from __future__ import annotations

import argparse
import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from config import PARQUET_DIR


POINT_TERRAIN_PATH = PARQUET_DIR / "insar_point_terrain.parquet"
BUILDING_TERRAIN_PATH = PARQUET_DIR / "building_terrain_context.parquet"


def _execute_sql_file(engine, path: Path) -> None:
    statements = [stmt.strip() for stmt in path.read_text(encoding="utf-8").split(";") if stmt.strip()]
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def _stage_and_upsert(engine, df: pd.DataFrame, target_table: str, conflict_cols: list[str]) -> None:
    if df.empty:
        print(f"  Skipping {target_table} (no rows)")
        return

    staging_table = f"staging_{target_table}_{uuid.uuid4().hex[:8]}"
    print(f"  Loading {len(df):,} rows into {target_table}...")
    with engine.begin() as conn:
        df.to_sql(staging_table, conn, if_exists="replace", index=False, method="multi", chunksize=2000)
        insert_cols = list(df.columns)
        insert_cols_sql = ", ".join(insert_cols)
        conflict_sql = ", ".join(conflict_cols)
        update_cols = [col for col in insert_cols if col not in conflict_cols]
        update_sql = ", ".join(f"{col} = EXCLUDED.{col}" for col in update_cols)
        conn.execute(
            text(
                f"""
                INSERT INTO {target_table} ({insert_cols_sql})
                SELECT {insert_cols_sql}
                FROM {staging_table}
                ON CONFLICT ({conflict_sql}) DO UPDATE
                SET {update_sql}
                """
            )
        )
        conn.execute(text(f"DROP TABLE IF EXISTS {staging_table}"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dsn", required=True, help="Postgres DSN")
    parser.add_argument("--skip-points", action="store_true")
    parser.add_argument("--skip-buildings", action="store_true")
    args = parser.parse_args()

    engine = create_engine(args.dsn)

    migration_path = (
        Path(__file__).resolve().parents[1] / "backend" / "sql" / "migrations" / "003_terrain_context.sql"
    )
    print("Ensuring terrain context tables exist...")
    _execute_sql_file(engine, migration_path)

    if not args.skip_points:
        if not POINT_TERRAIN_PATH.exists():
            raise FileNotFoundError(f"Point terrain parquet not found: {POINT_TERRAIN_PATH}")
        point_df = pd.read_parquet(POINT_TERRAIN_PATH)
        point_df["code"] = point_df["code"].astype(str)
        point_df["track"] = point_df["track"].astype(int)
        _stage_and_upsert(engine, point_df, "insar_point_terrain", ["code", "track"])

    if not args.skip_buildings:
        if not BUILDING_TERRAIN_PATH.exists():
            raise FileNotFoundError(f"Building terrain parquet not found: {BUILDING_TERRAIN_PATH}")
        building_df = pd.read_parquet(BUILDING_TERRAIN_PATH)
        building_df["building_source"] = building_df["building_source"].astype(str)
        building_df["building_id"] = building_df["building_id"].astype(str)
        _stage_and_upsert(
            engine,
            building_df,
            "building_terrain_context",
            ["building_source", "building_id"],
        )

    print("Terrain context load complete.")


if __name__ == "__main__":
    main()
