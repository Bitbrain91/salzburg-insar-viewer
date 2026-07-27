"""Gemeinsame Terrain-/Hangklassen-Semantik fuer die Evaluationsskripte.

Einzige Quelle der 5deg-/15deg-Schwellen und der Cross-Track-Toleranzformel im
Repo. Wird von `cross_track_consistency.py` und `bad_gastein_motion_compare.py`
importiert, damit Klassengrenzen und Toleranzband nicht mehrfach (und damit
divergierend) definiert werden.

Semantik-Quelle: `docs/pipelines/anomaly_local_v1/methodik.md` Paragraph 7
(Cross-Track-Konsistenz). Die Toleranzformel ist bit-identisch zur bestehenden
Harness-Implementierung `harness_cross_track` in
`phase7_clustering_experiments.py` (`allowed = 1.0 + 0.15 * slope`, wobei ein
fehlender Hangwert wie 0deg behandelt wird).
"""

from __future__ import annotations

import math

SLOPE_FLAT_MAX_DEG = 5.0
SLOPE_TRANSITION_MAX_DEG = 15.0

# Feste Reihenfolge fuer Charts, Tabellen und Farbzuordnung. "unbekannt" ist
# die Restklasse ohne belastbaren Hangwert und steht bewusst am Ende.
TERRAIN_CLASS_ORDER = ["flach", "uebergang", "hang", "unbekannt"]


def classify_slope(slope_mean_deg: float | None) -> str:
    """Ordne einen mittleren Hangwinkel (Grad) einer Terrain-Klasse zu.

    None oder NaN -> "unbekannt"; < 5deg -> "flach"; < 15deg -> "uebergang";
    sonst "hang".
    """
    if slope_mean_deg is None or math.isnan(slope_mean_deg):
        return "unbekannt"
    if slope_mean_deg < SLOPE_FLAT_MAX_DEG:
        return "flach"
    if slope_mean_deg < SLOPE_TRANSITION_MAX_DEG:
        return "uebergang"
    return "hang"


def allowed_cross_track_diff_mm_a(slope_mean_deg: float | None) -> float:
    """Zulaessige Cross-Track-Bewegungsdifferenz in mm/a fuer einen Hangwinkel.

    `1.0 + 0.15 * slope`, identisch zur Harness-Semantik in
    `harness_cross_track` (phase7_clustering_experiments.py). Ein fehlender
    Hangwert (None) wird - wie dort ueber `slope_mean_deg or 0.0` - als 0deg
    behandelt, sodass die Basistoleranz 1.0 mm/a greift.
    """
    slope = float(slope_mean_deg or 0.0)
    return 1.0 + 0.15 * slope
