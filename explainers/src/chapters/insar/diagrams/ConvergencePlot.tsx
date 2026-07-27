/**
 * Einschwingzeit der Ratenpräzision: σ(Rate) sinkt mit wachsender Stapellänge.
 * Schematische Kurven je Sensor (Sentinel-1, TerraSAR-X), die die
 * dokumentierten Einschwingfenster aus convergence treffen und die
 * Zielpräzision rateAccuracy.sigmaRateMmPerYear erreichen.
 *
 * Kurvenform ist SCHEMATISCH (nach TRE Fig. 5 S. 15–16): σ(t) = √(t_konv / t),
 * konstruiert so, dass σ = 1 mm/a genau in der Mitte des dokumentierten
 * Einschwingfensters erreicht wird. Keine gemessene Kurve — nur die
 * Fenster-Grenzen und die Zielpräzision stammen aus den Quellen.
 *
 * Geltungsbereich: sensorspezifisch (ScopeBadge je Kurve).
 */
import { useState } from "react";
import { ScopeBadge, sensorColors } from "../insarUi";
import {
  convergence,
  rateAccuracy,
  salzburgTsx,
  sensors,
  type SensorId,
} from "@/content/insarFacts";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

const W = 560;
const H = 300;
const PAD = { l: 52, r: 18, t: 18, b: 46 };
const X_MAX = 36; // Monate
const Y_MAX = 3.5; // mm/a

const plotX = (m: number) => PAD.l + (m / X_MAX) * (W - PAD.l - PAD.r);
const plotY = (s: number) => PAD.t + (1 - s / Y_MAX) * (H - PAD.t - PAD.b);

/** Mitte des dokumentierten Einschwingfensters (Monate). */
function convMid(id: SensorId): number {
  const [min, max] = convergence[id].monthsToSigma1;
  return (min + max) / 2;
}

/** Schematische σ(t)-Kurve als Polyline-Punkte. */
function curvePoints(id: SensorId): string {
  const mid = convMid(id);
  const pts: string[] = [];
  for (let m = 3; m <= X_MAX; m += 1) {
    const sigma = Math.min(Y_MAX, Math.sqrt(mid / m));
    pts.push(`${plotX(m)},${plotY(sigma)}`);
  }
  return pts.join(" ");
}

type Highlight = "both" | SensorId;

export function ConvergencePlot() {
  const [highlight, setHighlight] = useState<Highlight>("both");

  const target = rateAccuracy.sigmaRateMmPerYear;
  const monthTicks = [0, 6, 12, 18, 24, 30, 36];
  const sigmaTicks = [0, 1, 2, 3];

  const highlightButtons: { key: Highlight; label: string }[] = [
    { key: "both", label: "Beide" },
    { key: "s1", label: sensors.s1.name },
    { key: "tsx", label: sensors.tsx.name },
  ];

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ScopeBadge scope="s1" detail={`${convergence.s1.monthsToSigma1[0]}–${convergence.s1.monthsToSigma1[1]} Mon.`} />
          <ScopeBadge scope="tsx" detail={`${convergence.tsx.monthsToSigma1[0]}–${convergence.tsx.monthsToSigma1[1]} Mon.`} />
        </div>
        <div
          role="group"
          aria-label="Kurve hervorheben"
          className="grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-muted p-0.5"
        >
          {highlightButtons.map((btn) => {
            const active = highlight === btn.key;
            return (
              <button
                key={btn.key}
                type="button"
                aria-pressed={active}
                onClick={() => setHighlight(btn.key)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Präzision der Bewegungsrate gegen die Stapellänge, schematisch je Sensor"
        className="h-auto w-full rounded-md border border-border bg-background"
      >
        {/* Gitter + Achsenbeschriftung */}
        {sigmaTicks.map((s) => (
          <g key={`y-${s}`}>
            <line
              x1={PAD.l}
              y1={plotY(s)}
              x2={W - PAD.r}
              y2={plotY(s)}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.14}
              strokeWidth={1}
            />
            <text
              x={PAD.l - 8}
              y={plotY(s) + 3}
              textAnchor="end"
              fontSize={9.5}
              className="fill-current text-muted-foreground"
            >
              {formatNumber(s, 0)}
            </text>
          </g>
        ))}
        {monthTicks.map((m) => (
          <text
            key={`x-${m}`}
            x={plotX(m)}
            y={H - PAD.b + 16}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-current text-muted-foreground"
          >
            {m}
          </text>
        ))}

        {/* Zielpräzision σ = 1 mm/a */}
        <line
          x1={PAD.l}
          y1={plotY(target)}
          x2={W - PAD.r}
          y2={plotY(target)}
          stroke="hsl(var(--foreground))"
          strokeOpacity={0.55}
          strokeWidth={1.4}
          strokeDasharray="5 4"
        />
        <text
          x={W - PAD.r}
          y={plotY(target) - 5}
          textAnchor="end"
          fontSize={9}
          className="fill-current text-foreground"
        >
          Zielpräzision σ = {formatNumber(target, 0)} mm/a
        </text>

        {/* Kurven je Sensor */}
        {(["s1", "tsx"] as SensorId[]).map((id) => {
          const emphasized = highlight === "both" || highlight === id;
          const [min, max] = convergence[id].monthsToSigma1;
          const mid = convMid(id);
          const color = sensorColors[id];
          return (
            <g
              key={id}
              style={{ opacity: emphasized ? 1 : 0.22 }}
              className="transition-opacity duration-300"
            >
              {/* Einschwingfenster [min, max] */}
              <rect
                x={plotX(min)}
                y={PAD.t}
                width={plotX(max) - plotX(min)}
                height={plotY(0) - PAD.t}
                fill={color}
                fillOpacity={emphasized ? 0.1 : 0.05}
              />
              <polyline
                points={curvePoints(id)}
                fill="none"
                stroke={color}
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Kreuzung mit der Zielpräzision */}
              <line
                x1={plotX(mid)}
                y1={plotY(target)}
                x2={plotX(mid)}
                y2={plotY(0)}
                stroke={color}
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={plotX(mid)} cy={plotY(target)} r={4} fill={color} stroke="hsl(var(--background))" strokeWidth={1.6} />
              <text
                x={plotX(mid)}
                y={plotY(0) + 30}
                textAnchor="middle"
                fontSize={9}
                fill={color}
              >
                {min}–{max} Mon.
              </text>
            </g>
          );
        })}

        {/* Achsentitel */}
        <text
          x={(PAD.l + W - PAD.r) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={9.5}
          className="fill-current text-muted-foreground"
        >
          Stapellänge (Monate)
        </text>
        <text
          x={14}
          y={(PAD.t + plotY(0)) / 2}
          textAnchor="middle"
          fontSize={9.5}
          transform={`rotate(-90 14 ${(PAD.t + plotY(0)) / 2})`}
          className="fill-current text-muted-foreground"
        >
          σ der Rate (mm/a)
        </text>
      </svg>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Schematisch nach TRE Fig. 5 (S. 15–16): Die Kurvenform ist konstruiert, nur die
        Einschwingfenster ({convergence.tsx.monthsToSigma1[0]}–{convergence.tsx.monthsToSigma1[1]}{" "}
        Monate für {sensors.tsx.name}, {convergence.s1.monthsToSigma1[0]}–
        {convergence.s1.monthsToSigma1[1]} Monate für {sensors.s1.name}) und die Zielpräzision
        σ = {formatNumber(target, 0)} mm/a stammen aus den Quellen. Sie gelten unter den
        Szenario-Annahmen der Abbildung: Atmosphärenrauschen{" "}
        {formatNumber(convergence.assumptions.atmoNoiseMm2, 0)} mm²,{" "}
        {convergence.assumptions.note}, Punkte unter{" "}
        {formatNumber(convergence.assumptions.maxRefDistanceKm, 0)} km vom Referenzpunkt.
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Zum Vergleich: Der Salzburger {sensors.tsx.name}-Stapel umfasst{" "}
        <span className="font-mono font-semibold text-foreground">{salzburgTsx.scenes}</span> Szenen
        über den Zeitraum {salzburgTsx.period} — weit jenseits des hier gezeigten
        36-Monats-Fensters. Unter den genannten Annahmen ist die Rate dort also längst
        eingeschwungen; eine Garantie für jeden Einzelpunkt ist das nicht.
      </p>
    </div>
  );
}
