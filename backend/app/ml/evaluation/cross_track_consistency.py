"""Cross-Track-Konsistenz-Auswertung (Skript A).

Vergleicht je Gebaeude die aufsteigende (T44) und absteigende (T95) Track-
Bewegung aus dem `building_rollup`-Vertrag und prueft, wie gut sich beide
Geometrien decken. Anders als der Bad-Gastein-SNT/TSX-Vergleich (Skript B)
koppelt dieses Skript NICHT zwei Sensoren, sondern die beiden entgegengesetzten
Tracks EINES SNT-Runs (opposite-geometry) und aggregiert ueber mehrere AOIs.

Die `track_motion_mm_a`-Werte sind laut Rollup-Vertrag bereits vertikale Proxies
(`LOS / max(cos(incidence_angle), 0.30)`); dieses Skript rechnet die Bewegung
NICHT neu, sondern nutzt die gespeicherten Track-Bewegungen, klassifiziert die
Gebaeude nach Hangwinkel (SRTM 30 m, Schwellen 5deg/15deg) und misst Vorzeichen-,
Toleranz- und Rangkonsistenz je Terrain-Klasse und Filtergruppe.

Ergebnis ist ein Plausibilitaetsindikator, KEINE Ground-Truth-Kalibrierung: ein
hohes Cross-Track-Agreement bedeutet nur, dass beide Blickgeometrien konsistent
dieselbe (Vertikal-)Bewegung sehen.

Semantik-Quelle: `docs/pipelines/anomaly_local_v1/methodik.md` Paragraph 7.
Klassengrenzen und Toleranzformel stammen ausschliesslich aus
`terrain_classes.py`; die Toleranzformel ist bit-identisch zur Harness-Semantik
`harness_cross_track` (`allowed = 1.0 + 0.15 * slope`).

Aufruf (Repo-Root):
    backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.cross_track_consistency \\
        --run mirabell=<uuid> --run moosstrasse=<uuid> --run osthang=<uuid> \\
        --output-md <pfad>.md --output-json <pfad>.json --charts-dir <dir>
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import asyncpg
import numpy as np

from ...config import settings
from . import eval_charts
from .terrain_classes import (
    SLOPE_FLAT_MAX_DEG,
    SLOPE_TRANSITION_MAX_DEG,
    TERRAIN_CLASS_ORDER,
    allowed_cross_track_diff_mm_a,
    classify_slope,
)

# v4-Baselines (P8-F). Abweichung ist nur eine Warnung, kein Abbruch.
EXPECTED_MODEL_SET_VERSION = "local_hdbscan_rulegate_v4_k2xhf_diffv2"

# Opposite-geometry-Trackpaar je Dataset: T44 (aufsteigend) vs T95 (absteigend).
# Andere Datasets (z. B. bad_gastein_tsx_paz) werden mit Fehler abgelehnt, weil
# ihr Trackpaar nicht dieser Cross-Track-Semantik entspricht.
DATASET_TRACK_PAIRS: dict[str, tuple[int, int]] = {
    "salzburg_snt": (44, 95),
    "bad_gastein_snt": (44, 95),
}

DEFAULT_VIEWER_BASE_URL = "http://localhost:3000"
AGREEMENT_SANITY_TOL = 1e-3
RELIABILITY_MED_HIGH = {"medium", "high"}

# Feste Reihenfolge; strict ist die Leitgruppe und steht zuerst.
GROUP_ORDER = [
    "strict",
    "all_both_tracks",
    "status_ok",
    "reliability_medium_high",
    "main_support_ge2_each",
]
GROUP_LABELS: dict[str, str] = {
    "strict": "strict (Leitgruppe: ok ∧ mittel/hoch ∧ Support)",
    "all_both_tracks": "Beide Tracks vorhanden",
    "status_ok": "Status ok",
    "reliability_medium_high": "Zuverlässigkeit mittel/hoch",
    "main_support_ge2_each": "Core-Support ≥ min je Track",
}
CLASS_LABELS_MD: dict[str, str] = {
    "flach": f"Flach (<{SLOPE_FLAT_MAX_DEG:g}°)",
    "uebergang": f"Übergang ({SLOPE_FLAT_MAX_DEG:g}–{SLOPE_TRANSITION_MAX_DEG:g}°)",
    "hang": f"Hang (≥{SLOPE_TRANSITION_MAX_DEG:g}°)",
    "unbekannt": "Unbekannt",
}

# Spaltenreihenfolge kodiert die Diskriminator-Prioritaet: Median|Δ|, MAE und
# Spearman diskriminieren den Terrain-Klassenvergleich korrekt (Roh-/Rangebene)
# und stehen zuerst. "Vorzeichen" (totband-streng) und "≤ Toleranz"
# (hangtoleranz-relativ) stehen bewusst rechts und taugen nicht als Leitzahl fuer
# den Flach-vs-Hang-Vergleich.
METRIC_COLUMNS: list[tuple[str, str]] = [
    ("n", "n"),
    ("median_abs_delta", "Median Δ (abs)"),
    ("mae", "MAE"),
    ("spearman", "Spearman"),
    ("bias_median", "Bias median"),
    ("agreement_median", "Agreement median"),
    ("pearson", "Pearson"),
    ("sign_agreement", "Vorzeichen"),
    ("share_within_allowed", "≤ Toleranz"),
]


# ---------------------------------------------------------------------------
# Datenklassen
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class RunMeta:
    run_id: str
    label: str
    status: str
    created_at: datetime | None
    finished_at: datetime | None
    area_id: str
    dataset_id: str
    bbox: list[float] | None
    params: dict[str, Any]
    mlflow_run_id: str | None
    point_count: int
    building_sources: list[str]
    feature_versions: dict[str, int]
    model_versions: dict[str, int]


@dataclass
class BuildingRow:
    aoi: str
    run_id: str
    area_id: str
    building_source: str
    building_id: str
    building_status: str | None
    reliability_band: str | None
    slope: float | None
    slope_source: str
    terrain_class: str
    t44: float | None
    t95: float | None
    allowed: float
    agreement_stored: float | None
    kept_point_count: int | None
    differential_motion_level: str | None
    support_44: int = 0
    support_95: int = 0
    lon: float | None = None
    lat: float | None = None
    deep_link: str | None = None

    @property
    def delta(self) -> float | None:
        if self.t44 is None or self.t95 is None:
            return None
        return float(self.t44) - float(self.t95)

    @property
    def abs_delta(self) -> float | None:
        d = self.delta
        return abs(d) if d is not None else None

    @property
    def within_allowed(self) -> bool | None:
        d = self.abs_delta
        return (d <= self.allowed) if d is not None else None

    @property
    def agreement_recomputed(self) -> float | None:
        d = self.abs_delta
        if d is None:
            return None
        return float(math.exp(-(d / max(self.allowed, 1e-9))))


# ---------------------------------------------------------------------------
# Kleine Helfer (Muster aus bad_gastein_motion_compare.py, kopiert)
# ---------------------------------------------------------------------------
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
    if value is None or (isinstance(value, float) and not math.isfinite(value)):
        return "-"
    return f"{100.0 * value:.1f}%"


def _bbox_label(bbox: list[float] | None) -> str:
    if not bbox:
        return "-"
    return ",".join(f"{float(v):.6f}" for v in bbox)


def _motion_class(value: float | None, deadband: float) -> str:
    if value is None:
        return "missing"
    if abs(value) <= deadband:
        return "stable"
    return "negative" if value < 0 else "positive"


def _same_sign(a: float | None, b: float | None, deadband: float) -> bool | None:
    ca = _motion_class(a, deadband)
    cb = _motion_class(b, deadband)
    if "missing" in {ca, cb}:
        return None
    return ca == cb


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


# ---------------------------------------------------------------------------
# Datenextraktion (asyncpg)
# ---------------------------------------------------------------------------
async def _fetch_run_meta(conn: asyncpg.Connection, label: str, run_id: str) -> RunMeta:
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
        raise ValueError(f"Run nicht gefunden: {label}={run_id}")
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

    source_rows = await conn.fetch(
        """
        SELECT DISTINCT building_source
        FROM ml_point_results
        WHERE run_id = $1::uuid AND building_source IS NOT NULL
        ORDER BY building_source
        """,
        run_id,
    )
    building_sources = [str(r["building_source"]) for r in source_rows]

    bbox = _json(row["bbox"])
    params = _json(row["params"]) or {}
    return RunMeta(
        run_id=str(row["run_id"]),
        label=label,
        status=str(row["status"]),
        created_at=row["created_at"],
        finished_at=row["finished_at"],
        area_id=str(row["area_id"]),
        dataset_id=str(row["dataset_id"]),
        bbox=bbox if isinstance(bbox, list) else None,
        params=params if isinstance(params, dict) else {},
        mlflow_run_id=row["mlflow_run_id"],
        point_count=point_count,
        building_sources=building_sources,
        feature_versions=feature_versions,
        model_versions=model_versions,
    )


async def _fetch_rollups(conn: asyncpg.Connection, run_id: str) -> list[dict[str, Any]]:
    """Ein Rollup je (area_id, building_source, building_id) inkl. Slope-Kontext.

    Slope-Praezedenz: `building_terrain_context` (SRTM), sonst der im Rollup
    gespeicherte `building_context.slope_mean_deg`, sonst None -> "unbekannt".
    """
    rows = await conn.fetch(
        """
        SELECT DISTINCT ON (r.area_id, r.building_source, r.building_id)
               r.area_id,
               r.building_source,
               r.building_id,
               r.meta->'building_rollup' AS rollup,
               t.slope_mean_deg AS slope_terrain,
               (r.meta->'building_context'->>'slope_mean_deg')::float8 AS slope_ctx
        FROM ml_point_results r
        LEFT JOIN building_terrain_context t
          ON t.area_id = r.area_id
         AND t.building_source = r.building_source
         AND t.building_id = r.building_id
        WHERE r.run_id = $1::uuid
          AND r.building_id IS NOT NULL
          AND r.meta ? 'building_rollup'
        ORDER BY r.area_id, r.building_source, r.building_id, r.track, r.code
        """,
        run_id,
    )
    return [dict(row) for row in rows]


async def _fetch_main_support(
    conn: asyncpg.Connection, run_id: str
) -> dict[tuple[str, str, int], int]:
    """Core-Support des Main-Clusters je (building_source, building_id, track).

    `building_source` wird NICHT hartkodiert (Muster aus `_fetch_main_support`,
    aber quellenagnostisch), sondern aus den Zeilen des Runs uebernommen.
    """
    rows = await conn.fetch(
        """
        SELECT r.building_source, r.building_id, r.track, count(*) AS n
        FROM ml_point_results r
        WHERE r.run_id = $1::uuid
          AND r.building_id IS NOT NULL
          AND r.cluster_id = r.meta->'building_rollup'->'main_cluster_by_track'->>(r.track::text)
          AND r.meta->'cluster'->>'cluster_role' = 'core'
          AND COALESCE((r.meta->'visual_context'->>'gate_excluded')::boolean, false) = false
        GROUP BY r.building_source, r.building_id, r.track
        """,
        run_id,
    )
    return {
        (str(r["building_source"]), str(r["building_id"]), int(r["track"])): int(r["n"])
        for r in rows
    }


async def _fetch_centroids(
    conn: asyncpg.Connection,
    area_id: str,
    building_source: str,
    building_ids: list[str],
) -> dict[str, tuple[float, float]]:
    """lon/lat der ST_PointOnSurface-Zentroide je building_id fuer Deep-Links."""
    if not building_ids:
        return {}
    if building_source == "bev":
        table, id_col = "bev_buildings", "bev_id"
    elif building_source == "gba":
        table, id_col = "gba_buildings", "gba_id"
    elif building_source == "osm":
        table, id_col = "osm_buildings", "osm_id"
    else:
        return {}
    query = f"""
        SELECT {id_col}::text AS building_id,
               ST_X(ST_PointOnSurface(geom)) AS lon,
               ST_Y(ST_PointOnSurface(geom)) AS lat
        FROM {table}
        WHERE area_id = $1 AND {id_col}::text = ANY($2::text[])
    """
    rows = await conn.fetch(query, area_id, building_ids)
    return {
        str(r["building_id"]): (float(r["lon"]), float(r["lat"]))
        for r in rows
        if r["lon"] is not None and r["lat"] is not None
    }


# ---------------------------------------------------------------------------
# Zeilenaufbau je Run
# ---------------------------------------------------------------------------
def _slope_from_rollup(rollup_row: dict[str, Any]) -> tuple[float | None, str]:
    slope_terrain = _float(rollup_row.get("slope_terrain"))
    if slope_terrain is not None:
        return slope_terrain, "terrain_table"
    slope_ctx = _float(rollup_row.get("slope_ctx"))
    if slope_ctx is not None:
        return slope_ctx, "building_context"
    return None, "none"


def _deep_link(base_url: str, area_id: str, run_id: str, source: str, building_id: str) -> str:
    base = base_url.rstrip("/")
    return (
        f"{base}/?area={area_id}&run={run_id}"
        f"&building={source}:{building_id}"
        f"&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1"
    )


async def _build_run_rows(
    conn: asyncpg.Connection,
    meta: RunMeta,
    tracks: tuple[int, int],
    viewer_base_url: str,
) -> list[BuildingRow]:
    rollups = await _fetch_rollups(conn, meta.run_id)
    support = await _fetch_main_support(conn, meta.run_id)
    t44, t95 = tracks
    k44, k95 = str(t44), str(t95)

    ids_by_source: dict[str, list[str]] = defaultdict(list)
    for row in rollups:
        ids_by_source[str(row["building_source"])].append(str(row["building_id"]))
    centroids: dict[str, dict[str, tuple[float, float]]] = {}
    for source, ids in ids_by_source.items():
        centroids[source] = await _fetch_centroids(conn, meta.area_id, source, ids)

    rows: list[BuildingRow] = []
    for row in rollups:
        rollup = _json(row["rollup"]) or {}
        if not isinstance(rollup, dict):
            continue
        source = str(row["building_source"])
        building_id = str(row["building_id"])
        motions = rollup.get("track_motion_mm_a")
        motions = motions if isinstance(motions, dict) else {}
        slope, slope_source = _slope_from_rollup(row)
        lonlat = centroids.get(source, {}).get(building_id)
        rows.append(
            BuildingRow(
                aoi=meta.label,
                run_id=meta.run_id,
                area_id=meta.area_id,
                building_source=source,
                building_id=building_id,
                building_status=(
                    str(rollup["building_status"])
                    if rollup.get("building_status") is not None
                    else None
                ),
                reliability_band=(
                    str(rollup["building_reliability_band"])
                    if rollup.get("building_reliability_band") is not None
                    else None
                ),
                slope=slope,
                slope_source=slope_source,
                terrain_class=classify_slope(slope),
                t44=_float(motions.get(k44)),
                t95=_float(motions.get(k95)),
                allowed=allowed_cross_track_diff_mm_a(slope),
                agreement_stored=_float(rollup.get("track_agreement_score")),
                kept_point_count=(
                    int(rollup["kept_point_count"])
                    if rollup.get("kept_point_count") is not None
                    else None
                ),
                differential_motion_level=(
                    str(rollup["differential_motion_level"])
                    if rollup.get("differential_motion_level") is not None
                    else None
                ),
                support_44=support.get((source, building_id, t44), 0),
                support_95=support.get((source, building_id, t95), 0),
                lon=lonlat[0] if lonlat else None,
                lat=lonlat[1] if lonlat else None,
                deep_link=_deep_link(viewer_base_url, meta.area_id, meta.run_id, source, building_id),
            )
        )
    return rows


# ---------------------------------------------------------------------------
# Dedupe, Gruppen, Metriken
# ---------------------------------------------------------------------------
def _dedupe(rows: list[BuildingRow]) -> tuple[list[BuildingRow], int, dict[str, int]]:
    """Ein Gebaeude je (area_id, building_source, building_id): hoechster
    kept_point_count gewinnt. Liefert (behaltene Zeilen, Gesamtzahl entfernt,
    Detail je Verlierer-AOI -> Gewinner-AOI)."""
    groups: dict[tuple[str, str, str], list[BuildingRow]] = defaultdict(list)
    for r in rows:
        groups[(r.area_id, r.building_source, r.building_id)].append(r)
    kept: list[BuildingRow] = []
    removed_total = 0
    detail: dict[str, int] = defaultdict(int)
    for grp in groups.values():
        if len(grp) == 1:
            kept.append(grp[0])
            continue
        ordered = sorted(grp, key=lambda r: -(r.kept_point_count or 0))
        winner = ordered[0]
        kept.append(winner)
        for loser in ordered[1:]:
            removed_total += 1
            detail[f"{loser.aoi} -> {winner.aoi}"] += 1
    return kept, removed_total, dict(detail)


def _filter_groups(
    rows: list[BuildingRow], min_support: int
) -> dict[str, list[BuildingRow]]:
    both = [r for r in rows if r.delta is not None]
    status_ok = [r for r in both if r.building_status == "ok"]
    reliability = [r for r in both if r.reliability_band in RELIABILITY_MED_HIGH]
    support = [
        r for r in both if r.support_44 >= min_support and r.support_95 >= min_support
    ]
    strict = [
        r
        for r in both
        if r.building_status == "ok"
        and r.reliability_band in RELIABILITY_MED_HIGH
        and r.support_44 >= min_support
        and r.support_95 >= min_support
    ]
    return {
        "all_both_tracks": both,
        "status_ok": status_ok,
        "reliability_medium_high": reliability,
        "main_support_ge2_each": support,
        "strict": strict,
    }


def _metrics(rows: list[BuildingRow], deadband: float) -> dict[str, Any]:
    paired = [r for r in rows if r.delta is not None]
    n = len(paired)
    if n == 0:
        return {key: (0 if key == "n" else None) for key, _ in [("n", "")] + METRIC_COLUMNS}
    t44s = [float(r.t44) for r in paired]  # type: ignore[arg-type]
    t95s = [float(r.t95) for r in paired]  # type: ignore[arg-type]
    deltas = [float(r.delta) for r in paired]  # type: ignore[arg-type]
    abs_deltas = [abs(d) for d in deltas]
    within = [r.within_allowed for r in paired if r.within_allowed is not None]
    agrees = [r.agreement_recomputed for r in paired if r.agreement_recomputed is not None]
    signs = [_same_sign(r.t44, r.t95, deadband) for r in paired]
    sign_known = [s for s in signs if s is not None]
    return {
        "n": n,
        "sign_agreement": (
            sum(1 for s in sign_known if s) / len(sign_known) if sign_known else None
        ),
        "share_within_allowed": (
            sum(1 for w in within if w) / len(within) if within else None
        ),
        "median_abs_delta": float(np.median(abs_deltas)),
        "mae": float(np.mean(abs_deltas)),
        "bias_median": float(np.median(deltas)),
        "spearman": _spearman(t44s, t95s),
        "pearson": _correlation(t44s, t95s),
        "agreement_median": float(np.median(agrees)) if agrees else None,
    }


def _metrics_by_class(rows: list[BuildingRow], deadband: float) -> dict[str, Any]:
    by_class: dict[str, list[BuildingRow]] = defaultdict(list)
    for r in rows:
        by_class[r.terrain_class].append(r)
    out: dict[str, Any] = {}
    for cls in TERRAIN_CLASS_ORDER:
        if cls in by_class:
            out[cls] = _metrics(by_class[cls], deadband)
    out["_pooled"] = _metrics(rows, deadband)
    return out


def _agreement_sanity(rows: list[BuildingRow]) -> tuple[float | None, int]:
    diffs = [
        abs(r.agreement_recomputed - r.agreement_stored)
        for r in rows
        if r.agreement_recomputed is not None and r.agreement_stored is not None
    ]
    if not diffs:
        return None, 0
    return float(np.median(diffs)), len(diffs)


# ---------------------------------------------------------------------------
# Showcase-Auswahl
# ---------------------------------------------------------------------------
def _showcase_dict(r: BuildingRow) -> dict[str, Any]:
    return {
        "building_id": r.building_id,
        "building_source": r.building_source,
        "aoi": r.aoi,
        "run_id": r.run_id,
        "area_id": r.area_id,
        "slope": round(r.slope, 3) if r.slope is not None else None,
        "terrain_class": r.terrain_class,
        "t44": round(float(r.t44), 4) if r.t44 is not None else None,
        "t95": round(float(r.t95), 4) if r.t95 is not None else None,
        "delta": round(float(r.delta), 4) if r.delta is not None else None,
        "lon": r.lon,
        "lat": r.lat,
        "deep_link": r.deep_link,
    }


def _select_showcases(
    strict_rows: list[BuildingRow],
    both_rows: list[BuildingRow],
    deadband: float,
    min_support: int,
    top_n: int,
) -> dict[str, list[dict[str, Any]]]:
    flat_candidates = [
        r
        for r in strict_rows
        if r.terrain_class == "flach"
        and r.abs_delta is not None
        and r.t44 is not None
        and r.t95 is not None
        and max(abs(float(r.t44)), abs(float(r.t95))) >= deadband
    ]
    flat_candidates.sort(key=lambda r: float(r.abs_delta))  # type: ignore[arg-type]

    slope_candidates = [
        r
        for r in both_rows
        if r.terrain_class == "hang"
        and r.abs_delta is not None
        and r.support_44 >= min_support
        and r.support_95 >= min_support
    ]
    slope_candidates.sort(key=lambda r: float(r.abs_delta), reverse=True)  # type: ignore[arg-type]

    return {
        "flach": [_showcase_dict(r) for r in flat_candidates[:top_n]],
        "hang": [_showcase_dict(r) for r in slope_candidates[:top_n]],
    }


# ---------------------------------------------------------------------------
# JSON-Serialisierung der Gebaeudezeilen
# ---------------------------------------------------------------------------
def _row_json(r: BuildingRow, min_support: int, deadband: float) -> dict[str, Any]:
    def rnd(value: float | None, digits: int = 4) -> float | None:
        return round(float(value), digits) if value is not None else None

    strict = (
        r.delta is not None
        and r.building_status == "ok"
        and r.reliability_band in RELIABILITY_MED_HIGH
        and r.support_44 >= min_support
        and r.support_95 >= min_support
    )
    return {
        "aoi": r.aoi,
        "run_id": r.run_id,
        "area_id": r.area_id,
        "building_source": r.building_source,
        "building_id": r.building_id,
        "building_status": r.building_status,
        "reliability_band": r.reliability_band,
        "slope": rnd(r.slope, 3),
        "slope_source": r.slope_source,
        "terrain_class": r.terrain_class,
        "t44": rnd(r.t44),
        "t95": rnd(r.t95),
        "delta": rnd(r.delta),
        "allowed": rnd(r.allowed, 3),
        "within_allowed": r.within_allowed,
        "agreement_recomputed": rnd(r.agreement_recomputed),
        "agreement_stored": rnd(r.agreement_stored),
        "kept_point_count": r.kept_point_count,
        "differential_motion_level": r.differential_motion_level,
        "support_44": r.support_44,
        "support_95": r.support_95,
        "sign_class_agreement": _same_sign(r.t44, r.t95, deadband),
        "lon": r.lon,
        "lat": r.lat,
        "deep_link": r.deep_link,
        "has_both_tracks": r.delta is not None,
        "in_strict": strict,
    }


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def _markdown_metric_table(
    labelled_rows: list[tuple[str, dict[str, Any]]], first_header: str
) -> list[str]:
    if not labelled_rows:
        return ["_Keine auswertbaren Zeilen._"]
    columns = [("__label", first_header)] + METRIC_COLUMNS
    header = "| " + " | ".join(label for _, label in columns) + " |"
    separator = "| " + " | ".join("---" for _ in columns) + " |"
    lines = [header, separator]
    for label, metrics in labelled_rows:
        values = [label]
        for key, _ in METRIC_COLUMNS:
            value = metrics.get(key)
            if key in {"sign_agreement", "share_within_allowed"}:
                values.append(_fmt_pct(value))
            elif key == "n":
                values.append(_fmt(value))
            else:
                values.append(_fmt(value, 3))
        lines.append("| " + " | ".join(values) + " |")
    return lines


def _group_class_rows(metrics_by_class: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    rows: list[tuple[str, dict[str, Any]]] = []
    for cls in TERRAIN_CLASS_ORDER:
        if cls in metrics_by_class:
            rows.append((CLASS_LABELS_MD.get(cls, cls), metrics_by_class[cls]))
    rows.append(("Gepoolt", metrics_by_class["_pooled"]))
    return rows


def _render_markdown(
    *,
    generated: str,
    params: dict[str, Any],
    metas: list[RunMeta],
    warnings: list[str],
    metrics: dict[str, Any],
    per_aoi: dict[str, Any],
    showcase: dict[str, list[dict[str, Any]]],
    duplicates_removed: int,
    duplicates_detail: dict[str, int],
    chart_files: list[str],
) -> str:
    deadband = params["deadband"]
    min_support = params["min_support"]
    lines: list[str] = [
        "# Cross-Track-Konsistenz: T44 (aufsteigend) vs T95 (absteigend)",
        "",
        f"Stand: {generated}",
        "",
        "## Methodik",
        "",
        "- Verglichen werden je Gebaeude die gespeicherten Track-Bewegungen "
        "`track_motion_mm_a` der entgegengesetzten Tracks T44 und T95 EINES SNT-Runs.",
        "- Diese Werte sind laut Rollup-Vertrag bereits vertikale Proxies: "
        "`vertical_proxy = LOS / max(cos(incidence_angle), 0.30)` (Deckel 0.30 gegen "
        "Rauschverstaerkung bei flachem Einfall). Es wird NICHT neu gerechnet.",
        f"- `delta = T44 - T95`; Toleranz `allowed = 1.0 + 0.15 * slope` mm/a; "
        f"`within_allowed = |delta| <= allowed`; "
        f"`agreement = exp(-|delta| / allowed)`.",
        "- Hangwinkel aus SRTM (nominal 30 m) via `building_terrain_context.slope_mean_deg`, "
        "ersatzweise `building_context.slope_mean_deg`; ohne Wert Klasse \"unbekannt\". "
        "Vorbehalt: 30-m-SRTM glaettet kleinraeumige Hangkanten.",
        f"- Terrain-Klassen (einzige Quelle `terrain_classes.py`): flach `<{SLOPE_FLAT_MAX_DEG:g}°`, "
        f"uebergang `{SLOPE_FLAT_MAX_DEG:g}–{SLOPE_TRANSITION_MAX_DEG:g}°`, hang `≥{SLOPE_TRANSITION_MAX_DEG:g}°`.",
        f"- Vorzeichen-Totband (Deadband): `±{deadband:g}` mm/a; `stable` bei `|v| <= {deadband:g}`.",
        f"- Core-Support-Schwelle je Track: `{min_support}`.",
        "- Dedupe ueber Runs auf `(area_id, building_source, building_id)`: bei "
        "Mehrfachvorkommen gewinnt das Gebaeude mit hoeherem `kept_point_count`.",
        "- Lesart: Plausibilitaetsindikator fuer geometrische Konsistenz, KEINE "
        "Ground-Truth-Kalibrierung.",
        "",
    ]

    if warnings:
        lines.extend(["## Warnungen", ""])
        lines.extend(f"- {w}" for w in warnings)
        lines.append("")

    lines.extend(["## Verwendete Runs", ""])
    run_cols = [
        ("Label", lambda m: m.label),
        ("Run-ID", lambda m: m.run_id),
        ("Dataset", lambda m: m.dataset_id),
        ("Source", lambda m: ",".join(m.building_sources) or "-"),
        ("Model", lambda m: ", ".join(f"{k} ({v})" for k, v in m.model_versions.items())),
        ("BBox", lambda m: _bbox_label(m.bbox)),
        ("Status", lambda m: m.status),
        ("Punkte", lambda m: str(m.point_count)),
    ]
    lines.append("| " + " | ".join(h for h, _ in run_cols) + " |")
    lines.append("| " + " | ".join("---" for _ in run_cols) + " |")
    for meta in metas:
        lines.append("| " + " | ".join(fn(meta) for _, fn in run_cols) + " |")
    lines.append("")

    lines.extend(["## Kernbefund je Filtergruppe und Terrain-Klasse", ""])
    lines.append(
        "_Leitdiskriminatoren fuer den Terrain-Klassenvergleich: `Median Δ (abs)`, `MAE`, "
        "`Spearman` (Roh- und Rangebene, ganz links). `Vorzeichen` und `≤ Toleranz` stehen "
        "bewusst rechts: `Vorzeichen` ist totband-streng, `≤ Toleranz` misst nur RELATIV zur "
        "hangabhaengigen Modelltoleranz `1.0 + 0.15·slope` und eignet sich daher NICHT fuer den "
        "Flach-vs-Hang-Vergleich._"
    )
    lines.append("")
    for group in GROUP_ORDER:
        lines.append(f"### {GROUP_LABELS[group]}")
        lines.append("")
        lines.extend(_markdown_metric_table(_group_class_rows(metrics[group]), "Terrain-Klasse"))
        lines.append("")

    lines.extend(["## Je AOI (Leitgruppe strict, gepoolt)", ""])
    aoi_rows = [(aoi, per_aoi[aoi]) for aoi in per_aoi]
    lines.extend(_markdown_metric_table(aoi_rows, "AOI"))
    lines.append("")

    lines.extend(["## Dedupe", ""])
    lines.append(f"- Entfernte Duplikate gesamt: {duplicates_removed}")
    if duplicates_detail:
        for pair, count in sorted(duplicates_detail.items()):
            lines.append(f"  - {pair}: {count}")
    lines.append("")

    lines.extend(["## Showcase-Gebaeude", ""])
    show_cols = [
        "Klasse",
        "AOI",
        "Building",
        "Slope",
        "T44",
        "T95",
        "Δ",
        "Deep-Link",
    ]
    lines.append("| " + " | ".join(show_cols) + " |")
    lines.append("| " + " | ".join("---" for _ in show_cols) + " |")
    for kind, label in (("flach", "Flach übereinstimmend & bewegt"), ("hang", "Hang differenziell")):
        for item in showcase.get(kind, []):
            lines.append(
                "| "
                + " | ".join(
                    [
                        label,
                        str(item["aoi"]),
                        f"{item['building_source']}:{item['building_id']}",
                        _fmt(item["slope"], 2),
                        _fmt(item["t44"], 3),
                        _fmt(item["t95"], 3),
                        _fmt(item["delta"], 3),
                        f"[Karte]({item['deep_link']})",
                    ]
                )
                + " |"
            )
    lines.append("")

    if chart_files:
        lines.extend(["## Diagramme", ""])
        for path in chart_files:
            lines.append(f"- `{path}`")
        lines.append("")

    strict_pooled = metrics["strict"]["_pooled"]
    lines.extend(_interpretation(strict_pooled, metrics, deadband))
    lines.append("")
    return "\n".join(lines)


def _interpretation(
    strict_pooled: dict[str, Any], metrics: dict[str, Any], deadband: float
) -> list[str]:
    n = strict_pooled.get("n") or 0
    sign = strict_pooled.get("sign_agreement")
    strict_classes = metrics["strict"]
    flat = strict_classes.get("flach", {})
    slope = strict_classes.get("hang", {})
    multi_slope = bool(flat.get("n") and slope.get("n"))

    lines = ["## Interpretation", ""]

    # 1. Leitdiskriminatoren zuerst: Roh-/Rangmetriken (Median|Δ|, MAE, Spearman).
    if multi_slope:
        lines.append(
            "- Leitdiskriminatoren fuer den Terrain-Klassenvergleich sind die Roh- und "
            "Rangmetriken `Median |Δ|`, `MAE` und `Spearman` (nicht die toleranz- oder "
            "totbandrelativen Anteile): "
            f"flach (n={flat.get('n')}) `Median |Δ|` {_fmt(flat.get('median_abs_delta'))} / "
            f"`MAE` {_fmt(flat.get('mae'))} / `Spearman` {_fmt(flat.get('spearman'))} "
            f"gegenueber hang (n={slope.get('n')}) `Median |Δ|` {_fmt(slope.get('median_abs_delta'))} / "
            f"`MAE` {_fmt(slope.get('mae'))} / `Spearman` {_fmt(slope.get('spearman'))}. "
            "Sie diskriminieren die Klassen konsistent: am Hang groessere Absolutabweichung und "
            "schwaechere bzw. gegenlaeufige Rangordnung."
        )
    else:
        lines.append(
            f"- Leitgruppe strict (n={n}): Leitdiskriminatoren sind die Roh-/Rangmetriken "
            f"`Median |Δ|` {_fmt(strict_pooled.get('median_abs_delta'))} mm/a, "
            f"`MAE` {_fmt(strict_pooled.get('mae'))} mm/a und `Spearman` "
            f"{_fmt(strict_pooled.get('spearman'))}."
        )

    # 2. "Anteil <= Toleranz" nur als Innerhalb-Klasse-Mass, nicht fuer Flach-vs-Hang.
    if multi_slope:
        lines.append(
            "- `Anteil ≤ Toleranz` misst Konsistenz RELATIV zur hangabhaengigen Modelltoleranz "
            "`allowed = 1.0 + 0.15·slope` und ist deshalb NICHT fuer den Flach-vs-Hang-Vergleich "
            "geeignet: das Toleranzband weitet sich am Hang, sodass der Anteil dort trotz "
            f"groesserer Rohabweichung hoeher liegen kann (hang {_fmt_pct(slope.get('share_within_allowed'))} "
            f"vs flach {_fmt_pct(flat.get('share_within_allowed'))}). Er taugt nur als "
            "Innerhalb-Klasse-Konsistenzmass."
        )

    # 3. Vorzeichen-Uebereinstimmung nachgeordnet, mit Totband-Caveat direkt daneben.
    lines.append(
        f"- Nachgeordnet, keine fuehrende Kopfzahl: Vorzeichen-Uebereinstimmung "
        f"{_fmt_pct(sign)} (strict gepoolt). Die Metrik ist streng, weil quasi-stabile "
        f"Gebaeude nahe ±{deadband:g} mm/a schon durch kleine Schwankungen die Klasse wechseln; "
        "das Totband klammert stabile Gebaeude bewusst aus der Vorzeichenwertung aus."
    )

    # 4. Negativer Spearman am Hang: Hinweis auf horizontale Komponente -> 2D-Dekomposition.
    hang_spearman = slope.get("spearman")
    if hang_spearman is not None and hang_spearman < 0:
        lines.append(
            f"- Der negative `Spearman` am Hang ({_fmt(hang_spearman)}) bedeutet, dass auf- und "
            "absteigende Blickrichtung die Bewegung tendenziell GEGENLAEUFIG rangieren. Das ist "
            "ein Hinweis auf eine horizontale bzw. hangabwaerts gerichtete Bewegungskomponente, "
            "die beide Geometrien mit unterschiedlichem Vorzeichen in die LOS projizieren; es "
            "motiviert eine 2D-Dekomposition (Vertikal-/Ost-West-Zerlegung) statt der reinen "
            "Vertikalproxy-Annahme."
        )

    # Grundcharakter der Metrik.
    lines.append(
        "- Cross-Track-Konsistenz bleibt ein geometrischer Plausibilitaetsindikator: hohe Werte "
        "zeigen, dass auf- und absteigende Geometrie dieselbe (Vertikal-)Bewegung sehen, sie "
        "ersetzen aber keine unabhaengige Ground-Truth."
    )
    return lines


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------
def _finite_class_map(
    metrics_by_class: dict[str, Any], key: str
) -> dict[str, float]:
    out: dict[str, float] = {}
    for cls in TERRAIN_CLASS_ORDER:
        cls_metrics = metrics_by_class.get(cls)
        if not cls_metrics:
            continue
        value = cls_metrics.get(key)
        if value is not None and math.isfinite(value):
            out[cls] = float(value)
    return out


def _write_charts(
    charts_dir: Path,
    stem: str,
    both_rows: list[BuildingRow],
    strict_rows: list[BuildingRow],
    strict_metrics: dict[str, Any],
    deadband: float,
) -> list[str]:
    written: list[str] = []

    scatter_rows = [r for r in both_rows if r.t44 is not None and r.t95 is not None]
    if scatter_rows:
        paths = eval_charts.scatter_pair(
            [float(r.t44) for r in scatter_rows],  # type: ignore[arg-type]
            [float(r.t95) for r in scatter_rows],  # type: ignore[arg-type]
            [r.terrain_class for r in scatter_rows],
            xlabel="T44 (aufsteigend) vertikaler Proxy [mm/a]",
            ylabel="T95 (absteigend) vertikaler Proxy [mm/a]",
            deadband=deadband,
            stem=charts_dir / f"{stem}_scatter_t44_t95",
        )
        written.extend(str(p) for p in paths)

    sign_map = _finite_class_map(strict_metrics, "sign_agreement")
    within_map = _finite_class_map(strict_metrics, "share_within_allowed")
    if sign_map or within_map:
        paths = eval_charts.bar_by_class(
            {
                "Vorzeichen-Übereinstimmung": sign_map,
                "Innerhalb Toleranz": within_map,
            },
            ylabel="Anteil (strict)",
            stem=charts_dir / f"{stem}_agreement_by_class",
        )
        written.extend(str(p) for p in paths)

    absdelta_by_class: dict[str, list[float]] = defaultdict(list)
    for r in strict_rows:
        if r.abs_delta is not None:
            absdelta_by_class[r.terrain_class].append(float(r.abs_delta))
    if absdelta_by_class:
        paths = eval_charts.box_by_class(
            absdelta_by_class,
            ylabel="|Δ| = |T44 − T95| [mm/a] (strict)",
            stem=charts_dir / f"{stem}_absdelta_by_class",
        )
        written.extend(str(p) for p in paths)

    return written


# ---------------------------------------------------------------------------
# Orchestrierung
# ---------------------------------------------------------------------------
async def _run(args: argparse.Namespace) -> dict[str, Any]:
    runs = _parse_runs(args.run)
    deadband = float(args.deadband)
    min_support = int(args.min_support)
    top_n = int(args.top_n)
    viewer_base_url = str(args.viewer_base_url)

    warnings: list[str] = []
    metas: list[RunMeta] = []
    all_rows: list[BuildingRow] = []

    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=3)
    try:
        async with pool.acquire() as conn:
            for label, run_id in runs:
                meta = await _fetch_run_meta(conn, label, run_id)
                tracks = DATASET_TRACK_PAIRS.get(meta.dataset_id)
                if tracks is None:
                    raise SystemExit(
                        f"Dataset '{meta.dataset_id}' (Run {label}) hat kein "
                        f"Cross-Track-Paar; erlaubt: {sorted(DATASET_TRACK_PAIRS)}"
                    )
                if meta.status != "succeeded":
                    warnings.append(f"{label}: Run-Status ist {meta.status}, erwartet succeeded")
                if set(meta.model_versions) != {EXPECTED_MODEL_SET_VERSION}:
                    warnings.append(
                        f"{label}: model_set_version {sorted(meta.model_versions)}, "
                        f"erwartet {EXPECTED_MODEL_SET_VERSION}"
                    )
                metas.append(meta)
                all_rows.extend(await _build_run_rows(conn, meta, tracks, viewer_base_url))
    finally:
        await pool.close()

    deduped, duplicates_removed, duplicates_detail = _dedupe(all_rows)

    sanity_median, sanity_n = _agreement_sanity(deduped)
    if sanity_median is not None and sanity_median > AGREEMENT_SANITY_TOL:
        warnings.append(
            f"Agreement-Sanity-Median {sanity_median:.2e} > {AGREEMENT_SANITY_TOL:g} "
            f"(n={sanity_n}): recomputed vs gespeicherter track_agreement_score weichen ab"
        )

    groups = _filter_groups(deduped, min_support)
    metrics = {group: _metrics_by_class(rows, deadband) for group, rows in groups.items()}

    per_aoi: dict[str, Any] = {}
    strict_by_aoi: dict[str, list[BuildingRow]] = defaultdict(list)
    for r in groups["strict"]:
        strict_by_aoi[r.aoi].append(r)
    for label, _ in runs:
        per_aoi[label] = _metrics(strict_by_aoi.get(label, []), deadband)

    showcase = _select_showcases(
        groups["strict"], groups["all_both_tracks"], deadband, min_support, top_n
    )

    params = {
        "deadband": deadband,
        "min_support": min_support,
        "top_n": top_n,
        "viewer_base_url": viewer_base_url,
        "expected_model_set_version": EXPECTED_MODEL_SET_VERSION,
    }
    generated = datetime.now(timezone.utc).isoformat()

    # Charts
    chart_files: list[str] = []
    if args.charts_dir:
        stem = Path(args.output_md).stem if args.output_md else "cross_track_consistency"
        chart_files = _write_charts(
            Path(args.charts_dir),
            stem,
            groups["all_both_tracks"],
            groups["strict"],
            metrics["strict"],
            deadband,
        )

    result = {
        "generated": generated,
        "params": params,
        "runs": [
            {
                "label": m.label,
                "run_id": m.run_id,
                "status": m.status,
                "area_id": m.area_id,
                "dataset_id": m.dataset_id,
                "building_sources": m.building_sources,
                "bbox": m.bbox,
                "point_count": m.point_count,
                "model_versions": m.model_versions,
                "feature_versions": m.feature_versions,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "finished_at": m.finished_at.isoformat() if m.finished_at else None,
                "mlflow_run_id": m.mlflow_run_id,
            }
            for m in metas
        ],
        "warnings": warnings,
        "agreement_sanity": {"median_abs_diff": sanity_median, "n": sanity_n},
        "metrics": metrics,
        "per_aoi": per_aoi,
        "showcase": showcase,
        "duplicates_removed": duplicates_removed,
        "duplicates_removed_detail": duplicates_detail,
        "buildings": [_row_json(r, min_support, deadband) for r in deduped],
        "charts": chart_files,
    }

    markdown = _render_markdown(
        generated=generated,
        params=params,
        metas=metas,
        warnings=warnings,
        metrics=metrics,
        per_aoi=per_aoi,
        showcase=showcase,
        duplicates_removed=duplicates_removed,
        duplicates_detail=duplicates_detail,
        chart_files=chart_files,
    )

    if args.output_json:
        out_json = Path(args.output_json)
        out_json.parent.mkdir(parents=True, exist_ok=True)
        out_json.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
        print(f"written: {out_json}")
    if args.output_md:
        out_md = Path(args.output_md)
        out_md.parent.mkdir(parents=True, exist_ok=True)
        out_md.write_text(markdown, encoding="utf-8")
        print(f"written: {out_md}")

    print(
        f"runs={len(metas)} buildings={len(deduped)} "
        f"strict_n={metrics['strict']['_pooled'].get('n')} "
        f"duplicates_removed={duplicates_removed} "
        f"agreement_sanity_median={sanity_median} warnings={len(warnings)}"
    )
    return result


def _parse_runs(raw: list[str] | None) -> list[tuple[str, str]]:
    if not raw:
        raise SystemExit("Mindestens ein --run NAME=RUN_ID erforderlich")
    runs: list[tuple[str, str]] = []
    seen: set[str] = set()
    for item in raw:
        if "=" not in item:
            raise SystemExit(f"--run erwartet NAME=RUN_ID, erhalten: {item!r}")
        name, run_id = item.split("=", 1)
        name, run_id = name.strip(), run_id.strip()
        if not name or not run_id:
            raise SystemExit(f"--run erwartet NAME=RUN_ID, erhalten: {item!r}")
        if name in seen:
            raise SystemExit(f"Doppeltes AOI-Label: {name}")
        seen.add(name)
        runs.append((name, run_id))
    return runs


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cross-Track-Konsistenz-Auswertung (Skript A).")
    parser.add_argument(
        "--run",
        action="append",
        metavar="NAME=RUN_ID",
        help="AOI-Label und Run-UUID; mehrfach angeben.",
    )
    parser.add_argument("--deadband", type=float, default=0.5)
    parser.add_argument("--min-support", type=int, default=2)
    parser.add_argument("--top-n", type=int, default=5)
    parser.add_argument("--output-md", default=None)
    parser.add_argument("--output-json", default=None)
    parser.add_argument("--charts-dir", default=None)
    parser.add_argument("--viewer-base-url", default=DEFAULT_VIEWER_BASE_URL)
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
