import type { DifferentialMotionLevel, MlReliabilityPenalty } from "../hooks/useApi";

/**
 * Reine Formatierungshelfer, extrahiert aus InspectorPanel (Stage 2 des
 * UX-Redesigns). Verhalten unverändert; neue Konsumenten: Run-Manager,
 * Befund-Ansichten, Primitives.
 */

export const fmtNum = (value?: number | null, digits = 2) =>
  value === null || value === undefined ? "—" : value.toFixed(digits);

/** Wie fmtNum, aber mit Komma-Dezimale für sichtbare Befund-Werte (de-AT). */
export const fmtNumDe = (value?: number | null, digits = 2) =>
  value === null || value === undefined
    ? "—"
    : value.toFixed(digits).replace(".", ",");

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
  return `${value > 0 ? "+" : ""}${fmtNumDe(value)} mm/Jahr`;
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
    weakSecondaryTrackFlag ? "schwacher Sekundärtrack" : null,
    agreementTensionFlag ? "Track-Spannung" : null,
  ].filter(Boolean);
  return flags.length ? flags.join(" / ") : "—";
};

export const formatPenalty = (penalty: MlReliabilityPenalty) => {
  const tracks = penalty.tracks.length ? ` T${penalty.tracks.join("/T")}` : "";
  const deltaSuffix =
    penalty.score_delta === null ? "" : ` (${penalty.score_delta.toFixed(2)})`;
  if (penalty.key === "weak_main_cluster_support") {
    return `schwache Hauptcluster-Stützung${tracks}${deltaSuffix}`;
  }
  if (penalty.key === "weak_secondary_track_band_cap") {
    return `Bandgrenze ${penalty.cap_band || "—"}${tracks}`;
  }
  if (penalty.key === "low_track_agreement") {
    return `niedrige Track-Übereinstimmung${deltaSuffix}`;
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

/**
 * Kurzform einer Cluster-ID für die Anzeige: Cluster-IDs sind als
 * "{building_id}:t{track}:cluster_N" aufgebaut; sichtbar ist nur das
 * letzte Segment (der Kontext Gebäude/Track steht daneben).
 */
export const shortClusterId = (clusterId: string | null | undefined) => {
  if (!clusterId) return "—";
  const lastSegment = clusterId.split(":").pop();
  return lastSegment && lastSegment !== "" ? lastSegment : clusterId;
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
  confirmed: "bestätigt",
};

export const HISTORICAL_DIFFERENTIAL_LEVEL_MESSAGE =
  "historischer Modellstand – Differential-Level nicht verfügbar";

export function formatDifferentialMotionLevel(level: DifferentialMotionLevel | undefined) {
  return level === null || level === undefined
    ? HISTORICAL_DIFFERENTIAL_LEVEL_MESSAGE
    : `${level} – ${differentialMotionLevelLabels[level]}`;
}

// Deutsche Kurz-Labels für alle explain_top_features-/Gate-Keys der
// aktiven Pipeline (Quelle: anomaly_local_v1._build_explain_items und
// die Gate-/Demotion-Reasons). Unbekannte Keys fallen auf den
// aufbereiteten Key zurück.
export const focusReasonLabels: Record<string, string> = {
  local_motion_deviation: "Lokaler Punktkontext weicht ab",
  noise_cluster: "Kein stabiler Cluster",
  nearest_assignment: "Unsichere Gebäudezuordnung",
  directional_assignment: "Zuordnung über Blickrichtungs-Puffer",
  high_velocity_std: "Hohe Geschwindigkeits-Unsicherheit",
  unstable_amplitude: "Instabile Amplituden-Zeitreihe",
  unsupported_step: "Bewegungssprung ohne lokale Stützung",
  weak_local_support: "Schwache lokale Stützung",
  cross_track_mismatch: "Tracks widersprechen sich",
  insufficient_support: "Zu wenige lokale Punkte",
  no_building_assignment: "Keinem Gebäude zugeordnet",
  too_few_valid_epochs: "Zu wenige gültige Messepochen",
  too_sparse_timeseries: "Zu lückenhafte Zeitreihe",
  low_coherence: "Niedrige Kohärenz",
  nearest_no_geometric_anchor: "Kein geometrischer Anker",
  nearest_crosslook_unknown: "Querversatz nicht bestimmbar",
  nearest_crosslook_outlier: "Querversatz zu groß",
};

// Deutsche Detail-Saetze (sinngemäße Übersetzung der englischen
// Backend-summaries); Fallback ist der API-Text.
export const focusReasonDetails: Record<string, string> = {
  local_motion_deviation:
    "Der Punkt weicht vom lokalen Bewegungsmuster des Gebäudes ab.",
  noise_cluster: "Der Punkt fiel im lokalen Clustering als Rauschen heraus.",
  nearest_assignment:
    "Die Zuordnung erfolgte nur über den Nächstes-Gebäude-Fallback und ist entsprechend unsicher.",
  directional_assignment:
    "Die Zuordnung erfolgte über den Blickrichtungs-Puffer (radargeometrisch plausibler Versatz).",
  high_velocity_std: "Die Unsicherheit der Geschwindigkeitsschätzung ist hoch.",
  unstable_amplitude: "Die Amplituden-Zeitreihe des Punkts ist instabil.",
  unsupported_step:
    "Ein großer Bewegungssprung wird von den Nachbarpunkten nicht gestützt.",
  weak_local_support:
    "Nur ein kleiner Teil der lokalen Punkte hat die Qualitätsprüfung überstanden.",
  cross_track_mismatch:
    "Aufsteigender und absteigender Track widersprechen sich nach der lokalen Filterung.",
  insufficient_support:
    "Nach der Qualitätsprüfung blieben zu wenige lokale Punkte übrig.",
  no_building_assignment: "Der Punkt konnte keinem Gebäude zugeordnet werden.",
  too_few_valid_epochs:
    "Die Zeitreihe enthält zu wenige gültige Messepochen für eine belastbare Bewertung.",
  too_sparse_timeseries: "Die Zeitreihe ist zu lückenhaft.",
  low_coherence: "Die Kohärenz liegt unter der lokalen Qualitätsschwelle.",
  nearest_no_geometric_anchor:
    "Für dieses Gebäude gibt es keine geometrischen Ankerpunkte; die Nächstes-Gebäude-Zuordnung wurde verworfen.",
  nearest_crosslook_unknown:
    "Der Querversatz zum Gebäude ließ sich nicht bestimmen; die Zuordnung wurde verworfen.",
  nearest_crosslook_outlier:
    "Der Querversatz zum Gebäude ist radargeometrisch nicht erklärbar; die Zuordnung wurde verworfen.",
};

/** Deutscher Detailtext zu einem explain-Key; Fallback: API-Summary. */
export function formatFocusReasonDetail(
  key: string | null | undefined,
  fallbackSummary?: string | null
): string {
  if (key && focusReasonDetails[key]) return focusReasonDetails[key];
  return fallbackSummary && fallbackSummary.trim() !== ""
    ? fallbackSummary
    : "Kein Detailtext verfügbar.";
}

export const focusDetectorLabels: Record<string, string> = {
  rule_penalty: "Regel-Penalty",
  cluster_outlier: "Cluster-Ausreißer",
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
    within: "within - innerhalb des Gebäudes",
    nearest: "nearest - nächstes Gebäude",
    directional_buffer: "directional_buffer - Blickrichtungs-Puffer",
  };
  return labels[method] ?? method.split("_").join(" ");
}
