/**
 * Semantische Farbtoken — einzige Quelle für Bewertungs-, Status- und
 * Serienfarben. Konsumiert von Tailwind (tailwind.config.ts), MapLibre-Paint
 * (MapView), ECharts (TimeseriesPanel) und den UI-Primitives.
 *
 * Konventionen:
 * - Teal (primary #0c766e) ist Marke/Aktiv-Zustand, nie Bewertungssemantik.
 * - Differential-Level bewusst orange statt rot, um eine "Schaden"-Lesart
 *   zu vermeiden (Forschungsbefund, keine Schadensaussage).
 * - Kartografische Rampen (Velocity-/Höhenskala) bleiben in pointStyling.ts.
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
  runStatus: {
    queued: "#6b7280",
    running: "#2563eb",
    succeeded: "#059669",
    failed: "#c0362a",
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
export type RunStatusToken = keyof typeof tokens.runStatus;

/** Band-Schwellen der aktiven Methodik (siehe Explainer/Backend-Rollups). */
export const RELIABILITY_BAND_THRESHOLDS = { medium: 0.45, high: 0.75 } as const;

export function reliabilityBandFromScore(
  score: number | null | undefined
): ReliabilityBand {
  if (score === null || score === undefined || Number.isNaN(score)) return "unknown";
  if (score >= RELIABILITY_BAND_THRESHOLDS.high) return "high";
  if (score >= RELIABILITY_BAND_THRESHOLDS.medium) return "medium";
  return "low";
}

export function runStatusToken(status: string | null | undefined): RunStatusToken {
  switch ((status ?? "").toLowerCase()) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
    case "done":
      return "succeeded";
    case "failed":
      return "failed";
    default:
      return "queued";
  }
}
