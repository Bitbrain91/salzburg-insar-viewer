from __future__ import annotations

import json
from datetime import datetime, timezone


async def create_run_record(
    conn,
    run_id: str,
    pipeline: str,
    pipeline_version: str,
    run_type: str,
    source: str | None,
    track: int | None,
    bbox: tuple[float, float, float, float] | None,
    params: dict,
) -> None:
    await conn.execute(
        """
        INSERT INTO ml_runs (
            run_id, pipeline, pipeline_version, run_type, source, track,
            bbox, params, status, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)
        """,
        run_id,
        pipeline,
        pipeline_version,
        run_type,
        source,
        track,
        json.dumps(list(bbox) if bbox else None),
        json.dumps(params or {}),
        "queued",
        datetime.now(timezone.utc),
    )


async def fetch_runs(conn, limit: int = 50):
    return await conn.fetch(
        """
        SELECT run_id, status, pipeline, run_type, created_at, started_at, finished_at, source, track
        FROM ml_runs
        ORDER BY created_at DESC
        LIMIT $1
        """,
        limit,
    )


async def fetch_run_detail(conn, run_id: str):
    run = await conn.fetchrow(
        """
        SELECT run_id, status, pipeline, run_type, created_at, started_at, finished_at,
               source, track, params, mlflow_run_id, error
        FROM ml_runs
        WHERE run_id = $1
        """,
        run_id,
    )
    if not run:
        return None
    metrics = await conn.fetch(
        """
        SELECT metric, value
        FROM ml_run_metrics
        WHERE run_id = $1
        """,
        run_id,
    )
    return run, metrics
