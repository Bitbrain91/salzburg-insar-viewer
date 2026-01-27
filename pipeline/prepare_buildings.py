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

from config import EXTRACTS_DIR, PARQUET_DIR, GBA_SOURCE

SALZBURG_BBOX = (12.95, 47.75, 13.15, 47.85)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def load_gba() -> gpd.GeoDataFrame:
    if not GBA_SOURCE.exists():
        raise FileNotFoundError(f"GBA GeoJSON not found: {GBA_SOURCE}")

    gdf = gpd.read_file(GBA_SOURCE)
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
    # Capture all non-geometry properties for inspector
    props_cols = [c for c in gdf.columns if c not in {"geometry"}]
    gdf["properties"] = gdf[props_cols].to_dict(orient="records")
    gdf["properties"] = gdf["properties"].apply(lambda v: json.dumps(v, ensure_ascii=True))
    gdf = gdf[["gba_id", "height", "properties", "geometry"]].copy()
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--osm-source", choices=["overpass", "local"], default="overpass")
    args = parser.parse_args()

    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACTS_DIR.mkdir(parents=True, exist_ok=True)

    # GBA
    gba = load_gba()
    gba_out = PARQUET_DIR / "gba_buildings.parquet"
    gba.to_parquet(gba_out, index=False)
    print(f"Saved GBA buildings: {gba_out}")

    # OSM
    osm_out = PARQUET_DIR / "osm_buildings.parquet"
    if args.osm_source == "local" and osm_out.exists():
        print(f"OSM parquet already exists: {osm_out}")
    else:
        osm = load_osm_overpass(SALZBURG_BBOX)
        osm.to_parquet(osm_out, index=False)
        print(f"Saved OSM buildings: {osm_out}")


if __name__ == "__main__":
    main()
