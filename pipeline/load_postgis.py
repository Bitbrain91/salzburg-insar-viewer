from __future__ import annotations

import argparse
import io
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pyarrow.parquet as pq
from shapely.geometry import MultiPolygon, Polygon
from sqlalchemy import create_engine, text

from config import PARQUET_DIR


def _path_context(path: Path) -> tuple[str, str]:
    rel = path.relative_to(PARQUET_DIR)
    if len(rel.parts) >= 3:
        return rel.parts[0], rel.parts[1]
    raise ValueError(f"InSAR parquet must live under <area_id>/<dataset_id>/: {path}")


def _discover_insar_files(prefix: str) -> list[Path]:
    return sorted(PARQUET_DIR.glob(f"*/*/{prefix}_t*.parquet"))


def _discover_building_files(filename: str) -> list[Path]:
    combined = PARQUET_DIR / filename
    if combined.exists():
        return [combined]
    return sorted(PARQUET_DIR.glob(f"*/{filename}"))


def _scope_matches(value: str, scope: str) -> bool:
    return scope == "all" or value == scope


def _filter_insar_paths(paths: list[Path], area_id: str, dataset_id: str) -> list[Path]:
    filtered = []
    for path in paths:
        path_area_id, path_dataset_id = _path_context(path)
        if _scope_matches(path_area_id, area_id) and _scope_matches(path_dataset_id, dataset_id):
            filtered.append(path)
    return filtered


def _filter_insar_frame(df: pd.DataFrame, area_id: str, dataset_id: str) -> pd.DataFrame:
    if area_id != "all":
        df = df[df["area_id"] == area_id]
    if dataset_id != "all":
        df = df[df["dataset_id"] == dataset_id]
    return df


def _filter_building_frame(gdf: gpd.GeoDataFrame, area_id: str) -> gpd.GeoDataFrame:
    if area_id == "all":
        return gdf
    return gdf[gdf["area_id"] == area_id].copy()


def _table_columns(engine, table: str) -> list[str]:
    query = text(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = :table
        ORDER BY ordinal_position
        """
    )
    with engine.connect() as conn:
        return [row[0] for row in conn.execute(query, {"table": table})]


def _align_columns(engine, df: pd.DataFrame, table: str) -> pd.DataFrame:
    table_columns = _table_columns(engine, table)
    if not table_columns:
        return df
    keep = [column for column in table_columns if column in df.columns]
    dropped = sorted(set(df.columns) - set(keep))
    if dropped:
        print(f"    Dropping columns not in {table}: {', '.join(dropped)}")
    return df[keep]


def _apply_insar_context(
    df: pd.DataFrame,
    path: Path,
    *,
    require_sensor: bool = False,
) -> pd.DataFrame:
    area_id, dataset_id = _path_context(path)
    df = df.copy()
    required = {"area_id", "dataset_id", "code", "track"}
    if require_sensor:
        required.add("sensor")
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"InSAR parquet is missing required columns: {', '.join(sorted(missing))}: {path}")
    if df[list(required)].isna().any().any():
        raise ValueError(f"InSAR parquet contains empty identity values: {path}")
    if not (df["area_id"].astype(str) == area_id).all():
        raise ValueError(f"InSAR parquet area_id does not match its path: {path}")
    if not (df["dataset_id"].astype(str) == dataset_id).all():
        raise ValueError(f"InSAR parquet dataset_id does not match its path: {path}")
    return df


def _load_insar_points(engine, path: Path, area_id: str, dataset_id: str) -> None:
    print(f"  Loading {path.relative_to(PARQUET_DIR)}...")
    gdf = gpd.read_parquet(path)
    print(f"    Read {len(gdf):,} rows")
    gdf = _apply_insar_context(gdf, path, require_sensor=True)
    gdf = _filter_insar_frame(gdf, area_id, dataset_id)
    print(f"    Scoped to {len(gdf):,} rows")
    # Convert float columns to int where needed
    if "track" in gdf.columns:
        gdf["track"] = gdf["track"].astype(int)
    gdf = gdf.rename(columns={"geometry": "geom"}).set_geometry("geom")
    gdf = _align_columns(engine, gdf, "insar_points")

    # Load in smaller chunks with progress
    chunk_size = 5000
    total = len(gdf)
    if total == 0:
        return
    for i in range(0, total, chunk_size):
        chunk = gdf.iloc[i:i+chunk_size]
        chunk.to_postgis("insar_points", engine, if_exists="append", index=False)
        print(f"    Progress: {min(i+chunk_size, total):,}/{total:,} rows", end="\r")
    print()


def _copy_dataframe(conn, table: str, columns: list[str], df: pd.DataFrame) -> None:
    buffer = io.StringIO()
    df.to_csv(buffer, index=False, header=False, na_rep="\\N")
    buffer.seek(0)
    column_sql = ", ".join(columns)
    with conn.cursor() as cur:
        cur.copy_expert(
            f"COPY {table} ({column_sql}) FROM STDIN WITH (FORMAT csv, NULL '\\N')",
            buffer,
        )


def _copy_parquet_timeseries(
    engine,
    path: Path,
    *,
    table: str,
    value_column: str,
    area_id: str,
    dataset_id: str,
    batch_size: int = 250_000,
) -> None:
    print(f"  Loading {path.relative_to(PARQUET_DIR)}...")
    parquet_file = pq.ParquetFile(path)
    total = parquet_file.metadata.num_rows
    print(f"    Read {total:,} parquet rows")
    wanted_columns = ["area_id", "dataset_id", "code", "track", "date", value_column]
    available_columns = [column for column in wanted_columns if column in parquet_file.schema.names]
    copied = 0
    conn = engine.raw_connection()
    try:
        for batch in parquet_file.iter_batches(batch_size=batch_size, columns=available_columns):
            df = batch.to_pandas()
            df = _apply_insar_context(df, path)
            df = _filter_insar_frame(df, area_id, dataset_id)
            if df.empty:
                continue
            df["track"] = df["track"].astype(int)
            df = df[wanted_columns]
            _copy_dataframe(conn, table, wanted_columns, df)
            conn.commit()
            copied += len(df)
            print(f"    Progress: {copied:,}/{total:,} rows", end="\r")
    finally:
        conn.close()
    print(f"\n    Copied {copied:,} rows")


def _load_timeseries(engine, path: Path, area_id: str, dataset_id: str) -> None:
    _copy_parquet_timeseries(
        engine,
        path,
        table="insar_timeseries",
        value_column="displacement",
        area_id=area_id,
        dataset_id=dataset_id,
    )


def _load_amplitude_timeseries(engine, path: Path, area_id: str, dataset_id: str) -> None:
    _copy_parquet_timeseries(
        engine,
        path,
        table="insar_amplitude_timeseries",
        value_column="amplitude",
        area_id=area_id,
        dataset_id=dataset_id,
    )
    print()


def _load_buildings(engine, path: Path, table: str, id_col: str, area_id: str) -> None:
    print(f"  Loading {path.relative_to(PARQUET_DIR)} -> {table}...")
    if not path.exists():
        print(f"    Skipping (file not found)")
        return
    gdf = gpd.read_parquet(path)
    print(f"    Read {len(gdf):,} rows")
    if "area_id" not in gdf.columns:
        raise ValueError(f"{table} parquet must contain area_id: {path}")
    if gdf["area_id"].isna().any():
        raise ValueError(f"{table} parquet contains empty area_id values: {path}")
    gdf = _filter_building_frame(gdf, area_id)
    print(f"    Scoped to {len(gdf):,} rows")
    if id_col not in gdf.columns:
        gdf[id_col] = gdf.index.astype(str)
    gdf = _ensure_multipolygon(gdf)
    gdf = gdf.rename(columns={"geometry": "geom"}).set_geometry("geom")
    gdf = _align_columns(engine, gdf, table)

    chunk_size = 2000
    total = len(gdf)
    if total == 0:
        return
    for i in range(0, total, chunk_size):
        chunk = gdf.iloc[i:i+chunk_size]
        chunk.to_postgis(table, engine, if_exists="append", index=False)
        print(f"    Progress: {min(i+chunk_size, total):,}/{total:,} rows", end="\r")
    print()


def _load_many(label: str, paths: list[Path], loader) -> None:
    if not paths:
        print(f"  No {label} parquet files found.")
        return
    for path in paths:
        loader(path)


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
        choices=["all", "points", "timeseries", "buildings", "osm", "gba"],
        default="all",
        help="Load only a specific dataset group",
    )
    parser.add_argument(
        "--area-id",
        default="all",
        help="Load only one AOI from nested or combined parquet files.",
    )
    parser.add_argument(
        "--dataset-id",
        default="all",
        help="Load only one InSAR dataset from nested parquet files.",
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
        _load_many(
            "InSAR point",
            _filter_insar_paths(
                _discover_insar_files("insar_points"),
                args.area_id,
                args.dataset_id,
            ),
            lambda path: _load_insar_points(engine, path, args.area_id, args.dataset_id),
        )

    if args.only in {"all", "timeseries"}:
        print("\nLoading timeseries...")
        _load_many(
            "InSAR displacement timeseries",
            _filter_insar_paths(
                _discover_insar_files("insar_timeseries"),
                args.area_id,
                args.dataset_id,
            ),
            lambda path: _load_timeseries(engine, path, args.area_id, args.dataset_id),
        )
        _load_many(
            "InSAR amplitude timeseries",
            _filter_insar_paths(
                _discover_insar_files("insar_amplitude_timeseries"),
                args.area_id,
                args.dataset_id,
            ),
            lambda path: _load_amplitude_timeseries(engine, path, args.area_id, args.dataset_id),
        )

    if args.only in {"all", "buildings", "gba"}:
        print("\nLoading GBA buildings...")
        _load_many(
            "GBA building",
            _discover_building_files("gba_buildings.parquet"),
            lambda path: _load_buildings(engine, path, "gba_buildings", "gba_id", args.area_id),
        )
    if args.only in {"all", "buildings", "osm"}:
        print("\nLoading OSM buildings...")
        _load_many(
            "OSM building",
            _discover_building_files("osm_buildings.parquet"),
            lambda path: _load_buildings(engine, path, "osm_buildings", "osm_id", args.area_id),
        )

    print("\nPostGIS load complete.")


if __name__ == "__main__":
    main()
