from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path
from typing import List, Tuple

import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import MultiPolygon, Polygon, box

from config import (
    EXTRACTS_DIR,
    PARQUET_DIR,
    area_choices,
    area_parquet_dir,
    iter_area_items,
    resolve_repo_path,
)

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
]
OVERPASS_RETRY_STATUS = {429, 502, 503, 504}
BEV_DEFAULT_LAYER = "BWK_8100_BAUWERK_F"
GBA_COLUMNS = ["area_id", "gba_id", "height", "properties", "geometry"]
OSM_COLUMNS = ["area_id", "osm_id", "name", "building_type", "tags", "geometry"]
BEV_COLUMNS = [
    "area_id",
    "bev_id",
    "height",
    "height_m",
    "height_median_m",
    "height_max_m",
    "height_eaves_m",
    "ground_min_m",
    "ground_median_m",
    "ground_max_m",
    "footprint_area_m2",
    "relief_range_m",
    "agwr_object_number",
    "agwr_type",
    "building_function",
    "verification_lb",
    "flight_year",
    "als_date",
    "capture_method",
    "height_source",
    "height_quality",
    "properties",
    "geometry",
]


def _json_dumps_record(record: dict) -> str:
    cleaned = {}
    for key, value in record.items():
        if hasattr(value, "item"):
            value = value.item()
        if isinstance(value, pd.Timestamp):
            value = value.isoformat()
        elif hasattr(value, "isoformat") and not isinstance(value, str):
            value = value.isoformat()
        if isinstance(value, float) and math.isnan(value):
            value = None
        elif value is pd.NA or value is pd.NaT:
            value = None
        cleaned[key] = value
    return json.dumps(cleaned, ensure_ascii=True)


def _normalized_column_name(value: str) -> str:
    return "".join(ch for ch in value.upper() if ch.isalnum())


def _find_column(gdf: gpd.GeoDataFrame, *candidates: str) -> str | None:
    lookup = {_normalized_column_name(column): column for column in gdf.columns}
    for candidate in candidates:
        column = lookup.get(_normalized_column_name(candidate))
        if column is not None:
            return column
    return None


def _series_or_none(gdf: gpd.GeoDataFrame, *candidates: str) -> pd.Series | None:
    column = _find_column(gdf, *candidates)
    return gdf[column] if column is not None else None


def _numeric_series(gdf: gpd.GeoDataFrame, *candidates: str) -> pd.Series:
    series = _series_or_none(gdf, *candidates)
    if series is None:
        return pd.Series([pd.NA] * len(gdf), index=gdf.index, dtype="Float64")
    return pd.to_numeric(series, errors="coerce")


def _text_series(gdf: gpd.GeoDataFrame, *candidates: str) -> pd.Series:
    series = _series_or_none(gdf, *candidates)
    if series is None:
        return pd.Series([None] * len(gdf), index=gdf.index, dtype="object")
    return series.where(series.notna(), None).astype("string")


def _integer_text_series(gdf: gpd.GeoDataFrame, *candidates: str) -> pd.Series:
    series = _series_or_none(gdf, *candidates)
    if series is None:
        return pd.Series([None] * len(gdf), index=gdf.index, dtype="object")
    numeric = pd.to_numeric(series, errors="coerce").astype("Int64")
    return numeric.astype("string")


def _download_if_needed(source: Path, url: str | None) -> None:
    if source.exists():
        return
    if not url:
        raise FileNotFoundError(f"Source file not found and no download URL configured: {source}")
    source.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = source.with_suffix(source.suffix + ".part")
    print(f"Downloading BEV buildings from {url}...")
    with requests.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with tmp_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
    tmp_path.replace(source)


def _source_bbox_for_area(source: Path, layer: str, bbox_wgs84: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    try:
        sample = gpd.read_file(source, layer=layer, rows=slice(0, 0))
    except Exception:
        return bbox_wgs84
    if sample.crs is None:
        return bbox_wgs84
    bbox_geom = gpd.GeoSeries([box(*bbox_wgs84)], crs="EPSG:4326").to_crs(sample.crs)
    return tuple(float(value) for value in bbox_geom.total_bounds)


def _quality_from_source(value) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    if not text:
        return None
    normalized = text.casefold()
    if "default" in normalized or "fixwert" in normalized:
        return "default"
    if "unbekannt" in normalized:
        return "unknown"
    return "measured"


def load_gba(area_id: str, gba_spec: dict | None = None) -> gpd.GeoDataFrame:
    if not gba_spec or "path" not in gba_spec:
        raise ValueError(f"Manifest GBA path is required for {area_id}")
    source = resolve_repo_path(gba_spec["path"])
    if not source.exists():
        raise FileNotFoundError(f"GBA GeoJSON not found for {area_id}: {source}")

    gdf = gpd.read_file(source)
    if "height" not in gdf.columns:
        for col in ["Height", "HEIGHT", "bldg_height", "building_height"]:
            if col in gdf.columns:
                gdf["height"] = pd.to_numeric(gdf[col], errors="coerce")
                break
        else:
            gdf["height"] = 10.0
    gdf["height"] = pd.to_numeric(gdf["height"], errors="coerce").fillna(10.0)
    gdf = gdf.to_crs(epsg=4326)
    if "id" in gdf.columns:
        gdf["gba_id"] = gdf["id"].astype(str)
    else:
        gdf["gba_id"] = gdf.index.astype(str)
    gdf["area_id"] = area_id

    # Capture all non-geometry properties for inspector.
    props_cols = [c for c in gdf.columns if c not in {"geometry"}]
    gdf["properties"] = gdf[props_cols].to_dict(orient="records")
    gdf["properties"] = gdf["properties"].apply(_json_dumps_record)
    gdf = gdf[GBA_COLUMNS].copy()
    return gdf


def load_bev(area_id: str, area: dict) -> gpd.GeoDataFrame:
    bev_spec = area.get("bev")
    if not bev_spec or "path" not in bev_spec:
        raise ValueError(f"Manifest BEV path is required for {area_id}")
    if "bbox" not in area:
        raise ValueError(f"Area '{area_id}' is missing required bbox for BEV clipping")

    source = resolve_repo_path(bev_spec["path"])
    _download_if_needed(source, bev_spec.get("url"))
    layer = bev_spec.get("layer", BEV_DEFAULT_LAYER)
    bbox_wgs84 = tuple(float(value) for value in area["bbox"])
    read_bbox = _source_bbox_for_area(source, layer, bbox_wgs84)

    print(f"Reading BEV buildings for {area_id} from {source.name}...")
    gdf = gpd.read_file(source, layer=layer, bbox=read_bbox)
    if gdf.empty:
        return gpd.GeoDataFrame(columns=BEV_COLUMNS, geometry="geometry", crs="EPSG:4326")

    gdf = gdf.to_crs(epsg=4326)
    area_geom = box(*bbox_wgs84)
    gdf = gdf[gdf.geometry.notna() & gdf.geometry.intersects(area_geom)].copy()
    if gdf.empty:
        return gpd.GeoDataFrame(columns=BEV_COLUMNS, geometry="geometry", crs="EPSG:4326")

    id_series = _text_series(gdf, "GLOBALID", "globalid", "id", "OBJECTID")
    fallback_ids = pd.Series(gdf.index.astype(str), index=gdf.index)
    gdf["bev_id"] = id_series.fillna("").replace("", pd.NA).fillna(fallback_ids).astype(str)
    gdf["area_id"] = area_id

    gdf["height_median_m"] = _numeric_series(gdf, "HOEHE_OBJEKT_MEDIAN")
    gdf["height_max_m"] = _numeric_series(gdf, "HOEHE_OBJEKT_MAX", "HOEHE_ OBJEKT_MAX")
    gdf["height_eaves_m"] = _numeric_series(gdf, "HOEHE_OBJEKT_TRAUFE")
    gdf["height_m"] = gdf["height_median_m"].fillna(gdf["height_max_m"])
    gdf["height"] = gdf["height_m"]
    gdf["ground_min_m"] = _numeric_series(gdf, "HOEHE_BODEN_MIN")
    gdf["ground_median_m"] = _numeric_series(gdf, "HOEHE_BODEN_MEDIAN")
    gdf["ground_max_m"] = _numeric_series(gdf, "HOEHE_BODEN_MAX")
    gdf["relief_range_m"] = gdf["ground_max_m"] - gdf["ground_min_m"]

    shape_area = _numeric_series(gdf, "SHAPE_AREA")
    computed_area = gdf.to_crs(epsg=32633).geometry.area
    gdf["footprint_area_m2"] = shape_area.fillna(computed_area)

    gdf["agwr_object_number"] = _integer_text_series(gdf, "AGWR_OBJEKTNUMMER")
    gdf["agwr_type"] = _text_series(gdf, "AGWR_TYP")
    gdf["building_function"] = _text_series(gdf, "BAUWERKSFUNKTION")
    gdf["verification_lb"] = _text_series(gdf, "VERIFIKATION_LB")
    gdf["flight_year"] = pd.to_numeric(_text_series(gdf, "BEFLIEGUNGSJAHR"), errors="coerce").astype("Int64")
    gdf["als_date"] = _text_series(gdf, "ALS_DATUM")
    gdf["capture_method"] = _text_series(gdf, "ERFASS_ART")

    height_source = _text_series(
        gdf,
        "ERFASS_ART_HOEHE_OBJEKT_MEDIAN",
        "ERFASS_ART_HOEHE_OBJEKT_MAX",
        "ERFASS_ART_HOEHE_OBJEKT_TRAUFE",
    )
    gdf["height_source"] = height_source
    gdf["height_quality"] = height_source.apply(_quality_from_source)

    props_cols = [column for column in gdf.columns if column != "geometry"]
    gdf["properties"] = gdf[props_cols].to_dict(orient="records")
    gdf["properties"] = gdf["properties"].apply(_json_dumps_record)
    return gdf[BEV_COLUMNS].copy()


def _split_bbox(bbox: tuple, max_span: float) -> List[Tuple[float, float, float, float]]:
    min_lon, min_lat, max_lon, max_lat = bbox
    width = max_lon - min_lon
    height = max_lat - min_lat

    x_tiles = max(1, math.ceil(width / max_span))
    y_tiles = max(1, math.ceil(height / max_span))

    tiles = []
    for xi in range(x_tiles):
        for yi in range(y_tiles):
            tile_min_lon = min_lon + xi * max_span
            tile_max_lon = min(tile_min_lon + max_span, max_lon)
            tile_min_lat = min_lat + yi * max_span
            tile_max_lat = min(tile_min_lat + max_span, max_lat)
            tiles.append((tile_min_lon, tile_min_lat, tile_max_lon, tile_max_lat))
    return tiles


def _parse_osm_response(osm_data: dict) -> list:
    elements = osm_data.get("elements", [])

    nodes = {e["id"]: (e["lon"], e["lat"]) for e in elements if e.get("type") == "node"}
    ways = {e["id"]: e for e in elements if e.get("type") == "way"}

    buildings = []

    for element in elements:
        elem_type = element.get("type")
        tags = element.get("tags", {})
        if "building" not in tags:
            continue

        if elem_type == "way":
            geom = _way_to_polygon(element, nodes)
        elif elem_type == "relation":
            geom = _relation_to_polygon(element, ways, nodes)
        else:
            geom = None

        if geom is None:
            continue

        buildings.append({
            "geometry": geom,
            "osm_id": element["id"],
            "name": tags.get("name", ""),
            "building_type": tags.get("building", "yes"),
            "tags": tags,
        })

    return buildings


def _way_to_polygon(way: dict, nodes: dict) -> Polygon | None:
    node_refs = way.get("nodes", [])
    if len(node_refs) < 4:
        return None
    coords = []
    for node_id in node_refs:
        if node_id in nodes:
            coords.append(nodes[node_id])
        else:
            return None
    try:
        return Polygon(coords)
    except Exception:
        return None


def _relation_to_polygon(relation: dict, ways: dict, nodes: dict) -> MultiPolygon | None:
    members = relation.get("members", [])
    outer_rings = []
    for member in members:
        if member.get("type") != "way":
            continue
        way_id = member.get("ref")
        if way_id not in ways:
            continue
        poly = _way_to_polygon(ways[way_id], nodes)
        if poly is not None:
            outer_rings.append(poly)
    if not outer_rings:
        return None
    if len(outer_rings) == 1:
        return outer_rings[0]
    return MultiPolygon(outer_rings)


def load_osm_overpass(bbox: tuple) -> gpd.GeoDataFrame:
    tiles = _split_bbox(bbox, max_span=0.2)
    results = []
    for min_lon, min_lat, max_lon, max_lat in tiles:
        overpass_query = f"""
        [out:json][timeout:120];
        (
          way["building"]({min_lat},{min_lon},{max_lat},{max_lon});
          relation["building"]({min_lat},{min_lon},{max_lat},{max_lon});
        );
        out body;
        >;
        out skel qt;
        """
        response = _request_overpass(overpass_query)
        osm_data = response.json()
        buildings = _parse_osm_response(osm_data)
        if buildings:
            results.append(gpd.GeoDataFrame(buildings, crs="EPSG:4326"))

    if not results:
        return gpd.GeoDataFrame(columns=["geometry", "osm_id", "name", "building_type"], crs="EPSG:4326")

    merged = gpd.GeoDataFrame(pd.concat(results, ignore_index=True), crs="EPSG:4326")
    merged = merged.drop_duplicates(subset=["osm_id"])
    if "tags" in merged.columns:
        merged["tags"] = merged["tags"].apply(
            lambda v: json.dumps(v, ensure_ascii=True) if isinstance(v, dict) else v
        )
    return merged


def _request_overpass(overpass_query: str) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        for url in OVERPASS_URLS:
            try:
                response = requests.post(
                    url,
                    data={"data": overpass_query},
                    headers={"User-Agent": "salzburg-insar-viewer/1.0"},
                    timeout=180,
                )
            except requests.RequestException as exc:
                last_error = exc
                print(f"Overpass request failed at {url}: {exc}")
                continue
            if response.status_code not in OVERPASS_RETRY_STATUS:
                response.raise_for_status()
                return response
            last_error = requests.HTTPError(
                f"{response.status_code} retryable Overpass response at {url}",
                response=response,
            )
            print(f"Overpass retryable response {response.status_code} at {url}")
        if attempt < 3:
            time.sleep(10 * attempt)
    if last_error is not None:
        raise last_error
    raise RuntimeError("Overpass request failed without a response")


def _standardize_osm(gdf: gpd.GeoDataFrame, area_id: str) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gpd.GeoDataFrame(columns=OSM_COLUMNS, geometry="geometry", crs="EPSG:4326")

    gdf = gdf.to_crs(epsg=4326).copy()
    if "area_id" not in gdf.columns:
        gdf["area_id"] = area_id
    else:
        gdf["area_id"] = gdf["area_id"].fillna(area_id)
    if "osm_id" not in gdf.columns:
        gdf["osm_id"] = gdf.index.astype(str)
    for column in ["name", "building_type", "tags"]:
        if column not in gdf.columns:
            gdf[column] = ""
    gdf["tags"] = gdf["tags"].apply(
        lambda value: json.dumps(value, ensure_ascii=True) if isinstance(value, dict) else value
    )
    return gdf[OSM_COLUMNS].copy()


def _load_osm_local(area_id: str, nested_out: Path, combined_out: Path) -> gpd.GeoDataFrame:
    if nested_out.exists():
        return _standardize_osm(gpd.read_parquet(nested_out), area_id)

    if not combined_out.exists():
        return gpd.GeoDataFrame(columns=OSM_COLUMNS, geometry="geometry", crs="EPSG:4326")

    gdf = gpd.read_parquet(combined_out)
    if "area_id" not in gdf.columns:
        raise ValueError(f"Combined OSM parquet must contain area_id: {combined_out}")
    if gdf["area_id"].isna().any():
        raise ValueError(f"Combined OSM parquet contains empty area_id values: {combined_out}")
    gdf = gdf[gdf["area_id"] == area_id].copy()
    return _standardize_osm(gdf, area_id)


def _write_area_buildings(gdf: gpd.GeoDataFrame, output_path: Path, label: str) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_parquet(output_path, index=False)
    print(f"Saved {label}: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--area", choices=area_choices(), default="salzburg")
    parser.add_argument("--osm-source", choices=["overpass", "local"], default="overpass")
    parser.add_argument("--skip-bev", action="store_true")
    parser.add_argument("--skip-gba", action="store_true")
    parser.add_argument("--skip-osm", action="store_true")
    args = parser.parse_args()

    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACTS_DIR.mkdir(parents=True, exist_ok=True)
    selected_areas = list(iter_area_items(args.area))

    if not args.skip_bev:
        bev_frames = []
        for area_id, area in selected_areas:
            if "bev" not in area:
                print(f"Skipping BEV for {area_id} (no manifest source)")
                continue
            bev = load_bev(area_id, area)
            _write_area_buildings(
                bev,
                area_parquet_dir(area_id) / "bev_buildings.parquet",
                f"BEV buildings for {area_id}",
            )
            bev_frames.append(bev)

        if bev_frames:
            combined_bev = gpd.GeoDataFrame(
                pd.concat(bev_frames, ignore_index=True),
                geometry="geometry",
                crs="EPSG:4326",
            )
            _write_area_buildings(
                combined_bev,
                PARQUET_DIR / "bev_buildings.parquet",
                "combined BEV buildings",
            )

    if not args.skip_gba:
        gba_frames = []
        for area_id, area in selected_areas:
            if "gba" not in area:
                print(f"Skipping GBA for {area_id} (no manifest source)")
                continue
            gba = load_gba(area_id, area["gba"])
            _write_area_buildings(
                gba,
                area_parquet_dir(area_id) / "gba_buildings.parquet",
                f"GBA buildings for {area_id}",
            )
            gba_frames.append(gba)

        if gba_frames:
            combined_gba = gpd.GeoDataFrame(
                pd.concat(gba_frames, ignore_index=True),
                geometry="geometry",
                crs="EPSG:4326",
            )
            _write_area_buildings(
                combined_gba,
                PARQUET_DIR / "gba_buildings.parquet",
                "combined GBA buildings",
            )

    if not args.skip_osm:
        osm_frames = []
        combined_osm_out = PARQUET_DIR / "osm_buildings.parquet"
        for area_id, area in selected_areas:
            if not area.get("osm", {}).get("enabled", False):
                print(f"Skipping OSM for {area_id} (disabled in manifest)")
                continue

            nested_out = area_parquet_dir(area_id) / "osm_buildings.parquet"
            if args.osm_source == "local":
                osm = _load_osm_local(area_id, nested_out, combined_osm_out)
                if osm.empty:
                    print(f"Skipping OSM for {area_id} (no local parquet)")
                    continue
            else:
                if "bbox" not in area:
                    raise ValueError(f"Area '{area_id}' is missing required bbox for OSM download")
                bbox = tuple(area["bbox"])
                try:
                    osm = _standardize_osm(load_osm_overpass(bbox), area_id)
                except requests.RequestException as exc:
                    osm = _load_osm_local(area_id, nested_out, combined_osm_out)
                    if osm.empty:
                        raise
                    print(f"Using local OSM parquet for {area_id}; Overpass failed: {exc}")

            _write_area_buildings(osm, nested_out, f"OSM buildings for {area_id}")
            osm_frames.append(osm)

        if osm_frames:
            combined_osm = gpd.GeoDataFrame(
                pd.concat(osm_frames, ignore_index=True),
                geometry="geometry",
                crs="EPSG:4326",
            )
            _write_area_buildings(combined_osm, combined_osm_out, "combined OSM buildings")


if __name__ == "__main__":
    main()
