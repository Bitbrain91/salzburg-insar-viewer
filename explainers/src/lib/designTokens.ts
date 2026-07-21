/**
 * Semantische Farbtoken — Kopie aus `frontend/src/lib/designTokens.ts`
 * (Cross-App-Imports sind nicht möglich; bei Änderungen dort auch hier
 * nachziehen).
 *
 * Konventionen:
 * - Teal (primary #0c766e) ist Marke/Aktiv-Zustand, nie Bewertungssemantik.
 * - Differential-Level bewusst orange statt rot, um eine "Schaden"-Lesart
 *   zu vermeiden (Forschungsbefund, keine Schadensaussage).
 */
export const tokens = {
  reliability: {
    high: "#059669",
    medium: "#d97706",
    low: "#c0362a",
    unknown: "#9aa0a6",
  },
  // Punktlabels nutzen bewusst dieselbe Ampel wie die Zuverlässigkeit.
  pointLabel: {
    normal: "#059669",
    suspect: "#d97706",
    outlier: "#c0362a",
    unlabeled: "#9aa0a6",
  },
  clusterKind: {
    annex: "#7c3aed",
    foreign: "#00a6a6",
  },
  clusterRole: {
    excluded: "#9aa0a6",
    noise: "#c6372a",
    insufficientSupport: "#f2c14e",
  },
  differential: {
    none: "#9aa0a6",
    candidate: "#d97706",
    significant: "#c2571b",
    confirmed: "#c2571b",
  },
  series: {
    displacement: "#0c766e",
    amplitude: "#c4632d",
  },
} as const;

export type ReliabilityBand = keyof typeof tokens.reliability;

/** Band-Schwellen der aktiven Methodik (Backend-Rollups: _reliability_band). */
export const RELIABILITY_BAND_THRESHOLDS = { medium: 0.45, high: 0.75 } as const;

export function reliabilityBandFromScore(
  score: number | null | undefined
): ReliabilityBand {
  if (score === null || score === undefined || Number.isNaN(score)) return "unknown";
  if (score >= RELIABILITY_BAND_THRESHOLDS.high) return "high";
  if (score >= RELIABILITY_BAND_THRESHOLDS.medium) return "medium";
  return "low";
}

/** Deutsche Band-Label wie im Viewer (insights.tsx). */
export const RELIABILITY_BAND_LABELS: Record<ReliabilityBand, string> = {
  high: "hoch",
  medium: "mittel",
  low: "gering",
  unknown: "unbekannt",
};

export type MlClusterKind = "standard" | "annex" | "foreign";

/** Deutsche Cluster-Typ-Label wie im Viewer (mlClusterKind.ts). */
export const ML_CLUSTER_KIND_LABELS: Record<MlClusterKind, string> = {
  standard: "Standardcluster",
  annex: "Bauteil / Anbau",
  foreign: "Fremdreflektor",
};

export const ML_CLUSTER_KIND_DESCRIPTIONS: Record<MlClusterKind, string> = {
  standard:
    "Regulärer Gebäudecluster. Ein belastbarer Standard-Core kann Hauptcluster werden.",
  annex:
    "Strukturell plausibler Bauteil-/Anbaucluster: vom Hauptcluster getrennt, kann bei ausreichender Stützung eine Differentialaussage tragen.",
  foreign:
    "Separierter Fremdreflektor: nie Hauptcluster, nie Quelle einer Differentialaussage.",
};

export type DifferentialLevel = "none" | "candidate" | "significant" | "confirmed";

/** Deutsche Differential-Label wie im Viewer (formatters.ts). */
export const DIFFERENTIAL_LEVEL_LABELS: Record<DifferentialLevel, string> = {
  none: "keine",
  candidate: "Kandidat",
  significant: "signifikant",
  confirmed: "bestätigt",
};
