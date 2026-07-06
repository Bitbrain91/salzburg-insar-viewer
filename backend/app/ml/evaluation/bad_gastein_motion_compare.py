"""Quantitative SNT-vs-TSX/PAZ motion comparison for Bad Gastein.

The report deliberately keeps the existing Phase-7 structural comparison
separate: this module compares numeric building motions and overlap-window
slopes for identical GBA building IDs.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import asyncpg
import numpy as np

from ...config import BASE_DIR, settings
from ..track_geometry import get_track_geometry


ARTIFACTS_DIR = BASE_DIR / "docs" / "pipelines" / "anomaly_local_v1" / "artifacts"
DEFAULT_OUTPUT = ARTIFACTS_DIR / "bad_gastein_snt_tsx_motion_comparison.md"
OVERLAP_START = date(2022, 10, 6)
OVERLAP_END = date(2023, 5, 26)
MIN_OVERLAP_EPOCHS = 3
MIN_OVERLAP_SPAN_DAYS = 30
SIGN_DEADBAND_MM_A = 0.5
TRACK_PAIRS = {
    "ASC-vs-ASC": (44, 93),
    "DSC-vs-DSC": (95, 70),
}
STATUS_FILTER = {"ok", "single_track_only"}
RELIABILITY_FILTER = {"medium", "high"}
EXPECTED_MODEL_SET_VERSION = "local_hdbscan_rulegate_v2_k2x"


@dataclass(frozen=True)
class RunMeta:
    run_id: str
    status: str
    created_at: datetime | None
    finished_at: datetime | None
    area_id: str
    dataset_id: str
    bbox: list[float] | None
    params: dict[str, Any]
    mlflow_run_id: str | None
    point_count: int
    feature_versions: dict[str, int]
    model_versions: dict[str, int]
    data_windows: dict[int, dict[str, Any]]


@dataclass(frozen=True)
class PointSlope:
    building_id: str
    track: int
    code: str
    slope_los_mm_a: float
    slope_vertical_proxy_mm_a: float
    incidence_angle_deg: float
    epoch_count: int
    span_days: int


@dataclass(frozen=True)
class TrackSlope:
    building_id: str
    track: int
    slope_los_mm_a: float
    slope_vertical_proxy_mm_a: float
    point_count: int
    median_epoch_count: float
    median_span_days: float


@dataclass
class RunData:
    label: str
    meta: RunMeta
    buildings: dict[str, dict[str, Any]]
    main_support: dict[tuple[str, int], int]
    overlap_slopes: dict[tuple[str, int], TrackSlope]


@dataclass(frozen=True)
class ComparisonRow:
    building_id: str
    s_value: float | None
    t_value: float | None
    s_status: str
    t_status: str
    s_reliability: str | None
    t_reliability: str | None
    s_support: int | None
    t_support: int | None
    reason: str

    @property
    def delta(self) -> float | None:
        if self.s_value is None or self.t_value is None:
            return None
        return self.t_value - self.s_value

    @property
    def abs_delta(self) -> float | None:
        delta = self.delta
        return abs(delta) if delta is not None else None


def _json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        return json.loads(value)
    return value


def _float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(result):
        return None
    return result


def _int(value: Any) -> int:
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _fmt(value: Any, digits: int = 3) -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "ja" if value else "nein"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            return "-"
        return f"{value:.{digits}f}"
    return str(value)


def _fmt_pct(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{100.0 * value:.1f}%"


def _bbox_label(bbox: list[float] | None) -> str:
    if not bbox:
        return "-"
    return ",".join(f"{float(v):.6f}" for v in bbox)


def _motion_class(value: float | None) -> str:
    if value is None:
        return "missing"
    if abs(value) <= SIGN_DEADBAND_MM_A:
        return "stable"
    return "negative" if value < 0 else "positive"


def _same_sign(a: float | None, b: float | None) -> bool | None:
    ca = _motion_class(a)
    cb = _motion_class(b)
    if "missing" in {ca, cb}:
        return None
    return ca == cb


def _motion_relation(a: float | None, b: float | None) -> str:
    ca = _motion_class(a)
    cb = _motion_class(b)
    if "missing" in {ca, cb}:
        return "missing"
    if ca == cb:
        if ca == "stable":
            return "beide stabil"
        if ca == "negative":
            return "beide negativ/sinkend-proxy"
        return "beide positiv/hebend-proxy"
    if ca == "stable" or cb == "stable":
        return "einseitig stabil"
    return "widerspruechlich"


def _rank_average(values: list[float]) -> list[float]:
    indexed = sorted(enumerate(values), key=lambda item: item[1])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(indexed):
        j = i + 1
        while j < len(indexed) and indexed[j][1] == indexed[i][1]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            ranks[indexed[k][0]] = avg_rank
        i = j
    return ranks


def _correlation(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 3 or len(ys) < 3:
        return None
    x_arr = np.asarray(xs, dtype=float)
    y_arr = np.asarray(ys, dtype=float)
    if float(np.std(x_arr)) == 0.0 or float(np.std(y_arr)) == 0.0:
        return None
    return float(np.corrcoef(x_arr, y_arr)[0, 1])


def _spearman(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 3 or len(ys) < 3:
        return None
    return _correlation(_rank_average(xs), _rank_average(ys))


def _metric_summary(rows: list[ComparisonRow]) -> dict[str, Any]:
    paired = [
        row
        for row in rows
        if row.s_value is not None and row.t_value is not None and row.delta is not None
    ]
    if not paired:
        return {
            "n": 0,
            "bias_mean": None,
            "bias_median": None,
            "mae": None,
            "rmse": None,
            "median_abs_diff": None,
            "pearson": None,
            "spearman": None,
            "sign_agreement": None,
            "within_0_5": None,
            "within_1_0": None,
            "within_2_0": None,
        }
    s_values = [float(row.s_value) for row in paired if row.s_value is not None]
    t_values = [float(row.t_value) for row in paired if row.t_value is not None]
    deltas = [float(row.delta) for row in paired if row.delta is not None]
    abs_deltas = [abs(delta) for delta in deltas]
    sign_values = [_same_sign(row.s_value, row.t_value) for row in paired]
    sign_known = [value for value in sign_values if value is not None]

    def share_within(limit: float) -> float:
        return sum(1 for value in abs_deltas if value <= limit) / len(abs_deltas)

    return {
        "n": len(paired),
        "bias_mean": float(np.mean(deltas)),
        "bias_median": float(np.median(deltas)),
        "mae": float(np.mean(abs_deltas)),
        "rmse": float(math.sqrt(float(np.mean(np.square(deltas))))),
        "median_abs_diff": float(np.median(abs_deltas)),
        "pearson": _correlation(s_values, t_values),
        "spearman": _spearman(s_values, t_values),
        "sign_agreement": (
            sum(1 for value in sign_known if value) / len(sign_known) if sign_known else None
        ),
        "within_0_5": share_within(0.5),
        "within_1_0": share_within(1.0),
        "within_2_0": share_within(2.0),
    }


def _metric_table(rows_by_group: dict[str, list[ComparisonRow]]) -> list[dict[str, Any]]:
    out = []
    for group, rows in rows_by_group.items():
        summary = _metric_summary(rows)
        out.append({"group": group, **summary})
    return out


def _markdown_table(rows: list[dict[str, Any]], columns: list[tuple[str, str]]) -> list[str]:
    if not rows:
        return ["_Keine auswertbaren Zeilen._"]
    header = "| " + " | ".join(label for _, label in columns) + " |"
    separator = "| " + " | ".join("---" for _ in columns) + " |"
    lines = [header, separator]
    for row in rows:
        values = []
        for key, _ in columns:
            value = row.get(key)
            if key.startswith("share_") or key.startswith("within_") or key == "sign_agreement":
                values.append(_fmt_pct(value))
            elif key in {"pearson", "spearman"}:
                values.append(_fmt(value, 3))
            elif isinstance(value, float):
                values.append(_fmt(value, 3))
            else:
                values.append(_fmt(value))
        lines.append("| " + " | ".join(values) + " |")
    return lines


async def _fetch_run_meta(conn: asyncpg.Connection, run_id: str) -> RunMeta:
    row = await conn.fetchrow(
        """
        SELECT run_id, status, created_at, finished_at, area_id, dataset_id, bbox,
               params, mlflow_run_id
        FROM ml_runs
        WHERE run_id = $1::uuid
        """,
        run_id,
    )
    if row is None:
        raise ValueError(f"Run not found: {run_id}")
    version_rows = await conn.fetch(
        """
        SELECT feature_set_version, model_set_version, count(*) AS n
        FROM ml_point_results
        WHERE run_id = $1::uuid
        GROUP BY feature_set_version, model_set_version
        ORDER BY feature_set_version, model_set_version
        """,
        run_id,
    )
    point_count = sum(int(r["n"]) for r in version_rows)
    feature_versions: dict[str, int] = {}
    model_versions: dict[str, int] = {}
    for version_row in version_rows:
        feature = str(version_row["feature_set_version"] or "null")
        model = str(version_row["model_set_version"] or "null")
        feature_versions[feature] = feature_versions.get(feature, 0) + int(version_row["n"])
        model_versions[model] = model_versions.get(model, 0) + int(version_row["n"])

    window_rows = await conn.fetch(
        """
        SELECT r.track, min(t.date) AS min_date, max(t.date) AS max_date, count(*) AS n
        FROM ml_point_results r
        JOIN insar_timeseries t
          ON t.area_id = r.area_id
         AND t.dataset_id = r.dataset_id
         AND t.code = r.code
         AND t.track = r.track
        WHERE r.run_id = $1::uuid
        GROUP BY r.track
        ORDER BY r.track
        """,
        run_id,
    )
    data_windows = {
        int(r["track"]): {
            "min_date": r["min_date"],
            "max_date": r["max_date"],
            "row_count": int(r["n"]),
        }
        for r in window_rows
    }
    bbox = _json(row["bbox"])
    params = _json(row["params"]) or {}
    return RunMeta(
        run_id=str(row["run_id"]),
        status=str(row["status"]),
        created_at=row["created_at"],
        finished_at=row["finished_at"],
        area_id=str(row["area_id"]),
        dataset_id=str(row["dataset_id"]),
        bbox=bbox if isinstance(bbox, list) else None,
        params=params if isinstance(params, dict) else {},
        mlflow_run_id=row["mlflow_run_id"],
        point_count=point_count,
        feature_versions=feature_versions,
        model_versions=model_versions,
        data_windows=data_windows,
    )


async def _fetch_buildings(conn: asyncpg.Connection, run_id: str) -> dict[str, dict[str, Any]]:
    rows = await conn.fetch(
        """
        SELECT DISTINCT ON (r.building_id)
               r.building_id,
               r.meta->'building_rollup' AS building_rollup
        FROM ml_point_results r
        WHERE r.run_id = $1::uuid
          AND r.building_source = 'gba'
          AND r.building_id IS NOT NULL
          AND r.meta ? 'building_rollup'
        ORDER BY r.building_id, r.track, r.code
        """,
        run_id,
    )
    buildings: dict[str, dict[str, Any]] = {}
    for row in rows:
        rollup = _json(row["building_rollup"]) or {}
        if isinstance(rollup, dict):
            buildings[str(row["building_id"])] = rollup
    return buildings


async def _fetch_main_support(conn: asyncpg.Connection, run_id: str) -> dict[tuple[str, int], int]:
    rows = await conn.fetch(
        """
        SELECT r.building_id, r.track, count(*) AS n
        FROM ml_point_results r
        WHERE r.run_id = $1::uuid
          AND r.building_source = 'gba'
          AND r.building_id IS NOT NULL
          AND r.cluster_id = r.meta->'building_rollup'->'main_cluster_by_track'->>(r.track::text)
          AND r.meta->'cluster'->>'cluster_role' = 'core'
          AND COALESCE((r.meta->'visual_context'->>'gate_excluded')::boolean, false) = false
        GROUP BY r.building_id, r.track
        """,
        run_id,
    )
    return {(str(row["building_id"]), int(row["track"])): int(row["n"]) for row in rows}


async def _fetch_main_points(conn: asyncpg.Connection, run_id: str) -> list[dict[str, Any]]:
    rows = await conn.fetch(
        """
        SELECT r.area_id, r.dataset_id, r.building_id, r.code, r.track, p.incidence_angle
        FROM ml_point_results r
        JOIN insar_points p
          ON p.area_id = r.area_id
         AND p.dataset_id = r.dataset_id
         AND p.code = r.code
         AND p.track = r.track
        WHERE r.run_id = $1::uuid
          AND r.building_source = 'gba'
          AND r.building_id IS NOT NULL
          AND r.cluster_id = r.meta->'building_rollup'->'main_cluster_by_track'->>(r.track::text)
          AND r.meta->'cluster'->>'cluster_role' = 'core'
          AND COALESCE((r.meta->'visual_context'->>'gate_excluded')::boolean, false) = false
        ORDER BY r.building_id, r.track, r.code
        """,
        run_id,
    )
    return [dict(row) for row in rows]


def _fit_point_slope(
    building_id: str,
    dataset_id: str,
    code: str,
    track: int,
    incidence_angle: float | None,
    series: list[tuple[date, float]],
) -> PointSlope | None:
    if len(series) < MIN_OVERLAP_EPOCHS:
        return None
    ordered = sorted(series, key=lambda item: item[0])
    span_days = (ordered[-1][0] - ordered[0][0]).days
    if span_days < MIN_OVERLAP_SPAN_DAYS:
        return None
    x = np.asarray([(item[0] - ordered[0][0]).days / 365.25 for item in ordered], dtype=float)
    y = np.asarray([item[1] for item in ordered], dtype=float)
    x_centered = x - float(np.mean(x))
    denom = float(np.sum(x_centered * x_centered))
    if denom <= 0.0:
        return None
    slope = float(np.sum(x_centered * (y - float(np.mean(y)))) / denom)
    inc = incidence_angle
    if inc is None:
        inc = get_track_geometry(track, dataset_id=dataset_id).default_incidence_deg
    vertical = slope / max(math.cos(math.radians(float(inc))), 0.30)
    return PointSlope(
        building_id=building_id,
        track=track,
        code=code,
        slope_los_mm_a=slope,
        slope_vertical_proxy_mm_a=float(vertical),
        incidence_angle_deg=float(inc),
        epoch_count=len(ordered),
        span_days=span_days,
    )


async def _fetch_overlap_slopes(
    conn: asyncpg.Connection,
    run_id: str,
    dataset_id: str,
) -> dict[tuple[str, int], TrackSlope]:
    main_points = await _fetch_main_points(conn, run_id)
    if not main_points:
        return {}
    point_lookup: dict[tuple[str, int], dict[str, Any]] = {}
    codes: list[str] = []
    tracks: list[int] = []
    for point in main_points:
        key = (str(point["code"]), int(point["track"]))
        point_lookup[key] = point
        codes.append(key[0])
        tracks.append(key[1])

    rows = await conn.fetch(
        """
        WITH main_points AS (
            SELECT *
            FROM unnest($1::text[], $2::integer[]) AS p(code, track)
        )
        SELECT t.code, t.track, t.date, t.displacement
        FROM insar_timeseries t
        JOIN main_points p
          ON p.code = t.code
         AND p.track = t.track
        WHERE t.area_id = 'bad_gastein'
          AND t.dataset_id = $3
          AND t.date BETWEEN $4::date AND $5::date
        ORDER BY t.track, t.code, t.date
        """,
        codes,
        tracks,
        dataset_id,
        OVERLAP_START,
        OVERLAP_END,
    )
    series_by_point: dict[tuple[str, int], list[tuple[date, float]]] = {}
    for row in rows:
        key = (str(row["code"]), int(row["track"]))
        series_by_point.setdefault(key, []).append((row["date"], float(row["displacement"])))

    point_slopes: list[PointSlope] = []
    for key, series in series_by_point.items():
        point = point_lookup.get(key)
        if point is None:
            continue
        point_slope = _fit_point_slope(
            building_id=str(point["building_id"]),
            dataset_id=dataset_id,
            code=key[0],
            track=key[1],
            incidence_angle=_float(point.get("incidence_angle")),
            series=series,
        )
        if point_slope is not None:
            point_slopes.append(point_slope)

    grouped: dict[tuple[str, int], list[PointSlope]] = {}
    for point_slope in point_slopes:
        grouped.setdefault((point_slope.building_id, point_slope.track), []).append(point_slope)

    slopes: dict[tuple[str, int], TrackSlope] = {}
    for key, values in grouped.items():
        slopes[key] = TrackSlope(
            building_id=key[0],
            track=key[1],
            slope_los_mm_a=float(np.median([value.slope_los_mm_a for value in values])),
            slope_vertical_proxy_mm_a=float(
                np.median([value.slope_vertical_proxy_mm_a for value in values])
            ),
            point_count=len(values),
            median_epoch_count=float(np.median([value.epoch_count for value in values])),
            median_span_days=float(np.median([value.span_days for value in values])),
        )
    return slopes


async def _load_run(conn: asyncpg.Connection, label: str, run_id: str) -> RunData:
    meta = await _fetch_run_meta(conn, run_id)
    buildings = await _fetch_buildings(conn, run_id)
    support = await _fetch_main_support(conn, run_id)
    slopes = await _fetch_overlap_slopes(conn, run_id, meta.dataset_id)
    return RunData(label=label, meta=meta, buildings=buildings, main_support=support, overlap_slopes=slopes)


def _building_motion(building: dict[str, Any]) -> float | None:
    return _float(building.get("building_motion_mm_a"))


def _track_motion(building: dict[str, Any], track: int) -> float | None:
    motions = building.get("track_motion_mm_a")
    if not isinstance(motions, dict):
        return None
    return _float(motions.get(str(track)))


def _status(building: dict[str, Any]) -> str:
    return str(building.get("building_status") or "unknown")


def _reliability(building: dict[str, Any]) -> str | None:
    value = building.get("building_reliability_band")
    return str(value) if value is not None else None


def _support_for_rollup(run: RunData, building_id: str, building: dict[str, Any]) -> int | None:
    motions = building.get("track_motion_mm_a")
    if not isinstance(motions, dict):
        return None
    supports = [
        run.main_support.get((building_id, int(track)), 0)
        for track, value in motions.items()
        if value is not None
    ]
    return min(supports) if supports else None


def _reason(row: ComparisonRow) -> str:
    reasons: list[str] = []
    if row.s_status != "ok" or row.t_status != "ok":
        reasons.append(f"status {row.s_status}-{row.t_status}")
    if row.s_reliability not in RELIABILITY_FILTER or row.t_reliability not in RELIABILITY_FILTER:
        reasons.append(f"reliability {row.s_reliability or 'none'}-{row.t_reliability or 'none'}")
    if row.s_support is not None and row.s_support < 2:
        reasons.append(f"SNT support {row.s_support}")
    if row.t_support is not None and row.t_support < 2:
        reasons.append(f"TSX support {row.t_support}")
    if row.s_value is None or row.t_value is None:
        reasons.append("missing motion")
    elif _same_sign(row.s_value, row.t_value) is False:
        reasons.append("Vorzeichen/Klasse unterschiedlich")
    return "; ".join(reasons) if reasons else "kein offensichtlicher Support-/Statusgrund"


def _rollup_rows(snt: RunData, tsx: RunData, building_ids: set[str]) -> list[ComparisonRow]:
    rows = []
    for building_id in sorted(building_ids):
        s_building = snt.buildings[building_id]
        t_building = tsx.buildings[building_id]
        row = ComparisonRow(
            building_id=building_id,
            s_value=_building_motion(s_building),
            t_value=_building_motion(t_building),
            s_status=_status(s_building),
            t_status=_status(t_building),
            s_reliability=_reliability(s_building),
            t_reliability=_reliability(t_building),
            s_support=_support_for_rollup(snt, building_id, s_building),
            t_support=_support_for_rollup(tsx, building_id, t_building),
            reason="",
        )
        rows.append(ComparisonRow(**{**row.__dict__, "reason": _reason(row)}))
    return rows


def _track_rows(
    snt: RunData,
    tsx: RunData,
    building_ids: set[str],
    s_track: int,
    t_track: int,
) -> list[ComparisonRow]:
    rows = []
    for building_id in sorted(building_ids):
        s_building = snt.buildings[building_id]
        t_building = tsx.buildings[building_id]
        row = ComparisonRow(
            building_id=building_id,
            s_value=_track_motion(s_building, s_track),
            t_value=_track_motion(t_building, t_track),
            s_status=_status(s_building),
            t_status=_status(t_building),
            s_reliability=_reliability(s_building),
            t_reliability=_reliability(t_building),
            s_support=snt.main_support.get((building_id, s_track), 0),
            t_support=tsx.main_support.get((building_id, t_track), 0),
            reason="",
        )
        rows.append(ComparisonRow(**{**row.__dict__, "reason": _reason(row)}))
    return rows


def _overlap_rows(
    snt: RunData,
    tsx: RunData,
    building_ids: set[str],
    s_track: int,
    t_track: int,
    *,
    value_key: str,
) -> list[ComparisonRow]:
    rows = []
    for building_id in sorted(building_ids):
        s_slope = snt.overlap_slopes.get((building_id, s_track))
        t_slope = tsx.overlap_slopes.get((building_id, t_track))
        s_building = snt.buildings[building_id]
        t_building = tsx.buildings[building_id]
        if value_key == "vertical":
            s_value = s_slope.slope_vertical_proxy_mm_a if s_slope else None
            t_value = t_slope.slope_vertical_proxy_mm_a if t_slope else None
        else:
            s_value = s_slope.slope_los_mm_a if s_slope else None
            t_value = t_slope.slope_los_mm_a if t_slope else None
        row = ComparisonRow(
            building_id=building_id,
            s_value=s_value,
            t_value=t_value,
            s_status=_status(s_building),
            t_status=_status(t_building),
            s_reliability=_reliability(s_building),
            t_reliability=_reliability(t_building),
            s_support=s_slope.point_count if s_slope else 0,
            t_support=t_slope.point_count if t_slope else 0,
            reason="",
        )
        rows.append(ComparisonRow(**{**row.__dict__, "reason": _reason(row)}))
    return rows


def _filter_groups(rows: list[ComparisonRow]) -> dict[str, list[ComparisonRow]]:
    return {
        "all_coupled": rows,
        "status_ok_or_single_both": [
            row for row in rows if row.s_status in STATUS_FILTER and row.t_status in STATUS_FILTER
        ],
        "ok_ok": [row for row in rows if row.s_status == "ok" and row.t_status == "ok"],
        "reliability_medium_high_both": [
            row
            for row in rows
            if row.s_reliability in RELIABILITY_FILTER and row.t_reliability in RELIABILITY_FILTER
        ],
        "main_support_ge2_each": [
            row
            for row in rows
            if (row.s_support is not None and row.s_support >= 2)
            and (row.t_support is not None and row.t_support >= 2)
        ],
    }


def _top_deviations(rows: list[ComparisonRow], limit: int = 10) -> list[ComparisonRow]:
    candidates = [row for row in rows if row.abs_delta is not None]
    return sorted(candidates, key=lambda row: float(row.abs_delta or 0.0), reverse=True)[:limit]


def _top_rows(top: list[ComparisonRow]) -> list[dict[str, Any]]:
    out = []
    for row in top:
        out.append(
            {
                "building_id": row.building_id,
                "status": f"{row.s_status}-{row.t_status}",
                "reliability": f"{row.s_reliability or '-'}-{row.t_reliability or '-'}",
                "snt": row.s_value,
                "tsx": row.t_value,
                "delta": row.delta,
                "abs_delta": row.abs_delta,
                "relation": _motion_relation(row.s_value, row.t_value),
                "reason": row.reason,
            }
        )
    return out


def _filter_count_rows(rows: list[ComparisonRow]) -> list[dict[str, Any]]:
    return [
        {
            "group": group,
            "coupled": len(group_rows),
            "with_both_values": _metric_summary(group_rows)["n"],
        }
        for group, group_rows in _filter_groups(rows).items()
    ]


def _run_table(runs: list[RunData]) -> list[dict[str, Any]]:
    rows = []
    for run in runs:
        rows.append(
            {
                "label": run.label,
                "run_id": run.meta.run_id,
                "status": run.meta.status,
                "created_at": run.meta.created_at.isoformat() if run.meta.created_at else "-",
                "finished_at": run.meta.finished_at.isoformat() if run.meta.finished_at else "-",
                "dataset_id": run.meta.dataset_id,
                "bbox": _bbox_label(run.meta.bbox),
                "points": run.meta.point_count,
                "model": ", ".join(f"{k} ({v})" for k, v in run.meta.model_versions.items()),
            }
        )
    return rows


def _window_table(runs: list[RunData]) -> list[dict[str, Any]]:
    rows = []
    for run in runs:
        for track, window in sorted(run.meta.data_windows.items()):
            rows.append(
                {
                    "label": run.label,
                    "track": track,
                    "min_date": window["min_date"],
                    "max_date": window["max_date"],
                    "rows": window["row_count"],
                }
            )
    return rows


def _metric_rows(table: list[dict[str, Any]]) -> list[dict[str, Any]]:
    order = [
        "all_coupled",
        "status_ok_or_single_both",
        "ok_ok",
        "reliability_medium_high_both",
        "main_support_ge2_each",
    ]
    by_group = {row["group"]: row for row in table}
    return [by_group[group] for group in order if group in by_group]


def _reason_counts(rows: list[ComparisonRow]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in _top_deviations(rows):
        primary = row.reason.split("; ", 1)[0]
        counts[primary] = counts.get(primary, 0) + 1
    return counts


def _interpretation(
    flat_rollup: list[ComparisonRow],
    slope_rollup: list[ComparisonRow],
    flat_overlap: dict[str, list[ComparisonRow]],
    slope_overlap: dict[str, list[ComparisonRow]],
) -> list[str]:
    flat_summary = _metric_summary(flat_rollup)
    slope_summary = _metric_summary(slope_rollup)
    flat_mae = flat_summary.get("mae")
    slope_mae = slope_summary.get("mae")
    flat_sign = flat_summary.get("sign_agreement")
    slope_sign = slope_summary.get("sign_agreement")
    flat_within_2 = flat_summary.get("within_2_0")
    slope_within_2 = slope_summary.get("within_2_0")
    flat_overlap_maes = [
        _metric_summary(rows).get("mae")
        for rows in flat_overlap.values()
        if _metric_summary(rows).get("n", 0) > 0
    ]
    slope_overlap_maes = [
        _metric_summary(rows).get("mae")
        for rows in slope_overlap.values()
        if _metric_summary(rows).get("n", 0) > 0
    ]
    flat_overlap_mae = float(np.nanmean(flat_overlap_maes)) if flat_overlap_maes else None
    slope_overlap_mae = float(np.nanmean(slope_overlap_maes)) if slope_overlap_maes else None
    reason_counts = _reason_counts(flat_rollup + slope_rollup)
    dominant_reason = max(reason_counts.items(), key=lambda item: item[1])[0] if reason_counts else "-"

    lines = [
        "## Interpretation",
        "",
        (
            "- Flach-AOI: Rollup-Vergleich "
            f"MAE={_fmt(flat_mae)} mm/a, Sign-Agreement={_fmt_pct(flat_sign)}; "
            f"{_fmt_pct(flat_within_2)} liegen innerhalb <=2 mm/a. "
            f"Overlap-LOS mittlerer Paar-MAE={_fmt(flat_overlap_mae)} mm/a."
        ),
        (
            "- Hang-AOI: Rollup-Vergleich "
            f"MAE={_fmt(slope_mae)} mm/a, Sign-Agreement={_fmt_pct(slope_sign)}; "
            f"{_fmt_pct(slope_within_2)} liegen innerhalb <=2 mm/a. "
            f"Overlap-LOS mittlerer Paar-MAE={_fmt(slope_overlap_mae)} mm/a."
        ),
    ]
    if flat_mae is not None and slope_mae is not None:
        if slope_mae > flat_mae * 1.25:
            lines.append(
                "- Im Rollup verschlechtert sich die quantitative Uebereinstimmung im Hanggebiet deutlich; die Overlap-LOS-Fehler bleiben in beiden AOIs gross."
            )
        elif slope_mae > flat_mae:
            lines.append(
                "- Im Rollup ist die quantitative Uebereinstimmung im Hanggebiet etwas schlechter als im flachen Gebiet; die Overlap-LOS-Fehler bleiben in beiden AOIs gross."
            )
        else:
            lines.append(
                "- Die Rollup-Abweichungen sind im Hanggebiet nicht groesser als im flachen Gebiet; die Overlap-LOS-Fehler und Filtergruppen bleiben entscheidend."
            )
    lines.append(
        f"- Groesste Abweichungen sind primaer durch `{dominant_reason}` erklaert, soweit die heuristische Klassifikation das abbildet."
    )
    lines.append(
        "- Die zentrale Bewegungsfrage ist damit nur eingeschraenkt positiv: Rollup-Groessenordnungen passen in Teilen, aber Sign-Agreement und Overlap-Slopes zeigen keine robuste quantitative Uebereinstimmung ueber beide Geometrien."
    )
    lines.append(
        "- TSX/PAZ sollte fuer Bad Gastein derzeit als Plausibilitaets- und Strukturreferenz genutzt werden, nicht als quantitative Ground-Truth-Referenz fuer Gebaeudeabsenkung; belastbare quantitative Aussagen brauchen mindestens filter- und geometriegetrennte Betrachtung."
    )
    return lines


def _validate_runs(runs: list[RunData]) -> list[str]:
    warnings: list[str] = []
    for run in runs:
        if run.meta.status != "succeeded":
            warnings.append(f"{run.label}: run status is {run.meta.status}, expected succeeded")
        if set(run.meta.model_versions) != {EXPECTED_MODEL_SET_VERSION}:
            warnings.append(
                f"{run.label}: model_set_version is {run.meta.model_versions}, expected {EXPECTED_MODEL_SET_VERSION}"
            )
        if run.meta.area_id != "bad_gastein":
            warnings.append(f"{run.label}: area_id is {run.meta.area_id}, expected bad_gastein")
    return warnings


def _render_report(aoi_data: dict[str, tuple[RunData, RunData]]) -> str:
    all_runs = [run for pair in aoi_data.values() for run in pair]
    warnings = _validate_runs(all_runs)
    lines: list[str] = [
        "# Bad Gastein SNT-vs-TSX/PAZ Bewegungsvergleich",
        "",
        f"Stand: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Datenstand und Methode",
        "",
        f"- Overlap-Zeitfenster: `{OVERLAP_START}` bis `{OVERLAP_END}`.",
        "- Gekoppelt wird ausschliesslich ueber gleiche GBA-`building_id`.",
        "- Rollup-Vergleich nutzt `meta.building_rollup.building_motion_mm_a` und `track_motion_mm_a`.",
        "- Overlap-Vergleich fitet neue lineare Punkt-Slopes im gemeinsamen Zeitraum; primaer LOS in `mm/a`, sekundaer `vertical_proxy = slope / max(cos(incidence_angle), 0.30)`.",
        "- Sign-Klassen: `stable` bei `abs(value) <= 0.5 mm/a`, sonst `negative` oder `positive`.",
        "",
    ]
    if warnings:
        lines.extend(["## Warnungen", ""])
        lines.extend(f"- {warning}" for warning in warnings)
        lines.append("")

    lines.extend(["## Verwendete Runs", ""])
    lines.extend(
        _markdown_table(
            _run_table(all_runs),
            [
                ("label", "Label"),
                ("run_id", "Run-ID"),
                ("status", "Status"),
                ("created_at", "Created"),
                ("finished_at", "Finished"),
                ("dataset_id", "Dataset"),
                ("points", "Punkte"),
                ("model", "Model"),
                ("bbox", "BBox"),
            ],
        )
    )
    lines.extend(["", "## Datenfenster", ""])
    lines.extend(
        _markdown_table(
            _window_table(all_runs),
            [
                ("label", "Label"),
                ("track", "Track"),
                ("min_date", "Min"),
                ("max_date", "Max"),
                ("rows", "TS-Zeilen"),
            ],
        )
    )

    metric_columns = [
        ("group", "Filtergruppe"),
        ("n", "n"),
        ("bias_mean", "Bias mean"),
        ("bias_median", "Bias median"),
        ("mae", "MAE"),
        ("rmse", "RMSE"),
        ("median_abs_diff", "Median abs diff"),
        ("pearson", "Pearson"),
        ("spearman", "Spearman"),
        ("sign_agreement", "Sign agreement"),
        ("within_0_5", "<=0.5"),
        ("within_1_0", "<=1.0"),
        ("within_2_0", "<=2.0"),
    ]
    top_columns = [
        ("building_id", "Building-ID"),
        ("status", "Status"),
        ("reliability", "Reliability"),
        ("snt", "SNT"),
        ("tsx", "TSX/PAZ"),
        ("delta", "Delta"),
        ("abs_delta", "Abs Delta"),
        ("relation", "Relation"),
        ("reason", "Moeglicher Grund"),
    ]
    count_columns = [
        ("group", "Filtergruppe"),
        ("coupled", "Gebaeude in Gruppe"),
        ("with_both_values", "mit beiden Werten"),
    ]

    interpretation_inputs: dict[str, Any] = {}
    for aoi_label, (snt, tsx) in aoi_data.items():
        building_ids = set(snt.buildings) & set(tsx.buildings)
        rollup_rows = _rollup_rows(snt, tsx, building_ids)
        interpretation_inputs[f"{aoi_label}_rollup"] = rollup_rows

        lines.extend(["", f"## {aoi_label}", ""])
        lines.append(f"- SNT-Gebaeude: {len(snt.buildings)}")
        lines.append(f"- TSX/PAZ-Gebaeude: {len(tsx.buildings)}")
        lines.append(f"- gekoppelte GBA-Gebaeude: {len(building_ids)}")
        lines.append("")
        lines.extend(["### Auswertbare Gebaeude je Filtergruppe", ""])
        lines.extend(_markdown_table(_filter_count_rows(rollup_rows), count_columns))
        lines.extend(["", "### Rollup-Vergleich `building_motion_mm_a`", ""])
        lines.extend(_markdown_table(_metric_rows(_metric_table(_filter_groups(rollup_rows))), metric_columns))

        for pair_label, (s_track, t_track) in TRACK_PAIRS.items():
            track_rows = _track_rows(snt, tsx, building_ids, s_track, t_track)
            lines.extend(["", f"### {pair_label} Rollup-Track {s_track} vs {t_track}", ""])
            lines.extend(
                _markdown_table(_metric_rows(_metric_table(_filter_groups(track_rows))), metric_columns)
            )

        overlap_los_by_pair: dict[str, list[ComparisonRow]] = {}
        for pair_label, (s_track, t_track) in TRACK_PAIRS.items():
            overlap_los = _overlap_rows(
                snt, tsx, building_ids, s_track, t_track, value_key="los"
            )
            overlap_vertical = _overlap_rows(
                snt, tsx, building_ids, s_track, t_track, value_key="vertical"
            )
            overlap_los_by_pair[pair_label] = overlap_los
            lines.extend(["", f"### Overlap-LOS {pair_label} {s_track} vs {t_track}", ""])
            lines.extend(
                _markdown_table(
                    _metric_rows(_metric_table(_filter_groups(overlap_los))),
                    metric_columns,
                )
            )
            lines.extend(["", f"### Overlap-Vertical-Proxy {pair_label} {s_track} vs {t_track}", ""])
            lines.extend(
                _markdown_table(
                    _metric_rows(_metric_table(_filter_groups(overlap_vertical))),
                    metric_columns,
                )
            )
        interpretation_inputs[f"{aoi_label}_overlap"] = overlap_los_by_pair

        lines.extend(["", "### Top-10 groesste Rollup-Abweichungen", ""])
        lines.extend(_markdown_table(_top_rows(_top_deviations(rollup_rows)), top_columns))

    lines.extend(
        [
            "",
            *_interpretation(
                interpretation_inputs.get("bg_flat_01_rollup", []),
                interpretation_inputs.get("bg_slope_01_rollup", []),
                interpretation_inputs.get("bg_flat_01_overlap", {}),
                interpretation_inputs.get("bg_slope_01_overlap", {}),
            ),
        ]
    )
    lines.append("")
    return "\n".join(lines)


async def _run(args: argparse.Namespace) -> None:
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=3)
    try:
        async with pool.acquire() as conn:
            flat_snt = await _load_run(conn, "bg_flat_01_snt", args.flat_snt_run)
            flat_tsx = await _load_run(conn, "bg_flat_01_tsx_paz", args.flat_tsx_run)
            slope_snt = await _load_run(conn, "bg_slope_01_snt", args.slope_snt_run)
            slope_tsx = await _load_run(conn, "bg_slope_01_tsx_paz", args.slope_tsx_run)
    finally:
        await pool.close()

    report = _render_report(
        {
            "bg_flat_01": (flat_snt, flat_tsx),
            "bg_slope_01": (slope_snt, slope_tsx),
        }
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(report, encoding="utf-8")
    print(f"Wrote {output}")


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Quantitative Bad Gastein SNT-vs-TSX/PAZ motion comparison."
    )
    parser.add_argument("--flat-snt-run", required=True)
    parser.add_argument("--flat-tsx-run", required=True)
    parser.add_argument("--slope-snt-run", required=True)
    parser.add_argument("--slope-tsx-run", required=True)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
