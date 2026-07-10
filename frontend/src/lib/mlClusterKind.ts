import { tokens } from "./designTokens";

export type MlClusterKind = "standard" | "annex" | "foreign";

export const ML_CLUSTER_KIND_COLORS: Record<Exclude<MlClusterKind, "standard">, string> =
  tokens.clusterKind;

export const ML_CLUSTER_KIND_LABELS: Record<MlClusterKind, string> = {
  standard: "Standardcluster",
  annex: "Bauteil / Anbau",
  foreign: "Fremdreflektor",
};

export const ML_CLUSTER_KIND_DESCRIPTIONS: Record<MlClusterKind, string> = {
  standard: "Regulärer lokaler Cluster; seine individuelle Farbe stammt aus der Clusterpalette.",
  annex: "Separierter, baulich verbundener Bauteil- oder Anbau-Cluster.",
  foreign: "Separierter Fremdreflektor; dieser Cluster darf den Gebäudebefund nicht prägen.",
};

export function formatMlClusterKind(kind: MlClusterKind | null | undefined) {
  return kind ? ML_CLUSTER_KIND_LABELS[kind] : "Cluster-Typ nicht verfügbar";
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
