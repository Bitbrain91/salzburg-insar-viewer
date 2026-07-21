import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { silverChapterById } from "@/content/silverChapters";
import { GOLD_KONTEXT } from "@/content/silverFacts";
import { EvidenceLoop } from "./diagrams/EvidenceLoop";

export function S0Warum() {
  return (
    <Chapter
      meta={silverChapterById["silver-warum"]}
      techDetails={
        <>
          <p>
            Begriffsherkunft: Eine <em>Ground Truth</em> ist die Referenzwahrheit, an der ein
            Modell gemessen wird. „<GlossaryTerm term="goldStandard">Gold</GlossaryTerm>“ wäre
            eine unabhängig erhobene, expertenvalidierte Referenz mit Holdout-Fällen.
            „<GlossaryTerm term="silverGroundTruth">Silver</GlossaryTerm>“ heißt der interne
            Korpus, weil er vom Projektteam selbst erhoben wird — mit dokumentierter Evidenz,
            aber ohne unabhängige Gegenprüfung.
          </p>
          <p>{GOLD_KONTEXT}</p>
          <p>
            Autoritative Quellen: die Konvention{" "}
            <span className="font-mono">docs/pipelines/anomaly_local_v1/reference_labels.md</span>,
            der Korpus{" "}
            <span className="font-mono">artifacts/reference_labels.json</span> und die Benotung in{" "}
            <span className="font-mono">backend/app/ml/evaluation/phase7_clustering_experiments.py</span>.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die Pipeline-Reise zeigt, <em>wie</em> aus Radarpunkten ein Gebäudebefund wird. Diese
        Seite beantwortet die Frage dahinter: <strong>Woher weiß das Projekt, dass diese
        Entscheidungen stimmen?</strong> Die Antwort ist ein Kreislauf aus dokumentierten
        Befunden, maschinenlesbaren Labels und automatischer Benotung — die{" "}
        <GlossaryTerm term="silverGroundTruth">Silver Ground Truth</GlossaryTerm>. Sie ersetzt
        keine unabhängige fachliche Prüfung, aber sie sorgt dafür, dass keine Modelländerung
        unbemerkt etwas kaputt macht, was schon einmal fachlich geklärt war.
      </p>
      <EvidenceLoop />
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Jede Station dieses Kreislaufs hat ihr eigenes Kapitel — die Reise folgt dem Weg eines
        einzelnen Urteils: vom ersten Verdacht bis zu der Entscheidung, ob ein neuer
        Modellstand akzeptiert wird.
      </p>
    </Chapter>
  );
}
