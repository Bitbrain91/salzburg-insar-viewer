import type { DifferentialMotionLevel, MlReliabilityPenalty } from "../hooks/useApi";

/**
 * Reine Formatierungshelfer, extrahiert aus InspectorPanel (Stage 2 des
 * UX-Redesigns). Verhalten unveraendert; neue Konsumenten: Run-Manager,
 * Befund-Ansichten, Primitives.
 */

export const fmtNum = (value?: number | null, digits = 2) =>
  value === null || value === undefined ? "—" : value.toFixed(digits);

export const fmtPct = (value?: number | null, digits = 0) =>
  value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;

export const fmtStr = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export const fmtBool = (value?: boolean | null) =>
  value === null || value === undefined ? "—" : value ? "ja" : "nein";

const integerFormatDeAt = new Intl.NumberFormat("de-AT");

/** Ganzzahlen im de-AT-Format (Tausender-Trennung). */
export const fmtCount = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : integerFormatDeAt.format(Math.round(value));

export const formatRunTimestamp = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const sortTrackEntries = <T,>(values: Record<string, T>) =>
  Object.entries(values).sort(([left], [right]) => {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
    return left.localeCompare(right);
  });

export const formatTrackStringMap = (values: Record<string, string | null>) => {
  const entries = sortTrackEntries(values);
  if (!entries.length) return "—";
  return entries.map(([track, value]) => `T${track} ${fmtStr(value)}`).join(" / ");
};

export const formatTrackNumberMap = (values: Record<string, number | null>) => {
  const entries = sortTrackEntries(values);
  if (!entries.length) return "—";
  return entries.map(([track, value]) => `T${track} ${fmtNum(value)}`).join(" / ");
};

export const formatSignedTrackMotion = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${fmtNum(value)} mm/Jahr`;
};

export const formatTrackMotionDetail = (values: Record<string, number | null>) => {
  const entries = sortTrackEntries(values);
  if (!entries.length) return "";
  return entries
    .map(([track, value]) => `T${track} ${formatSignedTrackMotion(value)}`)
    .join(" / ");
};

export const trackSuffix = (tracks: string[]) =>
  tracks.length ? ` T${tracks.join("/T")}` : "";

export const formatRetuningFlags = (
  weakSecondaryTrackFlag: boolean,
  agreementTensionFlag: boolean
) => {
  const flags = [
    weakSecondaryTrackFlag ? "schwacher Sekundaertrack" : null,
    agreementTensionFlag ? "Track-Spannung" : null,
  ].filter(Boolean);
  return flags.length ? flags.join(" / ") : "—";
};

export const formatPenalty = (penalty: MlReliabilityPenalty) => {
  const tracks = penalty.tracks.length ? ` T${penalty.tracks.join("/T")}` : "";
  const deltaSuffix =
    penalty.score_delta === null ? "" : ` (${penalty.score_delta.toFixed(2)})`;
  if (penalty.key === "weak_main_cluster_support") {
    return `schwache Hauptcluster-Stuetzung${tracks}${deltaSuffix}`;
  }
  if (penalty.key === "weak_secondary_track_band_cap") {
    return `Bandgrenze ${penalty.cap_band || "—"}${tracks}`;
  }
  if (penalty.key === "low_track_agreement") {
    return `niedrige Track-Uebereinstimmung${deltaSuffix}`;
  }
  if (penalty.key === "very_low_track_agreement_band_cap") {
    return `Bandgrenze ${penalty.cap_band || "—"}`;
  }
  return penalty.key.split("_").join(" ");
};

export const formatPenaltySummary = (penalties: MlReliabilityPenalty[]) =>
  penalties.length ? penalties.map(formatPenalty).join(" / ") : "—";

export const formatCountLabel = (key: string) => {
  if (/^\d+$/.test(key)) return `Track ${key}`;
  return key.split("_").join(" ");
};

export const formatLabelCounts = (counts: Record<string, number>) => {
  const orderedKeys = ["normal", "suspect", "outlier", "unlabeled"];
  const entries = [
    ...orderedKeys
      .filter((key) => counts[key] !== undefined)
      .map((key) => [key, counts[key]] as const),
    ...Object.entries(counts).filter(([key]) => !orderedKeys.includes(key)),
  ];
  return entries.length
    ? entries.map(([key, value]) => `${formatCountLabel(key)} ${value}`).join(" / ")
    : "—";
};

export const formatRawValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const differentialMotionLevelLabels: Record<
  Exclude<DifferentialMotionLevel, null>,
  string
> = {
  none: "keine",
  candidate: "Kandidat",
  significant: "signifikant",
  confirmed: "bestaetigt",
};

export const HISTORICAL_DIFFERENTIAL_LEVEL_MESSAGE =
  "historischer Modellstand – Differential-Level nicht verfügbar";

export function formatDifferentialMotionLevel(level: DifferentialMotionLevel | undefined) {
  return level === null || level === undefined
    ? HISTORICAL_DIFFERENTIAL_LEVEL_MESSAGE
    : `${level} – ${differentialMotionLevelLabels[level]}`;
}

export const focusReasonLabels: Record<string, string> = {
  local_motion_deviation: "Lokaler Punktkontext weicht ab",
  noise_cluster: "Kein stabiler Cluster",
  nearest_assignment: "Unsichere Gebaeudezuordnung",
};

export const focusDetectorLabels: Record<string, string> = {
  rule_penalty: "Regel-Penalty",
  cluster_outlier: "Cluster-Ausreisser",
  local_deviation: "Lokale Abweichung",
};

export function formatFocusReasonKey(key: string | null | undefined) {
  if (!key) return "Unbekannter Hinweis";
  return focusReasonLabels[key] ?? key.split("_").join(" ");
}

export function formatFocusDetectorKey(key: string) {
  return focusDetectorLabels[key] ?? key.split("_").join(" ");
}

export function formatAssignmentMethod(method: string | null | undefined) {
  if (!method) return "—";
  const labels: Record<string, string> = {
    within: "within - innerhalb des Gebaeudes",
    nearest: "nearest - naechstes Gebaeude",
    directional_buffer: "directional_buffer - Blickrichtungs-Puffer",
  };
  return labels[method] ?? method.split("_").join(" ");
}
