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
from collections import Counter
from dataclasses import dataclass, field, asdict, replace
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
from ..pipelines.anomaly_local_v1 import (
    BUILDING_SOURCE_SPECS,
    AnomalyLocalV1Pipeline,
    LocalPointRecord,
)
from ..types import RunConfig
# P8-B (Bauteil-Trenner): dieselben selbstkalibrierten Konstanten wie der
# validierte Survivors-Scan (Fall 96959851) treiben die neuen Achsen
# a6_antilayover / a7_reach / a8_heightprofile.
from .phase7_survivors_scan import (
    ANTI_COMPONENT_MIN_M,
    ANTI_LAYOVER_DOT,
    HEIGHT_MARGIN_M,
    HEIGHT_SATURATION_RATIO,
    MAD_FLOOR_M,
    MAD_K,
    OFF_FOOTPRINT_EPS_M,
)

ARTIFACTS_DIR = Path(__file__).resolve().parents[4] / "docs" / "pipelines" / "anomaly_local_v1" / "artifacts"

AOIS: dict[str, dict[str, Any]] = {
    "mirabell": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "regression_gate",
        "bbox": (13.04027, 47.80375, 13.04387, 47.80735),
        "baseline_run": "a9419755-ced3-48c3-9d6d-57e17a7b6e7c",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "13fb52ef-e351-43a7-b33e-57d64fb62934",  # v3_k2xh_diffv2 (P8 W4)
    },
    "moosstrasse": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "regression_gate",
        "bbox": (13.02714, 47.79189, 13.03074, 47.79549),
        "baseline_run": "c1297b3e-daf1-4ac5-982c-0ed8611fec3c",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "79dd1468-f8ed-42c5-a6bd-62431be06f8f",  # v3_k2xh_diffv2 (P8 W4)
    },
    "osthang": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "stress_diagnose",
        "bbox": (13.0492, 47.8036, 13.0528, 47.8054),
        "baseline_run": "d8aa1314-0709-4646-9536-8c30736f178e",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "9ff3a6dc-a9a2-4503-8052-71dfc91ddd45",  # v3_k2xh_diffv2 (P8 W4)
    },
    "bg_flat_01_snt": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_snt", "role": "calibration_gate",
        "bbox": (13.132531, 47.106449, 13.135531, 47.109449),
        "baseline_run": "ce87a736-128b-48ac-b5a5-ea95f5127574",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "76eb4779-a04d-4798-bcd7-4b979ca7f799",  # v3_k2xh_diffv2 (P8 W4)
    },
    "bg_slope_01_snt": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_snt", "role": "stress_diagnose",
        "bbox": (13.138531, 47.118449, 13.141531, 47.121449),
        "baseline_run": "a7cd181e-b422-4d07-99c8-ddb8e8800252",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "430c3aa2-98b7-466f-8372-c6f514d01272",  # v3_k2xh_diffv2 (P8 W4)
    },
    "bg_flat_01_tsx": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_tsx_paz", "role": "calibration_gate",
        "bbox": (13.132531, 47.106449, 13.135531, 47.109449),
        "baseline_run": "438ba411-dc5c-4f2b-b656-fd24d945bbf5",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "f0bcde44-3a13-473b-ac58-fc415a89d452",  # v3_k2xh_diffv2 (P8 W4)
    },
    "bg_slope_01_tsx": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_tsx_paz", "role": "stress_diagnose",
        "bbox": (13.138531, 47.118449, 13.141531, 47.121449),
        "baseline_run": "bb685fc3-a0a8-452b-a6a6-a6a2b23e803b",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "6edd064a-a7e6-4ec7-8999-cdbf60b4ed83",  # v3_k2xh_diffv2 (P8 W4)
    },
    "moosstrasse_bev": {
        "area_id": "salzburg", "dataset_id": "salzburg_snt", "role": "regression_gate",
        "source": "bev",
        "bbox": (13.02714, 47.79189, 13.03074, 47.79549),
        "baseline_run": "b4514e21-6643-410d-8daa-a870485e5150",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "85953608-14e6-473e-967c-d24c8791d880",  # v3 (P8-A-W2-T1, BEV-Vollzug)
    },
    "bg_slope_01_snt_bev": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_snt", "role": "stress_diagnose",
        "source": "bev",
        "bbox": (13.138531, 47.118449, 13.141531, 47.121449),
        "baseline_run": "b24b1e91-8f23-4fba-9b0a-11f7f809f863",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "935a3a0a-4917-4b21-8d8e-cd099d3e2db5",  # v3 (P8-A-W2-T1)
    },
    "bg_slope_01_tsx_bev": {
        "area_id": "bad_gastein", "dataset_id": "bad_gastein_tsx_paz", "role": "stress_diagnose",
        "source": "bev",
        "bbox": (13.138531, 47.118449, 13.141531, 47.121449),
        "baseline_run": "377393ca-54a5-4eb7-9cf0-56549d09b52c",  # v4_k2xhf_diffv2 (P8-F, 2026-07-08)
        "legacy_baseline_run": "649cf539-75f6-4c34-9375-164a1fe29c66",  # v3 (P8-A-W2-T1)
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
    SELECT p.code, p.track, p.height_std, p.acceleration_std, p.s_amp_std,
           p.s_phs_std, p.season_phs, p.eff_area,
           t.terrain_elevation_m
    FROM insar_points p
    LEFT JOIN insar_point_terrain t
      ON t.area_id = p.area_id AND t.dataset_id = p.dataset_id
     AND t.code = p.code AND t.track = p.track
    WHERE p.area_id = $5 AND p.dataset_id = $6
      AND ST_Intersects(p.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
"""

# Geometrische Zusatzfelder fuer a6_antilayover (P8-B): Azimut von der Kante
# des NAECHSTGELEGENEN Quelltabellen-Footprints zum Punkt (wie im
# Survivors-Scan, aber LATERAL-nearest statt der zugeordneten building_id, weil
# der Offline-Pfad die Zuordnung nicht in die Query traegt). {building_table}
# stammt aus BUILDING_SOURCE_SPECS (keine Nutzereingabe).
GEOM_EXTRAS_QUERY_TEMPLATE = """
    WITH envelope AS (
        SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom
    )
    SELECT p.code, p.track, nb.az_from_fp, nb.d_fp_db
    FROM insar_points p
    CROSS JOIN envelope e
    CROSS JOIN LATERAL (
        SELECT
            degrees(ST_Azimuth(ST_ClosestPoint(b.geom, p.geom)::geography,
                               p.geom::geography)) AS az_from_fp,
            ST_Distance(p.geom::geography, b.geom::geography) AS d_fp_db
        FROM {building_table} b
        WHERE b.area_id = $5
          AND ST_DWithin(b.geom::geography, e.geom::geography, 60.0)
        ORDER BY b.geom <-> p.geom
        LIMIT 1
    ) nb
    WHERE p.area_id = $5 AND p.dataset_id = $6
      AND ST_Intersects(p.geom, e.geom)
"""

# nearest-Punkte in einer OSM-Struktur OHNE GBA-Entsprechung (Carport-Veto,
# nur Salzburg verfuegbar; Bad Gastein hat keine geladenen OSM-Gebaeude).
OSM_FOREIGN_QUERY = """
    SELECT p.code, p.track
    FROM insar_points p
    JOIN osm_buildings o
      ON o.area_id = $5 AND ST_Covers(o.geom, p.geom)
    WHERE p.area_id = $5 AND p.dataset_id = $6
      AND ST_Intersects(p.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      AND NOT EXISTS (
        SELECT 1 FROM gba_buildings g
        WHERE g.area_id = $5 AND ST_Intersects(g.geom, o.geom)
      )
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
    # OPTICS-Achsen (P7-C-W2-T1; nur bei algorithm="optics" wirksam)
    optics_cluster_method: str = "xi"     # xi | dbscan
    optics_xi: float = 0.05
    optics_eps: float = 0.5               # nur fuer cluster_method=dbscan (skalierter Feature-Raum)
    # Feature-Matrix: Liste (feature_name, gewicht); None = produktiver Default
    matrix_features: list[tuple[str, float]] | None = None
    # Gate-Achsen
    coherence_floor: float | None = None  # None = produktiv 0.45
    coherence_gate_mode: str = "absolute" # absolute | percentile:<p>
    # Assignment-Politik (Schritt 4): kommaseparierte Token-Liste. Bekannte
    # Token: a0 | a1_demote | a2_dist:<m> | a3_height | a4_osm | a5_crosslook |
    # a6_antilayover | a7_reach | a8_heightprofile. Ein Single-Token verhaelt
    # sich exakt wie frueher.
    assignment_policy: str = "a0"
    # P8-B (Bauteil-Trenner): "demote" (klassisch: Kandidaten der neuen Achsen
    # a6/a7/a8 werden gate-ausgeschlossen) | "separate" (Kandidaten bekommen
    # einen eigenen annex-Cluster statt entfernt zu werden). Nur die neuen
    # Achsen reagieren darauf; a1..a5 demotieren unveraendert direkt.
    separation_mode: str = "demote"
    # P8-F: Evidenzklassen-Routing der separation_candidates in
    # _assign_side_group (geerbt aus der Produktion). "off" (=v3: alle
    # Kandidaten in annex-Cluster) | "anti_foreign" (anti_layover-Kandidaten
    # -> :foreign/weak_support, bev auch reach; Rest annex) |
    # "strict_structural" (nur height_outlier bleibt annex-Klasse;
    # Vergleichsvariante). Default "anti_foreign" seit dem P8-F-Port
    # (Invariante noop == Produktion).
    separation_classes: str = "anti_foreign"
    # Small-N-Politik: baseline | strict (Konsistenzpflicht statt Pseudo-Core)
    smalln_mode: str = "baseline"
    # Borderline-Noise-Reassignment: on | off
    reassign_mode: str = "on"

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

    Mit der Default-Konfiguration (noop) ist das Verhalten punktidentisch zur
    Produktion (No-op-Beweis gegen persistierte Baseline-Runs).

    P8-B (W4-Port): Der Component-Separator (a6/a7/a8 -> annex-Cluster) ist seit
    diesem Port produktiv (AnomalyLocalV1Pipeline.component_separation_enabled).
    Damit gilt: noop == Produktion MIT k2xh-Separation. Fuer Experimente, die die
    Trennung selbst ueber a6/a7/a8-Token steuern (k2xh, k2xh_demote, isolierte
    a6/a7/a8), schaltet __init__ die Produktions-Separation ab und der Harness
    fuehrt sie ueber die Assignment-Policy (separate/demote). Deshalb ist
    EXPERIMENTS['k2xh'] jetzt eine Beinahe-Identitaet zu noop; der einzige
    Unterschied ist die a6-Azimutquelle (k2xh nutzt den geodaetischen
    x_az_from_fp aus GEOM_EXTRAS_QUERY, die Produktion/noop den planaren
    record.az_from_fp aus der points_query).
    """

    def __init__(self, exp: ExperimentConfig, extra_features: dict[tuple[str, int], dict[str, float | None]] | None = None,
                 osm_foreign: set[tuple[str, int]] | None = None,
                 geom_extras: dict[tuple[str, int], dict[str, float | None]] | None = None):
        self.exp = exp
        self.extra_features = extra_features or {}
        self.osm_foreign = osm_foreign or set()
        # P8-B: geometrische Zusatzfelder (az_from_fp) aus GEOM_EXTRAS_QUERY.
        self.geom_extras = geom_extras or {}
        self.reassign_stats: Counter = Counter()
        self.policy_stats: Counter = Counter()
        # P8-B (W4-Port): Die Produktion trennt jetzt IMMER
        # (component_separation_enabled=True als Klassenattribut). Fuer
        # Experimente, die die Trennung selbst ueber a6/a7/a8-Token steuern
        # (separate ODER demote), die Produktions-Separation ausschalten, damit
        # nicht doppelt markiert/getrennt wird. Fuer alle anderen (noop und die
        # reinen Clustering-Achsen-Sweeps) laeuft die Produktions-Separation:
        # noop == Produktion MIT k2xh.
        _component_tokens = {
            raw.strip().split(":")[0] for raw in exp.assignment_policy.split(",")
        }
        self.component_separation_enabled = not (
            _component_tokens & {"a6_antilayover", "a7_reach", "a8_heightprofile"}
        )
        # P8-F: Evidenzklassen-Routing als Instanzattribut (ueberschreibt das
        # Klassenattribut der Produktion; wirkt in dem geerbten
        # _assign_side_group fuer Produktions- UND Token-Separation).
        self.separation_classes = exp.separation_classes

    # --- Zusatzfelder in die Feature-Map injizieren -----------------------
    def _compute_series_features(self, records: list[LocalPointRecord]) -> None:
        super()._compute_series_features(records)
        for record in records:
            extra = self.extra_features.get((record.code, record.track))
            if extra:
                for name, value in extra.items():
                    if value is not None:
                        record.features[f"x_{name}"] = float(value)
            geom = self.geom_extras.get((record.code, record.track))
            if geom and geom.get("az_from_fp") is not None:
                record.features["x_az_from_fp"] = float(geom["az_from_fp"])

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
        self._apply_assignment_policy(records)

    # --- Assignment-Politik: Token-Dispatcher (P8-B) ----------------------
    def _apply_assignment_policy(self, records: list[LocalPointRecord]) -> None:
        """Kommaseparierte Politik-Token nacheinander anwenden.

        a1..a5 demotieren direkt (gate-excluded mit eigenem Grund: sichtbar/
        geflaggt, aber weder Cluster-Mitglied noch Score-Beitrag). a6/a7/a8
        MARKIEREN nur (separation_candidate); ob daraus Demotion oder ein
        eigener annex-Cluster wird, entscheidet separation_mode (nach der
        Token-Schleife, damit a5-Demotion und a6/a7/a8-Trennung disjunkt
        bleiben). a0 ist no-op; a2_dist wirkt ueber max_distance_m im Fetch.
        """
        dispatch = {
            "a1_demote": self._policy_a1,
            "a3_height": self._policy_a3,
            "a4_osm": self._policy_a4,
            "a5_crosslook": self._policy_a5,
            "a6_antilayover": self._policy_a6,
            "a7_reach": self._policy_a7,
            "a8_heightprofile": self._policy_a8,
        }
        for raw in self.exp.assignment_policy.split(","):
            token = raw.strip()
            if not token:
                continue
            base = token.split(":")[0]
            if base in ("a0", "a2_dist"):
                continue
            handler = dispatch.get(base)
            if handler is None:
                raise ValueError(f"unknown assignment_policy token: {token}")
            handler(records)

        if self.exp.separation_mode == "demote" and not self.component_separation_enabled:
            # A/B-Vergleich: die vom Harness markierten Bauteil-Kandidaten
            # klassisch demotieren (statt in annex zu trennen). Nur wenn der
            # Harness die Separation selbst besitzt - sonst hat die Produktion
            # (component_separation_enabled=True, noop-Pfad) die Kandidaten schon
            # in annex-Cluster getrennt und darf sie nicht nachtraeglich demotiert
            # bekommen.
            for r in records:
                if r.flags.get("separation_candidate") and not r.gate_excluded:
                    self._policy_demote(r, r.flags["separation_reasons"][0])

    def _policy_demote(self, record: LocalPointRecord, reason: str) -> None:
        record.gate_reasons = list(record.gate_reasons) + [reason]
        record.gate_excluded = True
        record.kept_for_scoring = False
        record.flags["gate_excluded"] = True
        record.flags["gate_reasons"] = record.gate_reasons
        record.flags.setdefault("degraded_reason", reason)
        self.policy_stats[reason] += 1

    def _mark_separation(self, record: LocalPointRecord, reason: str) -> None:
        record.flags["separation_candidate"] = True
        record.flags.setdefault("separation_reasons", []).append(reason)
        self.policy_stats[f"separation_candidate:{reason}"] += 1

    def _policy_a1(self, records: list[LocalPointRecord]) -> None:
        for r in records:
            if r.assignment_method == "nearest" and not r.gate_excluded:
                self._policy_demote(r, "nearest_demoted")

    def _policy_a3(self, records: list[LocalPointRecord]) -> None:
        # Kalibrierung je Track: p25 der (Punkthoehe - Gelaendehoehe) der
        # geometrisch begruendeten Punkte; nearest deutlich darunter
        # (>2 m) = Bodenobjekt-/Carport-Verdacht.
        rel_by_track: dict[int, list[float]] = {}
        def rel(r: LocalPointRecord) -> float | None:
            extra = self.extra_features.get((r.code, r.track)) or {}
            terr = extra.get("terrain_elevation_m")
            if terr is None or r.height is None:
                return None
            return float(r.height) - float(terr)
        for r in records:
            if r.assignment_method in ("within", "directional_buffer") and not r.gate_excluded:
                v = rel(r)
                if v is not None:
                    rel_by_track.setdefault(r.track, []).append(v)
        p25 = {t: float(np.percentile(np.asarray(v), 25)) for t, v in rel_by_track.items() if v}
        for r in records:
            if r.assignment_method != "nearest" or r.gate_excluded:
                continue
            v = rel(r)
            ref = p25.get(r.track)
            if v is not None and ref is not None and v < ref - 2.0:
                self._policy_demote(r, "nearest_low_height")

    def _policy_a4(self, records: list[LocalPointRecord]) -> None:
        for r in records:
            if (
                r.assignment_method == "nearest" and not r.gate_excluded
                and (r.code, r.track) in self.osm_foreign
            ):
                self._policy_demote(r, "nearest_osm_foreign_structure")

    def _policy_a5(self, records: list[LocalPointRecord]) -> None:
        # Quer-Versatz-Politik (P7-V3, motiviert durch Fall 96959851):
        # Laengs-Versatz kann Radarprojektion sein, Quer-Versatz nicht.
        # Selbstkalibrierend pro Gebaeude x Track: Toleranz aus ROBUSTER
        # Statistik der |cross_look_offset_m| der geometrisch begruendeten
        # Anker (within/directional):
        #   limit = median + 3*1.4826*MAD + 3 m Geocoding-Marge
        #           + sqrt(eff_area) des Kandidatenpunkts.
        # Median/MAD statt p95, weil die Candidate-Area selbst Fremdpunkte
        # als directional fangen kann. Ohne Anker: alle nearest demotieren.
        anchors_by_group: dict[tuple[str | None, int], list[float]] = {}
        for r in records:
            if r.assignment_method in ("within", "directional_buffer") and not r.gate_excluded:
                cross = r.features.get("cross_look_offset_m")
                if cross is not None and np.isfinite(cross):
                    anchors_by_group.setdefault((r.building_id, r.track), []).append(abs(float(cross)))
        for r in records:
            if r.assignment_method != "nearest" or r.gate_excluded:
                continue
            anchors = anchors_by_group.get((r.building_id, r.track))
            if not anchors:
                self._policy_demote(r, "nearest_no_geometric_anchor")
                continue
            cross = r.features.get("cross_look_offset_m")
            if cross is None or not np.isfinite(cross):
                self._policy_demote(r, "nearest_crosslook_unknown")
                continue
            arr = np.asarray(anchors, dtype=float)
            med = float(np.median(arr))
            mad = float(np.median(np.abs(arr - med)))
            eff_area = r.features.get("x_eff_area") or 0.0
            limit = med + 3.0 * 1.4826 * mad + 3.0 + math.sqrt(max(float(eff_area), 0.0))
            if abs(float(cross)) > limit:
                self._policy_demote(r, "nearest_crosslook_outlier")

    def _policy_a8(self, records: list[LocalPointRecord]) -> None:
        """Hoehenprofil-Trenner (P8-B): kartierungsfrei, ALLE
        Zuordnungsmethoden. Anker = nicht ausgeschlossene within/directional-
        Punkte am Footprint (d_fp<=0.5) je (building, track); Median/MAD der
        Anker-Hoehen, tol = max(3*1.4826*MAD, 1 m). Kandidat: jeder kept-Punkt
        mit |height - median| > tol.

        Robustheit (W2-Iteration): der Kandidat wird aus SEINEM EIGENEN
        Anker-Set entfernt (Selbst-Anker-Effekt) und es sind >=2 UNABHAENGIGE
        Anker noetig; sonst kein Check. Der fragile Single-Anchor-3m-Fall
        entfaellt (zu viele False Positives auf Kleinbauten)."""
        anchors_by_group: dict[tuple[str | None, int], list[tuple[str, float]]] = {}
        for r in records:
            if (
                r.assignment_method in ("within", "directional_buffer")
                and not r.gate_excluded
                and r.height is not None
                and r.distance_m is not None
                and float(r.distance_m) <= OFF_FOOTPRINT_EPS_M
            ):
                anchors_by_group.setdefault((r.building_id, r.track), []).append((r.code, float(r.height)))
        for r in records:
            if r.gate_excluded or r.height is None:
                continue
            anchors = anchors_by_group.get((r.building_id, r.track))
            if not anchors:
                continue
            heights = [h for code, h in anchors if code != r.code]
            if len(heights) < 2:
                continue
            med = float(np.median(heights))
            mad = float(np.median([abs(h - med) for h in heights]))
            tol = max(MAD_K * mad, MAD_FLOOR_M)
            # Einseitiges Anbau-Band (W2-Iteration 2): Anbauten liegen UNTER
            # dem Hauptdach, aber nicht beliebig tief. Punkte > 8 m unter den
            # Ankern sind Boden-/Gelaende-Returns (Osthang-Befund: -11/-21 m)
            # und gehoeren in die normale Clusterung, nicht in annex-Cores;
            # Punkte OBERHALB der Anker sind kein Anbau (ueber-Dach-Klasse
            # bleibt a6/a7 bzw. foreign-Logik).
            delta_below = med - float(r.height)
            if tol < delta_below <= 8.0:
                self._mark_separation(r, "height_outlier")

    def _policy_a7(self, records: list[LocalPointRecord]) -> None:
        """Layover-Reichweiten-Trenner (P8-B): implizite Reflektorhoehe
        d_fp/tan(inc) uebersteigt die plausible Gebaeudehoehe + Marge. Fuer
        gba wird die Saturierung korrigiert (h/0.735), fuer bev ist die Hoehe
        gemessen. Fehlt die Hoehe: kein Check."""
        for r in records:
            if r.gate_excluded:
                continue
            d_fp = r.distance_m
            if d_fp is None or float(d_fp) <= OFF_FOOTPRINT_EPS_M:
                continue
            ph = r.building_plausibility_height
            if ph is None:
                continue
            source = (r.building_source or "").lower()
            plausible_h = float(ph) / HEIGHT_SATURATION_RATIO if source == "gba" else float(ph)
            inc = float(r.incidence_angle) if r.incidence_angle is not None else 38.5
            implied_h = float(d_fp) / max(math.tan(math.radians(inc)), 1e-6)
            if implied_h > plausible_h + HEIGHT_MARGIN_M:
                self._mark_separation(r, "reach_height_excess")

    def _policy_a6(self, records: list[LocalPointRecord]) -> None:
        """Anti-Layover-Trenner (P8-B): Versatz ENTGEGEN der Range-Richtung
        (range_dx/dy) ist als Dachreflexion physikalisch unmoeglich (Layover
        verschiebt nur in EINE Richtung). az_from_fp aus GEOM_EXTRAS_QUERY.
        Kandidat wenn dot < -0.2 UND d_fp*(-dot) > 1.5 UND d_fp > 0.5."""
        for r in records:
            if r.gate_excluded:
                continue
            d_fp = r.distance_m
            if d_fp is None or float(d_fp) <= OFF_FOOTPRINT_EPS_M:
                continue
            # x_az_from_fp (geodaetischer Azimut aus GEOM_EXTRAS_QUERY) bevorzugt;
            # Fallback record.az_from_fp (planarer Azimut aus der Produktions-
            # points_query), damit Harness- und Produktions-Pfad dieselbe Quelle
            # nutzen koennen. None-Check statt `or`, weil Azimut 0.0 (Nord)
            # gueltig ist.
            az = r.features.get("x_az_from_fp")
            if az is None:
                az = r.az_from_fp
            if az is None or r.range_dx is None or r.range_dy is None:
                continue
            az_rad = math.radians(float(az))
            ux, uy = math.sin(az_rad), math.cos(az_rad)
            norm = math.hypot(float(r.range_dx), float(r.range_dy)) or 1.0
            dot = (ux * float(r.range_dx) + uy * float(r.range_dy)) / norm
            if dot < ANTI_LAYOVER_DOT and float(d_fp) * (-dot) > ANTI_COMPONENT_MIN_M:
                self._mark_separation(r, "anti_layover")

    # --- Bauteil-Trenner-Seams (P8-B) --------------------------------------
    # Seit dem W4-Port lebt _assign_side_group (annex-Zuweisung + kinematische
    # Rekrutierung) in der Produktion (AnomalyLocalV1Pipeline) und wird hier
    # geerbt. Der Harness liefert ihm im separate-Modus nur die Kandidaten via
    # _partition_for_clustering; im Nicht-separate-Modus delegiert er an die
    # Produktion, die selbst per component_separation_enabled entscheidet.
    def _partition_for_clustering(self, building_id, track, kept):
        """Peel-after-Clustering: der VOLLE kept-Satz wird geclustert (damit
        die Hauptdach-Kerne exakt ihre noop-Rollen behalten und nicht durch das
        Herausnehmen von Nachbarpunkten in Noise kippen, W2-Iteration); die
        markierten Kandidaten werden erst im geerbten `_assign_side_group` in
        den annex umetikettiert. Im separate-Modus peelt der Harness selbst
        (Produktions-Separation ist dann ausgeschaltet); sonst delegiert er an
        die Produktion."""
        if self.exp.separation_mode != "separate":
            return super()._partition_for_clustering(building_id, track, kept)
        side = [r for r in kept if r.flags.get("separation_candidate")]
        return (kept, side)

    # --- Small-N-Politik (P7-C-W1-T3) --------------------------------------
    def _apply_small_n_fallback(self, building_id, track, kept, noise_threshold):
        if self.exp.smalln_mode == "baseline":
            return super()._apply_small_n_fallback(building_id, track, kept, noise_threshold)
        if self.exp.smalln_mode != "strict":
            raise ValueError(f"unknown smalln_mode: {self.exp.smalln_mode}")
        velocities = np.asarray([r.velocity for r in kept], dtype=float)
        med = float(np.median(velocities))
        tol = np.maximum(1.0, 2.0 * np.asarray([r.velocity_std or 0.5 for r in kept], dtype=float))
        consistent = np.abs(velocities - med) <= tol
        if int(consistent.sum()) >= 2:
            return super()._apply_small_n_fallback(building_id, track, kept, noise_threshold)
        for r in kept:
            r.small_n_fallback = True
            r.cluster_id = f"{building_id}:t{track}:weak_support"
            r.cluster_role = "weak_support"
            r.cluster_probability = 0.30
            r.cluster_outlier_score = max(r.cluster_outlier_score, 0.50)

    # --- Reassignment-Audit (P7-C-W1-T4) ------------------------------------
    def _reassign_borderline_noise(self, kept, matrix, labels, probabilities, outlier_scores):
        if self.exp.reassign_mode == "off":
            self.reassign_stats["skipped_groups"] += 1
            return labels, probabilities, outlier_scores
        before = labels.copy()
        labels, probabilities, outlier_scores = super()._reassign_borderline_noise(
            kept, matrix, labels, probabilities, outlier_scores
        )
        for i in range(len(kept)):
            if before[i] == -1 and labels[i] >= 0:
                method = kept[i].assignment_method or "unassigned"
                n = len(kept)
                regime = "6-12" if n <= 12 else ("13-50" if n <= 50 else ">50")
                self.reassign_stats["rescued_total"] += 1
                self.reassign_stats[f"method:{method}"] += 1
                self.reassign_stats[f"regime:{regime}"] += 1
        return labels, probabilities, outlier_scores

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
            optics_kwargs: dict[str, Any] = {
                "min_samples": max(2, min_samples),
                "min_cluster_size": min_cluster_size,
                "cluster_method": exp.optics_cluster_method,
            }
            if exp.optics_cluster_method == "xi":
                optics_kwargs["xi"] = float(exp.optics_xi)
            elif exp.optics_cluster_method == "dbscan":
                # eps im skalierten, gewichteten Feature-Raum (RobustScaler 15/85)
                optics_kwargs["eps"] = float(exp.optics_eps)
            else:
                raise ValueError(f"unknown optics_cluster_method: {exp.optics_cluster_method}")
            model = OPTICS(**optics_kwargs)
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

async def fetch_aoi_inputs(aoi: str, params_overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    spec = AOIS[aoi]
    config = RunConfig(
        run_id="00000000-0000-0000-0000-000000000000",
        pipeline="anomaly_local_v1",
        area_id=spec["area_id"],
        dataset_id=spec["dataset_id"],
        source=str(spec.get("source", "gba")),
        track=None,
        bbox=spec["bbox"],
        params={},
    )
    pipeline = AnomalyLocalV1Pipeline()
    params = pipeline.default_params()
    # Quelle aus der AOI-Spec pinnen (Default gba): alle persistierten
    # Baselines und Referenzfaelle sind gba-basiert; _fetch_inputs liest nur
    # params["source"], dessen produktiver Default seit der BEV-Integration
    # bev ist und den Offline-Pfad sonst stillschweigend umstellen wuerde.
    params["source"] = str(spec.get("source", "gba"))
    if params_overrides:
        params.update(params_overrides)
    building_table = BUILDING_SOURCE_SPECS[str(params["source"]).lower()][0]
    geom_query = GEOM_EXTRAS_QUERY_TEMPLATE.format(building_table=building_table)
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=2)
    try:
        base_rows, ts_rows, amp_rows = await pipeline._fetch_inputs(pool, config, params)
        async with pool.acquire() as conn:
            extra_rows = await conn.fetch(
                EXTRA_FIELDS_QUERY, *spec["bbox"], spec["area_id"], spec["dataset_id"]
            )
            geom_rows = await conn.fetch(
                geom_query, *spec["bbox"], spec["area_id"], spec["dataset_id"]
            )
            osm_rows = []
            if spec["area_id"] == "salzburg":
                osm_rows = await conn.fetch(
                    OSM_FOREIGN_QUERY, *spec["bbox"], spec["area_id"], spec["dataset_id"]
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
            "terrain_elevation_m": r["terrain_elevation_m"],
        }
        for r in extra_rows
    }
    geom_extras = {
        (r["code"], r["track"]): {"az_from_fp": r["az_from_fp"], "d_fp_db": r["d_fp_db"]}
        for r in geom_rows
    }
    return {"spec": spec, "params": params, "base_rows": base_rows, "ts_rows": ts_rows,
            "amp_rows": amp_rows, "extras": extras, "geom_extras": geom_extras,
            "osm_foreign": {(r["code"], r["track"]) for r in osm_rows}}


def fetch_overrides_for(exp: ExperimentConfig) -> dict[str, Any] | None:
    for raw in exp.assignment_policy.split(","):
        token = raw.strip()
        if token.startswith("a2_dist:"):
            return {"max_distance_m": float(token.split(":", 1)[1])}
    return None


def run_experiment_on_inputs(exp: ExperimentConfig, inputs: dict[str, Any]):
    pipeline = ExperimentPipeline(
        exp, inputs["extras"], inputs.get("osm_foreign"), inputs.get("geom_extras")
    )
    records, metrics = pipeline._compute_run(
        inputs["base_rows"], inputs["ts_rows"], inputs["amp_rows"], dict(inputs["params"])
    )
    return pipeline, records, metrics


def main_cluster_choice_audit(records: list[LocalPointRecord]) -> dict[str, Any]:
    """Diagnose: wuerde eine within-share-first-Rangfolge den Main-Cluster aendern?

    Keine Pipeline-Aenderung - reine Auswertung der Zielbild-Pruefachse
    (support-basierte Wahl kann Anbau-/nearest-Cluster bevorzugen).
    """
    groups: dict[tuple[str, int], dict[str, list[LocalPointRecord]]] = {}
    mains: dict[tuple[str, int], str | None] = {}
    for r in records:
        if not r.building_id or r.cluster_role != "core" or not r.cluster_id:
            continue
        key = (r.building_id, r.track)
        groups.setdefault(key, {}).setdefault(str(r.cluster_id), []).append(r)
        rollup = r.building_rollup or {}
        mains[key] = (rollup.get("main_cluster_by_track") or {}).get(str(r.track))
    changed = []
    multi = 0
    for key, clusters in groups.items():
        if len(clusters) < 2:
            continue
        multi += 1
        current = str(mains.get(key)) if mains.get(key) else None
        def rank(item):
            cid, members = item
            within = sum(1 for m in members if m.assignment_method != "nearest")
            return (-within / len(members), -len(members), cid)
        alt = sorted(clusters.items(), key=rank)[0][0]
        if current and alt != current:
            cur_members = clusters.get(current, [])
            nearest_share = (
                sum(1 for m in cur_members if m.assignment_method == "nearest") / len(cur_members)
                if cur_members else None
            )
            changed.append({
                "building_id": key[0], "track": key[1],
                "current_main": current, "alt_main": alt,
                "current_nearest_share": round(nearest_share, 3) if nearest_share is not None else None,
            })
    return {
        "multi_cluster_groups": multi,
        "changed_main_count": len(changed),
        "changed_cases": changed[:20],
    }


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
    # Main-Cluster, die mehrheitlich aus nearest-Punkten bestehen (Hygiene-Signal)
    main_members: dict[tuple[str, str], list[LocalPointRecord]] = {}
    for r in records:
        if r.building_id and r.cluster_role == "core" and r.cluster_id and r.building_rollup:
            mains = {str(v) for v in (r.building_rollup.get("main_cluster_by_track") or {}).values()}
            if str(r.cluster_id) in mains:
                main_members.setdefault((r.building_id, str(r.cluster_id)), []).append(r)
    nearest_main = sum(
        1 for members in main_members.values()
        if sum(1 for m in members if m.assignment_method == "nearest") > len(members) / 2
    )
    # Robuste Multi-Cluster-Zaehlung (P7-V1): nur Cluster, die NICHT
    # nearest-dominiert sind, zaehlen. Hygiene-Politiken duerfen
    # nearest-getragene Zweitcluster verlieren, ohne den
    # Multi-Cluster-Guardrail zu reissen; echte Struktur bleibt geschuetzt.
    cluster_members: dict[tuple[str, str], list[LocalPointRecord]] = {}
    for r in records:
        if r.building_id and r.cluster_role == "core" and r.cluster_id:
            cluster_members.setdefault((r.building_id, str(r.cluster_id)), []).append(r)
    robust_by_building: Counter = Counter()
    for (bid, _cid), members in cluster_members.items():
        nearest_share = sum(1 for m in members if m.assignment_method == "nearest") / len(members)
        if nearest_share <= 0.5:
            robust_by_building[bid] += 1
    multi_robust = sum(1 for n in robust_by_building.values() if n > 1)
    # P8-F (report-only): aktive Differential-Level je Gebaeude inkl.
    # Quell-Cluster - macht den Diff noop<->sepcls_* maschinell auswertbar
    # (pure-geometric annex-Quellen muessen unter anti_foreign verschwinden).
    diff_levels: dict[str, Any] = {}
    diff_seen: set[str] = set()
    for r in records:
        if not r.building_id or r.building_id in diff_seen or not r.building_rollup:
            continue
        diff_seen.add(r.building_id)
        level = str(r.building_rollup.get("differential_motion_level") or "none")
        if level != "none":
            evidence = r.building_rollup.get("differential_motion_evidence") or {}
            diff_levels[r.building_id] = {
                "level": level,
                "cluster_id": evidence.get("cluster_id"),
            }
    return {
        "points_total": len(records),
        "points_kept": sum(1 for r in records if r.kept_for_scoring),
        "points_noise": sum(1 for r in records if r.cluster_role == "noise"),
        "points_nearest": sum(1 for r in records if r.assignment_method == "nearest"),
        "n_regimes": {k: regimes.get(k, 0) for k in ["<3", "3-5", "6-12", "13-50", ">50"]},
        "building_status_counts": dict(Counter(statuses.values())),
        "building_statuses": statuses,
        "building_differential_levels": diff_levels,
        "multi_cluster_buildings": multi,
        "multi_cluster_buildings_robust": multi_robust,
        "nearest_dominated_main_clusters": nearest_main,
    }


def separation_composition(records: list[LocalPointRecord]) -> dict[str, Any]:
    """P8-F Sichtbarkeits-Statistik: woraus bestehen die separierten Cluster?

    Zaehlt Punkte in annex-/foreign-Clustern je separation_reason-Kombination
    und Cluster je Evidenzklasse (structural = height_outlier oder
    annex_velocity_growth vorhanden). Haette den urspruenglichen Befund
    (Mehrheit der annex-Cluster ohne Struktur-Evidenz) sofort sichtbar
    gemacht - bleibt deshalb dauerhaft im AOI-Report."""
    from collections import Counter
    reason_combos: Counter = Counter()
    clusters: dict[str, dict[str, Any]] = {}
    for r in records:
        cid = str(r.cluster_id or "")
        if ":annex_" in cid:
            kind = "annex"
        elif cid.endswith(":foreign"):
            kind = "foreign"
        else:
            continue
        reasons = tuple(sorted(r.flags.get("separation_reasons") or []))
        reason_combos[f"{kind}:" + ("+".join(reasons) if reasons else "none")] += 1
        cluster = clusters.setdefault(cid, {"kind": kind, "structural": False})
        if {"height_outlier", "annex_velocity_growth"} & set(reasons):
            cluster["structural"] = True
    cluster_classes: Counter = Counter()
    for cluster in clusters.values():
        if cluster["kind"] == "annex":
            key = (
                "annex_clusters_structural"
                if cluster["structural"]
                else "annex_clusters_pure_geometric"
            )
        else:
            key = "foreign_clusters"
        cluster_classes[key] += 1
    return {
        "point_reason_combos": dict(reason_combos),
        "cluster_classes": dict(cluster_classes),
    }


def point_assignments(records: list[LocalPointRecord]) -> dict[str, list[str | None]]:
    return {
        f"{r.code}:t{r.track}": [r.cluster_id, r.cluster_role, r.label]
        for r in records
    }


# ---------------------------------------------------------------------------
# Scorecard (P7-B-W1-T2)
# ---------------------------------------------------------------------------

# Maschinell pruefbare Status-Erwartung je Referenzfalltyp; None = kein Status-Gate.
CASE_TYPE_EXPECTED_STATUS: dict[str, set[str] | None] = {
    "standard_ok_weak_secondary": {"ok", "single_track_only"},
    "adjacent_ok": {"ok"},
    "differential_motion": {"ok"},
    "differential_motion_low_reliability": {"ok"},
    "single_track_only": {"single_track_only"},
    "small_n": {"small_n"},
    "noise_dominated": {"noise_dominated"},
    "noise_dominated_low_agreement": {"noise_dominated"},
    "insufficient_support": {"insufficient_support"},
    "nearest_heavy_suspicious_ok": {"ok"},
    "ok_low_agreement_slope": {"ok"},
    "high_n_noise_dominated": {"noise_dominated"},
    "carport_nearest_main_suspect": None,
    "hr_coupling_ok": None,
    "hr_divergence": None,
    # P8-F: bev-spezifischer Fremdpunkt-Trennungs-Fall (A9A7E442); der
    # Gebaeude-Status bleibt ok, die eigentliche Erwartung sind Punkt-Pins.
    "foreign_separation_bev": {"ok"},
}

AOI_KEYS_BY_CASE_AOI = {
    # moosstrasse_bev: Referenzfaelle werden dort ueber den Dual-Key-Lookup
    # (bev_building_id) aufgeloest; die bg-bev-Varianten bleiben bewusst
    # aussen vor, bis bev-spezifische Erwartungen formuliert sind.
    "mirabell": ["mirabell"], "moosstrasse": ["moosstrasse", "moosstrasse_bev"], "osthang": ["osthang"],
    "bg_flat_01": ["bg_flat_01_snt", "bg_flat_01_tsx"],
    "bg_slope_01": ["bg_slope_01_snt", "bg_slope_01_tsx"],
    # P8-F: Faelle, die NUR im bev-Kontext definiert sind.
    "moosstrasse_bev": ["moosstrasse_bev"],
}

# Anspruchsstaerke eines Gebaeude-Status (P7-V1). Hygiene-Politiken duerfen
# Ansprueche EHRLICH ABSCHWAECHEN (Asymmetrie-Prinzip), nie verstaerken:
# rank(actual) <= max(rank(expected)) gilt als erwartungskonform.
# ok=volle Aussage, single_track_only=Aussage auf einem Track,
# small_n/noise_dominated=diagnostisch ohne Verlaesslichkeitsanspruch,
# insufficient_support=keine Aussage.
CLAIM_RANK: dict[str, int] = {
    "ok": 3,
    "single_track_only": 2,
    "small_n": 1,
    "noise_dominated": 1,
    "insufficient_support": 0,
}


def _policy_keys(config: dict[str, Any]) -> list[str]:
    """Aufloesungsreihenfolge fuer policy_expectations:
    exakte experiment_id -> assignment_policy (normalisiert) -> smalln_<mode>."""
    keys = [str(config.get("experiment_id") or "")]
    policy = str(config.get("assignment_policy") or "a0")
    for raw in policy.split(","):
        token = raw.strip()
        if token and token != "a0":
            keys.append(token.split(":")[0])
    smalln = str(config.get("smalln_mode") or "baseline")
    if smalln != "baseline":
        keys.append(f"smalln_{smalln}")
    return [k for k in keys if k]


def _is_policy_experiment(config: dict[str, Any]) -> bool:
    return (
        str(config.get("assignment_policy") or "a0") != "a0"
        or str(config.get("smalln_mode") or "baseline") != "baseline"
    )


def check_reference_cases(exp_out: dict[str, Any]) -> list[dict[str, Any]]:
    ref_path = ARTIFACTS_DIR / "phase7_reference_cases.json"
    if not ref_path.exists():
        return []
    cases = json.loads(ref_path.read_text())["cases"]
    config = exp_out.get("config") or {}
    checks = []
    for case in cases:
        default_expected = CASE_TYPE_EXPECTED_STATUS.get(case["case_type"])
        pin: set[str] | None = None
        pin_key: str | None = None
        policy_expectations = case.get("policy_expectations") or {}
        for key in _policy_keys(config):
            if key in policy_expectations:
                pin = set(policy_expectations[key])
                pin_key = key
                break
        if pin is None and default_expected is None and not case.get("point_expectations"):
            continue
        expected = pin if pin is not None else default_expected
        source = f"policy_pin:{pin_key}" if pin is not None else "case_type_default"
        for aoi_key in AOI_KEYS_BY_CASE_AOI.get(case["aoi"], []):
            aoi_out = exp_out["aois"].get(aoi_key)
            if not aoi_out:
                continue
            ds = case.get("dataset_id", "")
            if aoi_key.endswith("_tsx") and "tsx" not in ds:
                continue
            if aoi_key.endswith("_snt") and ds and "snt" not in ds:
                continue
            # P8-F: maschinelle Punkt-Pins (Evidenzklassen-Erwartungen je
            # Punkt). only_sources filtert nach Gebaeudequelle des AOI-Keys
            # (bev kartiert z.B. den 96959851-Anbau als eigenes Gebaeude -
            # dort gilt die annex-Erwartung bewusst NICHT). Fehlt der Punkt
            # im Lauf, wird das toleriert und nur sichtbar gemacht.
            aoi_source = str(AOIS.get(aoi_key, {}).get("source", "gba"))
            for pe in case.get("point_expectations") or []:
                only_sources = pe.get("only_sources")
                if only_sources and aoi_source not in only_sources:
                    continue
                try:
                    pin_id = f"{pe['point_code']}:t{int(pe['track'])}"
                    expected_states = set(pe["expected_states"])
                except (KeyError, TypeError, ValueError):
                    continue
                actual_state = (aoi_out.get("point_states") or {}).get(pin_id)
                if actual_state is None:
                    checks.append({
                        "case_id": case["case_id"], "aoi": aoi_key,
                        "building_id": case["building_id"], "point": pin_id,
                        "expected_any_of": sorted(expected_states), "actual": None,
                        "ok": True, "source": "point_pin_absent_tolerated",
                    })
                    continue
                checks.append({
                    "case_id": case["case_id"], "aoi": aoi_key,
                    "building_id": case["building_id"], "point": pin_id,
                    "expected_any_of": sorted(expected_states),
                    "actual": actual_state,
                    "ok": actual_state in expected_states,
                    "source": "point_pin",
                })
            if expected is None:
                continue
            # bev-Runs keyen building_statuses mit bev_id-GUIDs statt GBA-IDs; darum
            # zuerst per GBA-ID, bei Fehltreffer per bev_building_id nachschlagen.
            statuses = aoi_out["summary"]["building_statuses"]
            actual = statuses.get(case["building_id"])
            bev_id = case.get("bev_building_id")
            if actual is None and bev_id and bev_id != "no_bev_match":
                actual = statuses.get(bev_id)
            if actual is None:
                if pin is not None:
                    # Gepinnter Fall verschwindet unter der Politik (beide Keys fehlen)
                    # -> sichtbar machen.
                    checks.append({
                        "case_id": case["case_id"], "aoi": aoi_key,
                        "building_id": case["building_id"],
                        "expected_any_of": sorted(expected), "actual": None,
                        "ok": False, "source": source,
                    })
                continue
            ok = actual in expected
            check_source = source
            if not ok and pin is None and _is_policy_experiment(config):
                # Ehrliche Abstufung unter Hygiene-Politik toleriert; Aufwertung nie.
                max_expected_rank = max(CLAIM_RANK.get(e, 0) for e in expected)
                if CLAIM_RANK.get(actual, 0) <= max_expected_rank:
                    ok = True
                    check_source = "policy_downgrade_tolerance"
            checks.append({
                "case_id": case["case_id"], "aoi": aoi_key,
                "building_id": case["building_id"],
                "expected_any_of": sorted(expected), "actual": actual,
                "ok": ok, "source": check_source,
            })
    return checks


# ---------------------------------------------------------------------------
# Label-Korpus-Metriken (P8-D-W1-T2)
# ---------------------------------------------------------------------------

_LABEL_METRIC_KEYS = (
    "roof_lost", "foreign_in_main", "foreign_caught",
    "foreign_in_annex", "annex_in_foreign",
    "annex_merged", "annex_separated", "annex_demoted",
    "labels_evaluated", "unclear",
)


def _reference_label_state(record: LocalPointRecord) -> str:
    """Ist-Zustand eines Punkts fuer die Label-Benotung.

    P8-F: foreign_suspect wird VOR annex_suspect geprueft - ein als
    Fremdpunkt separierter Punkt (:foreign-Cluster) darf nie als annex
    gewertet werden; die Flags schliessen sich per Konstruktion aus."""
    if record.gate_excluded or record.cluster_role == "excluded":
        return "excluded"
    if record.flags.get("foreign_suspect"):
        return "foreign_separated"
    if record.flags.get("annex_suspect"):
        return "annex"
    role = record.cluster_role or "unassigned"
    if role == "core":
        return "main_core" if record.flags.get("is_main_cluster") else "core"
    return role


def pinned_point_states(records: list[LocalPointRecord]) -> dict[str, str]:
    """P8-F: Ist-Zustaende aller Punkte, fuer die irgendein Referenzfall
    point_expectations definiert. Wird je AOI in aoi_out persistiert und von
    check_reference_cases maschinell gegen die Pins geprueft - fachliche
    Punkt-Erwartungen existieren damit nie mehr nur als Prosa."""
    ref_path = ARTIFACTS_DIR / "phase7_reference_cases.json"
    if not ref_path.exists():
        return {}
    try:
        cases = json.loads(ref_path.read_text())["cases"]
    except (json.JSONDecodeError, OSError, KeyError):
        return {}
    wanted: set[tuple[str, int]] = set()
    for case in cases:
        for pe in case.get("point_expectations") or []:
            try:
                wanted.add((str(pe["point_code"]), int(pe["track"])))
            except (KeyError, TypeError, ValueError):
                continue
    if not wanted:
        return {}
    by_code = {(r.code, r.track): r for r in records}
    return {
        f"{code}:t{track}": _reference_label_state(by_code[(code, track)])
        for (code, track) in wanted
        if (code, track) in by_code
    }


def check_reference_labels(records: list[LocalPointRecord], aoi: str) -> dict[str, Any]:
    """Benotet den Ist-Zustand jedes gelabelten Punkts gegen die Regeln aus
    reference_labels.md (P8-D-W1-T2). Die JSON-Datei wird zur LAUFZEIT gelesen,
    weil eine parallele Session den Korpus erweitert.

    - roof: Fehler, wenn verloren (excluded/noise) oder faelschlich in einen
      annex getrennt.
    - foreign: gefangen, wenn nicht Main-Core; Fehler, wenn Main-Core.
    - annex: ideal im eigenen (annex/nicht-Main-)Cluster, suboptimal wenn
      demotiert, Fehler wenn in den Main verschmolzen.
    - unclear: nicht gewertet, nur gelistet.
    """
    metrics: dict[str, Any] = {k: 0 for k in _LABEL_METRIC_KEYS}
    metrics["details"] = []
    path = ARTIFACTS_DIR / "reference_labels.json"
    if not path.exists():
        return metrics
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return metrics
    dataset_id = AOIS.get(aoi, {}).get("dataset_id")
    by_code = {(r.code, r.track): r for r in records}
    for lab in data.get("labels", []):
        ds = lab.get("dataset_id")
        if dataset_id and ds and ds != dataset_id:
            continue
        try:
            track = int(lab["track"])
        except (KeyError, TypeError, ValueError):
            continue
        rec = by_code.get((lab.get("point_code"), track))
        if rec is None:
            continue
        label = lab.get("label")
        state = _reference_label_state(rec)
        if label == "roof":
            if state in ("excluded", "noise", "annex", "foreign_separated"):
                metrics["roof_lost"] += 1
                verdict = "roof_lost"
            else:
                verdict = "roof_kept"
        elif label == "foreign":
            if state == "main_core":
                metrics["foreign_in_main"] += 1
                verdict = "foreign_in_main"
            elif state == "annex":
                # P8-F: semantische Fehlablage - Fremdpunkt als "Anbau"
                # etikettiert. Frueher als foreign_caught belohnt; jetzt
                # eigener Failure-State (rotes Scorecard-Gate).
                metrics["foreign_in_annex"] += 1
                verdict = "foreign_in_annex"
            elif state in ("excluded", "noise", "weak_support", "foreign_separated"):
                metrics["foreign_caught"] += 1
                verdict = "foreign_caught"
            else:
                verdict = "foreign_in_secondary_core"
        elif label == "annex":
            if state == "main_core":
                metrics["annex_merged"] += 1
                verdict = "annex_merged"
            elif state == "foreign_separated":
                # P8-F: umgekehrte Fehlablage - echter Anbau-Punkt als
                # Fremdpunkt separiert (rotes Scorecard-Gate).
                metrics["annex_in_foreign"] += 1
                verdict = "annex_in_foreign"
            elif state == "annex":
                # P8-F: nur noch der annex-Cluster zaehlt als separiert;
                # ein Nicht-Main-"core" (frueher mitgezaehlt) ist ab jetzt
                # annex_demoted (fuer den aktuellen Korpus zahlneutral).
                metrics["annex_separated"] += 1
                verdict = "annex_separated"
            else:
                metrics["annex_demoted"] += 1
                verdict = "annex_demoted"
        elif label == "unclear":
            metrics["unclear"] += 1
            verdict = "unclear_not_scored"
        else:
            continue
        metrics["labels_evaluated"] += 1
        metrics["details"].append({
            "code": rec.code, "track": track, "building_id": lab.get("building_id"),
            "label": label, "state": state, "verdict": verdict,
        })
    return metrics


def _aggregate_label_metrics(exp_out: dict[str, Any]) -> dict[str, Any]:
    agg: dict[str, Any] = {k: 0 for k in _LABEL_METRIC_KEYS}
    agg["details"] = []
    agg["by_aoi"] = {}
    for aoi, aoi_out in exp_out["aois"].items():
        lm = aoi_out.get("label_metrics")
        if not lm:
            continue
        for k in _LABEL_METRIC_KEYS:
            agg[k] += int(lm.get(k, 0) or 0)
        agg["details"].extend(lm.get("details", []))
        agg["by_aoi"][aoi] = {k: int(lm.get(k, 0) or 0) for k in _LABEL_METRIC_KEYS}
    return agg


def build_scorecard(results: dict[str, Any], baseline_id: str = "noop") -> dict[str, Any]:
    base = results["experiments"].get(baseline_id)
    scorecard: dict[str, Any] = {
        "stand": results.get("stand"), "baseline": baseline_id, "entries": {}, "schema": {
            "verdicts": ["baseline", "candidate_green", "candidate_red", "candidate_inconclusive"],
            "rule": "Niedrigere Noise-Rate allein ist kein Erfolg; harte Gates muessen halten.",
            "policy_rule": (
                "P7-V1: Hygiene-Politiken (assignment_policy!=a0 oder smalln_mode!=baseline) "
                "duerfen Status-Ansprueche abschwaechen (CLAIM_RANK-Toleranz) und "
                "nearest-getragene Zweitcluster verlieren (robuste Multi-Cluster-Zaehlung); "
                "Aufwertungen und Verlust robuster Struktur bleiben harte Fails. "
                "policy_expectations in phase7_reference_cases.json pinnen Einzelfaelle."
            ),
            "cross_track_fields": ["cross_track_source", "cross_track_pair_type", "temporal_overlap_days"],
        },
    }
    for exp_id, exp_out in results["experiments"].items():
        ref_checks = check_reference_cases(exp_out)
        entry: dict[str, Any] = {
            "config": exp_out["config"],
            "reference_case_checks": ref_checks,
            "reference_cases_ok": all(c["ok"] for c in ref_checks) if ref_checks else None,
            "label_metrics": _aggregate_label_metrics(exp_out),
            "aoi_aggregates": {}, "guardrails": {}, "verdict": None, "reasons": [],
        }
        for aoi, aoi_out in exp_out["aois"].items():
            s = aoi_out["summary"]
            entry["aoi_aggregates"][aoi] = {
                "kept": s["points_kept"],
                "noise_rate": round(s["points_noise"] / max(s["points_kept"], 1), 4),
                "multi_cluster_buildings": s["multi_cluster_buildings"],
                "multi_cluster_buildings_robust": s.get("multi_cluster_buildings_robust"),
                "nearest_dominated_main_clusters": s["nearest_dominated_main_clusters"],
                "status_counts": s["building_status_counts"],
                "xtrack_agreement_median": (aoi_out.get("cross_track") or {}).get("agreement_median"),
                "confidence_bands": (aoi_out.get("confidence") or {}).get("band_counts"),
            }
        if exp_id == baseline_id or base is None:
            entry["verdict"] = "baseline"
        else:
            policy_exp = _is_policy_experiment(exp_out.get("config") or {})
            reasons, hard_fail, soft_gain = [], False, False
            for aoi, agg in entry["aoi_aggregates"].items():
                bagg = base["aois"].get(aoi)
                if not bagg:
                    continue
                bs = bagg["summary"]
                cand_summary = exp_out["aois"][aoi]["summary"]
                b_multi_robust = bs.get("multi_cluster_buildings_robust")
                cand_multi_robust = cand_summary.get("multi_cluster_buildings_robust")
                if policy_exp and b_multi_robust is not None and cand_multi_robust is not None:
                    # Hygiene-Politik: nearest-getragene Zweitcluster duerfen
                    # verschwinden; nur robuste Multi-Struktur ist geschuetzt.
                    if b_multi_robust and cand_multi_robust < 0.8 * b_multi_robust:
                        hard_fail = True
                        reasons.append(
                            f"{aoi}: robuste Multi-Cluster weggeglaettet "
                            f"({cand_multi_robust} < 0.8*{b_multi_robust})"
                        )
                else:
                    b_multi = bs["multi_cluster_buildings"]
                    if b_multi and agg["multi_cluster_buildings"] < 0.8 * b_multi:
                        hard_fail = True
                        reasons.append(f"{aoi}: Multi-Cluster weggeglaettet ({agg['multi_cluster_buildings']} < 0.8*{b_multi})")
                base_statuses = bs["building_statuses"]
                cand_statuses = exp_out["aois"][aoi]["summary"]["building_statuses"]
                promoted = [
                    b for b, st in cand_statuses.items()
                    if st == "ok" and base_statuses.get(b) in {"small_n", "insufficient_support"}
                ]
                if promoted:
                    hard_fail = True
                    reasons.append(f"{aoi}: Small-N/insufficient zu ok befoerdert: {promoted[:5]}")
                # P7-S5: Anspruchs-Aufwertungen (CLAIM_RANK steigt) sind kein
                # automatischer Fail, aber AUDIT-PFLICHTIG - sie koennen
                # legitime Kontaminations-Bereinigung ODER kosmetisches
                # Re-Clustering sein (vgl. 54773363/238057563 unter a1).
                upgrades = [
                    (b, base_statuses.get(b), st) for b, st in cand_statuses.items()
                    if base_statuses.get(b) is not None
                    and CLAIM_RANK.get(st, 0) > CLAIM_RANK.get(base_statuses.get(b), 0)
                ]
                if upgrades:
                    entry["aoi_aggregates"][aoi]["status_upgrades_vs_baseline"] = [
                        {"building_id": b, "from": s0, "to": s1} for b, s0, s1 in sorted(upgrades)
                    ]
                    reasons.append(
                        f"{aoi}: {len(upgrades)} Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)"
                    )
                if agg["nearest_dominated_main_clusters"] > bs["nearest_dominated_main_clusters"]:
                    hard_fail = True
                    reasons.append(f"{aoi}: mehr nearest-dominierte Main-Cluster")
                b_noise = bs["points_noise"] / max(bs["points_kept"], 1)
                b_x = (bagg.get("cross_track") or {}).get("agreement_median")
                if (
                    agg["noise_rate"] < b_noise * 0.8
                    and agg["xtrack_agreement_median"] is not None and b_x is not None
                    and agg["xtrack_agreement_median"] < b_x - 0.02
                ):
                    reasons.append(f"{aoi}: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn")
                if agg["xtrack_agreement_median"] is not None and b_x is not None and agg["xtrack_agreement_median"] > b_x + 0.02:
                    soft_gain = True
            if entry["reference_cases_ok"] is False:
                hard_fail = True
                reasons.append("Referenzfall-Erwartung verletzt")
            # P8-F: semantische Fehlablagen zwischen den Evidenzklassen sind
            # rote Gates - foreign-Punkte duerfen nie als annex etikettiert
            # werden (und umgekehrt), unabhaengig von allen anderen Metriken.
            lm_agg = entry["label_metrics"]
            fia = int(lm_agg.get("foreign_in_annex", 0) or 0)
            aif = int(lm_agg.get("annex_in_foreign", 0) or 0)
            if fia or aif:
                hard_fail = True
                reasons.append(
                    f"Label-Korpus: foreign_in_annex={fia}, annex_in_foreign={aif} (rotes Gate)"
                )
            entry["verdict"] = (
                "candidate_red" if hard_fail
                else ("candidate_green" if soft_gain else "candidate_inconclusive")
            )
            entry["reasons"] = reasons
        scorecard["entries"][exp_id] = entry
    return scorecard


def write_scorecard_md(scorecard: dict[str, Any], path: Path) -> None:
    lines = [
        "# Phase 7 - Scorecard (P7-B-W1-T2)", "",
        f"Stand: {scorecard['stand']}. Baseline: `{scorecard['baseline']}`.",
        "Regel: " + scorecard["schema"]["rule"], "",
    ]
    for exp_id, entry in scorecard["entries"].items():
        lines.append(f"## {exp_id} -> {entry['verdict']}")
        if entry["reasons"]:
            lines += [f"- {r}" for r in entry["reasons"]]
        lines.append("")
        lines.append("| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |")
        lines.append("| --- | ---: | ---: | ---: | ---: | ---: | --- |")
        for aoi, a in entry["aoi_aggregates"].items():
            lines.append(
                f"| {aoi} | {a['kept']} | {a['noise_rate']:.3f} | {a['multi_cluster_buildings']} | "
                f"{a['nearest_dominated_main_clusters']} | {a['xtrack_agreement_median']} | {a['confidence_bands']} |"
            )
        ref = entry.get("reference_case_checks") or []
        fails = [c for c in ref if not c["ok"]]
        tolerated = sum(1 for c in ref if c["ok"] and c.get("source") == "policy_downgrade_tolerance")
        pinned = sum(1 for c in ref if str(c.get("source", "")).startswith("policy_pin"))
        suffix = ""
        if tolerated:
            suffix += f"; {tolerated} via Abstufungs-Toleranz"
        if pinned:
            suffix += f"; {pinned} gepinnt"
        if fails:
            suffix += f"; FAILS: {[(c['case_id'], c['actual']) for c in fails]}"
        lines.append("")
        lines.append(f"Referenzfaelle: {len(ref) - len(fails)}/{len(ref)} ok{suffix}")
        lines.append("")
        lm = entry.get("label_metrics") or {}
        if lm.get("labels_evaluated"):
            lines.append(
                f"Label-Korpus ({lm['labels_evaluated']} Punkte): "
                f"roof_lost={lm.get('roof_lost', 0)}, "
                f"foreign_caught={lm.get('foreign_caught', 0)}, "
                f"foreign_in_main={lm.get('foreign_in_main', 0)}, "
                f"foreign_in_annex={lm.get('foreign_in_annex', 0)}, "
                f"annex_separated={lm.get('annex_separated', 0)}, "
                f"annex_in_foreign={lm.get('annex_in_foreign', 0)}, "
                f"annex_demoted={lm.get('annex_demoted', 0)}, "
                f"annex_merged={lm.get('annex_merged', 0)}, "
                f"unclear={lm.get('unclear', 0)}"
            )
            flagged = [
                d for d in lm.get("details", [])
                if d.get("verdict") in (
                    "roof_lost", "foreign_in_main", "annex_merged",
                    "foreign_in_annex", "annex_in_foreign",
                )
            ]
            if flagged:
                lines.append(
                    "  Auffaellig: "
                    + ", ".join(f"{d['code']}:t{d['track']} {d['label']}->{d['verdict']}" for d in flagged)
                )
            lines.append("")
    path.write_text("\n".join(lines) + "\n")


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
# Kandidaten-Persistenz als getaggte ml_runs (P7-V2)
# ---------------------------------------------------------------------------

async def persist_experiment_run(aoi: str, exp_id: str) -> dict[str, Any]:
    """Persistiert eine Experiment-Variante als echten, getaggten ml_run.

    Voller Produktionspfad (fetch -> compute -> _persist_results -> Farben ->
    Metriken -> Statusuebergaenge nach runner.py-Muster), aber ohne
    MLflow-Logging: Harness-Runs tragen ihre vollstaendige Konfiguration in
    ml_runs.params (experiment_id + experiment_config) und sind damit im
    Viewer (Run-Listen-Badge + Transparenz-Panel) inspizier- und
    deep-link-bar - Voraussetzung fuer das Visual-Audit der Shortlist
    (P7-D-W1-T3) und die User-Sichtbarkeit der Offline-Ergebnisse.
    """
    from datetime import datetime, timezone
    from uuid import uuid4

    from ..colors import assign_building_colors
    from ..runner import _update_run_status, _upsert_metric
    from ..store import create_run_record

    spec = AOIS[aoi]
    exp = EXPERIMENTS[exp_id]
    overrides = fetch_overrides_for(exp) or {}
    # Inputs einmal vorab holen: liefert extras/osm_foreign fuer die
    # Pipeline-Overrides; pipeline.run() fetcht danach ueber denselben
    # SQL-Pfad (deterministisch identisch).
    inputs = await fetch_aoi_inputs(aoi, overrides or None)
    pipeline = ExperimentPipeline(
        exp, inputs["extras"], inputs.get("osm_foreign"), inputs.get("geom_extras")
    )
    run_id = str(uuid4())
    config = RunConfig(
        run_id=run_id,
        pipeline=AnomalyLocalV1Pipeline.name,
        area_id=spec["area_id"],
        dataset_id=spec["dataset_id"],
        source=str(spec.get("source", "gba")),
        track=None,
        bbox=tuple(spec["bbox"]),
        params={
            **overrides,
            "source": str(spec.get("source", "gba")),
            "experiment_id": exp_id,
            "experiment_config": exp.to_jsonable(),
            "phase7_aoi": aoi,
            "phase7_baseline_run": spec["baseline_run"],
        },
    )
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=4)
    metrics: dict[str, Any] = {}
    try:
        async with pool.acquire() as conn:
            await create_run_record(
                conn,
                run_id=run_id,
                pipeline=config.pipeline,
                pipeline_version=pipeline.version,
                run_type=pipeline.run_type,
                area_id=config.area_id,
                dataset_id=config.dataset_id,
                source=config.source,
                track=config.track,
                bbox=config.bbox,
                params=config.params,
            )
            await _update_run_status(
                conn, run_id, "running", started_at=datetime.now(timezone.utc)
            )
        try:
            metrics = await pipeline.run(pool, config)
            await assign_building_colors(pool, run_id)
            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    async with pool.acquire() as conn:
                        await _upsert_metric(conn, run_id, key, float(value))
            async with pool.acquire() as conn:
                await _update_run_status(
                    conn, run_id, "succeeded", finished_at=datetime.now(timezone.utc)
                )
        except Exception as exc:
            async with pool.acquire() as conn:
                await _update_run_status(
                    conn, run_id, "failed",
                    finished_at=datetime.now(timezone.utc), error=str(exc),
                )
            raise
    finally:
        await pool.close()
    return {
        "aoi": aoi, "experiment_id": exp_id, "run_id": run_id,
        "numeric_metrics": {k: v for k, v in metrics.items() if isinstance(v, (int, float))},
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

EXPERIMENTS: dict[str, ExperimentConfig] = {
    # Seit P7-E-W1-T2 (MODEL_SET_VERSION local_hdbscan_rulegate_v2_k2x)
    # enthaelt die Produktion a5_crosslook + smalln_strict als Default;
    # noop == NEUE Produktion (alte Baselines: legacy_baseline_run in
    # AOIS). Die Politiken a1..a5/smalln_strict bleiben als
    # Forschungs-Overrides; a5_crosslook/k1/k2x sind gegenueber noop
    # jetzt verhaltensgleich (Doppel-Anwendung idempotent).
    "noop": ExperimentConfig("noop", "Produktionsidentische Variante (seit W4-Port inkl. a5_crosslook + smalln_strict + k2xh-Component-Separation)"),
    # --- P7-C-W1-T1: HDBSCAN-Sweep (isolierte Achsen) ---
    "ms_equal": ExperimentConfig("ms_equal", "Bibliotheks-Default min_samples=min_cluster_size (Pflichtvergleich)", min_samples_mode="equal"),
    "leaf": ExperimentConfig("leaf", "cluster_selection_method=leaf (feinere homogene Cluster)", cluster_selection_method="leaf"),
    "no_single": ExperimentConfig("no_single", "allow_single_cluster=False", allow_single_cluster=False),
    "mcs_03": ExperimentConfig("mcs_03", "min_cluster_size-Fraction 0.3 statt 0.2", mcs_fraction=0.3),
    "mcs_floor3": ExperimentConfig("mcs_floor3", "min_cluster_size-Untergrenze 3 statt 2 (gegen Paar-Cluster)", mcs_floor=3),
    "eps_05": ExperimentConfig("eps_05", "cluster_selection_epsilon=0.5 gegen Ueberfragmentierung", cluster_selection_epsilon=0.5),
    # --- P7-C-W1-T2: Feature-Ablation/-Erweiterung (isolierte Achsen) ---
    "feat_vel_lo": ExperimentConfig("feat_vel_lo", "Velocity-Dominanz senken (1.30 -> 0.90)", matrix_features=[
        ("along_look_offset_m", 1.10), ("cross_look_offset_m", 1.00), ("height_rank_in_building", 0.75),
        ("velocity", 0.90), ("acceleration", 0.90), ("coherence_penalty", 0.80)]),
    "feat_no_accel": ExperimentConfig("feat_no_accel", "Acceleration aus der Matrix entfernen", matrix_features=[
        ("along_look_offset_m", 1.10), ("cross_look_offset_m", 1.00), ("height_rank_in_building", 0.75),
        ("velocity", 1.30), ("coherence_penalty", 0.80)]),
    "feat_spatial_hi": ExperimentConfig("feat_spatial_hi", "Spatial-Features staerken (1.40/1.30)", matrix_features=[
        ("along_look_offset_m", 1.40), ("cross_look_offset_m", 1.30), ("height_rank_in_building", 0.75),
        ("velocity", 1.30), ("acceleration", 0.90), ("coherence_penalty", 0.80)]),
    "feat_ts": ExperimentConfig("feat_ts", "Zeitreihen-Features zuschalten (ts_slope/ts_residual_std)", matrix_features=[
        ("along_look_offset_m", 1.10), ("cross_look_offset_m", 1.00), ("height_rank_in_building", 0.75),
        ("velocity", 1.30), ("acceleration", 0.90), ("coherence_penalty", 0.80),
        ("ts_slope", 0.80), ("ts_residual_std", 0.60)]),
    "feat_hstd": ExperimentConfig("feat_hstd", "height_std als Qualitaetsfeature zuschalten", matrix_features=[
        ("along_look_offset_m", 1.10), ("cross_look_offset_m", 1.00), ("height_rank_in_building", 0.75),
        ("velocity", 1.30), ("acceleration", 0.90), ("coherence_penalty", 0.80),
        ("x_height_std", 0.60)]),
    "feat_no_coh": ExperimentConfig("feat_no_coh", "coherence_penalty aus der Matrix entfernen", matrix_features=[
        ("along_look_offset_m", 1.10), ("cross_look_offset_m", 1.00), ("height_rank_in_building", 0.75),
        ("velocity", 1.30), ("acceleration", 0.90)]),
    # --- P7-C-W1-T5: Assignment-Hygiene ---
    "a1_demote": ExperimentConfig("a1_demote", "nearest-Punkte sichtbar, aber von Clustering/Score ausgeschlossen", assignment_policy="a1_demote"),
    "a2_dist5": ExperimentConfig("a2_dist5", "nearest-Distanz 15 m -> 5 m (Fetch-Parameter)", assignment_policy="a2_dist:5"),
    "a3_height": ExperimentConfig("a3_height", "nearest mit Bodenobjekt-Hoehenprofil demotieren (height-terrain < p25(within)-2m)", assignment_policy="a3_height"),
    "a4_osm": ExperimentConfig("a4_osm", "nearest in OSM-Struktur ohne GBA-Entsprechung demotieren (nur Salzburg)", assignment_policy="a4_osm"),
    # --- P7-C-W1-T3: Small-N ---
    "smalln_strict": ExperimentConfig("smalln_strict", "Small-N nur mit Velocity-Konsistenz als Core, sonst weak_support", smalln_mode="strict"),
    # --- P7-C-W1-T4: Reassignment ---
    "no_reassign": ExperimentConfig("no_reassign", "Borderline-Noise-Reassignment deaktiviert", reassign_mode="off"),
    # --- P7-V3: Quer-Versatz-Politik (selektive Alternative zu a1, Fall 96959851) ---
    "a5_crosslook": ExperimentConfig(
        "a5_crosslook",
        "nearest demotieren, wenn |cross_look_offset| > p95(Anker) + 3m + sqrt(eff_area); ohne Anker alle nearest",
        assignment_policy="a5_crosslook",
    ),
}


def _variant(base_id: str, experiment_id: str, description: str, **overrides: Any) -> ExperimentConfig:
    """Kompositions-Helper (P7-V3): Variante auf Basis eines registrierten
    Experiments, ohne die Achsen von Hand zu duplizieren."""
    return replace(EXPERIMENTS[base_id], experiment_id=experiment_id, description=description, **overrides)


# Kandidaten-Registry (P7-V3): Shortlist-Kandidaten aus Schritt 4 als
# benannte Komposita; k2x ist der Quer-Versatz-Vergleichskandidat.
EXPERIMENTS["k1"] = _variant("smalln_strict", "k1", "Kandidat K1 = smalln_strict (konservativ)")
EXPERIMENTS["k2"] = _variant("a1_demote", "k2", "Kandidat K2 = a1_demote + smalln_strict", smalln_mode="strict")
EXPERIMENTS["k3"] = _variant("a3_height", "k3", "Kandidat K3 = a3_height")
EXPERIMENTS["k2x"] = _variant("a5_crosslook", "k2x", "Kandidat K2x = a5_crosslook + smalln_strict", smalln_mode="strict")

# Hygienischer Re-Sweep (P7-V4): die 12 Schritt-3-Achsen auf der Basis des
# fuehrenden Kandidaten k2x (Plan sah k2 vor; k2 wurde in V3 wegen des
# Aufblaeh-Nebeneffekts entthront). Scorecard-Baseline: k2x.
for _axis_id, _axis_desc, _axis_overrides in [
    ("ms_equal", "min_samples=min_cluster_size", {"min_samples_mode": "equal"}),
    ("leaf", "cluster_selection_method=leaf", {"cluster_selection_method": "leaf"}),
    ("no_single", "allow_single_cluster=False", {"allow_single_cluster": False}),
    ("mcs03", "mcs_fraction=0.3", {"mcs_fraction": 0.3}),
    ("floor3", "mcs_floor=3", {"mcs_floor": 3}),
    ("eps05", "cluster_selection_epsilon=0.5", {"cluster_selection_epsilon": 0.5}),
    ("feat_vel_lo", "Velocity 1.30->0.90", {"matrix_features": EXPERIMENTS["feat_vel_lo"].matrix_features}),
    ("feat_no_accel", "ohne Acceleration", {"matrix_features": EXPERIMENTS["feat_no_accel"].matrix_features}),
    ("feat_spatial_hi", "Spatial 1.40/1.30", {"matrix_features": EXPERIMENTS["feat_spatial_hi"].matrix_features}),
    ("feat_ts", "+ts_slope/ts_residual_std", {"matrix_features": EXPERIMENTS["feat_ts"].matrix_features}),
    ("feat_hstd", "+x_height_std", {"matrix_features": EXPERIMENTS["feat_hstd"].matrix_features}),
    ("feat_no_coh", "ohne coherence_penalty", {"matrix_features": EXPERIMENTS["feat_no_coh"].matrix_features}),
]:
    EXPERIMENTS[f"k2x_{_axis_id}"] = _variant(
        "k2x", f"k2x_{_axis_id}", f"V4: k2x + {_axis_desc}", **_axis_overrides
    )

# OPTICS-Vergleich (P7-C-W2-T1, Schritt 5): explizit waehlbare Varianten,
# KEIN Fallback (User-Entscheidung 2026-06-10). Identische Feature-Matrix
# und Scorecard wie HDBSCAN; auf Produktions-Defaults UND k2x-Basis.
for _oid, _odesc, _oover in [
    ("optics_xi03", "OPTICS xi=0.03", {"algorithm": "optics", "optics_xi": 0.03}),
    ("optics_xi05", "OPTICS xi=0.05", {"algorithm": "optics"}),
    ("optics_xi10", "OPTICS xi=0.10", {"algorithm": "optics", "optics_xi": 0.10}),
    ("optics_ms_equal", "OPTICS xi=0.05, min_samples=mcs", {"algorithm": "optics", "min_samples_mode": "equal"}),
    ("optics_dbscan05", "OPTICS dbscan-Extraktion eps=0.5", {"algorithm": "optics", "optics_cluster_method": "dbscan"}),
]:
    EXPERIMENTS[_oid] = _variant("noop", _oid, f"S5: {_odesc} (Produktionsbasis)", **_oover)
    EXPERIMENTS[f"k2x_{_oid}"] = _variant("k2x", f"k2x_{_oid}", f"S5: {_odesc} (k2x-Basis)", **_oover)

# High-N-/TSX-Strategie (P7-C-W2-T2): leaf+spatial-Kombination auf k2x-Basis
# (Einzelachsen k2x_leaf / k2x_feat_spatial_hi laufen im V4-Sweep mit).
EXPERIMENTS["k2x_leaf_spatial"] = _variant(
    "k2x", "k2x_leaf_spatial", "S5-T2: leaf + Spatial 1.40/1.30 (k2x-Basis, High-N/TSX)",
    cluster_selection_method="leaf",
    matrix_features=EXPERIMENTS["feat_spatial_hi"].matrix_features,
)

# P8-B (Bauteil-Trenner): kartierungsfreie Achsen als Trenner statt Wegwerfer.
# Einzeln (isoliert, separation_mode="separate"), plus das Komposit k2xh
# (a5_crosslook + Hoehenprofil + Anti-Layover + Reichweite) in Trenn- und
# Demote-Variante fuer das A/B.
EXPERIMENTS["a6_antilayover"] = ExperimentConfig(
    "a6_antilayover",
    "Anti-Layover-Trenner: Versatz entgegen range_dx/dy -> eigener annex-Cluster",
    assignment_policy="a6_antilayover", separation_mode="separate",
)
EXPERIMENTS["a7_reach"] = ExperimentConfig(
    "a7_reach",
    "Layover-Reichweiten-Trenner: implizite Reflektorhoehe > plausible Hoehe + 3 m",
    assignment_policy="a7_reach", separation_mode="separate",
)
EXPERIMENTS["a8_heightprofile"] = ExperimentConfig(
    "a8_heightprofile",
    "Hoehenprofil-Trenner: |height - Median(Dach-Anker)| > tol (alle Zuordnungen)",
    assignment_policy="a8_heightprofile", separation_mode="separate",
)
EXPERIMENTS["k2xh"] = _variant(
    "k2x", "k2xh",
    "Komposit K2xh = a5_crosslook + Hoehenprofil + Anti-Layover + Reichweite (Trennung). "
    "Seit dem W4-Port Beinahe-Identitaet zu noop (=Produktion mit Component-Separation); "
    "einziger Unterschied ist die geodaetische a6-Azimutquelle x_az_from_fp statt planar.",
    assignment_policy="a5_crosslook,a8_heightprofile,a6_antilayover,a7_reach",
    separation_mode="separate",
)
EXPERIMENTS["k2xh_demote"] = _variant(
    "k2x", "k2xh_demote",
    "K2xh im Demote-Modus (A/B-Gegenprobe: Kandidaten werden ausgeschlossen statt getrennt)",
    assignment_policy="a5_crosslook,a8_heightprofile,a6_antilayover,a7_reach",
    separation_mode="demote",
)
# P8-F: Evidenzklassen-Routing auf noop-Basis (= Produktions-Separation).
EXPERIMENTS["sepcls_foreign"] = _variant(
    "noop", "sepcls_foreign",
    "P8-F Variante A: anti_layover-Kandidaten -> :foreign (weak_support); "
    "im bev-Kontext zusaetzlich reach_height_excess (BEV kartiert Anbauten -> "
    "keine unkartierter-Anbau-Ausrede); height/reach(gba)-Kandidaten bleiben "
    "annex-Klasse (Rekrutierung unveraendert)",
    separation_classes="anti_foreign",
)
EXPERIMENTS["sepcls_strict"] = _variant(
    "noop", "sepcls_strict",
    "P8-F Variante B (nur Vergleich): nur height_outlier bleibt annex-Klasse; "
    "erwartet ROT (annex_in_foreign>0), weil der Flaggschiff-Anbau reach-only ist",
    separation_classes="strict_structural",
)

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
    p.add_argument("--scorecard", action="store_true",
                   help="Scorecard gegen die noop-Baseline bauen und nach artifacts/phase7_scorecard.{json,md} schreiben")
    p.add_argument("--scorecard-baseline", default="noop",
                   help="Baseline-Experiment-ID fuer die Scorecard (z. B. k2 fuer den hygienischen Re-Sweep)")
    p.add_argument("--scorecard-out", default=None,
                   help="Basisname fuer Scorecard-Artefakte (default: phase7_scorecard)")
    p.add_argument("--main-choice-audit", action="store_true",
                   help="Main-Cluster-Wahl-Audit (support- vs within-share-Rangfolge) berechnen")
    p.add_argument("--persist", action="store_true",
                   help="Experimente als echte getaggte ml_runs persistieren (P7-V2) "
                        "statt offline auszuwerten; Run-IDs nach phase7_persisted_runs.json")
    return p


async def amain(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    aois = [a.strip() for a in args.aois.split(",") if a.strip()]
    experiment_ids = [e.strip() for e in args.experiments.split(",") if e.strip()]

    if args.persist:
        registry_path = ARTIFACTS_DIR / "phase7_persisted_runs.json"
        registry = (
            json.loads(registry_path.read_text())
            if registry_path.exists() else {"schema_version": 1, "runs": []}
        )
        for exp_id in experiment_ids:
            if exp_id not in EXPERIMENTS:
                raise SystemExit(f"unbekanntes Experiment: {exp_id} (registriert: {sorted(EXPERIMENTS)})")
            for aoi in aois:
                res = await persist_experiment_run(aoi, exp_id)
                registry["runs"].append(res)
                registry_path.write_text(json.dumps(registry, indent=2, default=str))
                print(f"[persist {exp_id}/{aoi}] run_id={res['run_id']}")
        print(f"written: {registry_path}")
        return 0

    inputs_cache: dict[tuple[str, str], dict[str, Any]] = {}

    async def inputs_for(aoi: str, exp: ExperimentConfig) -> dict[str, Any]:
        overrides = fetch_overrides_for(exp)
        key = (aoi, json.dumps(overrides, sort_keys=True) if overrides else "default")
        if key not in inputs_cache:
            inputs_cache[key] = await fetch_aoi_inputs(aoi, overrides)
        return inputs_cache[key]

    results: dict[str, Any] = {"stand": "2026-06-10", "experiments": {}}
    for exp_id in experiment_ids:
        if exp_id not in EXPERIMENTS:
            raise SystemExit(f"unbekanntes Experiment: {exp_id} (registriert: {sorted(EXPERIMENTS)})")
        exp = EXPERIMENTS[exp_id]
        exp_out: dict[str, Any] = {"config": exp.to_jsonable(), "aois": {}}
        for aoi in aois:
            inputs = await inputs_for(aoi, exp)
            pipeline, records, metrics = run_experiment_on_inputs(exp, inputs)
            aoi_out: dict[str, Any] = {
                "summary": summarize_records(records),
                "pipeline_metrics": {k: v for k, v in metrics.items()},
                "label_metrics": check_reference_labels(records, aoi),
                # P8-F: Punkt-Pin-Zustaende + Klassen-Reinheit der Separation
                "point_states": pinned_point_states(records),
                "separation_composition": separation_composition(records),
            }
            if pipeline.reassign_stats:
                aoi_out["reassign_stats"] = dict(pipeline.reassign_stats)
            if pipeline.policy_stats:
                aoi_out["policy_stats"] = dict(pipeline.policy_stats)
            if args.main_choice_audit:
                aoi_out["main_choice_audit"] = main_cluster_choice_audit(records)
            if args.verify_noop and exp_id == "noop":
                aoi_out["noop_verification"] = await verify_noop_against_db(aoi, records)
            if args.cross_track:
                aoi_out["cross_track"] = harness_cross_track(records, AOIS[aoi]["dataset_id"])
            if args.confidence:
                aoi_out["confidence"] = confidence_summary(
                    pipeline, records, inputs["params"], args.confidence_max_groups
                )
            exp_out["aois"][aoi] = aoi_out
        results["experiments"][exp_id] = exp_out

    if args.hr_compare:
        snt_aoi, tsx_aoi = args.hr_compare.split(":")
        exp = EXPERIMENTS[experiment_ids[0]]
        _, snt_records, _ = run_experiment_on_inputs(exp, await inputs_for(snt_aoi, exp))
        _, tsx_records, _ = run_experiment_on_inputs(exp, await inputs_for(tsx_aoi, exp))
        results["hr_compare"] = {
            "snt_aoi": snt_aoi, "tsx_aoi": tsx_aoi,
            **hr_structural_compare(snt_records, tsx_records),
        }

    out_path = Path(args.out) if args.out else ARTIFACTS_DIR / f"phase7_experiment_{'_'.join(experiment_ids)}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2, default=str))
    print(f"written: {out_path}")

    if args.scorecard:
        scorecard = build_scorecard(results, baseline_id=args.scorecard_baseline)
        sc_base = args.scorecard_out or "phase7_scorecard"
        sc_json = ARTIFACTS_DIR / f"{sc_base}.json"
        sc_md = ARTIFACTS_DIR / f"{sc_base}.md"
        sc_json.write_text(json.dumps(scorecard, indent=2, default=str))
        write_scorecard_md(scorecard, sc_md)
        print(f"scorecard: {sc_json}")
        for exp_id, entry in scorecard["entries"].items():
            print(f"  {exp_id}: {entry['verdict']} refcases_ok={entry['reference_cases_ok']}")
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
