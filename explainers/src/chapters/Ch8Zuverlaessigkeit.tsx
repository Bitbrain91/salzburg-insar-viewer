import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { neighbourhood } from "@/content/facts";
import { formatMeters } from "@/lib/format";
import { ReliabilityWaterfall } from "./diagrams/ReliabilityWaterfall";

export function Ch8Zuverlaessigkeit() {
  return (
    <Chapter
      meta={chapterById.zuverlaessigkeit}
      techDetails={
        <>
          <p>
            Der Score wird nur berechnet, wenn der Gebäudestatus nicht{" "}
            <span className="font-mono">insufficient_support</span> ist, und am Ende auf 0..1
            begrenzt. Bänder: hoch ≥ 0,75, mittel ≥ 0,45, sonst gering. Jeder Abzug wird als
            Eintrag in <span className="font-mono">reliability_penalties</span> gespeichert — der
            Viewer zeigt die Gründe im Panel „Warum diese Bewertung?" an.
          </p>
          <p>
            Wichtig für die Einordnung: Der{" "}
            <GlossaryTerm term="reliabilityScore">Zuverlässigkeitswert</GlossaryTerm> ist ein
            internes Evidenzmaß und empirisch (noch) nicht kalibriert — er ist ausdrücklich keine
            prozentuale Schadens- oder Trefferwahrscheinlichkeit.
          </p>
          <p>
            Ergänzender Nachbarschaftskontext: Bis zu {neighbourhood.maxNeighbours} Nachbargebäude
            im Umkreis von {formatMeters(neighbourhood.radiusM, 0)} werden als Diagnosekontext
            geprüft. Passt ein Punkt deutlich besser zu einem Nachbarcluster, entsteht ein
            Fehlzuordnungs-Hinweis; bewegen sich mehrere Nachbarn gemeinsam, ein
            Nachbarschaftsereignis-Hinweis. Beides sind Hinweise — die Zuordnung wird nie
            automatisch umgeschrieben.
          </p>
        </>
      }
    >
      <ReliabilityWaterfall />
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Und woher weiß das Projekt, dass diese Bewertungen stimmen? Jede Modelländerung wird
        gegen einen internen Referenzlabel-Korpus benotet —{" "}
        <button
          type="button"
          onClick={() => {
            window.location.hash = "silver";
          }}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          der Silver-Ground-Truth-Explainer
        </button>{" "}
        erklärt, wie dieser Maßstab entsteht.
      </p>
    </Chapter>
  );
}
