/**
 * Kernbotschaft von Kap. 5: Jede InSAR-Zeitreihe ist auf einen als
 * unbeweglich ANGENOMMENEN Referenzpunkt bezogen. Bewegt sich der REF doch,
 * wandert sein Trend als GEGENLÄUFIGE Scheinbewegung in alle Zeitreihen des
 * Datensatzes (jeder Wert ist Ziel − Referenz; daher unten `v − refVel·t`).
 *
 * Der Slider „tatsächliche Eigenbewegung des REF“ verschiebt genau deshalb
 * jede der drei Beispiel-Zeitreihen gleichzeitig — sichtbar gemachte
 * Fehlerfortpflanzung (TRE S. 11–12: REF kann einen Regionaltrend enthalten,
 * nur per GNSS prüfbar).
 *
 * Geltungsbereich: allgemein. Die drei Zeitreihen sind DIDAKTISCHE,
 * deterministische Beispieldaten (kein Math.random) — sie stehen für typische
 * Fälle (stabil / Senkung / Hebung), nicht für konkrete Messpunkte.
 */
import { useState } from "react";
import { LabeledSlider } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import { ConditionsNote } from "../insarUi";
import { salzburgTsx } from "@/content/insarFacts";
import { tokens } from "@/lib/designTokens";
import { formatMmPerYear } from "@/lib/format";

/** Aufnahmezeitpunkte in Jahren (DIDAKTIK). */
const YEARS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

/**
 * Feste Beispiel-Zeitreihen (kumulative Verschiebung in mm, DIDAKTIK):
 * ein stabiles Dach, ein sich setzendes Wohnhaus, ein quellender Hang.
 * Bei stabilem REF zeigt der Datensatz genau diese Werte.
 */
const POINTS = [
  {
    id: "p1",
    label: "stabiles Flachdach",
    distanzKm: 0.4,
    base: [0, -0.4, 0.3, -0.2, 0.5, 0.1, -0.3, 0.4, 0.0],
  },
  {
    id: "p2",
    label: "setzendes Wohnhaus",
    distanzKm: 0.9,
    base: [0, -1.1, -2.6, -3.4, -5.1, -6.0, -7.6, -8.9, -10.2],
  },
  {
    id: "p3",
    label: "quellender Hang",
    distanzKm: 1.3,
    base: [0, 0.9, 1.4, 2.6, 3.1, 4.2, 4.6, 5.9, 6.4],
  },
] as const;

/** Gemeinsame y-Skala aller Sparklines, damit die Verschiebung vergleichbar bleibt. */
const Y_ABS = 24;

const LINE_COLOR = tokens.series.displacement;

export function ReferencePointDemo() {
  const [refVel, setRefVel] = useState(0);
  const drifts = Math.abs(refVel) >= 0.01;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      {/* Referenzpunkt-Kopf */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
        <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" role="img" aria-label="Referenzpunkt">
          <polygon
            points="16,5 27,26 5,26"
            fill={drifts ? tokens.reliability.medium : "hsl(var(--muted-foreground))"}
            fillOpacity={0.18}
            stroke={drifts ? tokens.reliability.medium : "hsl(var(--foreground))"}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <circle cx={16} cy={20} r={2.4} fill={drifts ? tokens.reliability.medium : "hsl(var(--foreground))"} />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Referenzpunkt {salzburgTsx.refPoint}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Alle Zeitreihen sind auf diesen Punkt bezogen — als unbeweglich angenommen.
          </p>
        </div>
      </div>

      <LabeledSlider
        label="Tatsächliche Eigenbewegung des Referenzpunkts"
        valueLabel={formatMmPerYear(refVel)}
        min={-3}
        max={3}
        step={0.5}
        value={[refVel]}
        onValueChange={([value]) => setRefVel(value)}
      />

      {/* Drei Messpunkte mit Mini-Zeitreihen */}
      <div className="grid gap-2.5">
        {POINTS.map((point) => {
          const displayed = point.base.map((v, i) => v - refVel * YEARS[i]);
          return (
            <div
              key={point.id}
              className="grid items-center gap-3 rounded-md border border-border bg-background px-3 py-2 sm:grid-cols-[1fr_auto]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LINE_COLOR }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{point.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    ~ {point.distanzKm.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
                    km vom REF
                  </p>
                </div>
              </div>
              <MiniSeries values={displayed} shifted={drifts} />
            </div>
          );
        })}
      </div>

      <FindingCard
        tone={drifts ? "warning" : "neutral"}
        label={
          drifts
            ? `Referenzpunkt driftet mit ${formatMmPerYear(refVel)}`
            : "Referenzpunkt stabil"
        }
        detail={
          drifts
            ? "Genau diese Scheinbewegung steckt jetzt in allen drei Zeitreihen — und in jedem einzelnen Wert des Datensatzes. Ohne unabhängige GNSS-Kontrolle ist sie nicht von echter Bewegung zu unterscheiden."
            : "Die Zeitreihen zeigen die tatsächliche Bewegung relativ zum Referenzpunkt. Die Stabilitätsannahme ist die stille Voraussetzung hinter jedem dieser Werte."
        }
      />

      <ConditionsNote variant="rate" />
    </div>
  );
}

/** Kleine gemeinsame Zeitreihen-Grafik (feste y-Skala ±24 mm). */
function MiniSeries({ values, shifted }: { values: number[]; shifted: boolean }) {
  const W = 208;
  const H = 54;
  const padX = 8;
  const padY = 8;
  const x = (i: number) => padX + (i / (values.length - 1)) * (W - 2 * padX);
  const y = (v: number) => padY + (1 - (v + Y_ABS) / (2 * Y_ABS)) * (H - 2 * padY);

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values[values.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Zeitreihe des Messpunkts"
      className="h-auto w-full sm:w-52"
    >
      {/* Null-Linie = Referenzpunkt-Annahme */}
      <line
        x1={padX}
        y1={y(0)}
        x2={W - padX}
        y2={y(0)}
        stroke="hsl(var(--muted-foreground))"
        strokeOpacity={0.4}
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <polyline
        points={points}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(last)}
        r={2.6}
        fill={shifted ? tokens.reliability.medium : LINE_COLOR}
        className="transition-all duration-500"
      />
    </svg>
  );
}
