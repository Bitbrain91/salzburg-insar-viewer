from __future__ import annotations

import json
from datetime import datetime, timezone


async def create_run_record(
    conn,
    run_id: str,
    pipeline: str,
    pipeline_version: str,
    run_type: str,
    area_id: str,
    dataset_id: str,
    source: str | None,
    track: int | None,
    bbox: tuple[float, float, float, float] | None,
    params: dict,
) -> None:
    await conn.execute(
        """
        INSERT INTO ml_runs (
            run_id, pipeline, pipeline_version, run_type, area_id, dataset_id, source, track,
            bbox, params, status, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)
        """,
        run_id,
        pipeline,
        pipeline_version,
        run_type,
        area_id,
        dataset_id,
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
        SELECT run_id, status, pipeline, run_type, created_at, started_at, finished_at,
               area_id, dataset_id, source, track
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
               area_id, dataset_id, source, track, params, mlflow_run_id, error
        FROM ml_runs
        WHERE run_id = $1
        """,
        run_id,
    )
    if not run:
        return None
    params = run["params"]
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except json.JSONDecodeError:
            params = {}
    run = dict(run)
    run["params"] = params
    metrics = await conn.fetch(
        """
        SELECT metric, value
        FROM ml_run_metrics
        WHERE run_id = $1
        """,
        run_id,
    )
    return run, metrics


async def fail_incomplete_runs(
    conn,
    *,
    finished_at: datetime | None = None,
    error_message: str | None = None,
):
    finished_at = finished_at or datetime.now(timezone.utc)
    error_message = (
        error_message
        or "Run marked failed on startup because the backend process restarted before completion."
    )
    return await conn.fetch(
        """
        UPDATE ml_runs
        SET status = 'failed',
            finished_at = COALESCE(finished_at, $1),
            error = COALESCE(error, $2)
        WHERE status IN ('queued', 'running')
        RETURNING run_id, pipeline, status, started_at, finished_at, mlflow_run_id
        """,
        finished_at,
        error_message,
    )
