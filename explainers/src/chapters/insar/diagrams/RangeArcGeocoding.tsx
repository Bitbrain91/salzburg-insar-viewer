/**
 * Kapitel „Lage & Höhe", Diagramm 6.2: „Laufzeit ortet, die Höhe platziert".
 *
 * Kernbotschaft: Die GROBE absolute Ortung eines Punkts kommt nicht aus der
 * Phase, sondern aus der Puls-Laufzeit (Ranging, TRE §7 S.47) plus der
 * präzise bekannten Satellitenbahn. Sie legt aber nur eine Linie gleicher
 * Laufzeit fest — WO auf dieser Linie der Punkt auf der Karte landet,
 * entscheidet die Höhenannahme (Referenzfläche/Höhenmodell; AUG S.14:
 * Lagekoordinaten hängen von der Höhe ab). Eine falsche Höhe wird zum
 * Lageversatz ε/tanθ zum Sensor hin (Faustformel: Standardwissen,
 * FOOTNOTES.heightGeocodingCoupling).
 *
 * Visuelle Erzählung (drei benannte Elemente, damit der SCHNITT sichtbar
 * wird — Feedback 2026-07-22: „wo die Laufzeitlinie die Referenzfläche
 * schneidet" muss erkennbar sein):
 * 1. Linie gleicher Laufzeit (teal, gestrichelt) durch die Dachkante,
 * 2. Höhenannahme-Ebene (orange, gestrichelt, IMMER sichtbar; der Slider
 *    verschiebt sie — bei 0 m liegt sie auf der Referenzfläche),
 * 3. ihr Schnittpunkt = geokodierter Punkt (orange, mit Ring + Label).
 *
 * Zeichnung als Parallelstrahl-Querschnitt (Muster HeightPhaseCenter):
 * Bei ~600 km Schrägentfernung ist der Entfernungs-„Bogen" im Bildausschnitt
 * praktisch eine Gerade senkrecht zur Blickrichtung. Die Szene rechnet exakt
 * mit tanθ des Salzburger TSX-Einfallswinkels (REPORT S.2), damit Zeichnung
 * und Meter-Readout dieselbe Geometrie teilen. Beispielhöhe der Dachkante:
 * DIDAKTIK, keine Quellen-Zahl.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { LabeledSlider } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import { FOOTNOTES, groundShiftFromHeightErrorM, salzburgTsx } from "@/content/insarFacts";
import { formatDegrees, formatMeters } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { ScopeBadge } from "../insarUi";

const VIEW_W = 460;
const VIEW_H = 252;
const GROUND_Y = 198;
const PX_PER_M = 2.6;

/** Einfallswinkel der Szene = Salzburg-TSX (REPORT S.2); Prinzip allgemein. */
const THETA_DEG = salzburgTsx.thetaDeg;
const TAN_THETA = Math.tan((THETA_DEG * Math.PI) / 180);

/** DIDAKTIK: wahre Höhe der Dachkante über der Referenzfläche. */
const TRUE_HEIGHT_M = 25;

const FACADE_X = 300;
const BUILDING_RIGHT = 356;
const ROOF_Y = GROUND_Y - TRUE_HEIGHT_M * PX_PER_M;

const TRUE_COLOR = tokens.series.displacement;
const SHIFT_COLOR = tokens.reliability.medium;

/** x der Linie gleicher Laufzeit (⊥ zur Blickrichtung) auf Höhe y. */
function wavefrontX(y: number): number {
  return FACADE_X - (y - ROOF_Y) / TAN_THETA;
}

/** x eines abwärts laufenden Strahls (dx/dy = tanθ) durch (px,py) auf Höhe y. */
function rayX(px: number, py: number, y: number): number {
  return px + TAN_THETA * (y - py);
}

/** Radar sitzt am Anfang des Echo-Strahls zur Dachkante. */
const SAT = { x: rayX(FACADE_X, ROOF_Y, 26), y: 26 };
const RAY_START = { x: rayX(FACADE_X, ROOF_Y, 42), y: 42 };

/** Endpunkte der Linie gleicher Laufzeit (deckt alle Slider-Stellungen ab). */
const FRONT_TOP = { y: ROOF_Y - 56, x: wavefrontX(ROOF_Y - 56) };
const FRONT_BOTTOM = { y: GROUND_Y, x: wavefrontX(GROUND_Y) };

const LEGEND = [
  { kind: "dot" as const, color: TRUE_COLOR, label: "Dachkante: wahrer Streuer" },
  { kind: "ring" as const, color: SHIFT_COLOR, label: "Schnittpunkt = geokodierter Punkt" },
  { kind: "dash" as const, color: TRUE_COLOR, label: "Linie gleicher Laufzeit" },
  { kind: "dash" as const, color: SHIFT_COLOR, label: "Höhenannahme (aus dem Höhenmodell)" },
];

export function RangeArcGeocoding() {
  const [assumedM, setAssumedM] = useState(0);

  const epsM = TRUE_HEIGHT_M - assumedM;
  const shiftM = groundShiftFromHeightErrorM(epsM, THETA_DEG);
  const matches = Math.abs(epsM) < 1;
  const pointColor = matches ? TRUE_COLOR : SHIFT_COLOR;

  /** Schnittpunkt: Linie gleicher Laufzeit × Höhenannahme-Ebene. */
  const pointY = GROUND_Y - assumedM * PX_PER_M;
  const pointX = wavefrontX(pointY);

  /** Höhenannahme-Label: über der Ebene, nahe am Boden darunter. */
  const planeLabelBelow = assumedM * PX_PER_M < 14;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope="allgemein" detail="Prinzip" />
        <ScopeBadge scope="tsx" detail={`θ = ${formatDegrees(THETA_DEG)}`} />
        <span className="text-[11px] text-muted-foreground">
          Szene rechnet mit dem Salzburger TSX-Einfallswinkel — das Prinzip gilt für jedes SAR.
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Querschnitt: Die gestrichelte Linie gleicher Laufzeit wird mit der orangefarbenen Höhenannahme-Ebene geschnitten; der Schnittpunkt ist der geokodierte Punkt und wandert mit der Höhenannahme."
        className="w-full rounded-md border border-border bg-background"
      >
        <defs>
          <marker id="rag-muted" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
          </marker>
          <marker id="rag-shift" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 Z" fill={SHIFT_COLOR} />
          </marker>
        </defs>

        {/* Radar am Anfang des Echo-Wegs */}
        <g transform={`translate(${SAT.x} ${SAT.y})`}>
          <Satellite width={20} height={20} x={-10} y={-10} className="text-foreground" strokeWidth={1.6} />
          <text x={-14} y={4} textAnchor="end" fontSize={8.5} className="fill-muted-foreground">
            Radar
          </text>
        </g>

        {/* Echo-Weg (dezent): misst nur die Laufzeit */}
        <line
          x1={RAY_START.x}
          y1={RAY_START.y}
          x2={FACADE_X}
          y2={ROOF_Y}
          className="stroke-muted-foreground"
          strokeWidth={1.2}
          markerEnd="url(#rag-muted)"
          opacity={0.7}
        />
        <text
          x={(RAY_START.x + FACADE_X) / 2 - 8}
          y={(RAY_START.y + ROOF_Y) / 2 - 2}
          textAnchor="end"
          fontSize={8}
          className="fill-muted-foreground"
        >
          Echo-Weg: Laufzeit → Entfernung
        </text>

        {/* Referenzfläche (Label darunter — oberhalb wandern Schnittpunkt und Ebene) */}
        <line x1={8} y1={GROUND_Y} x2={VIEW_W - 8} y2={GROUND_Y} className="stroke-border" strokeWidth={1.6} />
        <text x={12} y={GROUND_Y + 12} fontSize={8.5} className="fill-muted-foreground">
          Referenzfläche (Höhenmodell / Ellipsoid)
        </text>

        {/* Gebäude mit Dachkante (wahrer Streuer) */}
        <rect
          x={FACADE_X}
          y={ROOF_Y}
          width={BUILDING_RIGHT - FACADE_X}
          height={GROUND_Y - ROOF_Y}
          className="fill-foreground stroke-foreground"
          fillOpacity={0.06}
          strokeWidth={1.4}
        />
        <line x1={FACADE_X} y1={ROOF_Y} x2={BUILDING_RIGHT} y2={ROOF_Y} className="stroke-foreground" strokeWidth={2} />

        {/* 1. Linie gleicher Laufzeit durch die Dachkante */}
        <line
          x1={FRONT_TOP.x}
          y1={FRONT_TOP.y}
          x2={FRONT_BOTTOM.x}
          y2={FRONT_BOTTOM.y}
          stroke={TRUE_COLOR}
          strokeWidth={1.6}
          strokeDasharray="6 4"
          opacity={0.9}
        />
        <text x={FRONT_TOP.x + 8} y={FRONT_TOP.y + 9} fontSize={8.5} fontWeight={600} fill={TRUE_COLOR}>
          Linie gleicher Laufzeit
        </text>

        {/* Wahrer Streuer + Grundriss-Lot */}
        <circle cx={FACADE_X} cy={ROOF_Y} r={4.5} fill={TRUE_COLOR} stroke="white" strokeWidth={1.5} />
        <text x={FACADE_X + 12} y={ROOF_Y - 12} fontSize={8.5} fontWeight={600} fill={TRUE_COLOR}>
          Dachkante (wahr)
        </text>
        <line
          x1={FACADE_X}
          y1={ROOF_Y}
          x2={FACADE_X}
          y2={GROUND_Y}
          className="stroke-muted-foreground"
          strokeWidth={0.9}
          strokeDasharray="2 3"
          opacity={0.7}
        />

        {/* 2. Höhenannahme-Ebene (immer sichtbar; Slider verschiebt sie) */}
        <line
          x1={16}
          y1={pointY}
          x2={VIEW_W - 16}
          y2={pointY}
          stroke={SHIFT_COLOR}
          strokeWidth={1.3}
          strokeDasharray="5 4"
          opacity={0.9}
          className="transition-all duration-300"
        />
        <text
          x={VIEW_W - 16}
          y={planeLabelBelow ? pointY + 13 : pointY - 5}
          textAnchor="end"
          fontSize={8.5}
          fontWeight={600}
          fill={SHIFT_COLOR}
          className="transition-all duration-300"
        >
          Höhenannahme {formatMeters(assumedM, 0)}
          {assumedM === 0 ? " (= Referenzfläche)" : ""}
        </text>

        {/* 3. Schnittpunkt = geokodierter Punkt (Ring + Label) */}
        <line
          x1={pointX}
          y1={pointY}
          x2={pointX}
          y2={GROUND_Y}
          stroke={SHIFT_COLOR}
          strokeWidth={0.9}
          strokeDasharray="2 3"
          opacity={matches || assumedM === 0 ? 0 : 0.8}
          className="transition-all duration-300"
        />
        <circle
          cx={pointX}
          cy={pointY}
          r={8}
          fill="none"
          stroke={pointColor}
          strokeWidth={1.5}
          className="transition-all duration-300"
        />
        <circle
          cx={pointX}
          cy={pointY}
          r={4.5}
          fill={pointColor}
          stroke="white"
          strokeWidth={1.5}
          className="transition-all duration-300"
        />
        <text
          x={pointX - 14}
          y={pointY - 10}
          textAnchor="end"
          fontSize={8.5}
          fontWeight={600}
          fill={pointColor}
          className="transition-all duration-300"
        >
          {matches ? "geokodierter Punkt" : "Schnittpunkt: geokodierter Punkt"}
        </text>

        {/* Lageversatz auf der Karte */}
        {!matches && (
          <g className="transition-all duration-300">
            <line
              x1={pointX}
              y1={GROUND_Y + 14}
              x2={FACADE_X}
              y2={GROUND_Y + 14}
              stroke={SHIFT_COLOR}
              strokeWidth={1.4}
              markerStart="url(#rag-shift)"
              markerEnd="url(#rag-shift)"
            />
            <text
              x={(pointX + FACADE_X) / 2}
              y={GROUND_Y + 26}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight={600}
              fill={SHIFT_COLOR}
            >
              Lageversatz {formatMeters(Math.abs(shiftM), 1)}
            </text>
          </g>
        )}
      </svg>

      {/* Legende der Bildelemente */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        {LEGEND.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5 text-muted-foreground">
            {item.kind === "dot" && (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            )}
            {item.kind === "ring" && (
              <span
                className="h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
                style={{ borderColor: item.color }}
              />
            )}
            {item.kind === "dash" && (
              <span
                className="h-0 w-4 shrink-0 border-t-2 border-dashed"
                style={{ borderColor: item.color }}
              />
            )}
            {item.label}
          </li>
        ))}
      </ul>

      <LabeledSlider
        label="Höhenannahme für diese Zelle (liefert das Höhenmodell)"
        valueLabel={formatMeters(assumedM, 0)}
        min={0}
        max={40}
        step={1}
        value={[assumedM]}
        onValueChange={([value]) => setAssumedM(value)}
      />

      <FindingCard
        tone={matches ? "neutral" : "warning"}
        label={
          matches
            ? "Höhenannahme trifft die Dachkante — der Schnittpunkt sitzt am richtigen Ort"
            : `Höhe um ${formatMeters(Math.abs(epsM), 0)} ${epsM > 0 ? "zu niedrig" : "zu hoch"} angenommen → Punkt landet ${formatMeters(Math.abs(shiftM), 1)} daneben`
        }
        detail={
          matches
            ? "Die Geokodierung schneidet die Linie gleicher Laufzeit mit der Höhenannahme-Ebene — stimmt die Höhe, liegt der Schnittpunkt genau auf der Dachkante. Die Feinhöhe je Punkt liefert erst der Bildstapel (Diagramm 6.3)."
            : `Gleiche Laufzeit, andere Höhenannahme: Der Schnittpunkt rutscht auf der Laufzeit-Linie ${shiftM > 0 ? "zum Sensor hin" : "vom Sensor weg"}. Höhen- und Lagefehler sind über ε/tanθ gekoppelt — genau deshalb schätzt die Verarbeitung die Höhe je Punkt nach (Diagramm 6.3).`
        }
      />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Handbuch-Basis: Laufzeit ortet in Entfernung („ranging", TRE §7 S. 47); die
        Lagekoordinaten hängen von der Höhe des Punkts ab (AUG S. 14). Die Faustformel
        Lageversatz ≈ ε/tanθ und die Darstellung des Entfernungs-„Bogens" als Gerade (bei
        ~600 km Entfernung) sind SAR-Standardwissen über die Projekt-Handbücher hinaus —{" "}
        {FOOTNOTES.heightGeocodingCoupling}
      </p>
    </div>
  );
}
