from __future__ import annotations

import asyncio
import logging
from uuid import uuid4

from datetime import datetime, timezone

import mlflow
from fastapi import APIRouter, HTTPException, Query, Request, Response

from ..config import settings
from ..db import fetch_one
from ..schemas import MLRunCreate, MLRunDeleteResponse, MLRunDetail, MLRunSummary
from ..ml.colors import assign_building_colors
from ..ml.registry import get_pipeline, list_pipelines
from ..ml.runner import run_pipeline_async
from ..ml.store import create_run_record, fetch_run_detail, fetch_runs
from ..ml.types import RunConfig

router = APIRouter(prefix="/api/ml", tags=["ml"])
logger = logging.getLogger(__name__)


def _log_task_result(task: asyncio.Task) -> None:
    try:
        task.result()
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("ML pipeline task failed: %s", exc)
@router.get("/pipelines")
async def pipelines() -> dict:
    return {"pipelines": list_pipelines()}


@router.post("/runs", response_model=MLRunSummary)
async def create_run(request: Request, payload: MLRunCreate):
    try:
        pipeline = get_pipeline(payload.pipeline)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    run_id = str(uuid4())
    bbox = tuple(payload.bbox) if payload.bbox else None

    config = RunConfig(
        run_id=run_id,
        pipeline=payload.pipeline,
        source=payload.source,
        track=payload.track,
        bbox=bbox,
        params=payload.params or {},
    )

    async with request.app.state.db_pool.acquire() as conn:
        await create_run_record(
            conn,
            run_id,
            payload.pipeline,
            pipeline.version,
            pipeline.run_type,
            payload.source,
            payload.track,
            bbox,
            payload.params or {},
        )

    task = asyncio.create_task(
        run_pipeline_async(
            config,
            settings.db_dsn,
            settings.mlflow_tracking_uri,
            settings.mlflow_experiment,
        )
    )
    task.add_done_callback(_log_task_result)

    return MLRunSummary(
        run_id=run_id,
        status="queued",
        pipeline=payload.pipeline,
        run_type=pipeline.run_type,
        created_at=datetime.now(timezone.utc),
        started_at=None,
        finished_at=None,
        source=payload.source,
        track=payload.track,
    )


@router.get("/runs", response_model=list[MLRunSummary])
async def list_runs(request: Request):
    async with request.app.state.db_pool.acquire() as conn:
        rows = await fetch_runs(conn)
    return [
        MLRunSummary(
            run_id=str(r["run_id"]),
            status=r["status"],
            pipeline=r["pipeline"],
            run_type=r["run_type"],
            created_at=r["created_at"],
            started_at=r["started_at"],
            finished_at=r["finished_at"],
            source=r["source"],
            track=r["track"],
        )
        for r in rows
    ]


@router.get("/runs/{run_id}", response_model=MLRunDetail)
async def run_detail(request: Request, run_id: str):
    async with request.app.state.db_pool.acquire() as conn:
        result = await fetch_run_detail(conn, run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Run not found")
    run, metrics_rows = result
    metrics = {m["metric"]: m["value"] for m in metrics_rows}
    return MLRunDetail(
        run_id=str(run["run_id"]),
        status=run["status"],
        pipeline=run["pipeline"],
        run_type=run["run_type"],
        created_at=run["created_at"],
        started_at=run["started_at"],
        finished_at=run["finished_at"],
        source=run["source"],
        track=run["track"],
        params=run["params"] or {},
        mlflow_run_id=run["mlflow_run_id"],
        metrics=metrics,
        error=run["error"],
    )


@router.post("/runs/{run_id}/recolor")
async def recolor_run(request: Request, run_id: str):
    async with request.app.state.db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT run_id FROM ml_runs WHERE run_id = $1", run_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Run not found")
    count = await assign_building_colors(request.app.state.db_pool, run_id)
    return {"run_id": run_id, "building_colors": count}


@router.get("/runs/{run_id}/tiles/{z}/{x}/{y}.pbf")
async def ml_tiles(request: Request, run_id: str, z: int, x: int, y: int) -> Response:
    query = """
        WITH bounds AS (
            SELECT ST_TileEnvelope($1, $2, $3) AS geom
        ),
        mvtgeom AS (
            SELECT
                r.code,
                r.track,
                r.cluster_id,
                r.building_source,
                r.building_id,
                r.distance_m,
                r.score,
                p.velocity,
                p.coherence,
                (r.meta->>'method') AS method,
                (r.building_id IS NOT NULL) AS assigned,
                abs(hashtext(coalesce(r.cluster_id, r.code))) % 60 AS cluster_color_index,
                COALESCE(c.color_index, abs(hashtext(coalesce(r.building_id, r.code))) % 60) AS building_color_index,
                ST_AsMVTGeom(ST_Transform(p.geom, 3857), bounds.geom, 4096, 64, true) AS geom
            FROM ml_point_results r
            JOIN insar_points p ON p.code = r.code AND p.track = r.track
            LEFT JOIN ml_building_colors c
              ON c.run_id = r.run_id
             AND c.building_source = r.building_source
             AND c.building_id = r.building_id
            JOIN bounds ON ST_Intersects(ST_Transform(p.geom, 3857), bounds.geom)
            WHERE r.run_id = $4::uuid
        )
        SELECT ST_AsMVT(mvtgeom, 'ml_points', 4096, 'geom') AS mvt
        FROM mvtgeom
    """
    row = await fetch_one(request.app, query, z, x, y, run_id)
    if row is None or row["mvt"] is None:
        raise HTTPException(status_code=404, detail="Tile not found")

    return Response(
        content=row["mvt"],
        headers={
            "Content-Type": "application/x-protobuf",
            "Cache-Control": "no-store",
        },
    )


@router.get("/runs/{run_id}/buildings/{z}/{x}/{y}.pbf")
async def ml_buildings_tiles(request: Request, run_id: str, z: int, x: int, y: int) -> Response:
    query = """
        WITH bounds AS (
            SELECT ST_TileEnvelope($1, $2, $3) AS geom
        ),
        assigned_buildings AS (
            SELECT DISTINCT building_source, building_id
            FROM ml_point_results
            WHERE run_id = $4::uuid AND building_id IS NOT NULL
        ),
        gba AS (
            SELECT b.gba_id::text AS building_id,
                   'gba'::text AS building_source,
                   b.geom,
                   b.height AS height_m
            FROM gba_buildings b
            JOIN assigned_buildings ab
              ON ab.building_source = 'gba' AND ab.building_id = b.gba_id::text
        ),
        osm AS (
            SELECT b.osm_id::text AS building_id,
                   'osm'::text AS building_source,
                   b.geom,
                   NULL::double precision AS height_m
            FROM osm_buildings b
            JOIN assigned_buildings ab
              ON ab.building_source = 'osm' AND ab.building_id = b.osm_id::text
        ),
        all_buildings AS (
            SELECT * FROM gba
            UNION ALL
            SELECT * FROM osm
        ),
        mvtgeom AS (
            SELECT
                all_buildings.building_id,
                all_buildings.building_source,
                height_m,
                COALESCE(
                    c.color_index,
                    abs(hashtext(all_buildings.building_id)) % 60
                ) AS building_color_index,
                ST_AsMVTGeom(
                    ST_Transform(all_buildings.geom, 3857),
                    bounds.geom,
                    4096,
                    64,
                    true
                ) AS geom
            FROM all_buildings
            LEFT JOIN ml_building_colors c
              ON c.run_id = $4::uuid
             AND c.building_source = all_buildings.building_source
             AND c.building_id = all_buildings.building_id
            JOIN bounds ON ST_Intersects(ST_Transform(all_buildings.geom, 3857), bounds.geom)
        )
        SELECT ST_AsMVT(mvtgeom, 'ml_buildings', 4096, 'geom') AS mvt
        FROM mvtgeom
    """
    row = await fetch_one(request.app, query, z, x, y, run_id)
    if row is None or row["mvt"] is None:
        raise HTTPException(status_code=404, detail="Tile not found")

    return Response(
        content=row["mvt"],
        headers={
            "Content-Type": "application/x-protobuf",
            "Cache-Control": "no-store",
        },
    )


@router.delete("/runs/{run_id}", response_model=MLRunDeleteResponse)
async def delete_run(
    request: Request,
    run_id: str,
    force: bool = Query(default=False, description="Force DB delete even if MLflow fails"),
):
    async with request.app.state.db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT run_id, mlflow_run_id FROM ml_runs WHERE run_id = $1",
            run_id,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Run not found")

    mlflow_deleted = False
    mlflow_error = None
    if row["mlflow_run_id"]:
        try:
            mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
            client = mlflow.tracking.MlflowClient()
            client.delete_run(row["mlflow_run_id"])
            mlflow_deleted = True
        except Exception as exc:  # pylint: disable=broad-except
            mlflow_error = str(exc)
            if not force:
                raise HTTPException(status_code=502, detail=f"MLflow delete failed: {mlflow_error}")

    async with request.app.state.db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM ml_point_results WHERE run_id = $1", run_id)
            await conn.execute("DELETE FROM ml_run_metrics WHERE run_id = $1", run_id)
            await conn.execute("DELETE FROM ml_runs WHERE run_id = $1", run_id)

    return MLRunDeleteResponse(
        run_id=run_id,
        db_deleted=True,
        mlflow_deleted=mlflow_deleted,
        mlflow_error=mlflow_error,
    )
