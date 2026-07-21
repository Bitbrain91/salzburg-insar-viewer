import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { FindingCard } from "@/components/ui/insights";
import { silverChapterById } from "@/content/silverChapters";
import { referenceCases, rcGateV4 } from "@/content/silverFacts";
import { CaseCards } from "./diagrams/CaseCards";

export function S4Verwendung() {
  return (
    <Chapter
      meta={silverChapterById["silver-verwendung"]}
      techDetails={
        <>
          <p>
            Neben den Labels prüft der Harness {referenceCases.anzahl} feste{" "}
            <GlossaryTerm term="referenzfall">Referenzfälle</GlossaryTerm> (Gebäude mit
            erwartetem Status); {referenceCases.mitPunktPins} davon tragen maschinelle
            Punkt-Erwartungen (<span className="font-mono">point_expectations</span>,{" "}
            {referenceCases.gepinntePunkte} gepinnte Punkte, inkl.{" "}
            <span className="font-mono">only_sources</span> für den BEV/GBA-Unterschied).
            Fachliche Urteile existieren damit nie mehr nur als Prosa in einem Bericht.
          </p>
          <p>
            v4-Release-Candidate-Gate ({rcGateV4.datum}), Differential-Verteilung über alle
            Rollups: <span className="font-mono">none={rcGateV4.differentialVerteilung.none}</span>,{" "}
            <span className="font-mono">candidate={rcGateV4.differentialVerteilung.candidate}</span>,{" "}
            <span className="font-mono">significant={rcGateV4.differentialVerteilung.significant}</span>,{" "}
            <span className="font-mono">confirmed={rcGateV4.differentialVerteilung.confirmed}</span>.
            Ergebnis: <strong className="text-foreground">v4 {rcGateV4.ergebnis}</strong> — die
            grünen Prüfungen halten den Stand nutzbar, die roten Kriterien definieren die
            nächste Arbeit (kein Schwellen-Tuning, um Gates grün zu färben).
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die Benotung ist kein Selbstzweck: <GlossaryTerm term="scorecard">Scorecards</GlossaryTerm>{" "}
        entscheiden mit, ob eine Modelländerung integriert wird — so wurde der Wechsel auf BEV
        als Gebäudequelle zunächst gestoppt, der Bauteil-Trenner integriert und der
        annex/foreign-Fix erzwungen. Vier Fälle erzählen diese Geschichte am besten:
      </p>
      <CaseCards />
      <div className="grid gap-2">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Am Ende steht das <GlossaryTerm term="rcGate">Release-Candidate-Gate</GlossaryTerm>:
          die gesammelte Abschlussprüfung eines Modellstands. Beim v4-Stand ({rcGateV4.datum})
          sah das so aus:
        </p>
        <div className="grid gap-1.5 md:grid-cols-2">
          <div className="grid content-start gap-1.5">
            {rcGateV4.gruen.map((eintrag) => (
              <FindingCard key={eintrag} tone="good" label={eintrag} />
            ))}
          </div>
          <div className="grid content-start gap-1.5">
            {rcGateV4.rot.map((eintrag) => (
              <FindingCard key={eintrag} tone="bad" label={eintrag} />
            ))}
          </div>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Zwei rote Kriterien reichten: <strong>v4 wurde geprüft, aber nicht akzeptiert.</strong>{" "}
          Der Stand bleibt produktiv nutzbar — aber die roten Befunde sind jetzt die oberste
          Priorität der offenen Forschung, nicht ein Grund, die Messlatte zu senken.
        </p>
      </div>
    </Chapter>
  );
}
