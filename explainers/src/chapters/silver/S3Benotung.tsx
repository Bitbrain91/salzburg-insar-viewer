import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { silverChapterById } from "@/content/silverChapters";
import { fixedAois, noopV4, rcGateV4 } from "@/content/silverFacts";
import { goToAnchor } from "./silverUi";
import { GradingSimulator } from "./diagrams/GradingSimulator";

export function S3Benotung() {
  return (
    <Chapter
      meta={silverChapterById["silver-benotung"]}
      techDetails={
        <>
          <p>
            Ist-Zustand eines Punkts (<span className="font-mono">_reference_label_state</span>):
            Gate-Ausschluss vor allem anderen; danach gilt seit P8-F{" "}
            <span className="font-mono">foreign_suspect</span> VOR{" "}
            <span className="font-mono">annex_suspect</span> — ein als Fremdpunkt separierter
            Punkt darf nie als Anbau gewertet werden. Übrige Punkte tragen ihre Cluster-Rolle
            (<span className="font-mono">main_core</span> nur im Hauptcluster).
          </p>
          <p>
            Die Benotung läuft je Pflicht-AOI: Der Korpus wird zur Laufzeit gelesen (eine
            parallele Session kann ihn erweitern), auf das AOI-Dataset gefiltert und Punkt für
            Punkt gegen den Lauf geprüft. Beim v4-Release-Candidate ergaben die{" "}
            {rcGateV4.labelAuswertungen} Label-Auswertungen (Labels zählen je passender
            AOI/Quelle mehrfach) genau einen Fehler: <span className="font-mono">roof_lost=1</span>.
          </p>
          <p>
            Pflicht-AOIs in fester Reihenfolge:{" "}
            {fixedAois.map((aoi, i) => (
              <span key={aoi.name}>
                {i > 0 && " → "}
                <strong className="text-foreground">{aoi.name}</strong> ({aoi.kurz})
              </span>
            ))}
            . Die Bounding-Boxen sind im Harness eingefroren (
            <span className="font-mono">phase2_harness.py FIXED_AOI_RUNS</span>).
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Bevor irgendetwas benotet wird, muss der <GlossaryTerm term="harness">Harness</GlossaryTerm>{" "}
        beweisen, dass er die Pipeline exakt reproduziert: Die{" "}
        <GlossaryTerm term="noopBaseline">No-op-Prüfung</GlossaryTerm> muss eingefrorene
        Vergleichsläufe <strong>bitidentisch</strong> nachrechnen — beim v4-Stand{" "}
        {noopV4.aois}/{noopV4.aois} Testgebiete mit {noopV4.punkte.toLocaleString("de-AT")}{" "}
        Punkten und {noopV4.differenzen} Differenzen. Erst dann wird jeder gelabelte Punkt
        benotet: Aus Soll-Label und Ist-Zustand entsteht ein Verdict. Probiere alle
        Kombinationen aus — und beachte, welche davon sofort ein rotes Gate auslösen:
      </p>
      <GradingSimulator />
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Die Zustände auf der rechten Seite entstehen in der Pipeline —{" "}
        <button
          type="button"
          onClick={() => goToAnchor("trennung")}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          Station 3 der Pipeline-Reise
        </button>{" "}
        erklärt, wie Punkte zu Anbau- oder Fremdclustern getrennt werden.
      </p>
    </Chapter>
  );
}
