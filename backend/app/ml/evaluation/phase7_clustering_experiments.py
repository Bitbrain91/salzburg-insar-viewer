"""Phase-7-Experiment-Harness fuer anomaly_local_v1 (P7-B-W1-T1..T4).

Designprinzipien (siehe phase7_clustering_optimization_plan.md):

- Volle CLI-Runs nur fuer Baselines; Experiment-Varianten re-clustern die
  EINMAL geholten AOI-Inputs offline in-memory (keine ml_runs-Schreibungen).
- Die No-op-Variante MUSS punktidentisch zum produktiven Ergebnis sein;
  das wird gegen die persistierten Baseline-Runs verifiziert.
- Cross-Track wird harness-seitig dataset-agnostisch berechnet
  (cross_track_source=harness_computed, cross_track_pair_type).
- Sensitivitaet/Konfidenz ist Nebensignal: Messrauschen-Jitter (alle n),
  Leave-one-out (n>=4), Bootstrap nur n>=8. Kein Size-Penalty gegen
  legitime 2-Punkt-Cluster.
- HR-Pseudo-Referenz: raeumlich-strukturell, building-gekoppelt,
  Bewegungsvergleich nur qualitativ (temporal_overlap_days=232).
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

import asyncpg
import numpy as np

try:
    import hdbscan  # type: ignore
except ImportError as exc:  # pragma: no cover
    raise ImportError("phase7 experiments require hdbscan") from exc

from sklearn.cluster import OPTICS
from sklearn.preprocessing import RobustScaler

from ...config import settings
from ..pipelines.anomaly_local_v1 import AnomalyLocalV1Pipeline, LocalPointRecord
from ..types import RunConfig

ARTIFACTS_DIR = Path(__file__).resolve().parents[4] / "docs" / "pipelines" / "anomaly_local_v1" / "artifacts"

AOIS: dict[str, dict[str, Any]] = {
    "mirabell": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "regression_gate",
        "bbox": (13.04027, 47.80375, 13.04387, 47.80735),
        "baseline_run": "c23cd637-3251-45bb-a95e-e2aa88abe6de",
    },
    "moosstrasse": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "regression_gate",
        "bbox": (13.02714, 47.79189, 13.03074, 47.79549),
        "baseline_run": "15cee7d1-1f0c-44b2-a6e2-ecb633841db0",
    },
    "osthang": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "stress_diagnose",
        "bbox": (13.0492, 47.8036, 13.0528, 47.8054),
        "baseline_run": "74c1481e-f2c7-4938-a4ac-8022e1fe2799",
    },
    "bg_flat_01_snt": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_snt", "role": "calibration_gate",
        "bbox": (13.132531, 47.106449, 13.135531, 47.109449),
        "baseline_run": "ff2217a1-098d-4126-a89a-c3c9b9c148e5",
    },
    "bg_slope_01_snt": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_snt", "role": "stress_diagnose",
        "bbox": (13.138531, 47.118449, 13.141531, 47.121449),
        "baseline_run": "633325ef-409f-4a9e-a160-c9bc8394e574",
    },
    "bg_flat_01_tsx": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_tsx_paz", "role": "calibration_gate",
        "bbox": (13.132531, 47.106449, 13.135531, 47.109449),
        "baseline_run": "97672f6e-f06e-43d8-b279-1dddecc21300",
    },
    "bg_slope_01_tsx": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_tsx_paz", "role": "stress_diagnose",
        "bbox": (13.138531, 47.118449, 13.141531, 47.121449),
        "baseline_run": "60a3899f-118a-4856-b40a-379939449e8a",
    },
}

# ASC/DSC-Paare je Dataset (look geometriebedingt entgegengesetzt);
# same_geometry-Paare (22/95) existieren nur ausserhalb der Katalog-AOIs.
OPPOSITE_PAIRS = {
    "salzburg_snt": (44, 95),
    "bad_gastein_snt": (44, 95),
    "bad_gastein_tsx_paz": (93, 70),
}
TEMPORAL_OVERLAP_DAYS = {("bad_gastein_snt", "bad_gastein_tsx_paz"): 232}

EXTRA_FIELDS_QUERY = """
    SELECT code, track, height_std, acceleration_std, s_amp_std, s_phs_std,
           season_phs, eff_area
    FROM insar_points
    WHERE area_id = $5 AND dataset_id = $6
      AND ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
"""


@dataclass
class ExperimentConfig:
    """Vollstaendige Variantenkonfiguration; landet 1:1 im Artefakt."""

    experiment_id: str
    description: str = ""
    # HDBSCAN-Achsen (None = produktiver Default)
    algorithm: str = "hdbscan"            # hdbscan | optics (optics erst Schritt 5)
    mcs_fraction: float = 0.2
    mcs_cap: int = 8
    mcs_floor: int = 2
    min_samples_mode: str = "half"        # half | equal | int:<n>
    cluster_selection_method: str = "eom" # eom | leaf
    allow_single_cluster: bool = True
    cluster_selection_epsilon: float = 0.0
    # Feature-Matrix: Liste (feature_name, gewicht); None = produktiver Default
    matrix_features: list[tuple[str, float]] | None = None
    # Gate-Achsen
    coherence_floor: float | None = None  # None = produktiv 0.45
    coherence_gate_mode: str = "absolute" # absolute | percentile:<p>
    # Assignment-Politik (Schritt 4): a0 | a1_demote | a2_dist:<m> | a3_height | a4_osm
    assignment_policy: str = "a0"

    def to_jsonable(self) -> dict[str, Any]:
        d = asdict(self)
        if d.get("matrix_features") is not None:
            d["matrix_features"] = [[n, w] for n, w in d["matrix_features"]]
        return d


PRODUCTION_MATRIX: list[tuple[str, float]] = [
    ("along_look_offset_m", 1.10),
    ("cross_look_offset_m", 1.00),
    ("height_rank_in_building", 0.75),
    ("velocity", 1.30),
    ("acceleration", 0.90),
    ("coherence_penalty", 0.80),
]


class ExperimentPipeline(AnomalyLocalV1Pipeline):
    """Produktionspipeline mit konfigurierbarem Clustering-Kern.

    Mit der Default-Konfiguration ist das Verhalten punktidentisch zur
    Produktion (No-op-Beweis gegen persistierte Baseline-Runs).
    """

    def __init__(self, exp: ExperimentConfig, extra_features: dict[tuple[str, int], dict[str, float | None]] | None = None):
        self.exp = exp
        self.extra_features = extra_features or {}

    # --- Zusatzfelder in die Feature-Map injizieren -----------------------
    def _compute_series_features(self, records: list[LocalPointRecord]) -> None:
        super()._compute_series_features(records)
        for record in records:
            extra = self.extra_features.get((record.code, record.track))
            if not extra:
                continue
            for name, value in extra.items():
                if value is not None:
                    record.features[f"x_{name}"] = float(value)

    # --- Gate-Achse -------------------------------------------------------
    def _apply_gate_rules(self, records, track_stats, params):
        if self.exp.coherence_floor is not None:
            params = {**params, "coherence_floor": float(self.exp.coherence_floor)}
        if self.exp.coherence_gate_mode.startswith("percentile:"):
            pct = float(self.exp.coherence_gate_mode.split(":", 1)[1])
            for track, stats in track_stats.items():
                values = np.asarray(
                    [self._safe_value(r.coherence, np.nan) for r in records if r.track == track],
                    dtype=float,
                )
                values = values[np.isfinite(values)]
                if values.size:
                    stats["coherence_p05"] = float(np.nanpercentile(values, pct))
            params = {**params, "coherence_floor": 0.0}
        super()._apply_gate_rules(records, track_stats, params)

    # --- Cluster-Matrix-Achse ----------------------------------------------
    def _cluster_matrix(self, records: list[LocalPointRecord]) -> np.ndarray:
        features = self.exp.matrix_features
        if features is None:
            return super()._cluster_matrix(records)
        matrix = np.asarray(
            [
                [
                    record.velocity if name == "velocity" else record.features.get(name, 0.0)
                    for name, _ in features
                ]
                for record in records
            ],
            dtype=float,
        )
        scaled = RobustScaler(quantile_range=(15, 85)).fit_transform(matrix)
        weights = np.asarray([w for _, w in features], dtype=float)
        return np.nan_to_num(scaled * weights, nan=0.0)

    # --- Clustering-Achse ---------------------------------------------------
    def _resolved_min_samples(self, min_cluster_size: int) -> int:
        mode = self.exp.min_samples_mode
        if mode == "half":
            return max(1, int(math.floor(min_cluster_size / 2)))
        if mode == "equal":
            return min_cluster_size
        if mode.startswith("int:"):
            return max(1, int(mode.split(":", 1)[1]))
        raise ValueError(f"unknown min_samples_mode: {mode}")

    def _apply_density_clustering(self, building_id, track, kept):
        exp = self.exp
        is_noop = (
            exp.algorithm == "hdbscan"
            and exp.mcs_fraction == 0.2 and exp.mcs_cap == 8 and exp.mcs_floor == 2
            and exp.min_samples_mode == "half"
            and exp.cluster_selection_method == "eom"
            and exp.allow_single_cluster is True
            and exp.cluster_selection_epsilon == 0.0
        )
        if is_noop:
            return super()._apply_density_clustering(building_id, track, kept)

        matrix = self._cluster_matrix(kept)
        n_samples = matrix.shape[0]
        min_cluster_size = max(exp.mcs_floor, min(exp.mcs_cap, int(math.ceil(exp.mcs_fraction * n_samples))))
        min_cluster_size = max(2, min_cluster_size)
        min_samples = self._resolved_min_samples(min_cluster_size)

        if exp.algorithm == "hdbscan":
            model = hdbscan.HDBSCAN(
                min_cluster_size=min_cluster_size,
                min_samples=min_samples,
                metric="euclidean",
                allow_single_cluster=exp.allow_single_cluster,
                cluster_selection_method=exp.cluster_selection_method,
                cluster_selection_epsilon=float(exp.cluster_selection_epsilon),
            )
            labels = model.fit_predict(matrix)
            probabilities = np.asarray(getattr(model, "probabilities_", np.ones(n_samples)), dtype=float)
            outlier_scores = self._normalise_scores(
                np.asarray(getattr(model, "outlier_scores_", 1.0 - probabilities), dtype=float)
            )
        elif exp.algorithm == "optics":
            model = OPTICS(
                min_samples=max(2, min_samples),
                min_cluster_size=min_cluster_size,
                cluster_method="xi",
                xi=0.05,
            )
            labels = model.fit_predict(matrix)
            reachability = np.asarray(getattr(model, "reachability_", np.full(n_samples, np.inf)), dtype=float)
            finite = reachability[np.isfinite(reachability)]
            if finite.size:
                outlier_scores = np.asarray(
                    [1.0 if not np.isfinite(v) else (v - np.min(finite)) / max(np.ptp(finite), 1e-9) for v in reachability],
                    dtype=float,
                )
            else:
                outlier_scores = np.full(n_samples, 0.5, dtype=float)
            probabilities = np.clip(1.0 - outlier_scores, 0.05, 0.95)
        else:
            raise ValueError(f"unknown algorithm: {exp.algorithm}")

        labels = self._coerce_single_cluster(labels, matrix)
        labels, probabilities, outlier_scores = self._reassign_borderline_noise(
            kept, matrix, labels, probabilities, outlier_scores
        )
        cluster_sizes = {label: int(np.sum(labels == label)) for label in set(labels.tolist()) if label >= 0}
        for index, record in enumerate(kept):
            label = int(labels[index])
            record.cluster_probability = float(np.clip(probabilities[index], 0.05, 0.99))
            record.cluster_outlier_score = float(np.clip(outlier_scores[index], 0.0, 1.0))
            if label >= 0:
                record.cluster_id = f"{building_id}:t{track}:cluster_{label}"
                record.cluster_role = "core"
                record.building_context["cluster_member_count"] = cluster_sizes.get(label, 0)
            else:
                record.cluster_id = f"{building_id}:t{track}:noise"
                record.cluster_role = "noise"
                record.cluster_outlier_score = max(record.cluster_outlier_score, 0.75)
                record.building_context["cluster_member_count"] = 0


# ---------------------------------------------------------------------------
# Input-Fetch und Ausfuehrung
# ---------------------------------------------------------------------------

async def fetch_aoi_inputs(aoi: str) -> dict[str, Any]:
    spec = AOIS[aoi]
    config = RunConfig(
        run_id="00000000-0000-0000-0000-000000000000",
        pipeline="anomaly_local_v1",
        area_id=spec["area_id"],
        dataset_id=spec["dataset_id"],
        source="gba",
        track=None,
        bbox=spec["bbox"],
        params={},
    )
    pipeline = AnomalyLocalV1Pipeline()
    params = pipeline.default_params()
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=2)
    try:
        base_rows, ts_rows, amp_rows = await pipeline._fetch_inputs(pool, config, params)
        async with pool.acquire() as conn:
            extra_rows = await conn.fetch(
                EXTRA_FIELDS_QUERY, *spec["bbox"], spec["area_id"], spec["dataset_id"]
            )
    finally:
        await pool.close()
    extras = {
        (r["code"], r["track"]): {
            "height_std": r["height_std"],
            "acceleration_std": r["acceleration_std"],
            "s_amp_std": r["s_amp_std"],
            "s_phs_std": r["s_phs_std"],
            "season_phs": r["season_phs"],
            "eff_area": r["eff_area"],
        }
        for r in extra_rows
    }
    return {"spec": spec, "params": params, "base_rows": base_rows, "ts_rows": ts_rows,
            "amp_rows": amp_rows, "extras": extras}


def run_experiment_on_inputs(exp: ExperimentConfig, inputs: dict[str, Any]):
    pipeline = ExperimentPipeline(exp, inputs["extras"])
    records, metrics = pipeline._compute_run(
        inputs["base_rows"], inputs["ts_rows"], inputs["amp_rows"], dict(inputs["params"])
    )
    return pipeline, records, metrics


# ---------------------------------------------------------------------------
# Harness-seitige Cross-Track-Diagnostik (dataset-agnostisch)
# ---------------------------------------------------------------------------

def harness_cross_track(records: list[LocalPointRecord], dataset_id: str) -> dict[str, Any]:
    pair = OPPOSITE_PAIRS.get(dataset_id)
    by_building: dict[str, list[LocalPointRecord]] = {}
    for r in records:
        if r.building_id:
            by_building.setdefault(r.building_id, []).append(r)

    rows = []
    for building_id, recs in by_building.items():
        rollup = recs[0].building_rollup or {}
        motions = rollup.get("track_motion_mm_a") or {}
        main_by_track = rollup.get("main_cluster_by_track") or {}
        slope = max([r.slope_mean_deg or 0.0 for r in recs] or [0.0])
        if not pair:
            continue
        a, b = str(pair[0]), str(pair[1])
        ma, mb = motions.get(a), motions.get(b)
        support = {
            t: sum(
                1 for r in recs
                if r.track == int(t) and r.cluster_role == "core"
                and str(r.cluster_id) == str(main_by_track.get(t))
            )
            for t in (a, b)
        }
        if ma is None or mb is None:
            rows.append({
                "building_id": building_id, "pair": f"{a}/{b}",
                "cross_track_pair_type": "opposite_geometry",
                "cross_track_source": "harness_computed",
                "agreement": None, "diff_mm_a": None,
                "support": support,
                "not_applicable_reason": "missing_main_cluster_on_one_track",
            })
            continue
        allowed = 1.0 + 0.15 * slope
        diff = abs(float(ma) - float(mb))
        agreement = float(math.exp(-(diff / max(allowed, 1e-9))))
        gate_ok = support[a] >= 2 and support[b] >= 2
        rows.append({
            "building_id": building_id, "pair": f"{a}/{b}",
            "cross_track_pair_type": "opposite_geometry",
            "cross_track_source": "harness_computed",
            "agreement": round(agreement, 4), "diff_mm_a": round(diff, 3),
            "allowed_diff_mm_a": round(allowed, 3),
            "support": support, "support_gate_ok": gate_ok,
        })
    valid = [r["agreement"] for r in rows if r.get("agreement") is not None and r.get("support_gate_ok")]
    return {
        "pair": OPPOSITE_PAIRS.get(dataset_id),
        "buildings_total": len(rows),
        "buildings_with_agreement": len(valid),
        "agreement_median": round(float(np.median(valid)), 4) if valid else None,
        "rows": rows,
    }


# ---------------------------------------------------------------------------
# Sensitivitaets-/Konfidenzmodul (P7-B-W1-T3) - Nebensignal
# ---------------------------------------------------------------------------

def _group_seed(experiment_id: str, building_id: str, track: int) -> int:
    digest = hashlib.sha256(f"{experiment_id}:{building_id}:{track}".encode()).digest()
    return int.from_bytes(digest[:4], "big")

def _main_cluster_members(pipeline: ExperimentPipeline, kept: list[LocalPointRecord]) -> set[str]:
    counts: dict[str, int] = {}
    for r in kept:
        if r.cluster_role == "core" and r.cluster_id:
            counts[str(r.cluster_id)] = counts.get(str(r.cluster_id), 0) + 1
    if not counts:
        return set()
    main = max(sorted(counts), key=lambda k: counts[k])
    return {r.code for r in kept if str(r.cluster_id) == main}

def _recluster_group(pipeline: ExperimentPipeline, building_id: str, track: int,
                     kept: list[LocalPointRecord], noise_threshold: float) -> None:
    if len(kept) <= 5:
        pipeline._apply_small_n_fallback(building_id, track, kept, noise_threshold)
    else:
        pipeline._apply_density_clustering(building_id, track, kept)

def confidence_for_group(pipeline: ExperimentPipeline, building_id: str, track: int,
                         kept: list[LocalPointRecord], params: dict[str, Any],
                         jitter_samples: int = 40, bootstrap_samples: int = 100) -> dict[str, Any]:
    """Gruppenlokale Konfidenz: velocity_std-Jitter (alle n), LOO (n>=4), Bootstrap (n>=8)."""
    n = len(kept)
    if n < 2:
        return {"n": n, "confidence_band": "insufficient"}
    seed = _group_seed(pipeline.exp.experiment_id, building_id, track)
    rng = np.random.default_rng(seed)
    noise_threshold = float(params["small_n_noise_threshold"])

    base_velocity = np.asarray([r.velocity for r in kept], dtype=float)
    velocity_std = np.asarray([max(r.velocity_std or 0.5, 0.1) for r in kept], dtype=float)
    base_members = _main_cluster_members(pipeline, kept)
    base_state = [(r.cluster_id, r.cluster_role, r.cluster_probability, r.cluster_outlier_score, r.small_n_fallback) for r in kept]
    base_median = float(np.median([r.velocity for r in kept if r.code in base_members])) if base_members else None

    def restore():
        for r, st in zip(kept, base_state):
            r.cluster_id, r.cluster_role, r.cluster_probability, r.cluster_outlier_score, r.small_n_fallback = st

    # --- Messrauschen-Jitter ---
    jacc, medians, sign_flips = [], [], 0
    for _ in range(jitter_samples):
        jitter = rng.normal(0.0, velocity_std)
        for r, v in zip(kept, base_velocity + jitter):
            r.velocity = float(v)
            r.features["velocity"] = float(v)
        _recluster_group(pipeline, building_id, track, kept, noise_threshold)
        members = _main_cluster_members(pipeline, kept)
        union = base_members | members
        jacc.append(len(base_members & members) / len(union) if union else 1.0)
        if members:
            med = float(np.median([r.velocity for r in kept if r.code in members]))
            medians.append(med)
            if base_median is not None and base_median != 0 and np.sign(med) != np.sign(base_median) and abs(base_median) > 0.5:
                sign_flips += 1
    for r, v in zip(kept, base_velocity):
        r.velocity = float(v)
        r.features["velocity"] = float(v)
    restore()

    jitter_jaccard = float(np.mean(jacc)) if jacc else None
    ci = None
    if medians:
        lo, hi = np.percentile(np.asarray(medians), [5, 95])
        ci = [round(float(lo), 3), round(float(hi), 3)]

    # --- Leave-one-out (n>=4) ---
    loo_flip_rate = None
    if n >= 4:
        flips = 0
        for skip in range(n):
            subset = [r for i, r in enumerate(kept) if i != skip]
            sub_state = [(r.cluster_id, r.cluster_role, r.cluster_probability, r.cluster_outlier_score, r.small_n_fallback) for r in subset]
            _recluster_group(pipeline, building_id, track, subset, noise_threshold)
            members = _main_cluster_members(pipeline, subset)
            base_wo = base_members - {kept[skip].code}
            union = base_wo | members
            j = len(base_wo & members) / len(union) if union else 1.0
            if j < 0.6:
                flips += 1
            for r, st in zip(subset, sub_state):
                r.cluster_id, r.cluster_role, r.cluster_probability, r.cluster_outlier_score, r.small_n_fallback = st
        loo_flip_rate = flips / n
        restore()

    # --- Bootstrap (nur n>=8, Zusatzdiagnose) ---
    bootstrap_survival = None
    if n >= 8:
        surv = []
        for _ in range(bootstrap_samples):
            idx = sorted(set(rng.choice(n, size=n, replace=True).tolist()))
            subset = [kept[i] for i in idx]
            sub_state = [(r.cluster_id, r.cluster_role, r.cluster_probability, r.cluster_outlier_score, r.small_n_fallback) for r in subset]
            _recluster_group(pipeline, building_id, track, subset, noise_threshold)
            members = _main_cluster_members(pipeline, subset)
            base_sub = base_members & {r.code for r in subset}
            union = base_sub | members
            surv.append(len(base_sub & members) / len(union) if union else 1.0)
            for r, st in zip(subset, sub_state):
                r.cluster_id, r.cluster_role, r.cluster_probability, r.cluster_outlier_score, r.small_n_fallback = st
        bootstrap_survival = float(np.mean(surv))
        restore()

    # Banding: Jitter dominiert (funktioniert fuer alle n), LOO verschaerft.
    band = "stable"
    if jitter_jaccard is not None and jitter_jaccard < 0.6:
        band = "unstable"
    elif (jitter_jaccard is not None and jitter_jaccard < 0.8) or (loo_flip_rate is not None and loo_flip_rate > 0.25):
        band = "monitor"
    if sign_flips > jitter_samples * 0.1:
        band = "unstable"

    return {
        "n": n,
        "jitter_jaccard_mean": round(jitter_jaccard, 3) if jitter_jaccard is not None else None,
        "jitter_motion_ci90": ci,
        "jitter_sign_flip_rate": round(sign_flips / max(jitter_samples, 1), 3),
        "loo_flip_rate": round(loo_flip_rate, 3) if loo_flip_rate is not None else None,
        "bootstrap_survival_mean": round(bootstrap_survival, 3) if bootstrap_survival is not None else None,
        "confidence_band": band,
    }


def confidence_summary(pipeline: ExperimentPipeline, records: list[LocalPointRecord],
                       params: dict[str, Any], max_groups: int | None = None) -> dict[str, Any]:
    groups: dict[tuple[str, int], list[LocalPointRecord]] = {}
    for r in records:
        if r.building_id and not r.gate_excluded:
            groups.setdefault((r.building_id, r.track), []).append(r)
    items = sorted(groups.items())
    if max_groups is not None:
        items = items[:max_groups]
    out = {}
    for (building_id, track), kept in items:
        if len(kept) < 2:
            continue
        out[f"{building_id}:t{track}"] = confidence_for_group(pipeline, building_id, track, kept, params)
    bands = [v["confidence_band"] for v in out.values()]
    from collections import Counter
    return {"groups": out, "band_counts": dict(Counter(bands))}


# ---------------------------------------------------------------------------
# HR-Pseudo-Referenz-Modul (P7-B-W1-T4) - raeumlich-strukturell
# ---------------------------------------------------------------------------

SNT_GEOCODE_TOL_M = 12.0
TSX_GEOCODE_TOL_M = 3.0

def hr_structural_compare(snt_records: list[LocalPointRecord],
                          tsx_records: list[LocalPointRecord]) -> dict[str, Any]:
    """Building-gekoppelter Strukturvergleich SNT vs TSX/PAZ.

    Bewegung NUR qualitativ (Vorzeichen), wegen temporal_overlap_days=232.
    DS-Punkte erhalten sqrt(eff_area) Zusatztoleranz.
    """
    def by_building(records):
        out: dict[str, list[LocalPointRecord]] = {}
        for r in records:
            if r.building_id and not r.gate_excluded:
                out.setdefault(r.building_id, []).append(r)
        return out

    snt_b, tsx_b = by_building(snt_records), by_building(tsx_records)
    rows = []
    for building_id in sorted(set(snt_b) & set(tsx_b)):
        s_recs, t_recs = snt_b[building_id], tsx_b[building_id]
        s_rollup = s_recs[0].building_rollup or {}
        t_rollup = t_recs[0].building_rollup or {}
        s_main_by_track = s_rollup.get("main_cluster_by_track") or {}
        s_cores = [r for r in s_recs if r.cluster_role == "core"
                   and str(r.cluster_id) in {str(v) for v in s_main_by_track.values()}]
        support = {}
        region_match = None
        if s_cores:
            cx = float(np.median([r.x_m for r in s_cores]))
            cy = float(np.median([r.y_m for r in s_cores]))
            n_close = 0
            for r in t_recs:
                if r.cluster_role != "core":
                    continue
                tol = SNT_GEOCODE_TOL_M + TSX_GEOCODE_TOL_M
                eff = r.features.get("x_eff_area", 0.0)
                if eff and eff > 0:
                    tol += math.sqrt(eff)
                if math.hypot(r.x_m - cx, r.y_m - cy) <= tol:
                    n_close += 1
            support = {"tsx_core_points_near_snt_main": n_close}
            region_match = n_close >= 3
        s_motion = s_rollup.get("building_motion_mm_a")
        t_motion = t_rollup.get("building_motion_mm_a")
        sign_compatible = None
        if s_motion is not None and t_motion is not None:
            if abs(s_motion) < 1.0 and abs(t_motion) < 1.0:
                sign_compatible = True  # beide quasi stabil
            else:
                sign_compatible = bool(np.sign(s_motion) == np.sign(t_motion))
        rows.append({
            "building_id": building_id,
            "snt_status": s_rollup.get("building_status"),
            "tsx_status": t_rollup.get("building_status"),
            "snt_kept": int(s_rollup.get("kept_point_count", 0) or 0),
            "tsx_kept": int(t_rollup.get("kept_point_count", 0) or 0),
            "hr_main_region_match": region_match,
            **support,
            "motion_sign_compatible_qualitative": sign_compatible,
            "temporal_overlap_days": 232,
            "motion_comparison_scope": "qualitative_only",
        })
    matches = [r for r in rows if r["hr_main_region_match"] is not None]
    return {
        "buildings_coupled": len(rows),
        "buildings_with_match_eval": len(matches),
        "hr_main_region_match_rate": (
            round(sum(1 for r in matches if r["hr_main_region_match"]) / len(matches), 3) if matches else None
        ),
        "rows": rows,
    }


# ---------------------------------------------------------------------------
# Aggregation / Scorecard-Inputs
# ---------------------------------------------------------------------------

def summarize_records(records: list[LocalPointRecord]) -> dict[str, Any]:
    from collections import Counter
    def bucket(n):
        if n < 3: return "<3"
        if n <= 5: return "3-5"
        if n <= 12: return "6-12"
        if n <= 50: return "13-50"
        return ">50"
    groups: dict[tuple[str, int], int] = {}
    statuses: dict[str, str] = {}
    multi = 0
    for r in records:
        if r.building_id and not r.gate_excluded:
            groups[(r.building_id, r.track)] = groups.get((r.building_id, r.track), 0) + 1
        if r.building_id and r.building_rollup:
            statuses[r.building_id] = str(r.building_rollup.get("building_status"))
    seen = set()
    for r in records:
        if r.building_id and r.building_id not in seen and r.building_rollup:
            seen.add(r.building_id)
            if int(r.building_rollup.get("reliable_cluster_count", 0) or 0) > 1:
                multi += 1
    regimes = Counter(bucket(n) for n in groups.values())
    return {
        "points_total": len(records),
        "points_kept": sum(1 for r in records if r.kept_for_scoring),
        "points_noise": sum(1 for r in records if r.cluster_role == "noise"),
        "points_nearest": sum(1 for r in records if r.assignment_method == "nearest"),
        "n_regimes": {k: regimes.get(k, 0) for k in ["<3", "3-5", "6-12", "13-50", ">50"]},
        "building_status_counts": dict(Counter(statuses.values())),
        "multi_cluster_buildings": multi,
    }


def point_assignments(records: list[LocalPointRecord]) -> dict[str, list[str | None]]:
    return {
        f"{r.code}:t{r.track}": [r.cluster_id, r.cluster_role, r.label]
        for r in records
    }


# ---------------------------------------------------------------------------
# No-op-Verifikation gegen persistierte Baseline
# ---------------------------------------------------------------------------

async def verify_noop_against_db(aoi: str, records: list[LocalPointRecord]) -> dict[str, Any]:
    spec = AOIS[aoi]
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=2)
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT code, track, cluster_id, label,
                       meta->'cluster'->>'cluster_role' AS role
                FROM ml_point_results WHERE run_id = $1::uuid
                """,
                spec["baseline_run"],
            )
    finally:
        await pool.close()
    db = {(r["code"], r["track"]): (r["cluster_id"], r["role"], r["label"]) for r in rows}
    mem = {(r.code, r.track): (r.cluster_id, r.cluster_role, r.label) for r in records}
    only_db = set(db) - set(mem)
    only_mem = set(mem) - set(db)
    diff = [k for k in (set(db) & set(mem)) if db[k] != mem[k]]
    return {
        "db_points": len(db), "harness_points": len(mem),
        "only_db": len(only_db), "only_harness": len(only_mem),
        "differing": len(diff),
        "identical": not only_db and not only_mem and not diff,
        "diff_sample": [
            {"key": f"{k[0]}:t{k[1]}", "db": list(db[k]), "harness": list(mem[k])}
            for k in diff[:5]
        ],
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

EXPERIMENTS: dict[str, ExperimentConfig] = {
    "noop": ExperimentConfig("noop", "Produktionsidentische Variante (Determinismus-/No-op-Beweis)"),
}

def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Phase-7 Clustering-Experiment-Harness")
    p.add_argument("--aois", default="mirabell", help=f"Kommagetrennt aus: {','.join(AOIS)}")
    p.add_argument("--experiments", default="noop")
    p.add_argument("--verify-noop", action="store_true", help="No-op gegen persistierten Baseline-Run pruefen")
    p.add_argument("--confidence", action="store_true", help="Konfidenzmodul rechnen")
    p.add_argument("--confidence-max-groups", type=int, default=None)
    p.add_argument("--cross-track", action="store_true")
    p.add_argument("--hr-compare", metavar="SNT_AOI:TSX_AOI", help="z. B. bg_flat_01_snt:bg_flat_01_tsx")
    p.add_argument("--out", default=None, help="JSON-Ausgabedatei (default: artifacts/phase7_experiment_<id>.json)")
    return p


async def amain(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    aois = [a.strip() for a in args.aois.split(",") if a.strip()]
    experiment_ids = [e.strip() for e in args.experiments.split(",") if e.strip()]

    inputs_cache: dict[str, dict[str, Any]] = {}
    for aoi in set(aois) | (set(args.hr_compare.split(":")) if args.hr_compare else set()):
        inputs_cache[aoi] = await fetch_aoi_inputs(aoi)

    results: dict[str, Any] = {"stand": "2026-06-10", "experiments": {}}
    for exp_id in experiment_ids:
        if exp_id not in EXPERIMENTS:
            raise SystemExit(f"unbekanntes Experiment: {exp_id} (registriert: {sorted(EXPERIMENTS)})")
        exp = EXPERIMENTS[exp_id]
        exp_out: dict[str, Any] = {"config": exp.to_jsonable(), "aois": {}}
        for aoi in aois:
            pipeline, records, metrics = run_experiment_on_inputs(exp, inputs_cache[aoi])
            aoi_out: dict[str, Any] = {
                "summary": summarize_records(records),
                "pipeline_metrics": {k: v for k, v in metrics.items()},
            }
            if args.verify_noop and exp_id == "noop":
                aoi_out["noop_verification"] = await verify_noop_against_db(aoi, records)
            if args.cross_track:
                aoi_out["cross_track"] = harness_cross_track(records, AOIS[aoi]["dataset_id"])
            if args.confidence:
                aoi_out["confidence"] = confidence_summary(
                    pipeline, records, inputs_cache[aoi]["params"], args.confidence_max_groups
                )
            exp_out["aois"][aoi] = aoi_out
        results["experiments"][exp_id] = exp_out

    if args.hr_compare:
        snt_aoi, tsx_aoi = args.hr_compare.split(":")
        exp = EXPERIMENTS[experiment_ids[0]]
        _, snt_records, _ = run_experiment_on_inputs(exp, inputs_cache[snt_aoi])
        _, tsx_records, _ = run_experiment_on_inputs(exp, inputs_cache[tsx_aoi])
        results["hr_compare"] = {
            "snt_aoi": snt_aoi, "tsx_aoi": tsx_aoi,
            **hr_structural_compare(snt_records, tsx_records),
        }

    out_path = Path(args.out) if args.out else ARTIFACTS_DIR / f"phase7_experiment_{'_'.join(experiment_ids)}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2, default=str))
    print(f"written: {out_path}")
    # Kompakt-Zusammenfassung auf stdout
    for exp_id, exp_out in results["experiments"].items():
        for aoi, aoi_out in exp_out["aois"].items():
            line = f"[{exp_id}/{aoi}] kept={aoi_out['summary']['points_kept']} noise={aoi_out['summary']['points_noise']}"
            if "noop_verification" in aoi_out:
                line += f" noop_identical={aoi_out['noop_verification']['identical']}"
            if "cross_track" in aoi_out:
                line += f" xtrack_med={aoi_out['cross_track']['agreement_median']}"
            if "confidence" in aoi_out:
                line += f" bands={aoi_out['confidence']['band_counts']}"
            print(line)
    if "hr_compare" in results:
        hr = results["hr_compare"]
        print(f"[hr {hr['snt_aoi']} vs {hr['tsx_aoi']}] coupled={hr['buildings_coupled']} match_rate={hr['hr_main_region_match_rate']}")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(amain()))


if __name__ == "__main__":
    main()
