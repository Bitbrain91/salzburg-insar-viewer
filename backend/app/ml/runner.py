from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict

import asyncpg
import mlflow

from .registry import get_pipeline
from .types import RunConfig
from .colors import assign_building_colors

logger = logging.getLogger(__name__)

async def _update_run_status(conn, run_id: str, status: str, **fields) -> None:
    assignments = ["status = $2"]
    values = [run_id, status]
    idx = 3
    for key, value in fields.items():
        assignments.append(f"{key} = ${idx}")
        values.append(value)
        idx += 1
    query = f"UPDATE ml_runs SET {', '.join(assignments)} WHERE run_id = $1"
    await conn.execute(query, *values)


async def _upsert_metric(conn, run_id: str, metric: str, value: float, meta: dict | None = None):
    await conn.execute(
        """
        INSERT INTO ml_run_metrics (run_id, metric, value, meta)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (run_id, metric)
        DO UPDATE SET value = EXCLUDED.value, meta = EXCLUDED.meta
        """,
        run_id,
        metric,
        value,
        json.dumps(meta or {}),
    )


async def run_pipeline_async(
    config: RunConfig,
    db_dsn: str,
    mlflow_tracking_uri: str,
    mlflow_experiment: str,
) -> Dict[str, Any]:
    pipeline = get_pipeline(config.pipeline)
    pool = await asyncpg.create_pool(dsn=db_dsn, min_size=1, max_size=4)
    try:
        async with pool.acquire() as conn:
            await _update_run_status(conn, config.run_id, "running", started_at=datetime.now(timezone.utc))

        mlflow_ok = True
        try:
            mlflow.set_tracking_uri(mlflow_tracking_uri)
            mlflow.set_experiment(mlflow_experiment)
        except Exception as exc:  # pylint: disable=broad-except
            mlflow_ok = False
            metrics: Dict[str, Any] = {}
            logger.warning("MLflow disabled for this run: %s", exc)

        metrics: Dict[str, Any] = {}
        if mlflow_ok:
            mlflow.end_run()
            with mlflow.start_run(run_name=config.run_id) as run:
                mlflow_run_id = run.info.run_id
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE ml_runs SET mlflow_run_id = $2 WHERE run_id = $1",
                        config.run_id,
                        mlflow_run_id,
                    )

                mlflow.log_params(
                    {
                        "pipeline": config.pipeline,
                        "pipeline_version": pipeline.version,
                        "source": config.source or "",
                        "track": config.track if config.track is not None else "",
                        "bbox": ",".join(map(str, config.bbox)) if config.bbox else "",
                        **(config.params or {}),
                    }
                )

                metrics = await pipeline.run(pool, config)

                if pipeline.run_type in {"assignment", "hybrid"}:
                    try:
                        await assign_building_colors(pool, config.run_id)
                    except Exception:  # pylint: disable=broad-except
                        mlflow.log_param("coloring_status", "failed")

                for key, value in metrics.items():
                    if isinstance(value, (int, float)):
                        mlflow.log_metric(key, float(value))
                        async with pool.acquire() as conn:
                            await _upsert_metric(conn, config.run_id, key, float(value))

                summary = {
                    "run_id": config.run_id,
                    "pipeline": config.pipeline,
                    "version": pipeline.version,
                    "metrics": metrics,
                }
                with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
                    json.dump(summary, tmp, indent=2)
                    tmp_path = tmp.name
                mlflow.log_artifact(tmp_path, artifact_path="summary")
                os.unlink(tmp_path)
        else:
            metrics = await pipeline.run(pool, config)

            if pipeline.run_type in {"assignment", "hybrid"}:
                await assign_building_colors(pool, config.run_id)

            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    async with pool.acquire() as conn:
                        await _upsert_metric(conn, config.run_id, key, float(value))

        async with pool.acquire() as conn:
            await _update_run_status(
                conn,
                config.run_id,
                "succeeded",
                finished_at=datetime.now(timezone.utc),
            )

        return metrics
    except Exception as exc:  # pylint: disable=broad-except
        async with pool.acquire() as conn:
            await _update_run_status(
                conn,
                config.run_id,
                "failed",
                finished_at=datetime.now(timezone.utc),
                error=str(exc),
            )
        raise
    finally:
        try:
            mlflow.end_run()
        except Exception:  # pylint: disable=broad-except
            pass
        await pool.close()
