import type { MlPointAnalysis } from "../../../hooks/useApi";
import { tokens } from "../../../lib/designTokens";
import {
  fmtNum,
  formatAssignmentMethod,
  formatFocusReasonKey,
  formatSignedTrackMotion,
  fmtNumDe,
} from "../../../lib/formatters";
import { EmptyState, KindBadge, ScoreBar } from "../../ui";

const pointLabelInfo: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: tokens.pointLabel.normal },
  suspect: { label: "Verdacht", color: tokens.pointLabel.suspect },
  outlier: { label: "Ausreißer", color: tokens.pointLabel.outlier },
};

export type PointVerdictProps = {
  analysis: MlPointAnalysis;
  runTitle: string;
  onOpenBuilding?: () => void;
};

/** Oberste Befund-Karte des Punkts: Label, Score-Meter, Cluster, Zuordnung. */
export function PointVerdict({ analysis, runTitle, onOpenBuilding }: PointVerdictProps) {
  const labelInfo = analysis.label
    ? pointLabelInfo[analysis.label] ?? {
        label: analysis.label,
        color: tokens.pointLabel.unlabeled,
      }
    : { label: "Ohne Label", color: tokens.pointLabel.unlabeled };

  const assignmentMethod =
    typeof analysis.building_context.assignment_method === "string"
      ? analysis.building_context.assignment_method
      : null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-bold text-foreground">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: labelInfo.color }}
            aria-hidden
          />
          {labelInfo.label}
        </span>
        <span className="text-xs text-muted-foreground">Punktbewertung</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreBar
          label="Qualität"
          value={analysis.quality_score}
          direction="higher-better"
          threshold={0.7}
        />
        <ScoreBar
          label="Anomalie"
          value={analysis.anomaly_score}
          direction="higher-worse"
          threshold={0.9}
        />
      </div>

      <div className="text-xs text-foreground">
        <span className="font-mono font-semibold">
          {formatSignedTrackMotion(analysis.velocity)}
        </span>{" "}
        · Kohärenz{" "}
        <span className="font-mono font-semibold">{fmtNumDe(analysis.coherence)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <KindBadge
          kind={analysis.cluster_kind}
          modelSetVersion={analysis.model_set_version}
        />
        <span>
          Cluster <span className="font-mono">{analysis.cluster_role ? analysis.cluster_role : "—"}</span>
          {analysis.cluster_probability !== null &&
            ` · Wahrscheinlichkeit ${fmtNumDe(analysis.cluster_probability)}`}
        </span>
      </div>

      {analysis.building_id && (
        <div className="text-xs text-muted-foreground">
          Gehört zu Gebäude{" "}
          {onOpenBuilding ? (
            <button
              type="button"
              onClick={onOpenBuilding}
              className="font-mono font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {(analysis.building_source ?? "").toUpperCase()} {analysis.building_id}
            </button>
          ) : (
            <span className="font-mono font-semibold text-foreground">
              {(analysis.building_source ?? "").toUpperCase()} {analysis.building_id}
            </span>
          )}{" "}
          ({formatAssignmentMethod(assignmentMethod)}
          {analysis.distance_m !== null ? `, ${fmtNumDe(analysis.distance_m, 1)} m` : ""})
        </div>
      )}

      {analysis.gate_excluded && (
        <EmptyState
          tone="warning"
          title="Dieser Punkt wurde nicht für die Gebäudebewertung genutzt"
          message={
            analysis.gate_reasons.length > 0
              ? analysis.gate_reasons
                  .map((reason) => formatFocusReasonKey(reason))
                  .join(" · ")
              : "Der Punkt hat mindestens ein Qualitätsgate nicht bestanden."
          }
        />
      )}

      <div className="border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">
        Befund des Laufs ‚{runTitle}' — keine Aussage über Gebäudeschäden.
      </div>
    </div>
  );
}
