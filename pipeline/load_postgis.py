from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import MultiPolygon, Polygon
from sqlalchemy import create_engine, text

from config import PARQUET_DIR


def _load_insar_points(engine, path: Path) -> None:
    print(f"  Loading {path.name}...")
    gdf = gpd.read_parquet(path)
    print(f"    Read {len(gdf):,} rows")
    # Convert float columns to int where needed
    if "track" in gdf.columns:
        gdf["track"] = gdf["track"].astype(int)
    gdf = gdf.rename(columns={"geometry": "geom"}).set_geometry("geom")

    # Load in smaller chunks with progress
    chunk_size = 5000
    total = len(gdf)
    for i in range(0, total, chunk_size):
        chunk = gdf.iloc[i:i+chunk_size]
        chunk.to_postgis("insar_points", engine, if_exists="append", index=False)
        print(f"    Progress: {min(i+chunk_size, total):,}/{total:,} rows", end="\r")
    print()


def _load_timeseries(engine, path: Path) -> None:
    print(f"  Loading {path.name}...")
    df = pd.read_parquet(path)
    print(f"    Read {len(df):,} rows")

    chunk_size = 50000
    total = len(df)
    for i in range(0, total, chunk_size):
        chunk = df.iloc[i:i+chunk_size]
        chunk.to_sql("insar_timeseries", engine, if_exists="append", index=False)
        print(f"    Progress: {min(i+chunk_size, total):,}/{total:,} rows", end="\r")
    print()


def _load_buildings(engine, path: Path, table: str, id_col: str) -> None:
    print(f"  Loading {path.name} -> {table}...")
    if not path.exists():
        print(f"    Skipping (file not found)")
        return
    gdf = gpd.read_parquet(path)
    print(f"    Read {len(gdf):,} rows")
    if id_col not in gdf.columns:
        gdf[id_col] = gdf.index.astype(str)
    gdf = _ensure_multipolygon(gdf)
    gdf = gdf.rename(columns={"geometry": "geom"}).set_geometry("geom")

    chunk_size = 2000
    total = len(gdf)
    for i in range(0, total, chunk_size):
        chunk = gdf.iloc[i:i+chunk_size]
        chunk.to_postgis(table, engine, if_exists="append", index=False)
        print(f"    Progress: {min(i+chunk_size, total):,}/{total:,} rows", end="\r")
    print()


def _load_links(engine, path: Path, table: str) -> None:
    print(f"  Loading {path.name} -> {table}...")
    if not path.exists():
        print(f"    Skipping (file not found)")
        return
    df = pd.read_parquet(path)
    print(f"    Read {len(df):,} rows")

    chunk_size = 50000
    total = len(df)
    for i in range(0, total, chunk_size):
        chunk = df.iloc[i:i+chunk_size]
        chunk.to_sql(table, engine, if_exists="append", index=False)
        print(f"    Progress: {min(i+chunk_size, total):,}/{total:,} rows", end="\r")
    print()

def _ensure_multipolygon(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    def to_multi(geom):
        if geom is None:
            return None
        if geom.geom_type == "MultiPolygon":
            return geom
        if geom.geom_type == "Polygon":
            return MultiPolygon([geom])
        return geom

    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].apply(to_multi)
    return gdf


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dsn", required=True, help="Postgres DSN")
    parser.add_argument("--schema-only", action="store_true")
    parser.add_argument(
        "--skip-schema",
        action="store_true",
        help="Skip schema creation (use when DB already initialized)",
    )
    parser.add_argument(
        "--only",
        choices=["all", "points", "timeseries", "buildings", "links", "osm", "gba"],
        default="all",
        help="Load only a specific dataset group",
    )
    args = parser.parse_args()

    engine = create_engine(args.dsn)

    # create schema
    if not args.skip_schema:
        print("Creating schema...")
        schema_sql = Path(__file__).resolve().parents[1] / "backend" / "sql" / "schema.sql"
        statements = [s.strip() for s in schema_sql.read_text().split(";") if s.strip()]
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
        print("Schema created.")

    if args.schema_only:
        print("Skipping data load (--schema-only).")
        return

    if args.only in {"all", "points"}:
        print("\nLoading InSAR points...")
        _load_insar_points(engine, PARQUET_DIR / "insar_points_t44.parquet")
        _load_insar_points(engine, PARQUET_DIR / "insar_points_t95.parquet")

    if args.only in {"all", "timeseries"}:
        print("\nLoading timeseries...")
        _load_timeseries(engine, PARQUET_DIR / "insar_timeseries_t44.parquet")
        _load_timeseries(engine, PARQUET_DIR / "insar_timeseries_t95.parquet")

    if args.only in {"all", "buildings", "gba"}:
        print("\nLoading GBA buildings...")
        _load_buildings(engine, PARQUET_DIR / "gba_buildings.parquet", "gba_buildings", "gba_id")
    if args.only in {"all", "buildings", "osm"}:
        print("\nLoading OSM buildings...")
        _load_buildings(engine, PARQUET_DIR / "osm_buildings.parquet", "osm_buildings", "osm_id")

    if args.only in {"all", "links"}:
        print("\nLoading links...")
        _load_links(engine, PARQUET_DIR / "insar_to_gba.parquet", "insar_to_gba")
        _load_links(engine, PARQUET_DIR / "insar_to_osm.parquet", "insar_to_osm")

    print("\nPostGIS load complete.")


if __name__ == "__main__":
    main()
