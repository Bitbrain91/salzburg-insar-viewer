from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd

from config import PARQUET_DIR

UTM_EPSG = 32633


def _load_points() -> gpd.GeoDataFrame:
    t44 = gpd.read_parquet(PARQUET_DIR / "insar_points_t44.parquet")
    t95 = gpd.read_parquet(PARQUET_DIR / "insar_points_t95.parquet")
    points = pd.concat([t44, t95], ignore_index=True)
    gdf = gpd.GeoDataFrame(points, geometry="geometry", crs="EPSG:4326")
    return gdf


def _link(points: gpd.GeoDataFrame, buildings: gpd.GeoDataFrame, id_col: str, max_distance_m: float) -> pd.DataFrame:
    # project to metric for distance-based joins
    points_m = points.to_crs(epsg=UTM_EPSG)
    buildings_m = buildings.to_crs(epsg=UTM_EPSG)

    # intersects join
    joined = gpd.sjoin(points_m, buildings_m[[id_col, "geometry"]], predicate="within", how="left")
    matched = joined.dropna(subset=[id_col])
    matched_df = matched[["code", "track", id_col]].copy()
    matched_df["distance_m"] = 0.0
    matched_df["match_method"] = "within"

    # nearest for unmatched
    unmatched = joined[joined[id_col].isna()].copy()
    if not unmatched.empty:
        nearest = gpd.sjoin_nearest(
            unmatched[["code", "track", "geometry"]],
            buildings_m[[id_col, "geometry"]],
            how="left",
            max_distance=max_distance_m,
            distance_col="distance_m",
        )
        nearest = nearest.dropna(subset=[id_col])
        nearest_df = nearest[["code", "track", id_col, "distance_m"]].copy()
        nearest_df["match_method"] = "nearest"
        matched_df = pd.concat([matched_df, nearest_df], ignore_index=True)

    return matched_df


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-distance", type=float, default=15.0)
    args = parser.parse_args()

    points = _load_points()

    gba = gpd.read_parquet(PARQUET_DIR / "gba_buildings.parquet")
    osm = gpd.read_parquet(PARQUET_DIR / "osm_buildings.parquet")

    gba_links = _link(points, gba, "gba_id", args.max_distance)
    osm_links = _link(points, osm, "osm_id", args.max_distance)

    gba_out = PARQUET_DIR / "insar_to_gba.parquet"
    osm_out = PARQUET_DIR / "insar_to_osm.parquet"

    gba_links.to_parquet(gba_out, index=False)
    osm_links.to_parquet(osm_out, index=False)

    print(f"Saved links: {gba_out}")
    print(f"Saved links: {osm_out}")


if __name__ == "__main__":
    main()
