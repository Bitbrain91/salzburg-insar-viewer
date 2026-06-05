from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, Request

from ..area_metadata import area_contracts, dataset_contracts, resolve_area_dataset
from ..db import fetch_all, fetch_one
from ..ml.track_geometry import track_geometries_contract
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


def _resolve_area_dataset_or_404(
    area_id: str | None,
    dataset_id: str | None,
    *,
    default_dataset_when_omitted: bool,
) -> tuple[str, str | None]:
    try:
        return resolve_area_dataset(
            area_id,
            dataset_id,
            default_dataset_when_omitted=default_dataset_when_omitted,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _tracks_contract() -> list[dict]:
    return [
        {"id": geometry["track"], **geometry}
        for geometry in track_geometries_contract()
    ]


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/config", response_model=ConfigResponse)
async def config() -> ConfigResponse:
    return ConfigResponse(
        velocity_thresholds=VELOCITY_THRESHOLDS,
        areas=area_contracts(),
        datasets=dataset_contracts(),
        tracks=_tracks_contract(),
    )


@router.get("/points/{code}", response_model=InSARPointDetail)
async def point_detail(
    request: Request,
    code: str,
    track: int | None = Query(default=None, description="Optional track"),
    area_id: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
):
    app = request.app
    resolved_area_id, resolved_dataset_id = _resolve_area_dataset_or_404(
        area_id,
        dataset_id,
        default_dataset_when_omitted=True,
    )
    base_query = """
        SELECT p.area_id, p.dataset_id, p.sensor,
               p.code, p.track, p.los, p.velocity, p.velocity_std, p.coherence,
               p.height, p.height_std, p.acceleration, p.acceleration_std,
               p.season_amp, p.season_phs, p.s_amp_std, p.s_phs_std,
               p.incidence_angle, p.look_angle, p.eff_area,
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
               ON terrain.area_id = p.area_id
              AND terrain.dataset_id = p.dataset_id
              AND terrain.code = p.code
              AND terrain.track = p.track
        WHERE p.code = $1
          AND p.area_id = $2
    """
    params = [code, resolved_area_id]
    param_idx = 3
    if resolved_dataset_id is not None:
        base_query += f" AND p.dataset_id = ${param_idx}"
        params.append(resolved_dataset_id)
        param_idx += 1
    if track is not None:
        base_query += f" AND p.track = ${param_idx}"
        params.append(track)
        param_idx += 1
    base_query += " ORDER BY p.dataset_id, p.track LIMIT 1"

    row = await fetch_one(app, base_query, *params)
    if row is None:
        raise HTTPException(status_code=404, detail="Point not found")

    return InSARPointDetail(
        area_id=row["area_id"],
        dataset_id=row["dataset_id"],
        sensor=row["sensor"],
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
        look_angle=row.get("look_angle"),
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
    track: int | None = Query(default=None, description="Optional track"),
    area_id: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
):
    app = request.app
    resolved_area_id, resolved_dataset_id = _resolve_area_dataset_or_404(
        area_id,
        dataset_id,
        default_dataset_when_omitted=True,
    )
    params = [code, resolved_area_id]
    point_filters = ["p.code = $1", "p.area_id = $2"]
    param_idx = 3
    if resolved_dataset_id is not None:
        point_filters.append(f"p.dataset_id = ${param_idx}")
        params.append(resolved_dataset_id)
        param_idx += 1
    if track is not None:
        point_filters.append(f"p.track = ${param_idx}")
        params.append(track)
        param_idx += 1
    point_where = " AND ".join(point_filters)

    base_query = f"""
        WITH point_filter AS (
            SELECT area_id, dataset_id, sensor, code, track
            FROM insar_points p
            WHERE {point_where}
        ),
        disp AS (
            SELECT t.area_id, t.dataset_id, p.sensor, t.code, t.track, t.date, t.displacement
            FROM insar_timeseries t
            JOIN point_filter p
              ON p.area_id = t.area_id
             AND p.dataset_id = t.dataset_id
             AND p.code = t.code
             AND p.track = t.track
        ),
        amp AS (
            SELECT t.area_id, t.dataset_id, p.sensor, t.code, t.track, t.date, t.amplitude
            FROM insar_amplitude_timeseries t
            JOIN point_filter p
              ON p.area_id = t.area_id
             AND p.dataset_id = t.dataset_id
             AND p.code = t.code
             AND p.track = t.track
        )
        SELECT COALESCE(disp.area_id, amp.area_id) AS area_id,
               COALESCE(disp.dataset_id, amp.dataset_id) AS dataset_id,
               COALESCE(disp.sensor, amp.sensor) AS sensor,
               COALESCE(disp.code, amp.code) AS code,
               COALESCE(disp.track, amp.track) AS track,
               COALESCE(disp.date, amp.date) AS date,
               disp.displacement,
               amp.amplitude
        FROM disp
        FULL OUTER JOIN amp
          ON disp.area_id = amp.area_id
         AND disp.dataset_id = amp.dataset_id
         AND disp.code = amp.code
         AND disp.track = amp.track
         AND disp.date = amp.date
        ORDER BY dataset_id, track, date ASC
    """

    rows = await fetch_all(app, base_query, *params)
    if not rows:
        raise HTTPException(status_code=404, detail="Timeseries not found")

    return TimeseriesResponse(
        area_id=rows[0]["area_id"],
        dataset_id=rows[0]["dataset_id"],
        sensor=rows[0]["sensor"],
        code=rows[0]["code"],
        track=rows[0]["track"],
        measurements=[
            {"date": r["date"], "displacement": r.get("displacement"), "amplitude": r.get("amplitude")}
            for r in rows
        ],
    )


@router.get("/buildings/gba/{building_id}", response_model=BuildingDetail)
async def gba_building_detail(
    request: Request,
    building_id: str,
    area_id: str = Query(...),
):
    app = request.app
    resolved_area_id, _ = _resolve_area_dataset_or_404(
        area_id,
        None,
        default_dataset_when_omitted=False,
    )
    query = """
        SELECT gba_buildings.area_id AS area_id,
               gba_buildings.gba_id AS id,
               gba_buildings.height,
               gba_buildings.properties,
               terrain.terrain_source,
               terrain.terrain_resolution_m,
               terrain.terrain_elevation_mean_m,
               terrain.terrain_elevation_min_m,
               terrain.terrain_elevation_max_m,
               terrain.slope_mean_deg AS terrain_slope_mean_deg,
               terrain.slope_max_deg AS terrain_slope_max_deg,
               terrain.relief_range_m AS terrain_relief_range_m,
               ST_AsGeoJSON(gba_buildings.geom)::jsonb AS geometry
        FROM gba_buildings
        LEFT JOIN building_terrain_context terrain
          ON terrain.area_id = gba_buildings.area_id
         AND terrain.building_source = 'gba'
         AND terrain.building_id = gba_id::text
        WHERE gba_buildings.area_id = $1
          AND gba_id = $2
    """
    row = await fetch_one(app, query, resolved_area_id, building_id)
    if row is None:
        raise HTTPException(status_code=404, detail="GBA building not found")

    record = dict(row)
    geometry = _ensure_dict(record.pop("geometry"))
    attributes = _ensure_dict(record.get("properties") or {})

    return BuildingDetail(
        area_id=row["area_id"],
        id=str(row["id"]),
        source="gba",
        height=row.get("height"),
        geometry=geometry,
        attributes=attributes,
        terrain=_build_building_terrain(row),
    )


@router.get("/buildings/osm/{osm_id}", response_model=BuildingDetail)
async def osm_building_detail(
    request: Request,
    osm_id: int,
    area_id: str = Query(...),
):
    app = request.app
    resolved_area_id, _ = _resolve_area_dataset_or_404(
        area_id,
        None,
        default_dataset_when_omitted=False,
    )
    query = """
        SELECT osm_buildings.area_id AS area_id,
               osm_buildings.osm_id AS id,
               osm_buildings.name,
               osm_buildings.building_type,
               osm_buildings.tags,
               terrain.terrain_source,
               terrain.terrain_resolution_m,
               terrain.terrain_elevation_mean_m,
               terrain.terrain_elevation_min_m,
               terrain.terrain_elevation_max_m,
               terrain.slope_mean_deg AS terrain_slope_mean_deg,
               terrain.slope_max_deg AS terrain_slope_max_deg,
               terrain.relief_range_m AS terrain_relief_range_m,
               ST_AsGeoJSON(osm_buildings.geom)::jsonb AS geometry
        FROM osm_buildings
        LEFT JOIN building_terrain_context terrain
          ON terrain.area_id = osm_buildings.area_id
         AND terrain.building_source = 'osm'
         AND terrain.building_id = osm_id::text
        WHERE osm_buildings.area_id = $1
          AND osm_id = $2
    """
    row = await fetch_one(app, query, resolved_area_id, osm_id)
    if row is None:
        raise HTTPException(status_code=404, detail="OSM building not found")

    record = dict(row)
    geometry = _ensure_dict(record.pop("geometry"))
    attributes = _ensure_dict(record.get("tags") or {})

    return BuildingDetail(
        area_id=row["area_id"],
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
    area_id: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
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

    resolved_area_id, resolved_dataset_id = _resolve_area_dataset_or_404(
        area_id,
        dataset_id,
        default_dataset_when_omitted=True,
    )

    conditions = [
        "ST_Intersects(p.geom, ST_MakeEnvelope($1,$2,$3,$4,4326))",
        "p.area_id = $5",
    ]
    params = [min_lon, min_lat, max_lon, max_lat, resolved_area_id]
    param_idx = 6

    if resolved_dataset_id is not None:
        conditions.append(f"p.dataset_id = ${param_idx}")
        params.append(resolved_dataset_id)
        param_idx += 1
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
        SELECT p.area_id, p.dataset_id, p.sensor,
               p.code, p.track, p.los, p.velocity, p.coherence,
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
                "area_id": r["area_id"],
                "dataset_id": r["dataset_id"],
                "sensor": r["sensor"],
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
