from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import List, Tuple

import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import Polygon, MultiPolygon

from config import (
    EXTRACTS_DIR,
    PARQUET_DIR,
    area_choices,
    area_parquet_dir,
    iter_area_items,
    resolve_repo_path,
)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
GBA_COLUMNS = ["area_id", "gba_id", "height", "properties", "geometry"]
OSM_COLUMNS = ["area_id", "osm_id", "name", "building_type", "tags", "geometry"]


def _json_dumps_record(record: dict) -> str:
    cleaned = {}
    for key, value in record.items():
        if hasattr(value, "item"):
            value = value.item()
        if isinstance(value, float) and math.isnan(value):
            value = None
        elif value is pd.NA or value is pd.NaT:
            value = None
        cleaned[key] = value
    return json.dumps(cleaned, ensure_ascii=True)


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
        response = requests.post(
            OVERPASS_URL,
            data={"data": overpass_query},
            headers={"User-Agent": "salzburg-insar-viewer/1.0"},
            timeout=180,
        )
        response.raise_for_status()
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
    parser.add_argument("--skip-gba", action="store_true")
    parser.add_argument("--skip-osm", action="store_true")
    args = parser.parse_args()

    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACTS_DIR.mkdir(parents=True, exist_ok=True)
    selected_areas = list(iter_area_items(args.area))

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
                osm = _standardize_osm(load_osm_overpass(bbox), area_id)

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
