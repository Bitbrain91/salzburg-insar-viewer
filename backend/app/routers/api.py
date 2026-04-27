from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, Request

from ..db import fetch_all, fetch_one
from ..schemas import (
    BuildingDetail,
    BuildingTerrainContext,
    ConfigResponse,
    HealthResponse,
    InSARPointDetail,
    PointTerrainContext,
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


def _build_point_terrain(row) -> PointTerrainContext | None:
    source = row.get("terrain_source")
    if source is None:
        return None
    return PointTerrainContext(
        source=source,
        resolution_m=row.get("terrain_resolution_m"),
        elevation_m=row.get("terrain_elevation_m"),
        slope_deg=row.get("terrain_slope_deg"),
        aspect_deg=row.get("terrain_aspect_deg"),
    )


def _build_building_terrain(row) -> BuildingTerrainContext | None:
    source = row.get("terrain_source")
    if source is None:
        return None
    return BuildingTerrainContext(
        source=source,
        resolution_m=row.get("terrain_resolution_m"),
        elevation_mean_m=row.get("terrain_elevation_mean_m"),
        elevation_min_m=row.get("terrain_elevation_min_m"),
        elevation_max_m=row.get("terrain_elevation_max_m"),
        slope_mean_deg=row.get("terrain_slope_mean_deg"),
        slope_max_deg=row.get("terrain_slope_max_deg"),
        relief_range_m=row.get("terrain_relief_range_m"),
    )


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
               p.season_amp, p.season_phs, p.s_amp_std, p.s_phs_std,
               p.incidence_angle, p.eff_area,
               p.amp_mean, p.amp_std,
               ST_X(p.geom) AS lon,
               ST_Y(p.geom) AS lat,
               terrain.terrain_source,
               terrain.terrain_resolution_m,
               terrain.terrain_elevation_m,
               terrain.slope_deg AS terrain_slope_deg,
               terrain.aspect_deg AS terrain_aspect_deg
        FROM insar_points p
        LEFT JOIN insar_point_terrain terrain
               ON terrain.code = p.code AND terrain.track = p.track
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
        s_amp_std=row.get("s_amp_std"),
        s_phs_std=row.get("s_phs_std"),
        incidence_angle=row.get("incidence_angle"),
        eff_area=row.get("eff_area"),
        amp_mean=row.get("amp_mean"),
        amp_std=row.get("amp_std"),
        geometry={"lon": row["lon"], "lat": row["lat"]},
        terrain=_build_point_terrain(row),
    )


@router.get("/points/{code}/timeseries", response_model=TimeseriesResponse)
async def point_timeseries(
    request: Request,
    code: str,
    track: int | None = Query(default=None, description="Optional track (44 or 95)"),
):
    app = request.app
    params = [code]
    track_filter = ""
    if track is not None:
        track_filter = " AND track = $2"
        params.append(track)

    base_query = f"""
        WITH disp AS (
            SELECT code, track, date, displacement
            FROM insar_timeseries
            WHERE code = $1{track_filter}
        ),
        amp AS (
            SELECT code, track, date, amplitude
            FROM insar_amplitude_timeseries
            WHERE code = $1{track_filter}
        )
        SELECT COALESCE(disp.code, amp.code) AS code,
               COALESCE(disp.track, amp.track) AS track,
               COALESCE(disp.date, amp.date) AS date,
               disp.displacement,
               amp.amplitude
        FROM disp
        FULL OUTER JOIN amp
          ON disp.code = amp.code AND disp.track = amp.track AND disp.date = amp.date
        ORDER BY date ASC
    """

    rows = await fetch_all(app, base_query, *params)
    if not rows:
        raise HTTPException(status_code=404, detail="Timeseries not found")

    return TimeseriesResponse(
        code=rows[0]["code"],
        track=rows[0]["track"],
        measurements=[
            {"date": r["date"], "displacement": r.get("displacement"), "amplitude": r.get("amplitude")}
            for r in rows
        ],
    )


@router.get("/buildings/gba/{building_id}", response_model=BuildingDetail)
async def gba_building_detail(request: Request, building_id: str):
    app = request.app
    query = """
        SELECT gba_id AS id,
               height,
               properties,
               terrain.terrain_source,
               terrain.terrain_resolution_m,
               terrain.terrain_elevation_mean_m,
               terrain.terrain_elevation_min_m,
               terrain.terrain_elevation_max_m,
               terrain.slope_mean_deg AS terrain_slope_mean_deg,
               terrain.slope_max_deg AS terrain_slope_max_deg,
               terrain.relief_range_m AS terrain_relief_range_m,
               ST_AsGeoJSON(geom)::jsonb AS geometry
        FROM gba_buildings
        LEFT JOIN building_terrain_context terrain
          ON terrain.building_source = 'gba' AND terrain.building_id = gba_id::text
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
        terrain=_build_building_terrain(row),
    )


@router.get("/buildings/osm/{osm_id}", response_model=BuildingDetail)
async def osm_building_detail(request: Request, osm_id: int):
    app = request.app
    query = """
        SELECT osm_id AS id,
               name,
               building_type,
               tags,
               terrain.terrain_source,
               terrain.terrain_resolution_m,
               terrain.terrain_elevation_mean_m,
               terrain.terrain_elevation_min_m,
               terrain.terrain_elevation_max_m,
               terrain.slope_mean_deg AS terrain_slope_mean_deg,
               terrain.slope_max_deg AS terrain_slope_max_deg,
               terrain.relief_range_m AS terrain_relief_range_m,
               ST_AsGeoJSON(geom)::jsonb AS geometry
        FROM osm_buildings
        LEFT JOIN building_terrain_context terrain
          ON terrain.building_source = 'osm' AND terrain.building_id = osm_id::text
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
        terrain=_build_building_terrain(row),
    )


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
