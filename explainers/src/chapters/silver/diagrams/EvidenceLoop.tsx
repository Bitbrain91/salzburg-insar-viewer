/**
 * Evidenz-Kreislauf der Silver Ground Truth: vom Befund über Label, Harness
 * und Gates zur Entscheidung — und mit jeder Modelländerung wieder von vorn.
 * Klick auf eine Station springt in das zugehörige Kapitel.
 */
import { Card } from "@/components/ui";
import { goToAnchor } from "../silverUi";

type LoopNode = {
  nummer: number;
  titel: string;
  detail: string;
  anchor: string;
};

const NODES: LoopNode[] = [
  {
    nummer: 1,
    titel: "Befund",
    detail: "Visual Audit, Survivors-Scan oder User-Befund macht einen Punkt verdächtig — oder bestätigt ihn.",
    anchor: "silver-label",
  },
  {
    nummer: 2,
    titel: "Label im Korpus",
    detail: "Das dokumentierte Urteil (roof/annex/foreign/unclear) wird mit Evidenz und Datum maschinenlesbar festgehalten.",
    anchor: "silver-korpus",
  },
  {
    nummer: 3,
    titel: "Harness-Lauf",
    detail: "Feste Test-Gebiete und bitidentisch reproduzierte Vergleichsläufe prüfen jede Modelländerung.",
    anchor: "silver-benotung",
  },
  {
    nummer: 4,
    titel: "Benotung & Gates",
    detail: "Jeder gelabelte Punkt bekommt ein Verdict; bestimmte Fehlablagen stellen die Scorecard auf Rot.",
    anchor: "silver-benotung",
  },
  {
    nummer: 5,
    titel: "Entscheidung",
    detail: "Scorecards und Referenzfälle entscheiden über Integration und Release-Kandidaten.",
    anchor: "silver-verwendung",
  },
  {
    nummer: 6,
    titel: "Modelländerung",
    detail: "Die nächste Pipeline-Version erzeugt neue Läufe — und neue Befunde erweitern den Korpus.",
    anchor: "silver-grenzen",
  },
];

export function EvidenceLoop() {
  return (
    <Card className="grid gap-4 p-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {NODES.map((node, index) => (
          <div key={node.nummer} className="relative">
            <button
              type="button"
              onClick={() => goToAnchor(node.anchor)}
              className="grid h-full w-full gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 text-left text-xs transition-colors hover:border-primary/60 hover:bg-card"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                  {node.nummer}
                </span>
                <span className="font-semibold text-foreground">{node.titel}</span>
                {index < NODES.length - 1 && (
                  <span aria-hidden className="ml-auto text-muted-foreground">→</span>
                )}
              </span>
              <span className="leading-relaxed text-muted-foreground">{node.detail}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span aria-hidden className="font-mono">⟲</span>
        Nach Station 6 beginnt der Kreislauf von vorn: Jede Modelländerung muss erneut gegen
        alle Labels, Referenzfälle und Baselines bestehen — und jeder neue Befund macht den
        Maßstab strenger.
      </p>
    </Card>
  );
}
