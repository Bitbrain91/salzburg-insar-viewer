from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import mlflow
import numpy as np
from fastapi import APIRouter, HTTPException, Query, Request, Response

from ..config import settings
from ..db import fetch_one
from ..schemas import (
    GeoJsonFeature,
    MLBuildingAnalysis,
    MLBuildingClusterSummary,
    MLBuildingPointSummary,
    MLBuildingVisualizationContextResponse,
    MLBuildingVisualizationPointsResponse,
    MLPointAnalysis,
    MLPointAnalysisResponse,
    MLRunCreate,
    MLRunDeleteResponse,
    MLRunDetail,
    MLRunSummary,
)
from ..ml.colors import assign_building_colors
from ..ml.rollups import (
    building_rollup_from_meta,
    cluster_rollup_from_meta,
    nested_bool as _nested_bool,
    nested_dict as _nested_dict,
    nested_float as _nested_float,
    nested_int as _nested_int,
    nested_list as _nested_list,
    nested_object_list as _nested_object_list,
    nested_str as _nested_str,
    parse_meta as _parse_meta,
    track_motion_map,
)
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


def _count_map(rows, key_field: str = "key") -> dict[str, int]:
    return {str(row[key_field]): int(row["count"]) for row in rows}


def _json_object(value) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _rollup_bool(rollup: dict[str, Any], key: str) -> bool:
    value = _nested_bool({"value": rollup.get(key)}, "value")
    return value if value is not None else False


def _rollup_float(rollup: dict[str, Any], key: str) -> float | None:
    return _nested_float({"value": rollup.get(key)}, "value")


def _rollup_int(rollup: dict[str, Any], key: str, default: int = 0) -> int:
    value = _nested_int({"value": rollup.get(key)}, "value")
    return value if value is not None else default


def _rollup_str(rollup: dict[str, Any], key: str) -> str | None:
    return _nested_str({"value": rollup.get(key)}, "value")


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


@router.get("/runs/{run_id}/points/{code}", response_model=MLPointAnalysisResponse)
async def ml_point_analysis(
    request: Request,
    run_id: str,
    code: str,
    track: int = Query(..., description="Track number for the selected point"),
):
    query = """
        SELECT
            r.run_id,
            m.pipeline,
            m.run_type,
            r.code,
            r.track,
            r.quality_score,
            r.anomaly_score,
            r.cross_track_consistency,
            r.label,
            r.building_source,
            r.building_id,
            r.distance_m,
            r.feature_set_version,
            r.model_set_version,
            r.meta
        FROM ml_point_results r
        JOIN ml_runs m ON m.run_id = r.run_id
        WHERE r.run_id = $1::uuid
          AND r.code = $2
          AND r.track = $3
    """
    row = await fetch_one(request.app, query, run_id, code, track)
    if row is None:
        run = await fetch_one(
            request.app,
            """
            SELECT status
            FROM ml_runs
            WHERE run_id = $1::uuid
            """,
            run_id,
        )
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        if run["status"] in {"queued", "running"}:
            return MLPointAnalysisResponse(
                status="pending",
                message="ML point result is not available yet for this run.",
            )
        return MLPointAnalysisResponse(
            status="missing",
            message="ML point result not found for this point in the selected run.",
        )

    meta = _parse_meta(row.get("meta"))
    cluster_meta = _nested_dict(meta, "cluster")
    visual_meta = _nested_dict(meta, "visual_context")
    explain = [
        {
            "key": item.get("key", "unknown"),
            "severity": float(item.get("severity", 0.0) or 0.0),
            "summary": item.get("summary", ""),
        }
        for item in meta.get("explain_top_features", [])
        if isinstance(item, dict)
    ]

    return MLPointAnalysisResponse(
        status="ready",
        analysis=MLPointAnalysis(
            run_id=str(row["run_id"]),
            pipeline=row["pipeline"],
            run_type=row["run_type"],
            code=row["code"],
            track=row["track"],
            quality_score=row.get("quality_score"),
            anomaly_score=row.get("anomaly_score"),
            cross_track_consistency=row.get("cross_track_consistency"),
            label=row.get("label"),
            building_source=row.get("building_source"),
            building_id=row.get("building_id"),
            distance_m=row.get("distance_m"),
            feature_set_version=row.get("feature_set_version"),
            model_set_version=row.get("model_set_version"),
            detector_scores=meta.get("detector_scores") or {},
            feature_flags=meta.get("feature_flags") or {},
            building_context=meta.get("building_context") or {},
            cross_track_summary=meta.get("cross_track_summary") or {},
            neighbour_context=_nested_dict(meta, "neighbour_context"),
            cluster_role=cluster_meta.get("cluster_role"),
            cluster_probability=_nested_float(meta, "cluster", "cluster_probability"),
            cluster_outlier_score=_nested_float(meta, "cluster", "cluster_outlier_score"),
            gate_excluded=_nested_bool(meta, "visual_context", "gate_excluded"),
            gate_reasons=[
                str(item)
                for item in _nested_list(meta, "visual_context", "gate_reasons")
            ],
            kept_for_scoring=_nested_bool(meta, "visual_context", "kept_for_scoring"),
            explain_top_features=explain,
        ),
    )


@router.get("/runs/{run_id}/buildings/{source}/{building_id}", response_model=MLBuildingAnalysis)
async def ml_building_analysis(
    request: Request,
    run_id: str,
    source: str,
    building_id: str,
):
    if source not in {"gba", "osm"}:
        raise HTTPException(status_code=400, detail="Invalid source")

    async with request.app.state.db_pool.acquire() as conn:
        run = await conn.fetchrow(
            """
            SELECT run_id, pipeline, run_type
            FROM ml_runs
            WHERE run_id = $1
            """,
            run_id,
        )
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")

        rows = await conn.fetch(
            """
            SELECT
                r.code,
                r.track,
                r.cluster_id,
                r.label,
                r.quality_score,
                r.anomaly_score,
                r.cross_track_consistency,
                r.distance_m,
                r.meta
            FROM ml_point_results r
            WHERE r.run_id = $1::uuid
              AND r.building_source = $2
              AND r.building_id = $3
            ORDER BY r.quality_score ASC NULLS LAST, r.anomaly_score DESC NULLS LAST, r.code, r.track
            """,
            run_id,
            source,
            building_id,
        )

    point_count = len(rows)
    track_counts: dict[str, int] = defaultdict(int)
    label_counts: dict[str, int] = defaultdict(int)
    assignment_methods: dict[str, int] = defaultdict(int)
    building_rollup: dict[str, Any] = {}
    cluster_rollups: dict[tuple[int, str], dict[str, Any]] = {}
    kept_point_count = 0
    noise_point_count = 0
    excluded_point_count = 0
    quality_values: list[float] = []
    anomaly_values: list[float] = []
    cross_track_values: list[float] = []
    distance_values: list[float] = []

    for row in rows:
        meta = _parse_meta(row.get("meta"))
        cluster_meta = _nested_dict(meta, "cluster")
        cluster_rollup = cluster_rollup_from_meta(meta)
        current_building_rollup = building_rollup_from_meta(meta)
        visual_meta = _nested_dict(meta, "visual_context")
        building_meta = _nested_dict(meta, "building_context")
        cluster_role = str(cluster_meta.get("cluster_role") or "unknown")
        cluster_id = row.get("cluster_id")
        gate_excluded = bool(visual_meta.get("gate_excluded", False))
        assignment_method = (
            building_meta.get("assignment_method")
            or _nested_dict(meta, "feature_flags").get("assignment_method")
            or "unknown"
        )

        track_counts[str(row["track"])] += 1
        label_counts[str(row.get("label") or "unlabeled")] += 1
        assignment_methods[str(assignment_method)] += 1
        if row.get("quality_score") is not None:
            quality_values.append(float(row["quality_score"]))
        if row.get("anomaly_score") is not None:
            anomaly_values.append(float(row["anomaly_score"]))
        if row.get("cross_track_consistency") is not None:
            cross_track_values.append(float(row["cross_track_consistency"]))
        if row.get("distance_m") is not None:
            distance_values.append(float(row["distance_m"]))

        if gate_excluded:
            excluded_point_count += 1
        else:
            kept_point_count += 1
        if cluster_role == "noise":
            noise_point_count += 1

        if not building_rollup and current_building_rollup:
            building_rollup = current_building_rollup
        if cluster_rollup and cluster_id is not None and cluster_rollup.get("cluster_id") is not None:
            cluster_rollups[(int(row["track"]), str(cluster_id))] = cluster_rollup

    if not building_rollup:
        building_rollup = {
            "building_status": "insufficient_support" if kept_point_count < 3 else None,
            "building_motion_mm_a": None,
            "building_reliability_score": None,
            "building_reliability_band": None,
            "track_agreement_score": float(np.mean(cross_track_values)) if cross_track_values else None,
            "weak_secondary_track_flag": False,
            "agreement_tension_flag": False,
            "reliability_penalties": [],
            "differential_motion_flag": False,
            "main_cluster_track_44_id": None,
            "main_cluster_track_95_id": None,
            "neighbour_context_available": False,
            "neighbour_candidate_building_count": 0,
            "neighbour_misassignment_point_count": 0,
            "neighbour_misassignment_share": None,
            "neighbour_event_flag": False,
            "neighbour_event_score": None,
            "neighbour_consistency_score": None,
            "supporting_neighbour_count": 0,
            "supporting_track_count": 0,
            "track_motion_mm_a": {},
            "cluster_count": len(cluster_rollups),
            "reliable_cluster_count": 0,
            "point_count": point_count,
            "kept_point_count": kept_point_count,
            "noise_point_count": noise_point_count,
            "excluded_point_count": excluded_point_count,
        }

    return MLBuildingAnalysis(
        run_id=str(run["run_id"]),
        pipeline=run["pipeline"],
        run_type=run["run_type"],
        building_source=source,
        building_id=building_id,
        point_count=point_count,
        kept_point_count=int(building_rollup.get("kept_point_count", kept_point_count) or 0),
        noise_point_count=int(building_rollup.get("noise_point_count", noise_point_count) or 0),
        excluded_point_count=int(building_rollup.get("excluded_point_count", excluded_point_count) or 0),
        cluster_count=int(building_rollup.get("cluster_count", len(cluster_rollups)) or 0),
        reliable_cluster_count=int(building_rollup.get("reliable_cluster_count", 0) or 0),
        building_motion_mm_a=_rollup_float(building_rollup, "building_motion_mm_a"),
        building_reliability_score=_rollup_float(building_rollup, "building_reliability_score"),
        building_reliability_band=_rollup_str(building_rollup, "building_reliability_band"),
        track_agreement_score=_rollup_float(building_rollup, "track_agreement_score"),
        weak_secondary_track_flag=_rollup_bool(building_rollup, "weak_secondary_track_flag"),
        agreement_tension_flag=_rollup_bool(building_rollup, "agreement_tension_flag"),
        reliability_penalties=_nested_object_list(
            {"value": building_rollup.get("reliability_penalties")},
            "value",
        ),
        differential_motion_flag=_rollup_bool(building_rollup, "differential_motion_flag"),
        building_status=_rollup_str(building_rollup, "building_status"),
        main_cluster_track_44_id=_rollup_str(building_rollup, "main_cluster_track_44_id"),
        main_cluster_track_95_id=_rollup_str(building_rollup, "main_cluster_track_95_id"),
        neighbour_context_available=_rollup_bool(building_rollup, "neighbour_context_available"),
        neighbour_candidate_building_count=_rollup_int(
            building_rollup,
            "neighbour_candidate_building_count",
        ),
        neighbour_misassignment_point_count=_rollup_int(
            building_rollup,
            "neighbour_misassignment_point_count",
        ),
        neighbour_misassignment_share=_rollup_float(
            building_rollup,
            "neighbour_misassignment_share",
        ),
        neighbour_event_flag=_rollup_bool(building_rollup, "neighbour_event_flag"),
        neighbour_event_score=_rollup_float(building_rollup, "neighbour_event_score"),
        neighbour_consistency_score=_rollup_float(
            building_rollup,
            "neighbour_consistency_score",
        ),
        supporting_neighbour_count=_rollup_int(building_rollup, "supporting_neighbour_count"),
        supporting_track_count=_rollup_int(building_rollup, "supporting_track_count"),
        track_motion_mm_a=track_motion_map(building_rollup.get("track_motion_mm_a")),
        track_counts=dict(track_counts),
        label_counts=dict(label_counts),
        assignment_methods=dict(assignment_methods),
        avg_quality_score=float(np.mean(quality_values)) if quality_values else None,
        avg_anomaly_score=float(np.mean(anomaly_values)) if anomaly_values else None,
        avg_cross_track_consistency=float(np.mean(cross_track_values)) if cross_track_values else None,
        median_distance_m=float(np.median(distance_values)) if distance_values else None,
        clusters=[
            MLBuildingClusterSummary(
                cluster_id=str(values["cluster_id"]),
                building_source=str(values.get("building_source") or source),
                building_id=str(values.get("building_id") or building_id),
                track=int(values["track"]),
                cluster_role=str(values.get("cluster_role") or "unknown"),
                is_main_cluster=bool(values.get("is_main_cluster", False)),
                cluster_rank=_nested_int({"value": values.get("cluster_rank")}, "value"),
                point_count=int(values["point_count"]),
                median_velocity_mm_a=_nested_float(
                    {"value": values.get("median_velocity_mm_a")},
                    "value",
                ),
                median_vertical_proxy_mm_a=_nested_float(
                    {"value": values.get("median_vertical_proxy_mm_a")},
                    "value",
                ),
                median_coherence=_nested_float({"value": values.get("median_coherence")}, "value"),
                median_height_rank=_nested_float(
                    {"value": values.get("median_height_rank")},
                    "value",
                ),
                cluster_reliability_score=_nested_float(
                    {"value": values.get("cluster_reliability_score")},
                    "value",
                ),
                motion_delta_to_main_mm_a=_nested_float(
                    {"value": values.get("motion_delta_to_main_mm_a")},
                    "value",
                ),
                cluster_centroid_x_m=_rollup_float(values, "cluster_centroid_x_m"),
                cluster_centroid_y_m=_rollup_float(values, "cluster_centroid_y_m"),
                neighbour_candidate_building_count=_rollup_int(
                    values,
                    "neighbour_candidate_building_count",
                ),
                best_neighbour_building_id=_rollup_str(values, "best_neighbour_building_id"),
                best_neighbour_cluster_id=_rollup_str(values, "best_neighbour_cluster_id"),
                best_neighbour_consistency_score=_rollup_float(
                    values,
                    "best_neighbour_consistency_score",
                ),
                supporting_neighbour_building_count=_rollup_int(
                    values,
                    "supporting_neighbour_building_count",
                ),
                neighbour_event_candidate_flag=_rollup_bool(
                    values,
                    "neighbour_event_candidate_flag",
                ),
            )
            for _, values in sorted(
                cluster_rollups.items(),
                key=lambda item: (
                    int(item[1].get("cluster_rank") or 999),
                    int(item[1].get("track") or 0),
                    str(item[1].get("cluster_id") or ""),
                ),
            )
        ],
        top_points=[
            MLBuildingPointSummary(
                code=row["code"],
                track=row["track"],
                cluster_id=row.get("cluster_id"),
                cluster_role=_nested_dict(_parse_meta(row.get("meta")), "cluster").get("cluster_role"),
                label=row["label"],
                quality_score=row["quality_score"],
                anomaly_score=row["anomaly_score"],
                cross_track_consistency=row["cross_track_consistency"],
                distance_m=row["distance_m"],
                gate_excluded=_nested_bool(_parse_meta(row.get("meta")), "visual_context", "gate_excluded"),
            )
            for row in rows[:8]
        ],
    )


@router.get(
    "/runs/{run_id}/buildings/{source}/{building_id}/points",
    response_model=MLBuildingVisualizationPointsResponse,
)
async def ml_building_points_visualization(
    request: Request,
    run_id: str,
    source: str,
    building_id: str,
):
    if source not in {"gba", "osm"}:
        raise HTTPException(status_code=400, detail="Invalid source")

    async with request.app.state.db_pool.acquire() as conn:
        run = await conn.fetchrow(
            """
            SELECT run_id, pipeline, run_type
            FROM ml_runs
            WHERE run_id = $1
            """,
            run_id,
        )
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")

        rows = await conn.fetch(
            """
            SELECT
                r.code,
                r.track,
                r.cluster_id,
                r.label,
                r.anomaly_score,
                r.quality_score,
                r.cross_track_consistency,
                r.distance_m,
                r.meta,
                abs(hashtext(coalesce(r.cluster_id, r.code))) % 60 AS cluster_color_index,
                ST_AsGeoJSON(p.geom)::jsonb AS geometry
            FROM ml_point_results r
            JOIN insar_points p
              ON p.code = r.code AND p.track = r.track
            WHERE r.run_id = $1::uuid
              AND r.building_source = $2
              AND r.building_id = $3
            ORDER BY r.track, r.code
            """,
            run_id,
            source,
            building_id,
        )

    features = []
    for row in rows:
        meta = _parse_meta(row.get("meta"))
        cluster_meta = _nested_dict(meta, "cluster")
        cluster_rollup = cluster_rollup_from_meta(meta)
        building_rollup = building_rollup_from_meta(meta)
        visual_meta = _nested_dict(meta, "visual_context")
        building_meta = _nested_dict(meta, "building_context")
        cross_meta = _nested_dict(meta, "cross_track_summary")
        neighbour_context = _nested_dict(meta, "neighbour_context")
        features.append(
            GeoJsonFeature(
                geometry=_json_object(row["geometry"]),
                properties={
                    "code": row["code"],
                    "track": row["track"],
                    "cluster_id": row.get("cluster_id"),
                    "cluster_role": cluster_meta.get("cluster_role"),
                    "cluster_probability": _nested_float(meta, "cluster", "cluster_probability"),
                    "cluster_outlier_score": _nested_float(meta, "cluster", "cluster_outlier_score"),
                    "is_main_cluster": bool(cluster_rollup.get("is_main_cluster", False)),
                    "cluster_rank": cluster_rollup.get("cluster_rank"),
                    "cluster_color_index": int(row["cluster_color_index"]),
                    "label": row.get("label"),
                    "anomaly_score": row.get("anomaly_score"),
                    "quality_score": row.get("quality_score"),
                    "cross_track_consistency": row.get("cross_track_consistency"),
                    "assignment_method": building_meta.get("assignment_method") or visual_meta.get("assignment_method"),
                    "distance_m": row.get("distance_m"),
                    "kept_for_scoring": bool(visual_meta.get("kept_for_scoring", False)),
                    "gate_excluded": bool(visual_meta.get("gate_excluded", False)),
                    "gate_reasons": [
                        str(item) for item in _nested_list(meta, "visual_context", "gate_reasons")
                    ],
                    "small_n_fallback": bool(cluster_meta.get("small_n_fallback", False)),
                    "range_offset_m": building_meta.get("range_offset_m"),
                    "buffer_m": building_meta.get("buffer_m"),
                    "along_look_offset_m": building_meta.get("along_look_offset_m"),
                    "cross_look_offset_m": building_meta.get("cross_look_offset_m"),
                    "height_rank_in_building": building_meta.get("height_rank_in_building"),
                    "building_motion_mm_a": building_rollup.get("building_motion_mm_a"),
                    "building_reliability_score": building_rollup.get("building_reliability_score"),
                    "building_reliability_band": building_rollup.get("building_reliability_band"),
                    "weak_secondary_track_flag": _rollup_bool(
                        building_rollup,
                        "weak_secondary_track_flag",
                    ),
                    "agreement_tension_flag": _rollup_bool(
                        building_rollup,
                        "agreement_tension_flag",
                    ),
                    "reliability_penalties": _nested_object_list(
                        {"value": building_rollup.get("reliability_penalties")},
                        "value",
                    ),
                    "differential_motion_flag": bool(
                        building_rollup.get("differential_motion_flag", False)
                    ),
                    "allowed_diff_mm_a": cross_meta.get("allowed_diff_mm_a"),
                    "context_available": _rollup_bool(neighbour_context, "context_available"),
                    "candidate_neighbour_count": _rollup_int(
                        neighbour_context,
                        "candidate_neighbour_count",
                    ),
                    "eligible_neighbour_cluster_count": _rollup_int(
                        neighbour_context,
                        "eligible_neighbour_cluster_count",
                    ),
                    "best_neighbour_building_id": _rollup_str(
                        neighbour_context,
                        "best_neighbour_building_id",
                    ),
                    "best_neighbour_cluster_id": _rollup_str(
                        neighbour_context,
                        "best_neighbour_cluster_id",
                    ),
                    "own_cluster_fit_score": _rollup_float(
                        neighbour_context,
                        "own_cluster_fit_score",
                    ),
                    "neighbour_fit_score": _rollup_float(
                        neighbour_context,
                        "neighbour_fit_score",
                    ),
                    "neighbour_fit_delta": _rollup_float(
                        neighbour_context,
                        "neighbour_fit_delta",
                    ),
                    "own_fit_weak_flag": _rollup_bool(neighbour_context, "own_fit_weak_flag"),
                    "neighbour_misassignment_flag": _rollup_bool(
                        neighbour_context,
                        "neighbour_misassignment_flag",
                    ),
                    "neighbour_event_score": _rollup_float(
                        neighbour_context,
                        "neighbour_event_score",
                    ),
                    "neighbour_event_flag": _rollup_bool(
                        neighbour_context,
                        "neighbour_event_flag",
                    ),
                    "supporting_neighbour_count": _rollup_int(
                        neighbour_context,
                        "supporting_neighbour_count",
                    ),
                },
            )
        )

    return MLBuildingVisualizationPointsResponse(
        run_id=str(run["run_id"]),
        pipeline=run["pipeline"],
        run_type=run["run_type"],
        building_source=source,
        building_id=building_id,
        point_count=len(features),
        feature_collection={"type": "FeatureCollection", "features": features},
    )


@router.get(
    "/runs/{run_id}/buildings/{source}/{building_id}/context",
    response_model=MLBuildingVisualizationContextResponse,
)
async def ml_building_context_visualization(
    request: Request,
    run_id: str,
    source: str,
    building_id: str,
):
    if source not in {"gba", "osm"}:
        raise HTTPException(status_code=400, detail="Invalid source")

    async with request.app.state.db_pool.acquire() as conn:
        run = await conn.fetchrow(
            """
            SELECT run_id, pipeline, run_type, params
            FROM ml_runs
            WHERE run_id = $1
            """,
            run_id,
        )
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")

        params = _parse_meta(run.get("params"))
        default_incidence = float(params.get("default_incidence_angle_deg", 38.5) or 38.5)
        min_buffer_m = float(params.get("min_buffer_m", 3.0) or 3.0)
        max_buffer_m = float(params.get("max_buffer_m", 30.0) or 30.0)
        default_height_m = float(params.get("default_height_m", 12.0) or 12.0)
        buffer_multiplier = float(params.get("buffer_multiplier", 1.0) or 1.0)
        lateral_slack_m = float(params.get("lateral_slack_m", 2.0) or 2.0)

        if source == "gba":
            building_row = await conn.fetchrow(
                """
                SELECT
                    gba_id::text AS building_id,
                    height,
                    ST_AsGeoJSON(geom)::jsonb AS geometry,
                    ARRAY[ST_XMin(geom), ST_YMin(geom), ST_XMax(geom), ST_YMax(geom)] AS bounds
                FROM gba_buildings
                WHERE gba_id::text = $1
                """,
                building_id,
            )
        else:
            building_row = await conn.fetchrow(
                """
                SELECT
                    osm_id::text AS building_id,
                    NULL::double precision AS height,
                    ST_AsGeoJSON(geom)::jsonb AS geometry,
                    ARRAY[ST_XMin(geom), ST_YMin(geom), ST_XMax(geom), ST_YMax(geom)] AS bounds
                FROM osm_buildings
                WHERE osm_id::text = $1
                """,
                building_id,
            )
        if building_row is None:
            raise HTTPException(status_code=404, detail="Building not found")

        candidate_rows = []
        if source == "gba":
            candidate_rows = await conn.fetch(
                """
                WITH building AS (
                    SELECT
                        gba_id::text AS building_id,
                        height AS building_height,
                        ST_Transform(geom, 32633) AS geom_utm
                    FROM gba_buildings
                    WHERE gba_id::text = $1
                ),
                track_settings AS (
                    SELECT
                        44 AS track,
                        COALESCE(
                            (
                                SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY p.incidence_angle)
                                FROM ml_point_results r
                                JOIN insar_points p ON p.code = r.code AND p.track = r.track
                                WHERE r.run_id = $2::uuid
                                  AND r.building_source = $3
                                  AND r.building_id = $1
                                  AND r.track = 44
                                  AND p.incidence_angle IS NOT NULL
                            ),
                            $4::double precision
                        ) AS incidence_angle
                    UNION ALL
                    SELECT
                        95 AS track,
                        COALESCE(
                            (
                                SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY p.incidence_angle)
                                FROM ml_point_results r
                                JOIN insar_points p ON p.code = r.code AND p.track = r.track
                                WHERE r.run_id = $2::uuid
                                  AND r.building_source = $3
                                  AND r.building_id = $1
                                  AND r.track = 95
                                  AND p.incidence_angle IS NOT NULL
                            ),
                            $4::double precision
                        ) AS incidence_angle
                ),
                candidate AS (
                    SELECT
                        track,
                        incidence_angle,
                        GREATEST(
                            $5::double precision,
                            LEAST(
                                $6::double precision,
                                COALESCE(building_height, $7::double precision)
                                * tan(radians(incidence_angle))
                                * $8::double precision
                            )
                        ) AS range_offset_m,
                        geom_utm
                    FROM building
                    CROSS JOIN track_settings
                )
                SELECT
                    track,
                    incidence_angle,
                    range_offset_m,
                    ST_AsGeoJSON(
                        ST_Transform(
                            ST_Buffer(
                                ST_Union(
                                    geom_utm,
                                    ST_Translate(
                                    geom_utm,
                                        CASE WHEN track = 44 THEN -range_offset_m ELSE range_offset_m END,
                                        0.0
                                    )
                                ),
                                $9::double precision
                            ),
                            4326
                        )
                    )::jsonb AS geometry
                FROM candidate
                ORDER BY track
                """,
                building_id,
                run_id,
                source,
                default_incidence,
                min_buffer_m,
                max_buffer_m,
                default_height_m,
                buffer_multiplier,
                lateral_slack_m,
            )

        hull_rows = await conn.fetch(
            """
            SELECT
                r.cluster_id,
                r.track,
                COUNT(*)::integer AS point_count,
                abs(hashtext(r.cluster_id)) % 60 AS cluster_color_index,
                ST_AsGeoJSON(ST_ConvexHull(ST_Collect(p.geom)))::jsonb AS geometry
            FROM ml_point_results r
            JOIN insar_points p
              ON p.code = r.code AND p.track = r.track
            WHERE r.run_id = $1::uuid
              AND r.building_source = $2
              AND r.building_id = $3
              AND COALESCE(r.meta->'cluster'->>'cluster_role', '') = 'core'
              AND COALESCE(r.meta->'visual_context'->>'gate_excluded', 'false') = 'false'
            GROUP BY r.cluster_id, r.track
            ORDER BY point_count DESC, r.cluster_id
            """,
            run_id,
            source,
            building_id,
        )

        summary_row = await conn.fetchrow(
            """
            SELECT meta
            FROM ml_point_results
            WHERE run_id = $1::uuid
              AND building_source = $2
              AND building_id = $3
            ORDER BY
              COALESCE((meta->'cluster_rollup'->>'cluster_rank')::integer, 999),
              track,
              code
            LIMIT 1
            """,
            run_id,
            source,
            building_id,
        )

    candidate_features = [
        GeoJsonFeature(
            geometry=_json_object(row["geometry"]),
            properties={
                "track": row["track"],
                "incidence_angle_deg": row["incidence_angle"],
                "range_offset_m": row["range_offset_m"],
            },
        )
        for row in candidate_rows
    ]
    hull_features = [
        GeoJsonFeature(
            geometry=_json_object(row["geometry"]),
            properties={
                "cluster_id": row["cluster_id"],
                "track": row["track"],
                "point_count": row["point_count"],
                "cluster_color_index": int(row["cluster_color_index"]),
            },
        )
        for row in hull_rows
    ]

    summary_rollup = building_rollup_from_meta(_parse_meta(summary_row.get("meta"))) if summary_row else {}
    return MLBuildingVisualizationContextResponse(
        run_id=str(run["run_id"]),
        pipeline=run["pipeline"],
        run_type=run["run_type"],
        building_source=source,
        building_id=building_id,
        bounds=[float(value) for value in (building_row.get("bounds") or [])],
        building=GeoJsonFeature(
            geometry=_json_object(building_row["geometry"]),
            properties={
                "building_id": building_id,
                "building_source": source,
                "height_m": building_row.get("height"),
            },
        ),
        candidate_areas={"type": "FeatureCollection", "features": candidate_features},
        cluster_hulls={"type": "FeatureCollection", "features": hull_features},
        summary={
            "point_count": int(summary_rollup.get("point_count") or 0),
            "kept_point_count": int(summary_rollup.get("kept_point_count") or 0),
            "noise_point_count": int(summary_rollup.get("noise_point_count") or 0),
            "excluded_point_count": int(summary_rollup.get("excluded_point_count") or 0),
            "cluster_count": int(summary_rollup.get("cluster_count") or 0),
            "reliable_cluster_count": int(summary_rollup.get("reliable_cluster_count") or 0),
            "building_motion_mm_a": summary_rollup.get("building_motion_mm_a"),
            "building_reliability_score": summary_rollup.get("building_reliability_score"),
            "building_reliability_band": summary_rollup.get("building_reliability_band"),
            "track_agreement_score": summary_rollup.get("track_agreement_score"),
            "weak_secondary_track_flag": _rollup_bool(summary_rollup, "weak_secondary_track_flag"),
            "agreement_tension_flag": _rollup_bool(summary_rollup, "agreement_tension_flag"),
            "reliability_penalties": _nested_object_list(
                {"value": summary_rollup.get("reliability_penalties")},
                "value",
            ),
            "building_status": summary_rollup.get("building_status"),
            "differential_motion_flag": _rollup_bool(summary_rollup, "differential_motion_flag"),
            "neighbour_context_available": _rollup_bool(
                summary_rollup,
                "neighbour_context_available",
            ),
            "neighbour_candidate_building_count": _rollup_int(
                summary_rollup,
                "neighbour_candidate_building_count",
            ),
            "neighbour_misassignment_point_count": _rollup_int(
                summary_rollup,
                "neighbour_misassignment_point_count",
            ),
            "neighbour_misassignment_share": _rollup_float(
                summary_rollup,
                "neighbour_misassignment_share",
            ),
            "neighbour_event_flag": _rollup_bool(summary_rollup, "neighbour_event_flag"),
            "neighbour_event_score": _rollup_float(summary_rollup, "neighbour_event_score"),
            "neighbour_consistency_score": _rollup_float(
                summary_rollup,
                "neighbour_consistency_score",
            ),
            "supporting_neighbour_count": _rollup_int(
                summary_rollup,
                "supporting_neighbour_count",
            ),
            "supporting_track_count": _rollup_int(summary_rollup, "supporting_track_count"),
        },
    )


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
                r.anomaly_score,
                r.quality_score,
                r.cross_track_consistency,
                r.label,
                r.feature_set_version,
                r.model_set_version,
                p.velocity,
                p.coherence,
                (r.meta->>'method') AS method,
                (r.meta->'feature_flags'->>'height_band') AS height_band,
                (r.meta->'feature_flags'->>'degraded_reason') AS degraded_reason,
                (r.meta->'cluster'->>'cluster_role') AS cluster_role,
                (r.meta->'cluster'->>'cluster_probability')::double precision AS cluster_probability,
                (r.meta->'cluster'->>'cluster_outlier_score')::double precision AS cluster_outlier_score,
                COALESCE((r.meta->'cluster_rollup'->>'is_main_cluster')::boolean, false) AS is_main_cluster,
                (r.meta->'cluster_rollup'->>'cluster_rank')::integer AS cluster_rank,
                COALESCE((r.meta->'visual_context'->>'gate_excluded')::boolean, false) AS gate_excluded,
                COALESCE((r.meta->'visual_context'->>'kept_for_scoring')::boolean, false) AS kept_for_scoring,
                (r.meta->'building_context'->>'track_point_count')::integer AS building_track_point_count,
                (r.meta->'building_context'->>'kept_point_count_track')::integer AS kept_point_count_track,
                (r.meta->'building_context'->>'other_track_point_count')::integer AS other_track_point_count,
                (r.meta->'building_context'->>'step_support')::double precision AS step_support,
                (r.meta->'building_context'->>'building_velocity_robust_z')::double precision AS building_velocity_robust_z,
                (r.meta->'building_rollup'->>'building_motion_mm_a')::double precision AS building_motion_mm_a,
                (r.meta->'building_rollup'->>'building_reliability_score')::double precision AS building_reliability_score,
                (r.meta->'building_rollup'->>'building_reliability_band') AS building_reliability_band,
                COALESCE((r.meta->'building_rollup'->>'weak_secondary_track_flag')::boolean, false)
                    AS weak_secondary_track_flag,
                COALESCE((r.meta->'building_rollup'->>'agreement_tension_flag')::boolean, false)
                    AS agreement_tension_flag,
                COALESCE((r.meta->'building_rollup'->'reliability_penalties')::text, '[]')
                    AS reliability_penalties_json,
                COALESCE((r.meta->'building_rollup'->>'differential_motion_flag')::boolean, false) AS differential_motion_flag,
                (r.meta->'building_rollup'->>'building_status') AS building_status,
                (r.meta->'building_rollup'->>'track_agreement_score')::double precision AS track_agreement_score,
                (r.meta->'building_rollup'->>'cluster_count')::integer AS building_cluster_count,
                (r.meta->'building_rollup'->>'reliable_cluster_count')::integer AS reliable_cluster_count,
                COALESCE((r.meta->'neighbour_context'->>'context_available')::boolean, false)
                    AS neighbour_context_available,
                COALESCE((r.meta->'neighbour_context'->>'neighbour_misassignment_flag')::boolean, false)
                    AS neighbour_misassignment_flag,
                COALESCE((r.meta->'neighbour_context'->>'neighbour_event_flag')::boolean, false)
                    AS neighbour_event_flag,
                (r.meta->'neighbour_context'->>'neighbour_event_score')::double precision
                    AS neighbour_event_score,
                (r.meta->'neighbour_context'->>'supporting_neighbour_count')::integer
                    AS supporting_neighbour_count,
                (r.meta->'explain_top_features'->0->>'summary') AS top_reason,
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
        building_rollups AS (
            SELECT DISTINCT ON (building_source, building_id)
                building_source,
                building_id,
                (meta->'building_rollup'->>'building_motion_mm_a')::double precision AS building_motion_mm_a,
                (meta->'building_rollup'->>'building_reliability_score')::double precision AS building_reliability_score,
                (meta->'building_rollup'->>'building_reliability_band') AS building_reliability_band,
                COALESCE((meta->'building_rollup'->>'weak_secondary_track_flag')::boolean, false)
                    AS weak_secondary_track_flag,
                COALESCE((meta->'building_rollup'->>'agreement_tension_flag')::boolean, false)
                    AS agreement_tension_flag,
                COALESCE((meta->'building_rollup'->'reliability_penalties')::text, '[]')
                    AS reliability_penalties_json,
                COALESCE((meta->'building_rollup'->>'differential_motion_flag')::boolean, false) AS differential_motion_flag,
                (meta->'building_rollup'->>'building_status') AS building_status,
                (meta->'building_rollup'->>'track_agreement_score')::double precision AS track_agreement_score,
                (meta->'building_rollup'->>'cluster_count')::integer AS cluster_count,
                (meta->'building_rollup'->>'reliable_cluster_count')::integer AS reliable_cluster_count,
                (meta->'building_rollup'->>'point_count')::integer AS point_count,
                (meta->'building_rollup'->>'kept_point_count')::integer AS kept_point_count,
                (meta->'building_rollup'->>'noise_point_count')::integer AS noise_point_count,
                (meta->'building_rollup'->>'excluded_point_count')::integer AS excluded_point_count,
                (meta->'building_rollup'->>'main_cluster_track_44_id') AS main_cluster_track_44_id,
                (meta->'building_rollup'->>'main_cluster_track_95_id') AS main_cluster_track_95_id,
                COALESCE((meta->'building_rollup'->>'neighbour_context_available')::boolean, false)
                    AS neighbour_context_available,
                (meta->'building_rollup'->>'neighbour_candidate_building_count')::integer
                    AS neighbour_candidate_building_count,
                (meta->'building_rollup'->>'neighbour_misassignment_point_count')::integer
                    AS neighbour_misassignment_point_count,
                (meta->'building_rollup'->>'neighbour_misassignment_share')::double precision
                    AS neighbour_misassignment_share,
                COALESCE((meta->'building_rollup'->>'neighbour_event_flag')::boolean, false)
                    AS neighbour_event_flag,
                (meta->'building_rollup'->>'neighbour_event_score')::double precision
                    AS neighbour_event_score,
                (meta->'building_rollup'->>'neighbour_consistency_score')::double precision
                    AS neighbour_consistency_score,
                (meta->'building_rollup'->>'supporting_neighbour_count')::integer
                    AS supporting_neighbour_count,
                (meta->'building_rollup'->>'supporting_track_count')::integer
                    AS supporting_track_count
            FROM ml_point_results
            WHERE run_id = $4::uuid
              AND building_id IS NOT NULL
            ORDER BY
                building_source,
                building_id,
                COALESCE((meta->'cluster_rollup'->>'cluster_rank')::integer, 999),
                track,
                code
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
                rollups.building_motion_mm_a,
                rollups.building_reliability_score,
                rollups.building_reliability_band,
                rollups.weak_secondary_track_flag,
                rollups.agreement_tension_flag,
                rollups.reliability_penalties_json,
                rollups.differential_motion_flag,
                rollups.building_status,
                rollups.track_agreement_score,
                rollups.cluster_count,
                rollups.reliable_cluster_count,
                rollups.point_count,
                rollups.kept_point_count,
                rollups.noise_point_count,
                rollups.excluded_point_count,
                rollups.main_cluster_track_44_id,
                rollups.main_cluster_track_95_id,
                rollups.neighbour_context_available,
                rollups.neighbour_candidate_building_count,
                rollups.neighbour_misassignment_point_count,
                rollups.neighbour_misassignment_share,
                rollups.neighbour_event_flag,
                rollups.neighbour_event_score,
                rollups.neighbour_consistency_score,
                rollups.supporting_neighbour_count,
                rollups.supporting_track_count,
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
            LEFT JOIN building_rollups rollups
              ON rollups.building_source = all_buildings.building_source
             AND rollups.building_id = all_buildings.building_id
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
            await conn.execute("DELETE FROM ml_building_colors WHERE run_id = $1", run_id)
            await conn.execute("DELETE FROM ml_point_results WHERE run_id = $1", run_id)
            await conn.execute("DELETE FROM ml_run_metrics WHERE run_id = $1", run_id)
            await conn.execute("DELETE FROM ml_runs WHERE run_id = $1", run_id)

    return MLRunDeleteResponse(
        run_id=run_id,
        db_deleted=True,
        mlflow_deleted=mlflow_deleted,
        mlflow_error=mlflow_error,
    )
