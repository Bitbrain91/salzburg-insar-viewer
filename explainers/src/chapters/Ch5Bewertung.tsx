import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { pointScoring, rulePenalties } from "@/content/facts";
import { formatNumber } from "@/lib/format";
import { ClusterScoreCalculator, PointScoreCalculator } from "./diagrams/ScoreCalculators";

export function Ch5Bewertung() {
  return (
    <Chapter
      meta={chapterById.bewertung}
      techDetails={
        <>
          <p>
            Labels aus dem <GlossaryTerm term="qualityScore">Qualitätswert</GlossaryTerm>:{" "}
            <span className="font-mono">
              normal ≥ {formatNumber(pointScoring.labelNormalThreshold, 2)}
            </span>
            ,{" "}
            <span className="font-mono">
              suspect {formatNumber(pointScoring.labelOutlierThreshold, 2)}–
              {formatNumber(pointScoring.labelNormalThreshold - 0.01, 2)}
            </span>
            ,{" "}
            <span className="font-mono">
              outlier &lt; {formatNumber(pointScoring.labelOutlierThreshold, 2)}
            </span>
            . Sonderfälle: Gate-ausgeschlossene Punkte erhalten Anomalie ≥ 0,90, Qualität ≤ 0,15 und
            das Label outlier; Noise-Punkte Anomalie ≥ 0,80 und outlier;
            insufficient_support-Punkte Qualität ≤ 0,65 und suspect.
          </p>
          <p>Fachliche Regel-Abzüge (rule_penalty), maximales Gewicht je Regel:</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {rulePenalties.map((penalty) => (
              <li key={penalty.key} className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs">{penalty.key}</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {formatNumber(penalty.weight, 2)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            Die Cluster-Verlässlichkeit wird nur für core-Cluster berechnet; belastbar
            (reliable_core) ist ein Core-Cluster ab 2 Punkten. Anbau-Cluster (annex) sind von der
            Hauptcluster-Wahl ausgeschlossen — auch als einziger Core-Cluster; Fremd-Cluster
            (foreign) sind nie core.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Zwei Werte fassen jeden Punkt zusammen: der{" "}
        <GlossaryTerm term="anomalyScore">Anomaliewert</GlossaryTerm> (wie auffällig?) und der{" "}
        <GlossaryTerm term="qualityScore">Qualitätswert</GlossaryTerm> (wie belastbar?). Aus dem
        Qualitätswert entsteht das Ampel-Label im Viewer. Auf Gruppenebene bewertet die
        Cluster-Verlässlichkeit, wie tragfähig ein Cluster ist — und entscheidet mit, welcher zum{" "}
        <GlossaryTerm term="mainCluster">Hauptcluster</GlossaryTerm> wird.
      </p>
      <div className="grid gap-4">
        <PointScoreCalculator />
        <ClusterScoreCalculator />
      </div>
    </Chapter>
  );
}
