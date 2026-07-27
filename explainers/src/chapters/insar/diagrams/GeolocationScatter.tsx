/**
 * Hero-Diagramm Kapitel „Lage & Höhe": Draufsicht auf ein echtes Gebäude mit
 * der sensorabhängigen Geolokalisierungs-Streuung.
 *
 * Korrektheitsanker: die 1σ-/2σ-Ellipsen sind exakt geoAccuracy1Sigma[sensor]
 * (Nord = vertikale Halbachse, Ost = horizontale Halbachse) — der Kontrast
 * TSX (1×3 m) gegen Sentinel-1 (8×12 m) ist die Kernbotschaft. Die ~24
 * Beispielpunkte sind dieselben deterministischen Einheits-Ziehungen
 * (scatterUnitOffsets) für beide Sensoren, nur mit den jeweiligen σ-Werten
 * skaliert — kein Math.random(). Alle Zahlen aus insarFacts.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { Toggle } from "@/components/ui";
import {
  FOOTNOTES,
  geoAccuracy1Sigma,
  scatterUnitOffsets,
  type SensorId,
} from "@/content/insarFacts";
import { formatMeters } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";
import { ConditionsNote, goToAnchor, ScopeBadge, SensorSwitch, sensorColors } from "../insarUi";

const SCALE = 7.5; // px pro Meter (Draufsicht, fester Maßstab für den Kontrast)
const VIEW_W = 640;
const VIEW_H = 420;
const ORIGIN_X = 300; // Bildkoordinate des wahren Reflektorpunkts (Ost = 0)
const ORIGIN_Y = 210; // Bildkoordinate des wahren Reflektorpunkts (Nord = 0)

/** Weltkoordinaten (Ost = +x rechts, Nord = +y oben) → Bildkoordinaten. */
const toPx = (eastM: number, northM: number) => ({
  x: ORIGIN_X + eastM * SCALE,
  y: ORIGIN_Y - northM * SCALE,
});

/** Wahres Gebäude (Grundriss) — der Reflektor sitzt an seiner Südost-Ecke. */
const BUILDING = { eastMin: -13, eastMax: 1, northMin: -3, northMax: 11 };
/** Straße als Maßstabsreferenz, südlich des Gebäudes. */
const STREET = { eastMin: -30, eastMax: 40, northMin: -13, northMax: -6 };
const SCALE_BAR_M = 10;

export function GeolocationScatter() {
  const [sensor, setSensor] = useState<SensorId>("tsx");
  const [show2Sigma, setShow2Sigma] = useState(false);
  const [showLayover, setShowLayover] = useState(false);
  const [showFootnote, setShowFootnote] = useState(false);

  const sigma = geoAccuracy1Sigma[sensor];
  const color = sensorColors[sensor];

  const buildingTopLeft = toPx(BUILDING.eastMin, BUILDING.northMax);
  const buildingSize = {
    w: (BUILDING.eastMax - BUILDING.eastMin) * SCALE,
    h: (BUILDING.northMax - BUILDING.northMin) * SCALE,
  };
  const streetTopLeft = toPx(STREET.eastMin, STREET.northMax);
  const streetSize = {
    w: (STREET.eastMax - STREET.eastMin) * SCALE,
    h: (STREET.northMax - STREET.northMin) * SCALE,
  };

  const reflector = toPx(0, 0);
  const scatter = scatterUnitOffsets.map((offset, index) => ({
    id: index,
    ...toPx(offset.x * sigma.eastM, offset.y * sigma.northM),
  }));

  // Satellit oben rechts; der Layover-Pfeil zeigt vom Reflektor dorthin.
  const sat = { x: VIEW_W - 46, y: 40 };
  const satDir = (() => {
    const dx = sat.x - reflector.x;
    const dy = sat.y - reflector.y;
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  })();
  const layoverLen = 62;
  const layoverTip = {
    x: reflector.x + satDir.x * layoverLen,
    y: reflector.y + satDir.y * layoverLen,
  };

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SensorSwitch value={sensor} onChange={setSensor} />
        <ScopeBadge scope={sensor} detail="Geokodierung 1σ" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle
          checked={show2Sigma}
          onCheckedChange={setShow2Sigma}
          label="2σ-Ellipse zusätzlich zeigen"
          className="sm:max-w-[19rem]"
        />
        <Toggle
          checked={showLayover}
          onCheckedChange={setShowLayover}
          label="Systematischen Layover-Versatz zeigen"
          className="sm:max-w-[19rem]"
        />
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Draufsicht: wahres Gebäude mit sensorabhängiger Streuung der geschätzten Punktlage"
        className="w-full rounded-md border border-border bg-background"
      >
        {/* Straße als Maßstabsreferenz */}
        <rect
          x={streetTopLeft.x}
          y={streetTopLeft.y}
          width={streetSize.w}
          height={streetSize.h}
          fill="hsl(var(--muted))"
        />
        <line
          x1={streetTopLeft.x}
          y1={streetTopLeft.y + streetSize.h / 2}
          x2={streetTopLeft.x + streetSize.w}
          y2={streetTopLeft.y + streetSize.h / 2}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.2}
          strokeDasharray="10 8"
          opacity={0.7}
        />
        <text
          x={streetTopLeft.x + 8}
          y={streetTopLeft.y + streetSize.h - 6}
          fontSize={9.5}
          className="fill-current text-muted-foreground"
        >
          Straße (Maßstabsreferenz)
        </text>

        {/* Gebäudegrundriss */}
        <rect
          x={buildingTopLeft.x}
          y={buildingTopLeft.y}
          width={buildingSize.w}
          height={buildingSize.h}
          fill="hsl(156 14% 11% / 0.08)"
          stroke="hsl(156 14% 11%)"
          strokeWidth={1.6}
        />
        <text
          x={buildingTopLeft.x + 8}
          y={buildingTopLeft.y + 16}
          fontSize={11}
          fontWeight={600}
          className="fill-current text-foreground"
        >
          wahres Gebäude
        </text>

        {/* 2σ-Ellipse (optional) */}
        {show2Sigma && (
          <ellipse
            cx={reflector.x}
            cy={reflector.y}
            rx={sigma.eastM * 2 * SCALE}
            ry={sigma.northM * 2 * SCALE}
            fill={color}
            fillOpacity={0.07}
            stroke={color}
            strokeWidth={1.2}
            strokeDasharray="6 5"
            opacity={0.8}
          />
        )}
        {/* 1σ-Ellipse (Ost = horizontale Halbachse, Nord = vertikale Halbachse) */}
        <ellipse
          cx={reflector.x}
          cy={reflector.y}
          rx={sigma.eastM * SCALE}
          ry={sigma.northM * SCALE}
          fill={color}
          fillOpacity={0.15}
          stroke={color}
          strokeWidth={1.6}
        />

        {/* Beispielpunkte (dieselben Ziehungen für beide Sensoren) */}
        {scatter.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={2.8}
            fill={color}
            fillOpacity={0.85}
          />
        ))}

        {/* Wahrer Reflektorpunkt */}
        <g>
          <line
            x1={reflector.x - 9}
            y1={reflector.y}
            x2={reflector.x + 9}
            y2={reflector.y}
            stroke="hsl(156 14% 11%)"
            strokeWidth={1.4}
          />
          <line
            x1={reflector.x}
            y1={reflector.y - 9}
            x2={reflector.x}
            y2={reflector.y + 9}
            stroke="hsl(156 14% 11%)"
            strokeWidth={1.4}
          />
          <circle
            cx={reflector.x}
            cy={reflector.y}
            r={3.5}
            fill="hsl(156 14% 11%)"
          />
        </g>

        {/* Systematischer Layover-Versatz (klickbar → Kapitel Geometrie) */}
        {showLayover && (
          <g
            role="button"
            tabIndex={0}
            aria-label="Zum Kapitel Schrägsicht-Effekte springen"
            className="cursor-pointer"
            onClick={() => goToAnchor("insar-geometrie")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") goToAnchor("insar-geometrie");
            }}
          >
            <defs>
              <marker
                id="layover-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill={tokens.reliability.low} />
              </marker>
            </defs>
            <line
              x1={reflector.x}
              y1={reflector.y}
              x2={layoverTip.x}
              y2={layoverTip.y}
              stroke={tokens.reliability.low}
              strokeWidth={2}
              markerEnd="url(#layover-arrow)"
            />
            <circle
              cx={layoverTip.x}
              cy={layoverTip.y}
              r={4}
              fill="none"
              stroke={tokens.reliability.low}
              strokeWidth={1.6}
            />
            <text
              x={layoverTip.x + 8}
              y={layoverTip.y - 4}
              fontSize={9.5}
              fontWeight={600}
              fill={tokens.reliability.low}
            >
              Layover-Versatz → Kap. 7
            </text>
          </g>
        )}

        {/* Satellit */}
        <g transform={`translate(${sat.x} ${sat.y})`}>
          <Satellite width={20} height={20} x={-10} y={-10} className="text-foreground" strokeWidth={1.6} />
          <text y={22} textAnchor="middle" fontSize={9} className="fill-current text-muted-foreground">
            Sensor
          </text>
        </g>

        {/* Achsen-Legende oben links */}
        <g transform="translate(42 62)">
          <line x1={0} y1={0} x2={0} y2={-30} stroke="hsl(var(--muted-foreground))" strokeWidth={1.4} markerEnd="url(#axis-arrow)" />
          <line x1={0} y1={0} x2={30} y2={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.4} markerEnd="url(#axis-arrow)" />
          <defs>
            <marker id="axis-arrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="hsl(var(--muted-foreground))" />
            </marker>
          </defs>
          <text x={-3} y={-34} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-current text-muted-foreground">
            N
          </text>
          <text x={38} y={4} fontSize={10} fontWeight={600} className="fill-current text-muted-foreground">
            O
          </text>
        </g>

        {/* Maßstabsbalken unten rechts */}
        <g transform={`translate(${VIEW_W - SCALE_BAR_M * SCALE - 24} ${VIEW_H - 22})`}>
          <line x1={0} y1={0} x2={SCALE_BAR_M * SCALE} y2={0} stroke="hsl(156 14% 11%)" strokeWidth={2} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="hsl(156 14% 11%)" strokeWidth={2} />
          <line x1={SCALE_BAR_M * SCALE} y1={-4} x2={SCALE_BAR_M * SCALE} y2={4} stroke="hsl(156 14% 11%)" strokeWidth={2} />
          <text x={SCALE_BAR_M * SCALE / 2} y={-7} textAnchor="middle" fontSize={9.5} className="fill-current text-foreground">
            {formatMeters(SCALE_BAR_M, 0)}
          </text>
        </g>
      </svg>

      {/* Lese-Legende: was ist was? */}
      <div className="grid gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
              <line x1={6} y1={1} x2={6} y2={11} stroke="hsl(156 14% 11%)" strokeWidth={2} />
              <line x1={1} y1={6} x2={11} y2={6} stroke="hsl(156 14% 11%)" strokeWidth={2} />
            </svg>
            <span>
              <span className="font-semibold text-foreground">wahre Position</span> des Reflektors
              (ein einziger Ort)
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>
              <span className="font-semibold text-foreground">mögliche gemessene Positionen</span>{" "}
              (24 Beispiel-Ziehungen mit der dokumentierten Streuung)
            </span>
          </span>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          So liest du das Diagramm: Ein Objekt, viele mögliche Koordinaten — dein Datensatz
          enthält genau eine davon, irgendwo in dieser Wolke.
        </p>
      </div>

      {/* Legende der aktiven σ-Werte + Ost-Fußnote */}
      <div className="grid gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">
              1σ-Präzision je Achse: Nord{" "}
              <span className="font-mono font-semibold text-foreground">±{formatMeters(sigma.northM)}</span>, Ost{" "}
              <span className="font-mono font-semibold text-foreground">±{formatMeters(sigma.eastM)}</span>
            </span>
          </span>
          <button
            type="button"
            aria-expanded={showFootnote}
            onClick={() => setShowFootnote((value) => !value)}
            className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Ost-Wert: Quellenhinweis ¹
          </button>
        </div>
        {showFootnote && (
          <p className="leading-relaxed text-muted-foreground">{FOOTNOTES.s1EastAccuracy}</p>
        )}
      </div>

      <ConditionsNote variant="geo" />
    </div>
  );
}
