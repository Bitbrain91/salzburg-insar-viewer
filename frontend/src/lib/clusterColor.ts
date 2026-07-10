import type { MlBuildingClusterSummary } from "../hooks/useApi";
import { tokens } from "./designTokens";
import { ML_CLUSTER_KIND_COLORS } from "./mlClusterKind";
import { mlPalette } from "./mlPalette";

/**
 * Farbe eines Clusters für UI-Chips: Rolle schlägt Kind, Kind schlägt
 * Palette (verbatim aus InspectorPanel extrahiert, Stage 5).
 */
export function clusterColor(
  cluster: Pick<
    MlBuildingClusterSummary,
    "cluster_color_index" | "cluster_role" | "cluster_kind"
  >
) {
  if (cluster.cluster_role === "excluded") return tokens.clusterRole.excluded;
  if (cluster.cluster_role === "noise") return tokens.clusterRole.noise;
  if (cluster.cluster_role === "insufficient_support") {
    return tokens.clusterRole.insufficientSupport;
  }
  if (cluster.cluster_kind === "annex") return ML_CLUSTER_KIND_COLORS.annex;
  if (cluster.cluster_kind === "foreign") return ML_CLUSTER_KIND_COLORS.foreign;
  const index = cluster.cluster_color_index ?? 0;
  return mlPalette[((index % mlPalette.length) + mlPalette.length) % mlPalette.length];
}
