from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, Request

from ..db import fetch_all, fetch_one
from ..schemas import (
    BuildingDetail,
    ConfigResponse,
    HealthResponse,
    InSARPointDetail,
    TimeseriesResponse,
)

router = APIRouter(prefix="/api", tags=["api"])


VELOCITY_THRESHOLDS = {
    "strong_subsidence": -5.0,
    "moderate_subsidence": -2.0,
    "stable_min": -1.0,
    "stable_max": 1.0,
    "moderate_uplift": 2.0,
    "strong_uplift": 5.0,
}

TRACKS = [
    {"id": 44, "name": "Track 44 (Ascending)", "los": "A"},
    {"id": 95, "name": "Track 95 (Descending)", "los": "D"},
]


def _parse_json_value(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return {"raw": value}
    return value


def _ensure_dict(value) -> dict:
    parsed = _parse_json_value(value)
    return parsed if isinstance(parsed, dict) else {"value": parsed}


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/config", response_model=ConfigResponse)
async def config() -> ConfigResponse:
    return ConfigResponse(velocity_thresholds=VELOCITY_THRESHOLDS, tracks=TRACKS)


@router.get("/points/{code}", response_model=InSARPointDetail)
async def point_detail(
    request: Request,
    code: str,
    track: int | None = Query(default=None, description="Optional track (44 or 95)"),
):
    app = request.app
    base_query = """
        SELECT p.code, p.track, p.los, p.velocity, p.velocity_std, p.coherence,
               p.height, p.height_std, p.acceleration, p.acceleration_std,
               p.season_amp, p.season_phs, p.incidence_angle,
               p.amp_mean, p.amp_std,
               ST_X(p.geom) AS lon,
               ST_Y(p.geom) AS lat,
               gba.gba_id,
               osm.osm_id
        FROM insar_points p
        LEFT JOIN LATERAL (
            SELECT gba_id
            FROM insar_to_gba
            WHERE code = p.code AND track = p.track
            ORDER BY distance_m NULLS LAST
            LIMIT 1
        ) gba ON true
        LEFT JOIN LATERAL (
            SELECT osm_id
            FROM insar_to_osm
            WHERE code = p.code AND track = p.track
            ORDER BY distance_m NULLS LAST
            LIMIT 1
        ) osm ON true
        WHERE p.code = $1
    """
    params = [code]
    if track is not None:
        base_query += " AND p.track = $2"
        params.append(track)

    row = await fetch_one(app, base_query, *params)
    if row is None:
        raise HTTPException(status_code=404, detail="Point not found")

    return InSARPointDetail(
        code=row["code"],
        track=row["track"],
        los=row["los"],
        velocity=row["velocity"],
        velocity_std=row.get("velocity_std"),
        coherence=row.get("coherence"),
        height=row.get("height"),
        height_std=row.get("height_std"),
        acceleration=row.get("acceleration"),
        acceleration_std=row.get("acceleration_std"),
        season_amp=row.get("season_amp"),
        season_phs=row.get("season_phs"),
        incidence_angle=row.get("incidence_angle"),
        amp_mean=row.get("amp_mean"),
        amp_std=row.get("amp_std"),
        geometry={"lon": row["lon"], "lat": row["lat"]},
        gba_id=row.get("gba_id"),
        osm_id=row.get("osm_id"),
    )


@router.get("/points/{code}/timeseries", response_model=TimeseriesResponse)
async def point_timeseries(
    request: Request,
    code: str,
    track: int | None = Query(default=None, description="Optional track (44 or 95)"),
):
    app = request.app
    base_query = """
        SELECT code, track, date, displacement
        FROM insar_timeseries
        WHERE code = $1
        ORDER BY date ASC
    """
    params = [code]
    if track is not None:
        base_query = base_query.replace("WHERE code = $1", "WHERE code = $1 AND track = $2")
        params.append(track)

    rows = await fetch_all(app, base_query, *params)
    if not rows:
        raise HTTPException(status_code=404, detail="Timeseries not found")

    return TimeseriesResponse(
        code=rows[0]["code"],
        track=rows[0]["track"],
        measurements=[{"date": r["date"], "displacement": r["displacement"]} for r in rows],
    )


@router.get("/buildings/gba/{building_id}", response_model=BuildingDetail)
async def gba_building_detail(request: Request, building_id: str):
    app = request.app
    query = """
        SELECT gba_id AS id,
               height,
               properties,
               ST_AsGeoJSON(geom)::jsonb AS geometry
        FROM gba_buildings
        WHERE gba_id = $1
    """
    row = await fetch_one(app, query, building_id)
    if row is None:
        raise HTTPException(status_code=404, detail="GBA building not found")

    record = dict(row)
    geometry = _ensure_dict(record.pop("geometry"))
    attributes = _ensure_dict(record.get("properties") or {})

    return BuildingDetail(
        id=str(row["id"]),
        source="gba",
        height=row.get("height"),
        geometry=geometry,
        attributes=attributes,
    )


@router.get("/buildings/osm/{osm_id}", response_model=BuildingDetail)
async def osm_building_detail(request: Request, osm_id: int):
    app = request.app
    query = """
        SELECT osm_id AS id,
               name,
               building_type,
               tags,
               ST_AsGeoJSON(geom)::jsonb AS geometry
        FROM osm_buildings
        WHERE osm_id = $1
    """
    row = await fetch_one(app, query, osm_id)
    if row is None:
        raise HTTPException(status_code=404, detail="OSM building not found")

    record = dict(row)
    geometry = _ensure_dict(record.pop("geometry"))
    attributes = _ensure_dict(record.get("tags") or {})

    return BuildingDetail(
        id=str(row["id"]),
        source="osm",
        name=row.get("name") or None,
        building_type=row.get("building_type") or None,
        geometry=geometry,
        attributes=attributes,
    )


@router.get("/buildings/{source}/{building_id}/points")
async def building_points(request: Request, source: str, building_id: str):
    app = request.app
    if source not in {"gba", "osm"}:
        raise HTTPException(status_code=400, detail="Invalid source")

    if source == "gba":
        query = """
            SELECT p.code, p.track, p.velocity, p.coherence
            FROM insar_to_gba l
            JOIN insar_points p ON p.code = l.code AND p.track = l.track
            WHERE l.gba_id = $1
            ORDER BY p.velocity ASC
        """
    else:
        query = """
            SELECT p.code, p.track, p.velocity, p.coherence
            FROM insar_to_osm l
            JOIN insar_points p ON p.code = l.code AND p.track = l.track
            WHERE l.osm_id = $1
            ORDER BY p.velocity ASC
        """

    rows = await fetch_all(app, query, building_id)
    return {
        "source": source,
        "building_id": building_id,
        "count": len(rows),
        "points": [
            {
                "code": r["code"],
                "track": r["track"],
                "velocity": r["velocity"],
                "coherence": r["coherence"],
            }
            for r in rows
        ],
    }


@router.get("/points")
async def points_query(
    request: Request,
    bbox: str = Query(..., description="min_lon,min_lat,max_lon,max_lat"),
    track: int | None = Query(default=None),
    velocity_min: float | None = Query(default=None),
    velocity_max: float | None = Query(default=None),
    coherence_min: float | None = Query(default=None),
    limit: int = Query(default=5000, le=20000),
):
    app = request.app
    try:
        min_lon, min_lat, max_lon, max_lat = [float(v) for v in bbox.split(",")]
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid bbox format") from exc

    conditions = ["ST_Intersects(p.geom, ST_MakeEnvelope($1,$2,$3,$4,4326))"]
    params = [min_lon, min_lat, max_lon, max_lat]
    param_idx = 5

    if track is not None:
        conditions.append(f"p.track = ${param_idx}")
        params.append(track)
        param_idx += 1
    if velocity_min is not None:
        conditions.append(f"p.velocity >= ${param_idx}")
        params.append(velocity_min)
        param_idx += 1
    if velocity_max is not None:
        conditions.append(f"p.velocity <= ${param_idx}")
        params.append(velocity_max)
        param_idx += 1
    if coherence_min is not None:
        conditions.append(f"p.coherence >= ${param_idx}")
        params.append(coherence_min)
        param_idx += 1

    where_clause = " AND ".join(conditions)
    query = f"""
        SELECT p.code, p.track, p.los, p.velocity, p.coherence,
               ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM insar_points p
        WHERE {where_clause}
        ORDER BY p.velocity ASC
        LIMIT {limit}
    """

    rows = await fetch_all(app, query, *params)
    return {
        "count": len(rows),
        "points": [
            {
                "code": r["code"],
                "track": r["track"],
                "los": r["los"],
                "velocity": r["velocity"],
                "coherence": r["coherence"],
                "lon": r["lon"],
                "lat": r["lat"],
            }
            for r in rows
        ],
    }
