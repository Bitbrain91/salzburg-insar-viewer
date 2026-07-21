import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { FindingCard } from "@/components/ui/insights";
import { silverChapterById } from "@/content/silverChapters";
import { ausbau, corpus } from "@/content/silverFacts";
import { SilverVsGold } from "./diagrams/SilverVsGold";

export function S5Grenzen() {
  return (
    <Chapter
      meta={silverChapterById["silver-grenzen"]}
      techDetails={
        <>
          <p>
            Die offizielle Einordnung im Projektzieldokument: Diese Prüfungen sind{" "}
            <em>interne Silver-Ground-Truth-Evidenz — sie ersetzen keine unabhängige fachliche
            Ground Truth.</em> Konsequenz für die Kommunikation: Der Zuverlässigkeitswert der
            Gebäudebefunde ist ein internes Evidenzmaß; prozentuale Schadens- oder
            Trefferwahrscheinlichkeiten werden erst nach Kalibrierung gegen unabhängige
            Referenzen kommuniziert (P1-3).
          </p>
          <p>
            Die Ausbau-Schritte sind als P1-Prioritäten in{" "}
            <span className="font-mono">docs/pipelines/anomaly_local_v1/next_steps.md</span>{" "}
            geroutet; der Zielumfang von {ausbau.zielGebaeude} stratifizierten Gebäuden steht in
            der Korpus-Konvention (Regel 4).
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ehrlichkeit ist das Fundament dieses Korpus — und sie gilt auch für ihn selbst:{" "}
        {corpus.punkte} Punkte an {corpus.gebaeudePhysisch} Gebäuden sind ein
        Regressionsschutz, kein Beweis. Dieselben Fälle, an denen die Pipeline benotet wird,
        haben auch ihre Entwicklung geprägt; echte{" "}
        <GlossaryTerm term="holdout">Holdouts</GlossaryTerm> und unabhängige Prüfer fehlen
        noch. Der Unterschied zwischen dem heutigen Stand und dem Ziel lässt sich in vier
        Aspekten zusammenfassen:
      </p>
      <SilverVsGold />
      <div className="grid gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Der Weg dorthin — die priorisierten Ausbau-Schritte
        </p>
        {ausbau.schritte.map((schritt) => (
          <FindingCard
            key={schritt.id}
            tone="neutral"
            label={schritt.titel}
            aside={<span className="font-mono text-[10px] text-muted-foreground">{schritt.id}</span>}
            detail={schritt.text}
          />
        ))}
      </div>
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Bis dahin gilt die Regel, die sich durch alle Kapitel zieht: Lieber ein dokumentiertes
        „unclear" als ein erzwungenes Urteil, lieber ein rotes Gate als eine verschobene
        Schwelle — und jede Erweiterung des Korpus macht den Maßstab ein Stück belastbarer.
      </p>
    </Chapter>
  );
}
