from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import time
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, HTTPException, Query, Request

from ..area_metadata import (
    AREAS_BY_ID,
    area_contracts,
    building_source_contracts,
    dataset_contracts,
    resolve_area_dataset,
)
from ..config import settings
from ..db import fetch_all, fetch_one
from ..ml.track_geometry import track_geometries_contract
from ..schemas import (
    BuildingAddress,
    BuildingDetail,
    BuildingTerrainContext,
    ConfigResponse,
    GeometryPoint,
    HealthResponse,
    InSARPointDetail,
    PointTerrainContext,
    SearchResponse,
    SearchResult,
    TimeseriesResponse,
)
router = APIRouter(prefix="/api", tags=["api"])
logger = logging.getLogger(__name__)


VELOCITY_THRESHOLDS = {
    "strong_subsidence": -5.0,
    "moderate_subsidence": -2.0,
    "stable_min": -1.0,
    "stable_max": 1.0,
    "moderate_uplift": 2.0,
    "strong_uplift": 5.0,
}
GBA_ADDRESS_NEAREST_MAX_DISTANCE_M = 25.0
ADDRESS_BUILDING_SOURCES = {
    "bev": ("bev_buildings", "bev_id"),
    "gba": ("gba_buildings", "gba_id"),
}

_NOMINATIM_CACHE: dict[tuple[str, str | None, int], list[dict[str, Any]]] = {}
_NOMINATIM_LOCK = asyncio.Lock()
_NOMINATIM_LAST_REQUEST_AT = 0.0


def _safe_float(value) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _safe_bbox(value) -> list[float] | None:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return None
    bbox = [_safe_float(item) for item in value]
    if any(item is None for item in bbox):
        return None
    min_lon, min_lat, max_lon, max_lat = bbox
    if min_lon >= max_lon or min_lat >= max_lat:
        return None
    return [float(item) for item in bbox]


def _point_center(lon, lat) -> dict[str, float] | None:
    lon_value = _safe_float(lon)
    lat_value = _safe_float(lat)
    if lon_value is None or lat_value is None:
        return None
    return {"lon": lon_value, "lat": lat_value}


def _area_id_for_point(lon: float, lat: float, preferred_area_id: str | None = None) -> str | None:
    if preferred_area_id:
        area = AREAS_BY_ID.get(preferred_area_id)
        if area:
            min_lon, min_lat, max_lon, max_lat = area.bounds
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                return preferred_area_id
    for area in AREAS_BY_ID.values():
        min_lon, min_lat, max_lon, max_lat = area.bounds
        if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
            return area.area_id
    return preferred_area_id


def _result_with_center(result: SearchResult, lon, lat) -> SearchResult:
    center = _point_center(lon, lat)
    if not center:
        return result
    center_model = GeometryPoint(**center)
    if hasattr(result, "model_copy"):
        return result.model_copy(update={"center": center_model})
    return result.copy(update={"center": center_model})


def _nominatim_request(url: str) -> list[dict[str, Any]]:
    req = UrlRequest(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": settings.nominatim_user_agent,
        },
    )
    with urlopen(req, timeout=settings.nominatim_timeout_s) as response:
        payload = response.read().decode("utf-8")
    parsed = json.loads(payload)
    return parsed if isinstance(parsed, list) else []


async def _fetch_nominatim(
    query: str,
    *,
    area_id: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    if not settings.nominatim_enabled:
        return []

    cache_key = (query.casefold(), area_id, limit)
    if cache_key in _NOMINATIM_CACHE:
        return _NOMINATIM_CACHE[cache_key]

    params: dict[str, str | int] = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": min(limit, 5),
        "countrycodes": "at",
    }
    area = AREAS_BY_ID.get(area_id or "")
    if area:
        min_lon, min_lat, max_lon, max_lat = area.bounds
        params["viewbox"] = f"{min_lon},{max_lat},{max_lon},{min_lat}"
        params["bounded"] = 1

    url = f"{settings.nominatim_url}?{urlencode(params)}"
    async with _NOMINATIM_LOCK:
        global _NOMINATIM_LAST_REQUEST_AT
        elapsed = time.monotonic() - _NOMINATIM_LAST_REQUEST_AT
        wait_s = max(0.0, settings.nominatim_min_interval_s - elapsed)
        if wait_s:
            await asyncio.sleep(wait_s)
        _NOMINATIM_LAST_REQUEST_AT = time.monotonic()

        try:
            results = await asyncio.to_thread(_nominatim_request, url)
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning("Nominatim fallback failed for query '%s': %s", query, exc)
            results = []

    _NOMINATIM_CACHE[cache_key] = results
    return results


def _address_tokens(query: str) -> list[str]:
    return [
        token.casefold()
        for token in re.split(r"\s+", query.strip())
        if len(token.strip()) >= 2
    ]


async def _search_points(request: Request, query: str, area_id: str | None, limit: int) -> list[SearchResult]:
    normalized = query.casefold()
    rows = await fetch_all(
        request.app,
        """
        SELECT p.area_id,
               p.dataset_id,
               p.sensor,
               p.code,
               p.track,
               p.los,
               ST_X(p.geom) AS lon,
               ST_Y(p.geom) AS lat
        FROM insar_points p
        WHERE lower(p.code) = $1
           OR (char_length($1) >= 3 AND lower(p.code) LIKE $2)
        ORDER BY
          CASE WHEN lower(p.code) = $1 THEN 0 ELSE 1 END,
          CASE WHEN $3::text IS NOT NULL AND p.area_id = $3 THEN 0 ELSE 1 END,
          p.area_id,
          p.dataset_id,
          p.track
        LIMIT $4
        """,
        normalized,
        f"{normalized}%",
        area_id,
        limit,
    )
    results: list[SearchResult] = []
    for row in rows:
        result = SearchResult(
            result_type="point",
            id=f"{row['area_id']}:{row['dataset_id']}:{row['track']}:{row['code']}",
            label=f"Punkt {row['code']}",
            subtitle=f"{row['area_id']} · {row['dataset_id']} · {row['sensor']} T{row['track']} ({row['los']})",
            area_id=row["area_id"],
            dataset_id=row["dataset_id"],
            track=row["track"],
            source=row["sensor"],
            code=row["code"],
            selection={
                "type": "point",
                "code": row["code"],
                "track": row["track"],
                "areaId": row["area_id"],
                "datasetId": row["dataset_id"],
                "sensor": row["sensor"],
            },
        )
        results.append(_result_with_center(result, row["lon"], row["lat"]))
    return results


async def _search_bev_buildings(
    request: Request,
    query: str,
    area_id: str | None,
    limit: int,
) -> list[SearchResult]:
    normalized = query.casefold()
    rows = await fetch_all(
        request.app,
        """
        SELECT b.area_id,
               b.bev_id AS id,
               b.agwr_object_number,
               b.height_m,
               b.height_quality,
               ST_X(ST_PointOnSurface(b.geom)) AS lon,
               ST_Y(ST_PointOnSurface(b.geom)) AS lat,
               ARRAY[ST_XMin(b.geom), ST_YMin(b.geom), ST_XMax(b.geom), ST_YMax(b.geom)] AS bbox
        FROM bev_buildings b
        WHERE b.geom IS NOT NULL
          AND (
            lower(b.bev_id) = $1
            OR (char_length($1) >= 3 AND lower(b.bev_id) LIKE $2)
            OR (
                b.agwr_object_number IS NOT NULL
                AND (
                    lower(b.agwr_object_number) = $1
                    OR (char_length($1) >= 3 AND lower(b.agwr_object_number) LIKE $2)
                )
            )
          )
        ORDER BY
          CASE
            WHEN lower(b.bev_id) = $1 THEN 0
            WHEN b.agwr_object_number IS NOT NULL AND lower(b.agwr_object_number) = $1 THEN 0
            ELSE 1
          END,
          CASE WHEN $3::text IS NOT NULL AND b.area_id = $3 THEN 0 ELSE 1 END,
          b.area_id,
          b.bev_id
        LIMIT $4
        """,
        normalized,
        f"{normalized}%",
        area_id,
        limit,
    )
    results: list[SearchResult] = []
    for row in rows:
        subtitle_parts = [row["area_id"], "BEV DLM-Bauwerk"]
        height = row.get("height_m")
        if height is not None:
            subtitle_parts.append(f"{float(height):.1f} m")
        if row.get("height_quality"):
            subtitle_parts.append(str(row["height_quality"]))
        if row.get("agwr_object_number"):
            subtitle_parts.append(f"AGWR {row['agwr_object_number']}")
        result = SearchResult(
            result_type="building",
            id=f"bev:{row['area_id']}:{row['id']}",
            label=f"BEV-Bauwerk {row['id']}",
            subtitle=" Â· ".join(subtitle_parts),
            area_id=row["area_id"],
            source="bev",
            bbox=_safe_bbox(row["bbox"]),
            selection={
                "type": "building",
                "source": "bev",
                "id": str(row["id"]),
                "areaId": row["area_id"],
            },
        )
        results.append(_result_with_center(result, row["lon"], row["lat"]))
    return results


async def _search_gba_buildings(
    request: Request,
    query: str,
    area_id: str | None,
    limit: int,
) -> list[SearchResult]:
    normalized = query.casefold()
    rows = await fetch_all(
        request.app,
        """
        SELECT b.area_id,
               b.gba_id AS id,
               b.height,
               ST_X(ST_PointOnSurface(b.geom)) AS lon,
               ST_Y(ST_PointOnSurface(b.geom)) AS lat,
               ARRAY[ST_XMin(b.geom), ST_YMin(b.geom), ST_XMax(b.geom), ST_YMax(b.geom)] AS bbox
        FROM gba_buildings b
        WHERE b.geom IS NOT NULL
          AND (
            lower(b.gba_id) = $1
            OR (char_length($1) >= 3 AND lower(b.gba_id) LIKE $2)
          )
        ORDER BY
          CASE WHEN lower(b.gba_id) = $1 THEN 0 ELSE 1 END,
          CASE WHEN $3::text IS NOT NULL AND b.area_id = $3 THEN 0 ELSE 1 END,
          b.area_id,
          b.gba_id
        LIMIT $4
        """,
        normalized,
        f"{normalized}%",
        area_id,
        limit,
    )
    results: list[SearchResult] = []
    for row in rows:
        height = row.get("height")
        subtitle = f"{row['area_id']} · GBA"
        if height is not None:
            subtitle += f" · {float(height):.1f} m"
        result = SearchResult(
            result_type="building",
            id=f"gba:{row['area_id']}:{row['id']}",
            label=f"GBA-Gebäude {row['id']}",
            subtitle=subtitle,
            area_id=row["area_id"],
            source="gba",
            bbox=_safe_bbox(row["bbox"]),
            selection={
                "type": "building",
                "source": "gba",
                "id": str(row["id"]),
                "areaId": row["area_id"],
            },
        )
        results.append(_result_with_center(result, row["lon"], row["lat"]))
    return results


async def _search_osm_buildings(
    request: Request,
    query: str,
    area_id: str | None,
    limit: int,
) -> list[SearchResult]:
    normalized = query.casefold()
    rows = await fetch_all(
        request.app,
        """
        SELECT b.area_id,
               b.osm_id AS id,
               b.name,
               b.building_type,
               ST_X(ST_PointOnSurface(b.geom)) AS lon,
               ST_Y(ST_PointOnSurface(b.geom)) AS lat,
               ARRAY[ST_XMin(b.geom), ST_YMin(b.geom), ST_XMax(b.geom), ST_YMax(b.geom)] AS bbox
        FROM osm_buildings b
        WHERE b.geom IS NOT NULL
          AND (
            lower(b.osm_id::text) = $1
            OR (char_length($1) >= 3 AND lower(b.osm_id::text) LIKE $2)
          )
        ORDER BY
          CASE WHEN lower(b.osm_id::text) = $1 THEN 0 ELSE 1 END,
          CASE WHEN $3::text IS NOT NULL AND b.area_id = $3 THEN 0 ELSE 1 END,
          b.area_id,
          b.osm_id
        LIMIT $4
        """,
        normalized,
        f"{normalized}%",
        area_id,
        limit,
    )
    results: list[SearchResult] = []
    for row in rows:
        name = row.get("name") or ""
        result = SearchResult(
            result_type="building",
            id=f"osm:{row['area_id']}:{row['id']}",
            label=name or f"OSM-Gebäude {row['id']}",
            subtitle=f"{row['area_id']} · OSM · {row.get('building_type') or 'Gebäude'}",
            area_id=row["area_id"],
            source="osm",
            bbox=_safe_bbox(row["bbox"]),
            selection={
                "type": "building",
                "source": "osm",
                "id": str(row["id"]),
                "areaId": row["area_id"],
            },
        )
        results.append(_result_with_center(result, row["lon"], row["lat"]))
    return results


async def _search_local_addresses(
    request: Request,
    query: str,
    area_id: str | None,
    limit: int,
) -> list[SearchResult]:
    tokens = _address_tokens(query)
    if not tokens:
        return []
    params: list[Any] = [area_id, query.casefold()]
    token_filters: list[str] = []
    for token in tokens:
        params.append(f"%{token}%")
        token_filters.append(f"address_text LIKE ${len(params)}")
    params.append(limit)
    limit_param = len(params)
    where_clause = " AND ".join(token_filters)
    rows = await fetch_all(
        request.app,
        f"""
        WITH candidates AS (
            SELECT b.area_id,
                   b.osm_id AS id,
                   b.name,
                   b.building_type,
                   b.tags,
                   lower(concat_ws(
                       ' ',
                       b.name,
                       b.tags->>'addr:street',
                       b.tags->>'addr:housenumber',
                       b.tags->>'addr:postcode',
                       b.tags->>'addr:city'
                   )) AS address_text,
                   concat_ws(
                       ' ',
                       NULLIF(b.tags->>'addr:street', ''),
                       NULLIF(b.tags->>'addr:housenumber', '')
                   ) AS street_line,
                   concat_ws(
                       ' ',
                       NULLIF(b.tags->>'addr:postcode', ''),
                       NULLIF(b.tags->>'addr:city', '')
                   ) AS city_line,
                   ST_X(ST_PointOnSurface(b.geom)) AS lon,
                   ST_Y(ST_PointOnSurface(b.geom)) AS lat,
                   ARRAY[ST_XMin(b.geom), ST_YMin(b.geom), ST_XMax(b.geom), ST_YMax(b.geom)] AS bbox
            FROM osm_buildings b
            WHERE b.geom IS NOT NULL
              AND (
                b.name <> ''
                OR b.tags ? 'addr:street'
                OR b.tags ? 'addr:housenumber'
                OR b.tags ? 'addr:postcode'
                OR b.tags ? 'addr:city'
              )
        )
        SELECT *
        FROM candidates
        WHERE {where_clause}
        ORDER BY
          CASE WHEN $1::text IS NOT NULL AND area_id = $1 THEN 0 ELSE 1 END,
          CASE WHEN address_text = lower($2::text) THEN 0 ELSE 1 END,
          area_id,
          street_line,
          city_line
        LIMIT ${limit_param}
        """,
        *params,
    )
    results: list[SearchResult] = []
    for row in rows:
        street_line = (row.get("street_line") or "").strip()
        city_line = (row.get("city_line") or "").strip()
        name = row.get("name") or ""
        label = street_line or name or f"OSM-Adresse {row['id']}"
        subtitle_parts = [row["area_id"], "OSM-Adresse"]
        if city_line:
            subtitle_parts.append(city_line)
        if name and name != label:
            subtitle_parts.append(name)
        result = SearchResult(
            result_type="address",
            id=f"osm-address:{row['area_id']}:{row['id']}",
            label=label,
            subtitle=" · ".join(subtitle_parts),
            area_id=row["area_id"],
            source="osm",
            bbox=_safe_bbox(row["bbox"]),
            selection={
                "type": "building",
                "source": "osm",
                "id": str(row["id"]),
                "areaId": row["area_id"],
            },
        )
        results.append(_result_with_center(result, row["lon"], row["lat"]))
    return results


async def _search_ml_runs(request: Request, query: str, area_id: str | None, limit: int) -> list[SearchResult]:
    normalized = query.casefold()
    rows = await fetch_all(
        request.app,
        """
        SELECT run_id,
               mlflow_run_id,
               area_id,
               dataset_id,
               pipeline,
               status,
               source,
               track,
               bbox,
               params,
               created_at
        FROM ml_runs
        WHERE lower(run_id::text) = $1
           OR (char_length($1) >= 4 AND lower(run_id::text) LIKE $2)
           OR (mlflow_run_id IS NOT NULL AND lower(mlflow_run_id) = $1)
           OR (mlflow_run_id IS NOT NULL AND char_length($1) >= 4 AND lower(mlflow_run_id) LIKE $2)
           OR (params->>'experiment_id' IS NOT NULL AND lower(params->>'experiment_id') = $1)
           OR (params->>'experiment_id' IS NOT NULL AND char_length($1) >= 4 AND lower(params->>'experiment_id') LIKE $2)
        ORDER BY
          CASE
            WHEN lower(run_id::text) = $1 THEN 0
            WHEN mlflow_run_id IS NOT NULL AND lower(mlflow_run_id) = $1 THEN 0
            WHEN params->>'experiment_id' IS NOT NULL AND lower(params->>'experiment_id') = $1 THEN 0
            ELSE 1
          END,
          CASE WHEN $3::text IS NOT NULL AND area_id = $3 THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT $4
        """,
        normalized,
        f"{normalized}%",
        area_id,
        limit,
    )
    results: list[SearchResult] = []
    for row in rows:
        run_id = str(row["run_id"])
        bbox = _safe_bbox(row.get("bbox"))
        center = None
        if bbox:
            center = {
                "lon": (bbox[0] + bbox[2]) / 2,
                "lat": (bbox[1] + bbox[3]) / 2,
            }
        track = row.get("track")
        subtitle = f"{row['area_id']} · {row['dataset_id']} · {row['pipeline']} · {row['status']}"
        if track is not None:
            subtitle += f" · T{track}"
        results.append(
            SearchResult(
                result_type="ml_run",
                id=run_id,
                label=f"ML Run {run_id[:8]}",
                subtitle=subtitle,
                area_id=row["area_id"],
                dataset_id=row["dataset_id"],
                track=track,
                source=row.get("source"),
                run_id=run_id,
                center=center,
                bbox=bbox,
            )
        )
    return results


async def _search_external_addresses(
    query: str,
    *,
    area_id: str | None,
    limit: int,
) -> list[SearchResult]:
    rows = await _fetch_nominatim(query, area_id=area_id, limit=limit)
    results: list[SearchResult] = []
    for index, row in enumerate(rows):
        lon = _safe_float(row.get("lon"))
        lat = _safe_float(row.get("lat"))
        if lon is None or lat is None:
            continue
        raw_bbox = row.get("boundingbox")
        bbox = None
        if isinstance(raw_bbox, list) and len(raw_bbox) == 4:
            south, north, west, east = [_safe_float(value) for value in raw_bbox]
            if None not in {south, north, west, east}:
                bbox = [float(west), float(south), float(east), float(north)]
        result_area_id = _area_id_for_point(lon, lat, area_id)
        results.append(
            SearchResult(
                result_type="address",
                id=f"nominatim:{row.get('osm_type', 'place')}:{row.get('osm_id', index)}",
                label=row.get("name") or row.get("display_name") or query,
                subtitle=row.get("display_name") or "Nominatim",
                area_id=result_area_id,
                source="nominatim",
                center={"lon": lon, "lat": lat},
                bbox=bbox,
                external=True,
            )
        )
    return results

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


def _clean_address_part(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _building_address_from_osm_tags(
    tags: dict,
    *,
    match_type: str,
    matched_osm_id: str | int | None,
    distance_m: float | None = None,
) -> BuildingAddress | None:
    street = _clean_address_part(tags.get("addr:street")) or _clean_address_part(
        tags.get("addr:place")
    )
    housenumber = _clean_address_part(tags.get("addr:housenumber"))
    if not street or not housenumber:
        return None

    postcode = _clean_address_part(tags.get("addr:postcode"))
    city = _clean_address_part(tags.get("addr:city"))
    street_line = f"{street} {housenumber}"
    city_line = " ".join(part for part in [postcode, city] if part)
    label = ", ".join(part for part in [street_line, city_line] if part)

    return BuildingAddress(
        label=label,
        street=street,
        housenumber=housenumber,
        postcode=postcode,
        city=city,
        source="osm",
        match_type=match_type,
        matched_osm_id=str(matched_osm_id) if matched_osm_id is not None else None,
        distance_m=round(distance_m, 1) if distance_m is not None else None,
    )


async def _find_local_building_address(
    app,
    *,
    area_id: str,
    source: str,
    building_id: str,
) -> BuildingAddress | None:
    source_sql = ADDRESS_BUILDING_SOURCES.get(source)
    if source_sql is None:
        return None
    table_name, id_column = source_sql
    rows = await fetch_all(
        app,
        f"""
        WITH selected_raw AS (
            SELECT geom
            FROM {table_name}
            WHERE area_id = $1
              AND {id_column}::text = $2
        ),
        candidate_raw AS (
            SELECT b.osm_id,
                   b.tags,
                   b.geom
            FROM osm_buildings b
            JOIN selected_raw s
              ON b.geom && ST_Expand(s.geom, 0.0005)
            WHERE b.area_id = $1
              AND s.geom IS NOT NULL
              AND b.geom IS NOT NULL
              AND (
                NULLIF(b.tags->>'addr:street', '') IS NOT NULL
                OR NULLIF(b.tags->>'addr:place', '') IS NOT NULL
              )
              AND NULLIF(b.tags->>'addr:housenumber', '') IS NOT NULL
        ),
        selected AS (
            SELECT ST_CollectionExtract(ST_MakeValid(geom), 3) AS geom
            FROM selected_raw
        ),
        address_osm AS (
            SELECT osm_id,
                   tags,
                   ST_CollectionExtract(ST_MakeValid(geom), 3) AS geom
            FROM candidate_raw
        ),
        candidates AS (
            SELECT b.osm_id,
                   b.tags,
                   ST_Intersects(s.geom, b.geom) AS intersects,
                   ST_Covers(s.geom, ST_PointOnSurface(b.geom)) AS osm_point_inside_gba,
                   ST_Distance(s.geom::geography, b.geom::geography) AS distance_m
            FROM selected s
            JOIN address_osm b
              ON TRUE
            WHERE s.geom IS NOT NULL
              AND b.geom IS NOT NULL
              AND NOT ST_IsEmpty(s.geom)
              AND NOT ST_IsEmpty(b.geom)
              AND (
                ST_Intersects(s.geom, b.geom)
                OR ST_DWithin(
                    s.geom::geography,
                    b.geom::geography,
                    $3::double precision
                )
              )
        )
        SELECT *
        FROM candidates
        ORDER BY
          CASE WHEN intersects THEN 0 ELSE 1 END,
          CASE WHEN osm_point_inside_gba THEN 0 ELSE 1 END,
          distance_m ASC,
          osm_id ASC
        LIMIT 8
        """,
        area_id,
        building_id,
        GBA_ADDRESS_NEAREST_MAX_DISTANCE_M,
    )
    for row in rows:
        match_type = "osm_intersection" if row.get("intersects") else "osm_nearest"
        address = _building_address_from_osm_tags(
            _ensure_dict(row.get("tags") or {}),
            match_type=match_type,
            matched_osm_id=row.get("osm_id"),
            distance_m=row.get("distance_m") if match_type == "osm_nearest" else None,
        )
        if address:
            return address
    return None


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
        building_sources=building_source_contracts(),
        tracks=_tracks_contract(),
    )


@router.get("/search", response_model=SearchResponse)
async def search(
    request: Request,
    q: str = Query(..., min_length=1, description="ID, address, or ML run query"),
    area_id: str | None = Query(default=None, description="AOI used as ranking/geocoding bias"),
    limit: int = Query(default=12, ge=1, le=25),
    include_external: bool = Query(default=True),
) -> SearchResponse:
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(status_code=400, detail="Search query must contain at least 2 characters")
    if area_id is not None and area_id not in AREAS_BY_ID:
        raise HTTPException(status_code=400, detail=f"Unknown area_id '{area_id}'")

    per_kind_limit = max(limit, 8)
    local_results: list[SearchResult] = []
    local_results.extend(await _search_ml_runs(request, query, area_id, per_kind_limit))
    local_results.extend(await _search_points(request, query, area_id, per_kind_limit))
    local_results.extend(await _search_bev_buildings(request, query, area_id, per_kind_limit))
    local_results.extend(await _search_gba_buildings(request, query, area_id, per_kind_limit))
    local_results.extend(await _search_osm_buildings(request, query, area_id, per_kind_limit))
    local_results.extend(await _search_local_addresses(request, query, area_id, per_kind_limit))

    external_fallback_used = False
    results = local_results[:limit]
    if not results and include_external:
        external_results = await _search_external_addresses(query, area_id=area_id, limit=limit)
        if external_results:
            external_fallback_used = True
            results = external_results[:limit]

    return SearchResponse(
        query=query,
        count=len(results),
        results=results,
        external_fallback_used=external_fallback_used,
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
               p.std_def, p.height, p.height_std, p.acceleration, p.acceleration_std,
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
        std_def=row.get("std_def"),
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


@router.get("/buildings/bev/{building_id}", response_model=BuildingDetail)
async def bev_building_detail(
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
        SELECT bev_buildings.area_id AS area_id,
               bev_buildings.bev_id AS id,
               bev_buildings.height,
               bev_buildings.height_m,
               bev_buildings.height_median_m,
               bev_buildings.height_max_m,
               bev_buildings.height_eaves_m,
               bev_buildings.ground_min_m,
               bev_buildings.ground_median_m,
               bev_buildings.ground_max_m,
               bev_buildings.footprint_area_m2,
               bev_buildings.relief_range_m,
               bev_buildings.agwr_object_number,
               bev_buildings.agwr_type,
               bev_buildings.building_function,
               bev_buildings.verification_lb,
               bev_buildings.flight_year,
               bev_buildings.als_date,
               bev_buildings.capture_method,
               bev_buildings.height_source,
               bev_buildings.height_quality,
               bev_buildings.properties,
               terrain.terrain_source,
               terrain.terrain_resolution_m,
               terrain.terrain_elevation_mean_m,
               terrain.terrain_elevation_min_m,
               terrain.terrain_elevation_max_m,
               terrain.slope_mean_deg AS terrain_slope_mean_deg,
               terrain.slope_max_deg AS terrain_slope_max_deg,
               terrain.relief_range_m AS terrain_relief_range_m,
               ST_AsGeoJSON(bev_buildings.geom)::jsonb AS geometry
        FROM bev_buildings
        LEFT JOIN building_terrain_context terrain
          ON terrain.area_id = bev_buildings.area_id
         AND terrain.building_source = 'bev'
         AND terrain.building_id = bev_buildings.bev_id::text
        WHERE bev_buildings.area_id = $1
          AND bev_buildings.bev_id = $2
    """
    row = await fetch_one(app, query, resolved_area_id, building_id)
    if row is None:
        raise HTTPException(status_code=404, detail="BEV building not found")

    record = dict(row)
    geometry = _ensure_dict(record.pop("geometry"))
    attributes = _ensure_dict(record.get("properties") or {})

    return BuildingDetail(
        area_id=row["area_id"],
        id=str(row["id"]),
        source="bev",
        height=row.get("height"),
        height_m=row.get("height_m"),
        height_median_m=row.get("height_median_m"),
        height_max_m=row.get("height_max_m"),
        height_eaves_m=row.get("height_eaves_m"),
        ground_min_m=row.get("ground_min_m"),
        ground_median_m=row.get("ground_median_m"),
        ground_max_m=row.get("ground_max_m"),
        footprint_area_m2=row.get("footprint_area_m2"),
        relief_range_m=row.get("relief_range_m"),
        agwr_object_number=row.get("agwr_object_number"),
        agwr_type=row.get("agwr_type"),
        building_function=row.get("building_function"),
        verification_lb=row.get("verification_lb"),
        flight_year=row.get("flight_year"),
        als_date=row.get("als_date"),
        capture_method=row.get("capture_method"),
        height_source=row.get("height_source"),
        height_quality=row.get("height_quality"),
        building_type=row.get("building_function") or None,
        geometry=geometry,
        attributes=attributes,
        terrain=_build_building_terrain(row),
        address=await _find_local_building_address(
            app,
            area_id=row["area_id"],
            source="bev",
            building_id=str(row["id"]),
        ),
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
        height_m=row.get("height"),
        geometry=geometry,
        attributes=attributes,
        terrain=_build_building_terrain(row),
        address=await _find_local_building_address(
            app,
            area_id=row["area_id"],
            source="gba",
            building_id=str(row["id"]),
        ),
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
        address=_building_address_from_osm_tags(
            attributes,
            match_type="osm_self",
            matched_osm_id=row["id"],
        ),
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
