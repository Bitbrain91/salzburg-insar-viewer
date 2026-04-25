from __future__ import annotations

import argparse
import asyncio
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import asyncpg
import numpy as np

from ...config import BASE_DIR, settings
from ..rollups import (
    building_rollup_from_meta,
    cluster_rollup_from_meta,
    nested_bool,
    nested_dict,
    nested_list,
    parse_meta,
    track_motion_map,
)

ARTIFACTS_DIR = BASE_DIR / "docs" / "pipelines" / "anomaly_local_v1" / "artifacts"
DEFAULT_JSON_PATH = ARTIFACTS_DIR / "phase2_harness_results.json"
DEFAULT_MARKDOWN_PATH = ARTIFACTS_DIR / "phase2_harness_summary.md"
DEFAULT_REFERENCE_CASES_PATH = ARTIFACTS_DIR / "phase2_reference_cases.json"
DEFAULT_BOOTSTRAP_SAMPLES = 500
DEFAULT_BOOTSTRAP_SEED = 17


@dataclass(frozen=True)
class AOIRun:
    name: str
    run_id: str
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class ReferenceCase:
    case_id: str
    aoi: str
    run_id: str
    building_source: str
    building_id: str
    case_type: str
    expected_status: str
    summary: str


FIXED_AOI_RUNS: tuple[AOIRun, ...] = (
    AOIRun(
        name="Mirabell",
        run_id="b5c20834-6b5d-4a8f-b2a7-90ce623c78f7",
        bbox=(13.04027, 47.80375, 13.04387, 47.80735),
    ),
    AOIRun(
        name="Moosstrasse",
        run_id="fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5",
        bbox=(13.02714, 47.79189, 13.03074, 47.79549),
    ),
    AOIRun(
        name="Osthang-Stressbereich",
        run_id="71770d85-ec8c-4354-840a-545fa0b7c757",
        bbox=(13.0492, 47.8036, 13.0528, 47.8054),
    ),
)

REFERENCE_CASES: tuple[ReferenceCase, ...] = (
    ReferenceCase(
        case_id="mirabell_standard_high_conf",
        aoi="Mirabell",
        run_id="b5c20834-6b5d-4a8f-b2a7-90ce623c78f7",
        building_source="gba",
        building_id="548205",
        case_type="standard_ok",
        expected_status="ok",
        summary="P1-Anker fuer den stabilen, zweitrackigen Standardfall.",
    ),
    ReferenceCase(
        case_id="mirabell_adjacent_standard",
        aoi="Mirabell",
        run_id="b5c20834-6b5d-4a8f-b2a7-90ce623c78f7",
        building_source="gba",
        building_id="548204",
        case_type="adjacent_ok",
        expected_status="ok",
        summary="Direkter Nachbar-Footprint fuer dichte Karten-Selektion und moderateres Track-Agreement.",
    ),
    ReferenceCase(
        case_id="moosstrasse_differential_anchor",
        aoi="Moosstrasse",
        run_id="fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5",
        building_source="gba",
        building_id="96637447",
        case_type="differential_motion",
        expected_status="ok",
        summary="P1-Anker fuer Multi-Cluster mit gesetztem differential_motion_flag.",
    ),
    ReferenceCase(
        case_id="moosstrasse_differential_low_agreement",
        aoi="Moosstrasse",
        run_id="fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5",
        building_source="gba",
        building_id="96637522",
        case_type="differential_motion_low_reliability",
        expected_status="ok",
        summary="Differenzieller Bewegungsfall mit deutlich niedrigerem Agreement und nur mittlerer Stabilitaet.",
    ),
    ReferenceCase(
        case_id="moosstrasse_single_track_only",
        aoi="Moosstrasse",
        run_id="fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5",
        building_source="gba",
        building_id="96637488",
        case_type="single_track_only",
        expected_status="single_track_only",
        summary="Ein-Track-Fall fuer fehlenden ASC/DSC-Gegencheck bei ansonsten brauchbarem Main-Cluster.",
    ),
    ReferenceCase(
        case_id="moosstrasse_small_n",
        aoi="Moosstrasse",
        run_id="fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5",
        building_source="gba",
        building_id="96959854",
        case_type="small_n",
        expected_status="small_n",
        summary="Knapp ueber der Support-Grenze, aber zu klein fuer robuste Gebaeudesemantik.",
    ),
    ReferenceCase(
        case_id="moosstrasse_noise_dominated",
        aoi="Moosstrasse",
        run_id="fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5",
        building_source="gba",
        building_id="96637551",
        case_type="noise_dominated",
        expected_status="noise_dominated",
        summary="Gebaeude mit nur einem brauchbaren Cluster und dominierendem Noise-Anteil.",
    ),
    ReferenceCase(
        case_id="osthang_insufficient_support",
        aoi="Osthang-Stressbereich",
        run_id="71770d85-ec8c-4354-840a-545fa0b7c757",
        building_source="gba",
        building_id="395674088",
        case_type="insufficient_support",
        expected_status="insufficient_support",
        summary="P1-Anker fuer den Small-n-/Stressbereich ohne belastbares Gebaeuderesultat.",
    ),
)


def _masked_db_dsn() -> str:
    if getattr(settings, "db_password", None):
        return settings.db_dsn.replace(settings.db_password, "***")
    return settings.db_dsn


def _resolve_aoi_runs(
    *,
    mirabell_run_id: str | None = None,
    moosstrasse_run_id: str | None = None,
    osthang_run_id: str | None = None,
) -> tuple[AOIRun, ...]:
    overrides = {
        "Mirabell": mirabell_run_id,
        "Moosstrasse": moosstrasse_run_id,
        "Osthang-Stressbereich": osthang_run_id,
    }
    return tuple(
        AOIRun(
            name=aoi.name,
            run_id=str(overrides.get(aoi.name) or aoi.run_id),
            bbox=aoi.bbox,
        )
        for aoi in FIXED_AOI_RUNS
    )


def _resolve_reference_cases(aoi_runs: tuple[AOIRun, ...]) -> tuple[ReferenceCase, ...]:
    run_ids_by_aoi = {aoi.name: aoi.run_id for aoi in aoi_runs}
    return tuple(
        ReferenceCase(
            case_id=case.case_id,
            aoi=case.aoi,
            run_id=run_ids_by_aoi.get(case.aoi, case.run_id),
            building_source=case.building_source,
            building_id=case.building_id,
            case_type=case.case_type,
            expected_status=case.expected_status,
            summary=case.summary,
        )
        for case in REFERENCE_CASES
    )


def _float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _median(values: list[float]) -> float | None:
    if not values:
        return None
    return float(np.median(np.asarray(values, dtype=float)))


def _band_counts(values: list[str | None]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in values:
        key = value or "unknown"
        counts[key] = counts.get(key, 0) + 1
    return counts


def _bootstrap_distribution(values: list[float], samples: int, seed: int) -> list[float]:
    if not values:
        return []
    array = np.asarray(values, dtype=float)
    if array.size == 1:
        return [float(array[0])] * samples
    rng = np.random.default_rng(seed)
    draws = rng.choice(array, size=(samples, array.size), replace=True)
    return [float(item) for item in np.median(draws, axis=1)]


def _distribution_summary(values: list[float]) -> dict[str, float | int] | None:
    if not values:
        return None
    array = np.asarray(values, dtype=float)
    low, high = np.percentile(array, [5, 95])
    return {
        "sample_count": int(array.size),
        "mean": float(np.mean(array)),
        "median": float(np.median(array)),
        "std": float(np.std(array)),
        "p05": float(low),
        "p95": float(high),
        "ci_width": float(high - low),
    }


def _stability_band(point_count: int, support_ratio: float, ci_width: float | None) -> str:
    if point_count < 2 or ci_width is None:
        return "unstable"
    if ci_width <= 0.75 and support_ratio >= 0.35:
        return "stable"
    if ci_width <= 1.50 and support_ratio >= 0.20:
        return "monitor"
    return "unstable"


def _building_stability_band(
    *,
    has_track_44: bool,
    has_track_95: bool,
    track_band_44: str,
    track_band_95: str,
    building_ci_width: float | None,
    agreement_ci_width: float | None,
) -> str:
    if not has_track_44 and not has_track_95:
        return "unstable"
    if has_track_44 and has_track_95:
        if track_band_44 == "stable" and track_band_95 == "stable":
            if building_ci_width is not None and building_ci_width <= 1.00:
                if agreement_ci_width is None or agreement_ci_width <= 0.35:
                    return "stable"
            return "monitor"
        if track_band_44 == "unstable" and track_band_95 == "unstable":
            return "unstable"
        return "monitor"
    surviving_band = track_band_44 if has_track_44 else track_band_95
    return "monitor" if surviving_band != "unstable" else "unstable"


def _case_seed(base_seed: int, case_id: str, track: str) -> int:
    return base_seed + sum(ord(char) for char in f"{case_id}:{track}")


async def _fetch_run_metrics(conn: asyncpg.Connection, run_id: str) -> dict[str, float]:
    rows = await conn.fetch(
        """
        SELECT metric, value
        FROM ml_run_metrics
        WHERE run_id = $1::uuid
        ORDER BY metric
        """,
        run_id,
    )
    return {str(row["metric"]): float(row["value"]) for row in rows if row["value"] is not None}


async def _fetch_building_rollups(conn: asyncpg.Connection, run_id: str) -> list[dict[str, Any]]:
    rows = await conn.fetch(
        """
        SELECT DISTINCT ON (r.building_source, r.building_id)
            r.building_source,
            r.building_id,
            r.meta
        FROM ml_point_results r
        WHERE r.run_id = $1::uuid
          AND r.building_id IS NOT NULL
          AND r.meta ? 'building_rollup'
        ORDER BY r.building_source, r.building_id, r.code, r.track
        """,
        run_id,
    )

    building_rollups: list[dict[str, Any]] = []
    for row in rows:
        meta = parse_meta(row["meta"])
        rollup = building_rollup_from_meta(meta)
        if not rollup:
            continue
        penalties = rollup.get("reliability_penalties")
        building_rollups.append(
            {
                "building_source": str(row["building_source"]),
                "building_id": str(row["building_id"]),
                "building_status": str(rollup.get("building_status") or "unknown"),
                "building_motion_mm_a": _float(rollup.get("building_motion_mm_a")),
                "building_reliability_score": _float(rollup.get("building_reliability_score")),
                "building_reliability_band": (
                    str(rollup.get("building_reliability_band"))
                    if rollup.get("building_reliability_band") is not None
                    else None
                ),
                "track_agreement_score": _float(rollup.get("track_agreement_score")),
                "weak_secondary_track_flag": bool(rollup.get("weak_secondary_track_flag", False)),
                "agreement_tension_flag": bool(rollup.get("agreement_tension_flag", False)),
                "reliability_penalties": penalties if isinstance(penalties, list) else [],
                "differential_motion_flag": bool(rollup.get("differential_motion_flag", False)),
                "cluster_count": int(rollup.get("cluster_count", 0) or 0),
                "reliable_cluster_count": int(rollup.get("reliable_cluster_count", 0) or 0),
                "kept_point_count": int(rollup.get("kept_point_count", 0) or 0),
                "noise_point_count": int(rollup.get("noise_point_count", 0) or 0),
                "excluded_point_count": int(rollup.get("excluded_point_count", 0) or 0),
                "main_cluster_track_44_id": (
                    str(rollup.get("main_cluster_track_44_id"))
                    if rollup.get("main_cluster_track_44_id") is not None
                    else None
                ),
                "main_cluster_track_95_id": (
                    str(rollup.get("main_cluster_track_95_id"))
                    if rollup.get("main_cluster_track_95_id") is not None
                    else None
                ),
                "neighbour_context_available": bool(
                    rollup.get("neighbour_context_available", False)
                ),
                "neighbour_candidate_building_count": int(
                    rollup.get("neighbour_candidate_building_count", 0) or 0
                ),
                "neighbour_misassignment_point_count": int(
                    rollup.get("neighbour_misassignment_point_count", 0) or 0
                ),
                "neighbour_misassignment_share": _float(
                    rollup.get("neighbour_misassignment_share")
                ),
                "neighbour_event_flag": bool(rollup.get("neighbour_event_flag", False)),
                "neighbour_event_score": _float(rollup.get("neighbour_event_score")),
                "neighbour_consistency_score": _float(
                    rollup.get("neighbour_consistency_score")
                ),
                "supporting_neighbour_count": int(
                    rollup.get("supporting_neighbour_count", 0) or 0
                ),
                "supporting_track_count": int(rollup.get("supporting_track_count", 0) or 0),
                "track_motion_mm_a": track_motion_map(rollup.get("track_motion_mm_a")),
            }
        )
    return building_rollups


def _summarise_run(aoi: AOIRun, metrics: dict[str, float], building_rollups: list[dict[str, Any]]) -> dict[str, Any]:
    reliability_values = [
        value["building_reliability_score"]
        for value in building_rollups
        if value["building_reliability_score"] is not None
    ]
    agreement_values = [
        value["track_agreement_score"]
        for value in building_rollups
        if value["track_agreement_score"] is not None
    ]
    motion_values = [
        abs(value["building_motion_mm_a"])
        for value in building_rollups
        if value["building_motion_mm_a"] is not None
    ]
    cluster_counts = [value["cluster_count"] for value in building_rollups]
    reliable_cluster_counts = [value["reliable_cluster_count"] for value in building_rollups]

    return {
        "aoi": aoi.name,
        "run_id": aoi.run_id,
        "bbox": list(aoi.bbox),
        "run_metrics": metrics,
        "building_count": len(building_rollups),
        "building_status_counts": _band_counts(
            [value["building_status"] for value in building_rollups]
        ),
        "reliability_band_counts": _band_counts(
            [value["building_reliability_band"] for value in building_rollups]
        ),
        "differential_motion_buildings": sum(
            1 for value in building_rollups if value["differential_motion_flag"]
        ),
        "neighbour_context_buildings": sum(
            1 for value in building_rollups if value["neighbour_context_available"]
        ),
        "neighbour_misassignment_points": sum(
            value["neighbour_misassignment_point_count"] for value in building_rollups
        ),
        "buildings_with_neighbour_misassignment": sum(
            1 for value in building_rollups if value["neighbour_misassignment_point_count"] > 0
        ),
        "neighbour_event_buildings": sum(
            1 for value in building_rollups if value["neighbour_event_flag"]
        ),
        "median_building_reliability": _median(reliability_values),
        "median_track_agreement": _median(agreement_values),
        "median_abs_building_motion_mm_a": _median(motion_values),
        "median_cluster_count": _median([float(value) for value in cluster_counts]),
        "median_reliable_cluster_count": _median(
            [float(value) for value in reliable_cluster_counts]
        ),
    }


async def _fetch_reference_case(
    conn: asyncpg.Connection,
    reference_case: ReferenceCase,
    *,
    bootstrap_samples: int,
    bootstrap_seed: int,
) -> dict[str, Any]:
    building_row = await conn.fetchrow(
        """
        SELECT
            gba_id::text AS building_id,
            height,
            ARRAY[ST_XMin(geom), ST_YMin(geom), ST_XMax(geom), ST_YMax(geom)] AS bounds
        FROM gba_buildings
        WHERE gba_id::text = $1
        """,
        reference_case.building_id,
    )
    if building_row is None:
        raise RuntimeError(f"Building {reference_case.building_id} not found in gba_buildings")

    terrain_row = await conn.fetchrow(
        """
        SELECT
            terrain_source,
            terrain_resolution_m,
            terrain_elevation_mean_m,
            terrain_elevation_min_m,
            terrain_elevation_max_m,
            slope_mean_deg,
            slope_max_deg,
            relief_range_m
        FROM building_terrain_context
        WHERE building_source = $1 AND building_id = $2
        """,
        reference_case.building_source,
        reference_case.building_id,
    )

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
            r.meta,
            p.velocity,
            p.coherence,
            p.height,
            ST_X(p.geom) AS lon,
            ST_Y(p.geom) AS lat
        FROM ml_point_results r
        JOIN insar_points p
          ON p.code = r.code AND p.track = r.track
        WHERE r.run_id = $1::uuid
          AND r.building_source = $2
          AND r.building_id = $3
        ORDER BY r.quality_score ASC NULLS LAST, r.anomaly_score DESC NULLS LAST, r.code, r.track
        """,
        reference_case.run_id,
        reference_case.building_source,
        reference_case.building_id,
    )

    if not rows:
        raise RuntimeError(
            f"No point results found for {reference_case.run_id}:{reference_case.building_id}"
        )

    building_rollup: dict[str, Any] = {}
    cluster_rollups: dict[str, dict[str, Any]] = {}
    exported_points: list[dict[str, Any]] = []

    for row in rows:
        meta = parse_meta(row["meta"])
        visual_meta = nested_dict(meta, "visual_context")
        building_meta = nested_dict(meta, "building_context")
        cluster_meta = nested_dict(meta, "cluster")
        neighbour_context = nested_dict(meta, "neighbour_context")
        current_building_rollup = building_rollup_from_meta(meta)
        cluster_rollup = cluster_rollup_from_meta(meta)
        if not building_rollup and current_building_rollup:
            building_rollup = current_building_rollup
        if cluster_rollup:
            cluster_rollups[str(cluster_rollup.get("cluster_id") or row["cluster_id"])] = cluster_rollup
        exported_points.append(
            {
                "code": str(row["code"]),
                "track": int(row["track"]),
                "cluster_id": str(row["cluster_id"]) if row["cluster_id"] is not None else None,
                "cluster_role": str(cluster_meta.get("cluster_role") or "unknown"),
                "label": str(row["label"]) if row["label"] is not None else None,
                "quality_score": _float(row["quality_score"]),
                "anomaly_score": _float(row["anomaly_score"]),
                "cross_track_consistency": _float(row["cross_track_consistency"]),
                "distance_m": _float(row["distance_m"]),
                "velocity_mm_a": _float(row["velocity"]),
                "coherence": _float(row["coherence"]),
                "height_m": _float(row["height"]),
                "gate_excluded": nested_bool(meta, "visual_context", "gate_excluded"),
                "kept_for_scoring": nested_bool(meta, "visual_context", "kept_for_scoring"),
                "assignment_method": (
                    building_meta.get("assignment_method") or visual_meta.get("assignment_method")
                ),
                "gate_reasons": [str(item) for item in nested_list(meta, "visual_context", "gate_reasons")],
                "is_main_cluster": bool(cluster_rollup.get("is_main_cluster", False)),
                "cluster_rank": _int(cluster_rollup.get("cluster_rank")),
                "neighbour_context": {
                    "context_available": bool(neighbour_context.get("context_available", False)),
                    "candidate_neighbour_count": int(
                        neighbour_context.get("candidate_neighbour_count", 0) or 0
                    ),
                    "eligible_neighbour_cluster_count": int(
                        neighbour_context.get("eligible_neighbour_cluster_count", 0) or 0
                    ),
                    "best_neighbour_building_id": (
                        str(neighbour_context.get("best_neighbour_building_id"))
                        if neighbour_context.get("best_neighbour_building_id") is not None
                        else None
                    ),
                    "best_neighbour_cluster_id": (
                        str(neighbour_context.get("best_neighbour_cluster_id"))
                        if neighbour_context.get("best_neighbour_cluster_id") is not None
                        else None
                    ),
                    "own_cluster_fit_score": _float(
                        neighbour_context.get("own_cluster_fit_score")
                    ),
                    "neighbour_fit_score": _float(neighbour_context.get("neighbour_fit_score")),
                    "neighbour_fit_delta": _float(neighbour_context.get("neighbour_fit_delta")),
                    "own_fit_weak_flag": bool(neighbour_context.get("own_fit_weak_flag", False)),
                    "neighbour_misassignment_flag": bool(
                        neighbour_context.get("neighbour_misassignment_flag", False)
                    ),
                    "neighbour_event_score": _float(
                        neighbour_context.get("neighbour_event_score")
                    ),
                    "neighbour_event_flag": bool(
                        neighbour_context.get("neighbour_event_flag", False)
                    ),
                    "supporting_neighbour_count": int(
                        neighbour_context.get("supporting_neighbour_count", 0) or 0
                    ),
                },
                "lon": _float(row["lon"]),
                "lat": _float(row["lat"]),
            }
        )

    building_analysis = {
        "building_status": str(building_rollup.get("building_status") or "unknown"),
        "building_motion_mm_a": _float(building_rollup.get("building_motion_mm_a")),
        "building_reliability_score": _float(building_rollup.get("building_reliability_score")),
        "building_reliability_band": (
            str(building_rollup.get("building_reliability_band"))
            if building_rollup.get("building_reliability_band") is not None
            else None
        ),
        "track_agreement_score": _float(building_rollup.get("track_agreement_score")),
        "weak_secondary_track_flag": bool(building_rollup.get("weak_secondary_track_flag", False)),
        "agreement_tension_flag": bool(building_rollup.get("agreement_tension_flag", False)),
        "reliability_penalties": (
            building_rollup.get("reliability_penalties")
            if isinstance(building_rollup.get("reliability_penalties"), list)
            else []
        ),
        "differential_motion_flag": bool(building_rollup.get("differential_motion_flag", False)),
        "main_cluster_track_44_id": (
            str(building_rollup.get("main_cluster_track_44_id"))
            if building_rollup.get("main_cluster_track_44_id") is not None
            else None
        ),
        "main_cluster_track_95_id": (
            str(building_rollup.get("main_cluster_track_95_id"))
            if building_rollup.get("main_cluster_track_95_id") is not None
            else None
        ),
        "track_motion_mm_a": track_motion_map(building_rollup.get("track_motion_mm_a")),
        "cluster_count": int(building_rollup.get("cluster_count", 0) or 0),
        "reliable_cluster_count": int(building_rollup.get("reliable_cluster_count", 0) or 0),
        "point_count": int(building_rollup.get("point_count", len(exported_points)) or len(exported_points)),
        "kept_point_count": int(building_rollup.get("kept_point_count", 0) or 0),
        "noise_point_count": int(building_rollup.get("noise_point_count", 0) or 0),
        "excluded_point_count": int(building_rollup.get("excluded_point_count", 0) or 0),
        "neighbour_context_available": bool(building_rollup.get("neighbour_context_available", False)),
        "neighbour_candidate_building_count": int(
            building_rollup.get("neighbour_candidate_building_count", 0) or 0
        ),
        "neighbour_misassignment_point_count": int(
            building_rollup.get("neighbour_misassignment_point_count", 0) or 0
        ),
        "neighbour_misassignment_share": _float(
            building_rollup.get("neighbour_misassignment_share")
        ),
        "neighbour_event_flag": bool(building_rollup.get("neighbour_event_flag", False)),
        "neighbour_event_score": _float(building_rollup.get("neighbour_event_score")),
        "neighbour_consistency_score": _float(
            building_rollup.get("neighbour_consistency_score")
        ),
        "supporting_neighbour_count": int(
            building_rollup.get("supporting_neighbour_count", 0) or 0
        ),
        "supporting_track_count": int(building_rollup.get("supporting_track_count", 0) or 0),
    }

    cluster_summaries = [
        {
            "cluster_id": str(values.get("cluster_id") or cluster_id),
            "building_source": str(
                values.get("building_source") or reference_case.building_source
            ),
            "building_id": str(values.get("building_id") or reference_case.building_id),
            "track": int(values.get("track", 0) or 0),
            "cluster_role": str(values.get("cluster_role") or "unknown"),
            "is_main_cluster": bool(values.get("is_main_cluster", False)),
            "cluster_rank": _int(values.get("cluster_rank")),
            "point_count": int(values.get("point_count", 0) or 0),
            "median_velocity_mm_a": _float(values.get("median_velocity_mm_a")),
            "median_vertical_proxy_mm_a": _float(values.get("median_vertical_proxy_mm_a")),
            "median_coherence": _float(values.get("median_coherence")),
            "median_height_rank": _float(values.get("median_height_rank")),
            "cluster_reliability_score": _float(values.get("cluster_reliability_score")),
            "motion_delta_to_main_mm_a": _float(values.get("motion_delta_to_main_mm_a")),
            "neighbour_candidate_building_count": int(
                values.get("neighbour_candidate_building_count", 0) or 0
            ),
            "best_neighbour_building_id": (
                str(values.get("best_neighbour_building_id"))
                if values.get("best_neighbour_building_id") is not None
                else None
            ),
            "best_neighbour_cluster_id": (
                str(values.get("best_neighbour_cluster_id"))
                if values.get("best_neighbour_cluster_id") is not None
                else None
            ),
            "best_neighbour_consistency_score": _float(
                values.get("best_neighbour_consistency_score")
            ),
            "supporting_neighbour_building_count": int(
                values.get("supporting_neighbour_building_count", 0) or 0
            ),
            "neighbour_event_candidate_flag": bool(
                values.get("neighbour_event_candidate_flag", False)
            ),
        }
        for cluster_id, values in sorted(
            cluster_rollups.items(),
            key=lambda item: (
                int(item[1].get("cluster_rank") or 999),
                int(item[1].get("track") or 0),
                str(item[1].get("cluster_id") or item[0]),
            ),
        )
    ]

    terrain_context = {
        "terrain_source": str(terrain_row["terrain_source"]) if terrain_row else None,
        "terrain_resolution_m": _float(terrain_row["terrain_resolution_m"]) if terrain_row else None,
        "terrain_elevation_mean_m": _float(terrain_row["terrain_elevation_mean_m"]) if terrain_row else None,
        "terrain_elevation_min_m": _float(terrain_row["terrain_elevation_min_m"]) if terrain_row else None,
        "terrain_elevation_max_m": _float(terrain_row["terrain_elevation_max_m"]) if terrain_row else None,
        "slope_mean_deg": _float(terrain_row["slope_mean_deg"]) if terrain_row else None,
        "slope_max_deg": _float(terrain_row["slope_max_deg"]) if terrain_row else None,
        "relief_range_m": _float(terrain_row["relief_range_m"]) if terrain_row else None,
    }

    stability = _compute_stability(
        reference_case,
        building_analysis,
        terrain_context,
        exported_points,
        bootstrap_samples=bootstrap_samples,
        bootstrap_seed=bootstrap_seed,
    )

    return {
        "case_id": reference_case.case_id,
        "aoi": reference_case.aoi,
        "run_id": reference_case.run_id,
        "building_source": reference_case.building_source,
        "building_id": reference_case.building_id,
        "case_type": reference_case.case_type,
        "expected_status": reference_case.expected_status,
        "summary": reference_case.summary,
        "bounds": [float(value) for value in building_row["bounds"]],
        "building_height_m": _float(building_row["height"]),
        "terrain_context": terrain_context,
        "building_analysis": building_analysis,
        "cluster_summaries": cluster_summaries,
        "points": exported_points,
        "stability": stability,
    }


def _compute_stability(
    reference_case: ReferenceCase,
    building_analysis: dict[str, Any],
    terrain_context: dict[str, Any],
    exported_points: list[dict[str, Any]],
    *,
    bootstrap_samples: int,
    bootstrap_seed: int,
) -> dict[str, Any]:
    main_cluster_ids = {
        "44": building_analysis.get("main_cluster_track_44_id"),
        "95": building_analysis.get("main_cluster_track_95_id"),
    }
    kept_point_count = max(int(building_analysis.get("kept_point_count", 0) or 0), 1)
    slope_mean_deg = _float(terrain_context.get("slope_mean_deg")) or 0.0
    allowed_diff_mm_a = 1.0 + (0.15 * slope_mean_deg)

    track_distributions: dict[str, list[float]] = {}
    track_summaries: dict[str, Any] = {}
    for track in ("44", "95"):
        cluster_id = main_cluster_ids[track]
        velocities = [
            float(point["velocity_mm_a"])
            for point in exported_points
            if str(point["track"]) == track
            and point["velocity_mm_a"] is not None
            and point["gate_excluded"] is not True
            and cluster_id is not None
            and point["cluster_id"] == cluster_id
        ]
        draws = _bootstrap_distribution(
            velocities,
            bootstrap_samples,
            _case_seed(bootstrap_seed, reference_case.case_id, track),
        )
        distribution = _distribution_summary(draws)
        support_ratio = float(len(velocities) / kept_point_count) if kept_point_count else 0.0
        band = _stability_band(
            len(velocities),
            support_ratio,
            distribution["ci_width"] if distribution else None,
        )
        track_distributions[track] = draws
        track_summaries[track] = {
            "main_cluster_id": cluster_id,
            "point_count": len(velocities),
            "support_ratio": support_ratio,
            "distribution": distribution,
            "stability_band": band,
        }

    building_distribution: list[float] = []
    if track_distributions["44"] and track_distributions["95"]:
        building_distribution = [
            float((value_44 + value_95) / 2.0)
            for value_44, value_95 in zip(track_distributions["44"], track_distributions["95"], strict=True)
        ]
    elif track_distributions["44"]:
        building_distribution = list(track_distributions["44"])
    elif track_distributions["95"]:
        building_distribution = list(track_distributions["95"])

    agreement_distribution: list[float] = []
    if track_distributions["44"] and track_distributions["95"]:
        agreement_distribution = [
            float(math.exp(-abs(value_44 - value_95) / max(allowed_diff_mm_a, 0.25)))
            for value_44, value_95 in zip(track_distributions["44"], track_distributions["95"], strict=True)
        ]

    building_summary = _distribution_summary(building_distribution)
    agreement_summary = _distribution_summary(agreement_distribution)
    building_band = _building_stability_band(
        has_track_44=bool(track_distributions["44"]),
        has_track_95=bool(track_distributions["95"]),
        track_band_44=str(track_summaries["44"]["stability_band"]),
        track_band_95=str(track_summaries["95"]["stability_band"]),
        building_ci_width=building_summary["ci_width"] if building_summary else None,
        agreement_ci_width=agreement_summary["ci_width"] if agreement_summary else None,
    )

    notes: list[str] = []
    recorded_motion = _float(building_analysis.get("building_motion_mm_a"))
    if building_summary and recorded_motion is not None:
        motion_alignment_abs_error = abs(building_summary["median"] - recorded_motion)
        if motion_alignment_abs_error > 0.35:
            notes.append(
                f"Bootstrap median deviates by {motion_alignment_abs_error:.2f} mm/yr from stored building motion."
            )
    if (
        building_analysis.get("building_reliability_score") is not None
        and float(building_analysis["building_reliability_score"]) >= 0.75
        and building_summary is not None
        and building_summary["ci_width"] > 1.00
    ):
        notes.append("High reliability is paired with a wide bootstrap motion interval.")
    if (
        building_analysis.get("building_reliability_score") is not None
        and float(building_analysis["building_reliability_score"]) >= 0.75
        and any(
            info["main_cluster_id"] is not None and info["stability_band"] == "unstable"
            for info in track_summaries.values()
        )
    ):
        notes.append("High reliability is paired with at least one unstable track-local bootstrap signal.")
    if (
        building_analysis.get("track_agreement_score") is not None
        and float(building_analysis["track_agreement_score"]) < 0.25
        and building_analysis.get("building_status") == "ok"
    ):
        notes.append("Building remains ok despite very low main-cluster track agreement.")
    if building_analysis.get("building_status") in {"small_n", "insufficient_support"}:
        notes.append("Status is already a small-sample guard; bootstrap values are diagnostic only.")
    if building_analysis.get("differential_motion_flag") and int(building_analysis.get("reliable_cluster_count", 0)) < 3:
        notes.append("Differential flag is set with only a small number of reliable clusters.")

    return {
        "bootstrap_samples": bootstrap_samples,
        "allowed_diff_mm_a": allowed_diff_mm_a,
        "track": track_summaries,
        "building_motion_distribution": building_summary,
        "track_agreement_distribution": agreement_summary,
        "stability_band": building_band,
        "notes": notes,
    }


def _build_markdown_summary(
    run_summaries: list[dict[str, Any]],
    reference_cases: list[dict[str, Any]],
    *,
    generated_at: str,
    bootstrap_samples: int,
    bootstrap_seed: int,
) -> str:
    lines = [
        "# anomaly_local_v1 Phase-2 Harness Summary",
        "",
        f"Generated: {generated_at}",
        f"Bootstrap samples: {bootstrap_samples}",
        f"Bootstrap seed: {bootstrap_seed}",
        "",
        "## AOI Runs",
        "",
        "| AOI | Run ID | Buildings | Status counts | Reliability bands | Differential | Median reliability | Median agreement |",
        "| --- | --- | ---: | --- | --- | ---: | ---: | ---: |",
    ]

    for item in run_summaries:
        lines.append(
            "| {aoi} | `{run_id}` | {building_count} | `{status_counts}` | `{band_counts}` | {differential} | {reliability} | {agreement} |".format(
                aoi=item["aoi"],
                run_id=item["run_id"],
                building_count=item["building_count"],
                status_counts=json.dumps(item["building_status_counts"], sort_keys=True),
                band_counts=json.dumps(item["reliability_band_counts"], sort_keys=True),
                differential=item["differential_motion_buildings"],
                reliability=(
                    f"{item['median_building_reliability']:.2f}"
                    if item["median_building_reliability"] is not None
                    else "n/a"
                ),
                agreement=(
                    f"{item['median_track_agreement']:.2f}"
                    if item["median_track_agreement"] is not None
                    else "n/a"
                ),
            )
        )

    lines.extend(
        [
            "",
            "## Neighbourhood Diagnostics",
            "",
            "| AOI | Run ID | Buildings with context | Misassignment points | Buildings with misassignment | Event buildings |",
            "| --- | --- | ---: | ---: | ---: | ---: |",
        ]
    )

    for item in run_summaries:
        lines.append(
            "| {aoi} | `{run_id}` | {context_buildings} | {misassignment_points} | {misassignment_buildings} | {event_buildings} |".format(
                aoi=item["aoi"],
                run_id=item["run_id"],
                context_buildings=item["neighbour_context_buildings"],
                misassignment_points=item["neighbour_misassignment_points"],
                misassignment_buildings=item["buildings_with_neighbour_misassignment"],
                event_buildings=item["neighbour_event_buildings"],
            )
        )

    lines.extend(
        [
            "",
            "## Reference Cases",
            "",
            "| Case | AOI | Building | Type | Status | Reliability | Agreement | Nbr ctx | Misassign | Event | Stability | Notes |",
            "| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |",
        ]
    )

    for item in reference_cases:
        analysis = item["building_analysis"]
        stability = item["stability"]
        note_text = "; ".join(stability["notes"]) if stability["notes"] else "none"
        lines.append(
            "| {case_id} | {aoi} | `{building}` | `{case_type}` | `{status}` | {reliability} | {agreement} | `{context_available}` | {misassignment_count} | `{event_flag}` | `{stability_band}` | {notes} |".format(
                case_id=item["case_id"],
                aoi=item["aoi"],
                building=item["building_id"],
                case_type=item["case_type"],
                status=analysis["building_status"],
                reliability=(
                    f"{analysis['building_reliability_score']:.2f}"
                    if analysis["building_reliability_score"] is not None
                    else "n/a"
                ),
                agreement=(
                    f"{analysis['track_agreement_score']:.2f}"
                    if analysis["track_agreement_score"] is not None
                    else "n/a"
                ),
                context_available="yes" if analysis["neighbour_context_available"] else "no",
                misassignment_count=analysis["neighbour_misassignment_point_count"],
                event_flag="yes" if analysis["neighbour_event_flag"] else "no",
                stability_band=stability["stability_band"],
                notes=note_text.replace("|", "/"),
            )
        )

    return "\n".join(lines) + "\n"


async def run_harness(
    *,
    json_path: Path,
    markdown_path: Path,
    reference_cases_path: Path,
    bootstrap_samples: int,
    bootstrap_seed: int,
    aoi_runs: tuple[AOIRun, ...] | None = None,
    reference_cases: tuple[ReferenceCase, ...] | None = None,
) -> dict[str, Any]:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    resolved_aoi_runs = aoi_runs or FIXED_AOI_RUNS
    resolved_reference_cases = reference_cases or _resolve_reference_cases(resolved_aoi_runs)
    try:
        conn = await asyncpg.connect(settings.db_dsn)
    except (OSError, asyncpg.PostgresError) as exc:
        raise RuntimeError(
            "Unable to connect to PostGIS for the Phase-2 harness at "
            f"{_masked_db_dsn()}. Start or expose the backend database, then rerun the harness."
        ) from exc
    try:
        run_summaries: list[dict[str, Any]] = []
        for aoi in resolved_aoi_runs:
            metrics = await _fetch_run_metrics(conn, aoi.run_id)
            rollups = await _fetch_building_rollups(conn, aoi.run_id)
            run_summaries.append(_summarise_run(aoi, metrics, rollups))

        reference_cases = [
            await _fetch_reference_case(
                conn,
                reference_case,
                bootstrap_samples=bootstrap_samples,
                bootstrap_seed=bootstrap_seed,
            )
            for reference_case in resolved_reference_cases
        ]
    finally:
        await conn.close()

    generated_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "generated_at": generated_at,
        "db_dsn": _masked_db_dsn(),
        "bootstrap_samples": bootstrap_samples,
        "bootstrap_seed": bootstrap_seed,
        "fixed_aoi_runs": [
            {
                "name": aoi.name,
                "run_id": aoi.run_id,
                "bbox": list(aoi.bbox),
            }
            for aoi in resolved_aoi_runs
        ],
        "reference_catalog": [
            {
                "case_id": case.case_id,
                "aoi": case.aoi,
                "run_id": case.run_id,
                "building_source": case.building_source,
                "building_id": case.building_id,
                "case_type": case.case_type,
                "expected_status": case.expected_status,
                "summary": case.summary,
            }
            for case in resolved_reference_cases
        ],
        "run_summaries": run_summaries,
        "reference_cases": reference_cases,
    }

    json_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    reference_cases_path.write_text(
        json.dumps({"generated_at": generated_at, "cases": reference_cases}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    markdown_path.write_text(
        _build_markdown_summary(
            run_summaries,
            reference_cases,
            generated_at=generated_at,
            bootstrap_samples=bootstrap_samples,
            bootstrap_seed=bootstrap_seed,
        ),
        encoding="utf-8",
    )
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the anomaly_local_v1 Phase-2 evaluation harness.")
    parser.add_argument("--json-out", default=str(DEFAULT_JSON_PATH))
    parser.add_argument("--markdown-out", default=str(DEFAULT_MARKDOWN_PATH))
    parser.add_argument("--reference-cases-out", default=str(DEFAULT_REFERENCE_CASES_PATH))
    parser.add_argument("--bootstrap-samples", type=int, default=DEFAULT_BOOTSTRAP_SAMPLES)
    parser.add_argument("--bootstrap-seed", type=int, default=DEFAULT_BOOTSTRAP_SEED)
    parser.add_argument("--mirabell-run-id")
    parser.add_argument("--moosstrasse-run-id")
    parser.add_argument("--osthang-run-id")
    args = parser.parse_args()
    aoi_runs = _resolve_aoi_runs(
        mirabell_run_id=args.mirabell_run_id,
        moosstrasse_run_id=args.moosstrasse_run_id,
        osthang_run_id=args.osthang_run_id,
    )

    asyncio.run(
        run_harness(
            json_path=Path(args.json_out),
            markdown_path=Path(args.markdown_out),
            reference_cases_path=Path(args.reference_cases_out),
            bootstrap_samples=max(args.bootstrap_samples, 50),
            bootstrap_seed=args.bootstrap_seed,
            aoi_runs=aoi_runs,
            reference_cases=_resolve_reference_cases(aoi_runs),
        )
    )


if __name__ == "__main__":
    main()
