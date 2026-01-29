from __future__ import annotations

import argparse
import asyncio
import json
from uuid import uuid4

import asyncpg

from ..config import settings
from .registry import get_pipeline
from .runner import run_pipeline_async
from .store import create_run_record
from .types import RunConfig


def _parse_bbox(value: str | None):
    if not value:
        return None
    parts = [float(v) for v in value.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must be min_lon,min_lat,max_lon,max_lat")
    return tuple(parts)


async def _create_run(config: RunConfig) -> None:
    pipeline = get_pipeline(config.pipeline)
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=2)
    try:
        async with pool.acquire() as conn:
            await create_run_record(
                conn,
                config.run_id,
                config.pipeline,
                pipeline.version,
                pipeline.run_type,
                config.source,
                config.track,
                config.bbox,
                config.params,
            )
    finally:
        await pool.close()


async def _run(config: RunConfig) -> None:
    await _create_run(config)
    await run_pipeline_async(
        config,
        settings.db_dsn,
        settings.mlflow_tracking_uri,
        settings.mlflow_experiment,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run InSAR ML pipelines.")
    parser.add_argument("--pipeline", required=True, choices=["assignment", "clustering", "hybrid"])
    parser.add_argument("--source", choices=["gba", "osm"])
    parser.add_argument("--track", type=int, choices=[44, 95])
    parser.add_argument("--bbox", help="min_lon,min_lat,max_lon,max_lat")
    parser.add_argument("--params", default="{}", help="JSON string with pipeline params")
    args = parser.parse_args()

    config = RunConfig(
        run_id=str(uuid4()),
        pipeline=args.pipeline,
        source=args.source,
        track=args.track,
        bbox=_parse_bbox(args.bbox),
        params=json.loads(args.params),
    )

    asyncio.run(_run(config))


if __name__ == "__main__":
    main()
