import type { MlBuildingAnalysis } from "../../../hooks/useApi";
import {
  fmtNum,
  formatSignedTrackMotion,
  shortClusterId,
  sortTrackEntries,
} from "../../../lib/formatters";
import { CollapsibleSection } from "../../ui";

const assignmentMethodPhrases: Record<string, string> = {
  within: "innerhalb des Umrisses",
  directional_buffer: "über den Blickrichtungs-Puffer",
  nearest: "als nächstgelegenes Gebäude",
};

const bandWords: Record<string, string> = {
  high: "hoch",
  medium: "mittel",
  low: "gering",
};

function assignmentSentence(analysis: MlBuildingAnalysis): string {
  const total = analysis.point_count;
  const parts = Object.entries(analysis.assignment_methods ?? {})
    .filter(([, count]) => count > 0)
    .map(
      ([method, count]) =>
        `${count} ${assignmentMethodPhrases[method] ?? method.split("_").join(" ")}`
    );
  const suffix = parts.length ? ` (${parts.join(", ")})` : "";
  return `${total} ${total === 1 ? "Punkt wurde" : "Punkte wurden"} diesem Gebäude zugeordnet${suffix}.`;
}

function gateSentence(analysis: MlBuildingAnalysis): string {
  return `${analysis.kept_point_count} ${
    analysis.kept_point_count === 1 ? "Punkt bestand" : "Punkte bestanden"
  } die Qualitätsprüfung, ${analysis.excluded_point_count} ${
    analysis.excluded_point_count === 1 ? "wurde" : "wurden"
  } ausgeschlossen, ${analysis.noise_point_count} ${
    analysis.noise_point_count === 1 ? "ist" : "sind"
  } Rauschen.`;
}

function clusterSentence(analysis: MlBuildingAnalysis): string {
  const entries = sortTrackEntries(analysis.main_cluster_by_track ?? {});
  if (!entries.length) {
    return "Für dieses Gebäude wurde kein Hauptcluster bestimmt.";
  }
  const parts = entries.map(([track, clusterId]) => {
    const motion = analysis.track_motion_mm_a?.[track] ?? null;
    const motionText =
      motion === null || motion === undefined
        ? "—"
        : formatSignedTrackMotion(motion);
    return `T${track} → ${shortClusterId(clusterId)} (${motionText})`;
  });
  return `Je Track wurde ein Hauptcluster bestimmt: ${parts.join(", ")}.`;
}

function verdictSentence(analysis: MlBuildingAnalysis): string {
  const motion =
    analysis.building_motion_mm_a === null ||
    analysis.building_motion_mm_a === undefined
      ? "—"
      : formatSignedTrackMotion(analysis.building_motion_mm_a);
  const band = bandWords[analysis.building_reliability_band ?? ""] ?? "unbekannt";
  const penaltyCount = analysis.reliability_penalties.length;
  if (penaltyCount === 0) {
    return `Aus den Hauptclustern ergibt sich ${motion}. Keine Abzüge — die Zuverlässigkeit liegt bei ‚${band}' (${fmtNum(
      analysis.building_reliability_score
    )}).`;
  }
  return `Aus den Hauptclustern ergibt sich ${motion}. ${penaltyCount} ${
    penaltyCount === 1 ? "Abzug senkte" : "Abzüge senkten"
  } die Zuverlässigkeit auf ‚${band}' (${fmtNum(analysis.building_reliability_score)}).`;
}

export type FindingStepsProps = {
  analysis: MlBuildingAnalysis;
  sectionKey?: string;
};

/**
 * "So kam der Befund zustande" — vierstufiger Erklärpfad
 * (Zuordnung → Prüfung → Cluster → Gebäudewert) mit den echten Zahlen
 * dieses Gebäudes; adaptiert aus der Explainer-App (simpleStages).
 */
export function FindingSteps({ analysis, sectionKey }: FindingStepsProps) {
  const steps = [
    { title: "Zuordnung", text: assignmentSentence(analysis) },
    { title: "Prüfung (Gates)", text: gateSentence(analysis) },
    { title: "Cluster", text: clusterSentence(analysis) },
    { title: "Gebäudewert", text: verdictSentence(analysis) },
  ];

  return (
    <CollapsibleSection
      title="So kam der Befund zustande"
      defaultOpen={false}
      key={sectionKey}
    >
      <ol className="grid gap-0">
        {steps.map((step, index) => (
          <li key={step.title} className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px bg-border"
              />
            )}
            <span className="z-[1] inline-grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-[11px] font-bold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="text-xs font-semibold text-foreground">{step.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </CollapsibleSection>
  );
}
