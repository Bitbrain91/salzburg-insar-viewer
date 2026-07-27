/**
 * Diagramm Kapitel „Störanteile" (Teil B·2): die gemessene Phase als Summe
 * ihrer Bestandteile. Inhalt und Reihenfolge kommen vollständig aus
 * phaseComponents (insarFacts) — hier stehen weder Anteilsgrößen noch
 * Quellen-Zahlen; die Balken sind schematisch, nicht maßstäblich. Kein
 * Zufall, kein Timer: der Zustand ergibt sich aus den Entfernen-Schaltern.
 *
 * Scope: allgemeingültig (gilt für jede InSAR-Verarbeitung, sensorunabhängig).
 */
import { useState } from "react";
import { Toggle } from "@/components/ui";
import { FormulaBox } from "@/components/FormulaBox";
import { phaseComponents } from "@/content/insarFacts";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";
import { ScopeBadge } from "../insarUi";

type ComponentKey = (typeof phaseComponents)[number]["key"];

const COMPONENT_COLORS: Record<ComponentKey, string> = {
  deformation: tokens.series.displacement,
  topo: tokens.reliability.medium,
  demError: tokens.clusterRole.insufficientSupport,
  atmo: tokens.clusterKind.annex,
  noise: tokens.reliability.unknown,
};

const SHORT_LABEL: Record<ComponentKey, string> = {
  deformation: "Bewegung",
  topo: "Topografie",
  demError: "DEM-Fehler ε",
  atmo: "Atmosphäre (APS)",
  noise: "Rauschen",
};

const removableComponents = phaseComponents.filter((component) => component.entfernbar);

export function PhaseBudgetMixer() {
  const [removed, setRemoved] = useState<Record<string, boolean>>({});

  const isRemoved = (key: string) => Boolean(removed[key]);
  const active = phaseComponents.filter(
    (component) => !(component.entfernbar && isRemoved(component.key))
  );
  const allRemovableRemoved = removableComponents.every((component) =>
    isRemoved(component.key)
  );

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gemessene Phase φ
        </p>
        <ScopeBadge scope="allgemein" detail="jede Verarbeitung" />
      </div>

      {/* Schematischer Stapel der aktiven Anteile */}
      <div className="flex overflow-hidden rounded-md border border-border">
        {active.map((component) => (
          <div
            key={component.key}
            className="flex flex-1 items-center justify-center px-2 py-3 text-center text-[11px] font-semibold leading-tight text-white transition-all"
            style={{ backgroundColor: COMPONENT_COLORS[component.key] }}
          >
            {SHORT_LABEL[component.key]}
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Schematisch, nicht maßstäblich — die Anteile sind je nach Ort, Wetter und Ziel
        unterschiedlich groß.
      </p>

      <FormulaBox
        result="φ_gemessen"
        terms={active.map((component) => ({
          name: SHORT_LABEL[component.key],
          color: COMPONENT_COLORS[component.key],
        }))}
        note={
          allRemovableRemoved
            ? "Alle trennbaren Anteile sind entfernt — übrig bleiben Nutzsignal und Rauschen."
            : "Schalte die trennbaren Anteile ab und beobachte, was von der Phase übrig bleibt."
        }
      />

      {/* Entfernen-Schalter (nur für trennbare Anteile) */}
      <div className="grid gap-2 sm:grid-cols-2">
        {removableComponents.map((component) => (
          <Toggle
            key={component.key}
            checked={isRemoved(component.key)}
            onCheckedChange={(checked) =>
              setRemoved((prev) => ({ ...prev, [component.key]: checked }))
            }
            label={
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COMPONENT_COLORS[component.key] }}
                />
                Verarbeitung entfernt „{component.label}“
              </span>
            }
          />
        ))}
      </div>

      {/* Bestandteile im Detail */}
      <div className="grid gap-2 sm:grid-cols-2">
        {phaseComponents.map((component) => {
          const color = COMPONENT_COLORS[component.key];
          const removedNow = component.entfernbar && isRemoved(component.key);
          return (
            <div
              key={component.key}
              className={cn(
                "grid gap-1 rounded-md border bg-background px-3 py-2.5 text-xs transition-opacity",
                removedNow ? "border-border opacity-45" : "border-border"
              )}
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <p className="font-semibold text-foreground">{component.label}</p>
              <p className="leading-relaxed text-muted-foreground">{component.text}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {component.entfernbar
                  ? removedNow
                    ? `entfernt über: ${component.entfernung}`
                    : `trennbar über: ${component.entfernung}`
                  : component.entfernung}
              </p>
            </div>
          );
        })}
      </div>

      {/* Kernbotschaft: das APS-Prinzip */}
      <div
        className="grid gap-1 rounded-md border px-3 py-3 text-xs"
        style={{
          borderColor: COMPONENT_COLORS.atmo,
          backgroundColor: `${COMPONENT_COLORS.atmo}12`,
        }}
      >
        <p className="font-semibold text-foreground">
          Warum sich die Atmosphäre herausrechnen lässt — das APS-Prinzip
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Die atmosphärische Phase ist über kurze Distanzen räumlich glatt (Nachbarpunkte sehen
          fast dieselbe Luftsäule), aber von Aufnahme zu Aufnahme zeitlich zufällig. Echte
          Bodenbewegung ist umgekehrt zeitlich stetig. Über einen Stapel vieler Aufnahmen lassen
          sich beide Muster statistisch trennen — deshalb braucht InSAR viele Szenen, nicht nur zwei.
        </p>
      </div>

      {/* Endzustand */}
      {allRemovableRemoved && (
        <div
          className="grid gap-1 rounded-md border px-3 py-3 text-xs"
          style={{
            borderColor: COMPONENT_COLORS.deformation,
            backgroundColor: `${COMPONENT_COLORS.deformation}12`,
          }}
        >
          <p className="font-semibold text-foreground">Übrig bleiben: Bewegung + Rauschen</p>
          <p className="leading-relaxed text-muted-foreground">
            Das Rauschen wird nicht subtrahiert, sondern vermieden: instabile Zellen werden über die
            Kohärenz gar nicht erst zu Messpunkten. Was als Zeitreihe im Viewer ankommt, ist die
            geschätzte Bewegung — der Rest ist bestmöglich herausgerechnet oder ausgesiebt.
          </p>
        </div>
      )}
    </div>
  );
}
