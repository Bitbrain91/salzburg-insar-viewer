export type MlClusterKind = "standard" | "annex" | "foreign";

export const ML_CLUSTER_KIND_COLORS: Record<Exclude<MlClusterKind, "standard">, string> = {
  annex: "#7c3aed",
  foreign: "#00a6a6",
};

export const ML_CLUSTER_KIND_LABELS: Record<MlClusterKind, string> = {
  standard: "Standardcluster",
  annex: "Bauteil / Anbau",
  foreign: "Fremdreflektor",
};

export const ML_CLUSTER_KIND_DESCRIPTIONS: Record<MlClusterKind, string> = {
  standard: "Regulaerer lokaler Cluster; seine individuelle Farbe stammt aus der Clusterpalette.",
  annex: "Separierter, baulich verbundener Bauteil- oder Anbau-Cluster.",
  foreign: "Separierter Fremdreflektor; dieser Cluster darf den Gebaeudebefund nicht praegen.",
};

export function formatMlClusterKind(kind: MlClusterKind | null | undefined) {
  return kind ? ML_CLUSTER_KIND_LABELS[kind] : "Cluster-Typ nicht verfuegbar";
}

export const V3_ANNEX_CLASSIFICATION_NOTE =
  "damalige v3-Klassifikation – keine v4-Bestätigung";

export function isV3ModelSetVersion(modelSetVersion: string | null | undefined) {
  return modelSetVersion?.startsWith("local_hdbscan_rulegate_v3_") ?? false;
}

export function formatMlClusterKindForModel(
  kind: MlClusterKind | null | undefined,
  modelSetVersion: string | null | undefined
) {
  const label = formatMlClusterKind(kind);
  return kind === "annex" && isV3ModelSetVersion(modelSetVersion)
    ? `${label} – ${V3_ANNEX_CLASSIFICATION_NOTE}`
    : label;
}
