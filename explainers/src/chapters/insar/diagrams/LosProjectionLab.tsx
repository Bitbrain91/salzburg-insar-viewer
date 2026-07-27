/**
 * Kapitel „Geometrie", Diagramm 2: Projektion einer Bodenbewegung auf die
 * Radar-Blicklinie (LOS).
 *
 * Korrektheitsanker: jede LOS-Zahl kommt aus losProjectionMm() aus insarFacts,
 * ausgewertet mit genericLosVersors (didaktisch: gespiegelte Salzburg-TSX-
 * Versoren) und zusätzlich mit dem realen salzburgTsx.losVersor. Die kleine
 * Nord-Komponente ist der Punkt: reine N–S-Bewegung projiziert für beide
 * Blickrichtungen fast auf null. Kein Math.random(), nur useState + SVG.
 */
import { useState } from "react";
import { LabeledSlider, Toggle } from "@/components/ui";
import {
  genericLosVersors,
  losProjectionMm,
  salzburgTsx,
  type LosVersor,
} from "@/content/insarFacts";
import { formatMmPerYear, formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { ScopeBadge, sensorColors } from "../insarUi";

const CX = 110;
const CY = 110;
const R = 82;

const MAX_MM = 10;

type ProjResult = {
  key: string;
  title: string;
  los: number;
  /** "tsx" = realer Salzburg-Versor; null = synthetischer (gespiegelter) Versor. */
  scope: "tsx" | null;
  detail: string;
};

/** Vorzeichen-Farbe: positiv = zum Satelliten, negativ = vom Satelliten. */
function losColor(los: number): string {
  if (los > 0.15) return tokens.series.displacement;
  if (los < -0.15) return tokens.series.amplitude;
  return tokens.reliability.unknown;
}

function LosCard({ result }: { result: ProjResult }) {
  const color = losColor(result.los);
  const fillPct = Math.min(Math.abs(result.los) / MAX_MM, 1) * 50; // je Seite max 50 %
  return (
    <div className="grid gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{result.title}</span>
        {result.scope ? (
          <ScopeBadge scope={result.scope} detail={result.detail} />
        ) : (
          <span className="rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {result.detail}
          </span>
        )}
      </div>
      <div className="font-mono text-sm font-semibold" style={{ color }}>
        {formatMmPerYear(result.los)}
      </div>
      {/* Balken mit Nulllinie in der Mitte */}
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            backgroundColor: color,
            width: `${fillPct}%`,
            left: result.los >= 0 ? "50%" : `${50 - fillPct}%`,
          }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">
        {result.los > 0.15
          ? "Bewegung zum Satelliten"
          : result.los < -0.15
            ? "Bewegung vom Satelliten weg"
            : "für diese Blickrichtung fast unsichtbar"}
      </span>
    </div>
  );
}

export function LosProjectionLab() {
  const [directionDeg, setDirectionDeg] = useState(90); // Kompass: 0 = Nord, 90 = Ost
  const [magnitude, setMagnitude] = useState(6);
  const [vertical, setVertical] = useState(false);
  const [combine, setCombine] = useState(false);

  const phi = (directionDeg * Math.PI) / 180;
  const motion = vertical
    ? { e: 0, n: 0, u: magnitude }
    : { e: magnitude * Math.sin(phi), n: magnitude * Math.cos(phi), u: 0 };

  const project = (versor: LosVersor) => losProjectionMm(motion, versor);
  const losAsc = project(genericLosVersors.asc);
  const losDsc = project(genericLosVersors.dsc);
  const losTsx = project(salzburgTsx.losVersor);

  const results: ProjResult[] = [
    { key: "asc", title: "was ASC sieht", los: losAsc, scope: null, detail: "synthetisch (TSX T93 gespiegelt)" },
    { key: "dsc", title: "was DSC sieht", los: losDsc, scope: null, detail: "synthetisch (TSX T93 gespiegelt)" },
    { key: "tsx", title: "Salzburg TSX real", los: losTsx, scope: "tsx", detail: "Track 93 DSC" },
  ];

  const nsBlind =
    !vertical &&
    magnitude > 0.5 &&
    Math.abs(losAsc) < 0.35 * magnitude &&
    Math.abs(losDsc) < 0.35 * magnitude;

  // Kompass-Pfeilspitze für horizontale Bewegung
  const tip = { x: CX + R * 0.82 * Math.sin(phi), y: CY - R * 0.82 * Math.cos(phi) };

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSlider
          label="Bewegungsrichtung (Kompass, 90° = Ost)"
          valueLabel={vertical ? "—" : `${formatNumber(directionDeg, 0)}°`}
          min={0}
          max={360}
          step={5}
          value={[directionDeg]}
          onValueChange={([value]) => setDirectionDeg(value)}
          disabled={vertical}
        />
        <LabeledSlider
          label="Betrag der Bewegung"
          valueLabel={`${formatNumber(magnitude, 1)} mm/a`}
          min={0}
          max={MAX_MM}
          step={0.5}
          value={[magnitude]}
          onValueChange={([value]) => setMagnitude(value)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          checked={vertical}
          onCheckedChange={setVertical}
          label="Bewegung ist vertikal statt horizontal (Hebung)"
        />
        <Toggle
          checked={combine}
          onCheckedChange={setCombine}
          label="ASC + DSC kombinieren (2D-Zerlegung)"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
        <svg
          viewBox="0 0 220 220"
          role="img"
          aria-label="Kompass mit der eingestellten Bewegungsrichtung"
          className="w-full max-w-[220px] justify-self-center rounded-md border border-border bg-background"
        >
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="hsl(var(--border))" strokeWidth={1.2} />
          {/* Ost-West-Achse betont (das Radar sieht v. a. Ost-West + vertikal) */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          {[
            { label: "N", x: CX, y: CY - R - 6, anchor: "middle" as const },
            { label: "O", x: CX + R + 8, y: CY + 4, anchor: "middle" as const },
            { label: "S", x: CX, y: CY + R + 14, anchor: "middle" as const },
            { label: "W", x: CX - R - 8, y: CY + 4, anchor: "middle" as const },
          ].map((tickLabel) => (
            <text
              key={tickLabel.label}
              x={tickLabel.x}
              y={tickLabel.y}
              textAnchor={tickLabel.anchor}
              fontSize={11}
              fontWeight={700}
              className="fill-current text-muted-foreground"
            >
              {tickLabel.label}
            </text>
          ))}

          {vertical ? (
            <g>
              <circle cx={CX} cy={CY} r={9} fill="none" stroke={tokens.series.displacement} strokeWidth={2} />
              <circle cx={CX} cy={CY} r={2.5} fill={tokens.series.displacement} />
              <text x={CX} y={CY + 26} textAnchor="middle" fontSize={10} fontWeight={600} fill={tokens.series.displacement}>
                vertikal (Hebung)
              </text>
            </g>
          ) : (
            <g>
              <defs>
                <marker id="motion-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={tokens.series.displacement} />
                </marker>
              </defs>
              <line
                x1={CX}
                y1={CY}
                x2={tip.x}
                y2={tip.y}
                stroke={tokens.series.displacement}
                strokeWidth={2.4}
                markerEnd="url(#motion-arrow)"
              />
              <circle cx={CX} cy={CY} r={2.5} fill={tokens.series.displacement} />
            </g>
          )}
        </svg>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {results.map((result) => (
            <LosCard key={result.key} result={result} />
          ))}
        </div>
      </div>

      {nsBlind && (
        <div
          className="grid gap-1 rounded-md border px-3 py-2.5 text-xs"
          style={{ borderColor: tokens.reliability.low, backgroundColor: `${tokens.reliability.low}14` }}
        >
          <span className="font-semibold" style={{ color: tokens.reliability.low }}>
            Nord–Süd-Bewegung ist für das Radar fast unsichtbar
          </span>
          <span className="leading-relaxed text-muted-foreground">
            Beide Blickrichtungen projizieren diese Bewegung auf nahezu null — die Nord-Komponente
            der Blicklinie ist mit {formatNumber(salzburgTsx.losVersor.n, 3)} winzig. Eine reine
            Nord–Süd-Verschiebung bleibt deshalb prinzipiell ungemessen.
          </span>
        </div>
      )}

      {combine && (
        <div className="grid gap-1 rounded-md border border-border bg-secondary/60 px-3 py-2.5 text-xs">
          <span className="font-semibold text-foreground">ASC + DSC kombiniert → 2D</span>
          <span className="leading-relaxed text-muted-foreground">
            Zwei Blickrichtungen auf dasselbe Gebiet lassen sich zu zwei Komponenten zerlegen:
            vertikal und Ost–West. Weil die Punkte von ASC und DSC nicht deckungsgleich liegen,
            geschieht das in gemeinsamen Pseudozellen — TRE nennt „in general 100x100 m",
            AUGMENTERRA als Beispiel 10 × 10 m; die Rastergröße ist prozessierungsabhängig. Die
            Nord–Süd-Komponente bleibt auch dann unbestimmt (TRE §2.1.2, S. 19–20; AUG S. 12).
          </span>
        </div>
      )}
    </div>
  );
}
