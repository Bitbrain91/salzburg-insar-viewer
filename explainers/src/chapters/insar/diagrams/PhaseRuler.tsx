/**
 * Hero-Diagramm Kapitel „Phase" (Teil B·1): die Phase als Maßband.
 *
 * Rechenkern ausschließlich aus insarFacts (phaseFromDeltaRMm,
 * fringesFromDeltaRMm, fringeSpacingMm, wavelengthMm) — keine Zahl hier
 * hartkodiert außer Layout-Koordinaten. Kein setInterval/rAF: die Szene, das
 * Zifferblatt und der Fringe-Zähler leiten sich rein aus dem ΔR-Regler und
 * der Sensorwahl ab. Die Reflektor-Verschiebung ist bewusst stark überzeichnet
 * (Millimeter gegen 700 km Bahnhöhe) und als solche gekennzeichnet.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { Button, LabeledSlider } from "@/components/ui";
import { FormulaBox } from "@/components/FormulaBox";
import {
  fringeSpacingMm,
  fringesFromDeltaRMm,
  phaseFromDeltaRMm,
  sensors,
  wavelengthMm,
  type SensorId,
} from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { ScopeBadge, SensorSwitch, sensorColors } from "../insarUi";

/* Szene: Satellit oben, Reflektor unten, Sinuswelle auf dem Blickstrahl. */
const SW = 300;
const SH = 330;
const SAT = { x: 234, y: 48 };
const REF0 = { x: 92, y: 286 };
/** ΔR (Regler-Maximum 30 mm) → höchstens 40 px Versatz — stark überzeichnet. */
const DISP_PX_PER_MM = 40 / 30;
const WAVE_LAMBDA_PX = 24;
const WAVE_AMP_PX = 7;
const WAVE_STEPS = 96;

/* Phasen-Zifferblatt. */
const DIAL = { cx: 92, cy: 92, r: 66 };
const DIAL_W = 184;

const SIGNAL = tokens.series.displacement;

function fmtMm(value: number): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 1)} mm`;
}

export function PhaseRuler() {
  const [sensor, setSensor] = useState<SensorId>("s1");
  const [deltaR, setDeltaR] = useState(8);

  const lambdaMm = wavelengthMm(sensor);
  const phaseRad = phaseFromDeltaRMm(deltaR, sensor);
  const fringes = fringesFromDeltaRMm(deltaR, sensor);
  const twoPi = 2 * Math.PI;
  const residual = ((phaseRad % twoPi) + twoPi) % twoPi; // gewickelte Rest-Phase 0..2π
  const fullTurns = Math.trunc(fringes);
  const accent = sensorColors[sensor];

  // Reflektor-Position: + ΔR schiebt entgegen der Blickrichtung zum Satelliten.
  const beamDx0 = REF0.x - SAT.x;
  const beamDy0 = REF0.y - SAT.y;
  const beamLen0 = Math.hypot(beamDx0, beamDy0);
  const ux0 = beamDx0 / beamLen0;
  const uy0 = beamDy0 / beamLen0;
  const shiftPx = deltaR * DISP_PX_PER_MM;
  const ref = { x: REF0.x - ux0 * shiftPx, y: REF0.y - uy0 * shiftPx };

  // Sinuswelle entlang des aktuellen Strahls; Phasenoffset = Δφ (Zweiweg-Phase).
  const beamDx = ref.x - SAT.x;
  const beamDy = ref.y - SAT.y;
  const beamLen = Math.hypot(beamDx, beamDy);
  const ux = beamDx / beamLen;
  const uy = beamDy / beamLen;
  const perpX = -uy;
  const perpY = ux;
  const k = twoPi / WAVE_LAMBDA_PX;
  const wavePoints = Array.from({ length: WAVE_STEPS + 1 }, (_, i) => {
    const along = (i / WAVE_STEPS) * beamLen;
    const off = WAVE_AMP_PX * Math.sin(k * along + phaseRad);
    const x = SAT.x + ux * along + perpX * off;
    const y = SAT.y + uy * along + perpY * off;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Zifferblatt-Zeiger (0 = oben, im Uhrzeigersinn) und Sektor der Rest-Phase.
  const needle = {
    x: DIAL.cx + (DIAL.r - 12) * Math.sin(residual),
    y: DIAL.cy - (DIAL.r - 12) * Math.cos(residual),
  };
  const arcEnd = {
    x: DIAL.cx + DIAL.r * Math.sin(residual),
    y: DIAL.cy - DIAL.r * Math.cos(residual),
  };
  const largeArc = residual > Math.PI ? 1 : 0;
  const turnsAbs = Math.abs(fullTurns);
  const turnsText =
    turnsAbs === 0
      ? "kein voller Umlauf"
      : turnsAbs === 1
        ? "1 voller Umlauf"
        : `${formatNumber(turnsAbs, 0)} volle Umläufe`;
  const wedge =
    `M ${DIAL.cx} ${DIAL.cy} L ${DIAL.cx} ${DIAL.cy - DIAL.r} ` +
    `A ${DIAL.r} ${DIAL.r} 0 ${largeArc} 1 ${arcEnd.x.toFixed(1)} ${arcEnd.y.toFixed(1)} Z`;

  const quarterLabels = ["0", "λ/8", "λ/4", "3λ/8"];
  const showArrow = Math.abs(deltaR) >= 0.5;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      {/* Steuerung */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <SensorSwitch value={sensor} onChange={setSensor} />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(sensors) as SensorId[]).map((id) => (
              <Button
                key={id}
                size="sm"
                variant="outline"
                onClick={() => {
                  setSensor(id);
                  setDeltaR(fringeSpacingMm(id));
                }}
              >
                1 Fringe {sensors[id].name}
              </Button>
            ))}
          </div>
        </div>
        <ScopeBadge
          scope={sensor}
          detail={`${sensors[sensor].band}-Band · λ ${formatNumber(lambdaMm, 1)} mm`}
        />
      </div>

      <LabeledSlider
        label="Bewegung zum Satelliten ΔR (positiv = zum Satelliten)"
        valueLabel={fmtMm(deltaR)}
        min={-30}
        max={30}
        step={0.5}
        value={[deltaR]}
        onValueChange={([value]) => setDeltaR(value)}
      />

      {/* Szene + Zifferblatt */}
      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
        <svg
          viewBox={`0 0 ${SW} ${SH}`}
          role="img"
          aria-label="Satellit, Reflektor und Radarwelle auf dem Zweiweg-Pfad"
          className="w-full rounded-md border border-border bg-background"
        >
          <defs>
            <marker id="phaseRulerArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={SIGNAL} />
            </marker>
          </defs>

          {/* Boden */}
          <line
            x1={12}
            y1={REF0.y + 22}
            x2={SW - 12}
            y2={REF0.y + 22}
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
          />

          {/* Blickstrahl mit Sinuswelle */}
          <line
            x1={SAT.x}
            y1={SAT.y}
            x2={ref.x}
            y2={ref.y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.55}
          />
          <polyline points={wavePoints} fill="none" stroke={accent} strokeWidth={2} />
          <text
            x={(SAT.x + ref.x) / 2 + 20}
            y={(SAT.y + ref.y) / 2}
            fontSize={9.5}
            className="fill-current text-muted-foreground"
          >
            Zweiweg-Pfad
          </text>

          {/* Verschiebungspfeil ΔR */}
          {showArrow && (
            <line
              x1={REF0.x}
              y1={REF0.y}
              x2={ref.x + ux0 * 8}
              y2={ref.y + uy0 * 8}
              stroke={SIGNAL}
              strokeWidth={2}
              markerEnd="url(#phaseRulerArrow)"
            />
          )}

          {/* Ursprüngliche Reflektorlage (Geist) */}
          <rect
            x={REF0.x - 9}
            y={REF0.y - 9}
            width={18}
            height={18}
            rx={2}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.6}
          />
          {/* Aktueller Reflektor */}
          <rect
            x={ref.x - 9}
            y={ref.y - 9}
            width={18}
            height={18}
            rx={2}
            fill={SIGNAL}
            fillOpacity={0.2}
            stroke={SIGNAL}
            strokeWidth={2}
          />
          <text
            x={ref.x}
            y={ref.y + 32}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-current text-muted-foreground"
          >
            Reflektor
          </text>

          {/* Satellit */}
          <g transform={`translate(${SAT.x} ${SAT.y})`}>
            <Satellite
              width={26}
              height={26}
              x={-13}
              y={-13}
              className="text-foreground"
              strokeWidth={1.6}
            />
            <text y={-18} textAnchor="middle" fontSize={9.5} className="fill-current text-muted-foreground">
              Satellit
            </text>
          </g>
        </svg>

        {/* Phasen-Zifferblatt + Fringe-Zähler */}
        <div className="grid content-start gap-3">
          <svg
            viewBox={`0 0 ${DIAL_W} ${DIAL_W}`}
            role="img"
            aria-label="Phasen-Zifferblatt: Zeiger zeigt die Rest-Phase modulo 2π"
            className="mx-auto w-full max-w-[220px]"
          >
            <circle
              cx={DIAL.cx}
              cy={DIAL.cy}
              r={DIAL.r}
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
            />
            {/* Sektor der Rest-Phase */}
            <path d={wedge} fill={accent} fillOpacity={0.16} stroke="none" />
            {/* Viertel-Marken mit Distanz-Äquivalent */}
            {quarterLabels.map((label, i) => {
              const a = (i * Math.PI) / 2;
              const inner = DIAL.r - 6;
              const x1 = DIAL.cx + inner * Math.sin(a);
              const y1 = DIAL.cy - inner * Math.cos(a);
              const x2 = DIAL.cx + DIAL.r * Math.sin(a);
              const y2 = DIAL.cy - DIAL.r * Math.cos(a);
              const tx = DIAL.cx + (DIAL.r + 12) * Math.sin(a);
              const ty = DIAL.cy - (DIAL.r + 12) * Math.cos(a) + 3;
              return (
                <g key={label}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                  <text x={tx} y={ty} textAnchor="middle" fontSize={9} className="fill-current text-muted-foreground">
                    {label}
                  </text>
                </g>
              );
            })}
            {/* Zeiger */}
            <line
              x1={DIAL.cx}
              y1={DIAL.cy}
              x2={needle.x}
              y2={needle.y}
              stroke={accent}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={DIAL.cx} cy={DIAL.cy} r={4} fill={accent} />
          </svg>

          <div className="rounded-md border border-border bg-background px-3 py-2.5 text-center">
            <div className="font-mono text-2xl font-bold" style={{ color: accent }}>
              {formatNumber(fringes, 2)}
            </div>
            <div className="text-[11px] text-muted-foreground">Fringes ({turnsText})</div>
            <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              Rest-Phase mod 2π = {formatNumber(residual, 2)} rad
            </div>
          </div>
        </div>
      </div>

      <FormulaBox
        result="Δφ"
        operator="·"
        terms={[
          { factor: "4π /", name: "λ", color: accent },
          { name: "ΔR", color: SIGNAL },
        ]}
        note={
          <>
            Mit λ = {formatNumber(lambdaMm, 1)} mm ({sensors[sensor].name}) und ΔR = {fmtMm(deltaR)}:
            {" "}
            Δφ = {formatNumber(phaseRad, 2)} rad = {formatNumber(fringes, 2)} Fringes. Ein voller
            Fringe ist eine Wegänderung von λ/2 = {formatNumber(fringeSpacingMm(sensor), 1)} mm —
            deshalb dreht der Zeiger beim kurzwelligen TerraSAR-X pro Millimeter fast doppelt so
            schnell wie bei Sentinel-1.
          </>
        }
      />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Die Phase misst nur den Rest innerhalb einer halben Wellenlänge — die vollen Umläufe
        (Fringes) muss die Abwicklung rekonstruieren (Kapitel „Störanteile"). Der Reflektor-Versatz
        ist zur Sichtbarkeit stark überzeichnet: real sind es Millimeter gegen rund 700 km
        Bahnhöhe.
      </p>
    </div>
  );
}
