import type {
  MlBuildingAnalysis,
  MlBuildingClusterSummary,
} from "../../../hooks/useApi";
import { buildReliabilityReasons } from "../../../lib/reliabilityReasons";
import type { MlBuildingTrackFilter } from "../../../lib/store";
import { FindingSteps } from "../shared/FindingSteps";
import { WhyPanel } from "../shared/WhyPanel";
import { BuildingVerdict } from "./BuildingVerdict";
import { ClusterSection } from "./ClusterSection";

type PointRecord = Record<string, unknown>;

export type BuildingBefundProps = {
  analysis: MlBuildingAnalysis;
  runTitle: string;
  sectionKey: string;
  /** ClusterSection nur fuer lokale Anomaly-Laeufe anzeigen. */
  showClusters?: boolean;
  trackOptions: Array<{ value: MlBuildingTrackFilter; label: string }>;
  pointsByCluster: Map<string, PointRecord[]>;
  pointsLoading: boolean;
  isSelectedPoint: (point: PointRecord) => boolean;
  onFocusPoint: (point: PointRecord, cluster: MlBuildingClusterSummary) => void;
  onEndFocus: () => void;
};

/**
 * Gebäude-Befund: Verdict → Warum → Erklärpfad → Bewegungsmuster.
 * Erzählt den Befund von der Aussage zur Evidenz statt Variablen zu listen.
 */
export function BuildingBefund({
  analysis,
  runTitle,
  sectionKey,
  showClusters = true,
  trackOptions,
  pointsByCluster,
  pointsLoading,
  isSelectedPoint,
  onFocusPoint,
  onEndFocus,
}: BuildingBefundProps) {
  const reasons = buildReliabilityReasons(analysis);
  const whyDefaultOpen =
    analysis.building_reliability_band !== "high" || reasons.length > 0;

  return (
    <div className="space-y-4">
      <BuildingVerdict analysis={analysis} runTitle={runTitle} />
      <WhyPanel
        title="Warum diese Bewertung?"
        reasons={reasons}
        defaultOpen={whyDefaultOpen}
        trackMotion={analysis.track_motion_mm_a}
        trackAgreementScore={analysis.track_agreement_score}
        sectionKey={`why-${sectionKey}`}
      />
      <FindingSteps analysis={analysis} sectionKey={`steps-${sectionKey}`} />
      {showClusters && (
        <ClusterSection
          analysis={analysis}
          trackOptions={trackOptions}
          pointsByCluster={pointsByCluster}
          pointsLoading={pointsLoading}
          isSelectedPoint={isSelectedPoint}
          onFocusPoint={onFocusPoint}
          onEndFocus={onEndFocus}
        />
      )}
    </div>
  );
}
