from __future__ import annotations

import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
import requests

from config import area_choices, iter_area_items, resolve_repo_path

GBA_COLUMNS = ["source", "id", "height", "var", "region", "geometry"]


def validate_gba_geojson(gdf: gpd.GeoDataFrame, source: Path | str) -> gpd.GeoDataFrame:
    missing = [col for col in GBA_COLUMNS if col not in gdf.columns]
    if missing:
        raise ValueError(f"{source} is missing GBA columns: {', '.join(missing)}")

    if gdf.crs is None:
        raise ValueError(f"{source} has no CRS; expected EPSG:4326")
    gdf = gdf.to_crs(epsg=4326)
    if gdf.crs is None or gdf.crs.to_epsg() != 4326:
        raise ValueError(f"{source} CRS validation failed; expected EPSG:4326")

    gdf = gdf[GBA_COLUMNS].copy()
    gdf["source"] = gdf["source"].astype(str)
    gdf["id"] = gdf["id"].astype(str)
    gdf["height"] = pd.to_numeric(gdf["height"], errors="coerce")
    gdf["var"] = pd.to_numeric(gdf["var"], errors="coerce")
    gdf["region"] = gdf["region"].astype(str)
    gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()].copy()
    return gdf


def _wfs_params(area: dict[str, Any], wfs: dict[str, Any]) -> dict[str, str]:
    bbox = ",".join(str(value) for value in area["bbox"])
    return {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": wfs["type_names"],
        "outputFormat": "application/json",
        "bbox": f"{bbox},EPSG:4326",
        "srsName": wfs.get("srs_name", "EPSG:4326"),
        "sortBy": wfs.get("sort_by", "ogc_fid"),
    }


def _parse_hits_count(text: str) -> int:
    root = ET.fromstring(text)
    number_matched = root.attrib.get("numberMatched")
    if not number_matched or number_matched == "unknown":
        raise ValueError("WFS hits response did not include a numeric numberMatched")
    return int(number_matched)


def _request_json(session: requests.Session, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
    response = session.get(endpoint, params=params, timeout=120)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if "json" not in content_type:
        raise RuntimeError(f"WFS returned non-JSON response: {response.text[:500]}")
    return response.json()


def fetch_wfs_gba(area: dict[str, Any], page_size: int | None = None) -> gpd.GeoDataFrame:
    wfs = area["gba"]["wfs"]
    endpoint = wfs["endpoint"]
    params = _wfs_params(area, wfs)
    page_size = page_size or int(wfs.get("page_size", 1000))

    with requests.Session() as session:
        hits_response = session.get(
            endpoint,
            params={**params, "resultType": "hits"},
            timeout=60,
        )
        hits_response.raise_for_status()
        total = _parse_hits_count(hits_response.text)

        features: list[dict[str, Any]] = []
        for start_index in range(0, total, page_size):
            page = _request_json(
                session,
                endpoint,
                {**params, "count": page_size, "startIndex": start_index},
            )
            page_features = page.get("features", [])
            if not page_features:
                break
            features.extend(page_features)
            print(f"Fetched GBA WFS features: {len(features):,}/{total:,}", end="\r")
        print()

    if len(features) != total:
        raise RuntimeError(f"WFS returned {len(features):,} features, expected {total:,}")

    return gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")


def download_area_gba(
    area_id: str,
    area: dict[str, Any],
    *,
    force: bool = False,
    page_size: int | None = None,
) -> Path:
    gba = area.get("gba", {})
    if "wfs" not in gba:
        raise ValueError(f"Area '{area_id}' does not define a GBA WFS source")

    output_path = resolve_repo_path(gba["path"])
    if output_path.exists() and not force:
        gdf = gpd.read_file(output_path)
        validate_gba_geojson(gdf, output_path)
        print(f"GBA GeoJSON already exists and validates: {output_path}")
        return output_path

    gdf = fetch_wfs_gba(area, page_size=page_size)
    gdf = validate_gba_geojson(gdf, area_id)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(output_path, driver="GeoJSON")
    print(f"Saved GBA GeoJSON: {output_path} ({len(gdf):,} buildings)")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Download GBA area extracts from WFS.")
    parser.add_argument("--area", choices=area_choices(), default="bad_gastein")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--page-size", type=int, default=None)
    args = parser.parse_args()

    for area_id, area in iter_area_items(args.area):
        if "wfs" not in area.get("gba", {}):
            continue
        download_area_gba(area_id, area, force=args.force, page_size=args.page_size)


if __name__ == "__main__":
    main()
