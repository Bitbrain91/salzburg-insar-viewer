/**
 * Kapitel „Geometrie“, Diagramm 7.1: Schrägsicht-Projektion (Layover) am
 * Geländeprofil — jetzt mit wandernden PUNKTEN statt reiner Flächenfärbung.
 *
 * Korrektheitsanker: Die Zonen (normal / Foreshortening / Layover / Schatten)
 * kommen ausschließlich aus slantMapping(slope, θ) aus insarFacts — der Hang
 * über den Slider, das Hochhaus über einen festen Steilwinkel. Die
 * θ-Markierungen sind salzburgTsx.thetaDeg und sensors[x].thetaDegRange.
 *
 * Neu: Auf der Oberfläche liegen Boden-Marker; die Ground-Range-Skala darunter
 * zeigt, WOHIN jeder Marker abgebildet wird. Ein um h erhöhter Punkt rückt um
 * h·cot(θ) zum Sensor — daraus werden sichtbar: Stauchung (Foreshortening),
 * Reihenfolge-Umkehr (Layover, „Nummern rückwärts“) und fehlende Punkte
 * (Schatten). Kein Math.random(), nur useState + SVG.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { LabeledSlider } from "@/components/ui";
import {
  salzburgTsx,
  sensors,
  slantMapping,
  slantZoneLabels,
  type SensorId,
  type SlantZone,
} from "@/content/insarFacts";
import { formatDegrees } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { ScopeBadge, sensorColors } from "../insarUi";

const VIEW_W = 600;
const VIEW_H = 380;
const GROUND_Y = 210;

const HILL = { x0: 130, x1: 250 };
const HILL_HEIGHT_CAP = 140; // px — hält den Apex im sichtbaren Bereich
const BUILDING = { x0: 380, x1: 412, topY: 110 };
const BUILDING_SLOPE_DEG = 82; // Hochhaus: nahezu senkrecht
const BUILDING_CX = (BUILDING.x0 + BUILDING.x1) / 2;

const THETA_MIN = 20;
const THETA_MAX = 55;

// Ground-Range-Skala („Karte“) unter der Szene
const BAND_Y = 294;
const BAND_H = 30;
const DOT_Y = 309; // Höhe der projizierten Punkte
const ARROW_Y = 340; // Maßpfeil „Layover-Versatz“
const EDGE_L = 8;
const EDGE_R = VIEW_W - 8;

const ZONE_COLOR: Record<SlantZone, string> = {
  normal: tokens.reliability.unknown,
  foreshortening: tokens.clusterRole.insufficientSupport,
  layover: tokens.reliability.low,
  shadow: "hsl(var(--muted-foreground))",
};

const ZONE_EXPLAIN: Record<SlantZone, string> = {
  normal:
    "Der Hang ist flach genug und dem Radar nicht abgewandt — er wird weitgehend unverzerrt abgebildet.",
  foreshortening:
    "Der zugewandte Hang ist flacher als der Einfallswinkel: viele Bodenpunkte fallen in wenige Zellen, der Hang erscheint gestaucht und hell.",
  layover:
    "Der zugewandte Hang ist steiler als der Einfallswinkel — Hangfuß und Oberkante vertauschen die Reihenfolge, Berg- und Gebäudespitzen kippen zum Sensor.",
  shadow:
    "Der abgewandte Hang ist steiler als (90° − θ): das Radar beleuchtet ihn nicht, dort entstehen keine Messpunkte.",
};

// Was auf der Skala mit den PUNKTEN geschieht — je Zone ein Satz.
const ZONE_POINTS: Record<SlantZone, string> = {
  normal:
    "Die Marker fallen senkrecht auf die Skala: Szenen-Position und Ground Range stimmen überein.",
  foreshortening:
    "Die Hangmarker rücken auf der Skala zusammen — gleicher Bodenweg, weniger Range: der Hang wird gestaucht.",
  layover:
    "Die oberen Hangmarker überholen die unteren; auf der Skala kippt die Reihenfolge (Nummern rückwärts) und Punkte fallen zusammen.",
  shadow:
    "Die Hangmarker werden nicht beleuchtet und tauchen gar nicht erst auf der Skala auf — kein Signal.",
};

const thetaPct = (theta: number) => ((theta - THETA_MIN) / (THETA_MAX - THETA_MIN)) * 100;

/**
 * Ground-Range-Position eines Szenenpunkts (Layout-Mathematik, keine
 * Facts-Zahl). Bei parallelen Strahlen unter Einfallswinkel θ bildet das Radar
 * nach Schrägentfernung ab. Ein um h erhöhter Punkt (x = horizontal, weg vom
 * Sensor) erscheint auf der Karte um h·cot(θ) zum Sensor verschoben:
 *   Ground Range = x − h·cot(θ).
 * x und h in SVG-px; θ in Grad.
 */
function groundRangeX(x: number, h: number, thetaDeg: number): number {
  return x - h / Math.tan((thetaDeg * Math.PI) / 180);
}

const clampX = (x: number) => Math.min(EDGE_R, Math.max(EDGE_L, x));

export function LayoverPlayground() {
  const [slopeDeg, setSlopeDeg] = useState(30);
  const [thetaDeg, setThetaDeg] = useState(42);

  const hillZone = slantMapping(slopeDeg, thetaDeg);
  const buildingZone = slantMapping(BUILDING_SLOPE_DEG, thetaDeg);
  const hillInShadow = hillZone === "shadow";
  // Zarte Tönung der Karte: Hex-Token bekommen Alpha, der Schatten-CSS-Var-Wert
  // nicht (sonst entsteht ungültiges CSS).
  const hillTint = hillInShadow ? "hsl(var(--muted))" : `${ZONE_COLOR[hillZone]}14`;

  const rad = (thetaDeg * Math.PI) / 180;
  const cotTheta = 1 / Math.tan(rad);
  const dir = { x: Math.sin(rad), y: Math.cos(rad) };

  // Geländeprofil: Apex rechts (zugewandt, slope ≥ 0) oder links (abgewandt).
  const runPx = HILL.x1 - HILL.x0;
  const rawH = runPx * Math.tan((Math.abs(slopeDeg) * Math.PI) / 180);
  const hillH = Math.min(rawH, HILL_HEIGHT_CAP);
  const apexY = GROUND_Y - hillH;
  const hillPoints =
    slopeDeg >= 0
      ? `${HILL.x0},${GROUND_Y} ${HILL.x1},${apexY} ${HILL.x1},${GROUND_Y}`
      : `${HILL.x0},${GROUND_Y} ${HILL.x0},${apexY} ${HILL.x1},${GROUND_Y}`;

  // Radarstrahlen (parallel, Einfallswinkel θ zur Senkrechten)
  const rayLen = (GROUND_Y - 15) / dir.y;
  const rays = [30, 110, 190, 270].map((startX) => ({
    x1: startX,
    y1: 15,
    x2: startX + dir.x * rayLen,
    y2: 15 + dir.y * rayLen,
  }));

  // Boden-Marker auf flachem Gelände (~alle 40 px), Hügel-Inneres und
  // Hochhaus-Grundriss ausgespart (die bekommen eigene Marker).
  const flatMarkers: number[] = [];
  for (let x = 20; x <= VIEW_W - 20; x += 40) {
    if (x > HILL.x0 && x < HILL.x1) continue;
    if (x >= BUILDING.x0 - 6 && x <= BUILDING.x1 + 6) continue;
    flatMarkers.push(x);
  }

  // Fünf Marker entlang der Hangflanke, nummeriert 1…5 (Fuß → Spitze bei
  // zugewandtem Hang). Höhe wächst richtungsabhängig.
  const hillMarkers = [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
    const x = HILL.x0 + runPx * t;
    const frac = slopeDeg >= 0 ? t : 1 - t;
    const h = hillH * frac;
    return { x, y: GROUND_Y - h, h, n: i + 1 };
  });

  // Hochhaus: Fuß (Grund) und Dach (Höhe) an derselben x-Position.
  const roofH = GROUND_Y - BUILDING.topY;
  const footProjX = groundRangeX(BUILDING_CX, 0, thetaDeg); // = BUILDING_CX
  const roofProjRaw = groundRangeX(BUILDING_CX, roofH, thetaDeg);
  const roofProjX = clampX(roofProjRaw);
  const roofOffMap = roofProjRaw < EDGE_L;
  const buildingColor = ZONE_COLOR[buildingZone];

  // Zonen-Hintergrund der Skala (dezent, wie bisher) — dient der Orientierung.
  const bandSections: Array<{ x0: number; x1: number; zone: SlantZone }> = [
    { x0: 0, x1: HILL.x0, zone: "normal" },
    { x0: HILL.x0, x1: HILL.x1, zone: hillZone },
    { x0: HILL.x1, x1: BUILDING.x0, zone: "normal" },
    { x0: BUILDING.x0, x1: BUILDING.x1, zone: buildingZone },
    { x0: BUILDING.x1, x1: VIEW_W, zone: "normal" },
  ];

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledSlider
          label="Hangneigung (+ zugewandt · − abgewandt)"
          valueLabel={`${slopeDeg > 0 ? "+" : ""}${formatDegrees(slopeDeg, 0)}`}
          min={-45}
          max={60}
          step={1}
          value={[slopeDeg]}
          onValueChange={([value]) => setSlopeDeg(value)}
        />
        <div className="grid gap-1">
          <LabeledSlider
            label="Einfallswinkel θ"
            valueLabel={formatDegrees(thetaDeg, 0)}
            min={THETA_MIN}
            max={THETA_MAX}
            step={1}
            value={[thetaDeg]}
            onValueChange={([value]) => setThetaDeg(value)}
          />
          {/* θ-Markierungen: Sensor-Spannen + Salzburg-TSX */}
          <div className="relative mt-1 h-7">
            {(["s1", "tsx"] as SensorId[]).map((id, index) => {
              const [lo, hi] = sensors[id].thetaDegRange;
              const left = thetaPct(Math.max(lo, THETA_MIN));
              const right = thetaPct(Math.min(hi, THETA_MAX));
              return (
                <div
                  key={id}
                  className="absolute h-1.5 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${right - left}%`,
                    top: index * 7,
                    backgroundColor: sensorColors[id],
                    opacity: 0.55,
                  }}
                  title={`${sensors[id].name}: θ ${lo}–${hi}°`}
                />
              );
            })}
            <div
              className="absolute top-0 h-4 w-px"
              style={{ left: `${thetaPct(salzburgTsx.thetaDeg)}%`, backgroundColor: sensorColors.tsx }}
            />
            <div
              className="absolute whitespace-nowrap text-[9px] font-mono text-muted-foreground"
              style={{ left: `${thetaPct(salzburgTsx.thetaDeg)}%`, top: 15, transform: "translateX(-50%)" }}
            >
              TSX {formatDegrees(salzburgTsx.thetaDeg)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            {(["s1", "tsx"] as SensorId[]).map((id) => (
              <span key={id} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sensorColors[id] }} />
                {sensors[id].name} θ {sensors[id].thetaDegRange[0]}–{sensors[id].thetaDegRange[1]}°
              </span>
            ))}
            <ScopeBadge scope="tsx" detail="Salzburg Track 93" />
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Geländeprofil mit Boden-Markern und deren Projektion auf die Ground-Range-Skala (Foreshortening, Layover, Schatten)"
        className="w-full rounded-md border border-border bg-background"
      >
        {/* Radarstrahlen (parallel, θ zur Senkrechten) */}
        {rays.map((ray, index) => (
          <line
            key={index}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.4}
          />
        ))}

        {/* Szene: Boden, Hügel, Hochhaus */}
        <line x1={0} y1={GROUND_Y} x2={VIEW_W} y2={GROUND_Y} stroke="hsl(156 14% 11%)" strokeWidth={1.4} />
        <polygon
          points={hillPoints}
          fill={ZONE_COLOR[hillZone]}
          fillOpacity={hillInShadow ? 0.35 : 0.5}
          stroke="hsl(156 14% 11%)"
          strokeWidth={1.4}
        />
        <text x={(HILL.x0 + HILL.x1) / 2} y={GROUND_Y - 6} textAnchor="middle" fontSize={9.5} className="fill-current text-foreground">
          Hang
        </text>
        <rect
          x={BUILDING.x0}
          y={BUILDING.topY}
          width={BUILDING.x1 - BUILDING.x0}
          height={GROUND_Y - BUILDING.topY}
          fill={buildingColor}
          fillOpacity={0.5}
          stroke="hsl(156 14% 11%)"
          strokeWidth={1.4}
        />
        <text x={BUILDING_CX} y={BUILDING.topY - 16} textAnchor="middle" fontSize={9.5} className="fill-current text-foreground">
          Hochhaus
        </text>

        {/* Skala: dezenter Zonen-Hintergrund + Achse */}
        <text x={VIEW_W - 8} y={GROUND_Y + 38} textAnchor="end" fontSize={9} className="fill-current text-muted-foreground">
          Ground Range (Karte) · links = näher am Sensor
        </text>
        {bandSections.map((section, index) => (
          <rect
            key={index}
            x={section.x0}
            y={BAND_Y}
            width={section.x1 - section.x0}
            height={BAND_H}
            fill={ZONE_COLOR[section.zone]}
            fillOpacity={0.14}
          />
        ))}
        <line x1={EDGE_L} y1={DOT_Y} x2={EDGE_R} y2={DOT_Y} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.45} />

        {/* Verbindungslinien flach: senkrecht (kein Versatz) */}
        {flatMarkers.map((x) => (
          <line
            key={`fl-${x}`}
            x1={x}
            y1={GROUND_Y}
            x2={x}
            y2={DOT_Y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            opacity={0.16}
          />
        ))}

        {/* Verbindungslinien Hang: geneigt um h·cot(θ) (nur wenn beleuchtet) */}
        {!hillInShadow &&
          hillMarkers.map((m) => {
            const projRaw = groundRangeX(m.x, m.h, thetaDeg);
            const projX = clampX(projRaw);
            const offMap = projRaw < EDGE_L || projRaw > EDGE_R;
            return (
              <line
                key={`hl-${m.n}`}
                x1={m.x}
                y1={m.y}
                x2={projX}
                y2={DOT_Y}
                stroke={ZONE_COLOR[hillZone]}
                strokeWidth={1.2}
                strokeDasharray={offMap ? "3 3" : undefined}
                opacity={0.5}
              />
            );
          })}

        {/* Verbindungslinien Hochhaus: Fuß senkrecht, Dach stark geneigt */}
        <line x1={BUILDING_CX} y1={GROUND_Y} x2={footProjX} y2={DOT_Y} stroke={buildingColor} strokeWidth={1.1} opacity={0.4} />
        <line
          x1={BUILDING_CX}
          y1={BUILDING.topY}
          x2={roofProjX}
          y2={DOT_Y}
          stroke={buildingColor}
          strokeWidth={1.7}
          strokeDasharray={roofOffMap ? "3 3" : undefined}
          opacity={0.7}
        />

        {/* Projizierte Punkte auf der Skala */}
        {flatMarkers.map((x) => (
          <circle key={`fp-${x}`} cx={x} cy={DOT_Y} r={2.4} fill="hsl(var(--muted-foreground))" opacity={0.75} />
        ))}
        {!hillInShadow &&
          hillMarkers.map((m) => {
            const projRaw = groundRangeX(m.x, m.h, thetaDeg);
            const projX = clampX(projRaw);
            const offMap = projRaw < EDGE_L || projRaw > EDGE_R;
            return (
              <g key={`hp-${m.n}`}>
                <circle
                  cx={projX}
                  cy={DOT_Y}
                  r={3.4}
                  fill={offMap ? "hsl(var(--background))" : ZONE_COLOR[hillZone]}
                  stroke={ZONE_COLOR[hillZone]}
                  strokeWidth={offMap ? 1.4 : 0}
                />
                <text x={projX} y={DOT_Y - 6} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={ZONE_COLOR[hillZone]}>
                  {m.n}
                </text>
              </g>
            );
          })}
        {/* Hochhaus-Projektion: Fuß hohl, Dach gefüllt */}
        <circle cx={footProjX} cy={DOT_Y} r={4} fill="hsl(var(--background))" stroke={buildingColor} strokeWidth={1.6} />
        <circle
          cx={roofProjX}
          cy={DOT_Y}
          r={4.5}
          fill={roofOffMap ? "hsl(var(--background))" : buildingColor}
          stroke={buildingColor}
          strokeWidth={roofOffMap ? 1.6 : 0}
        />

        {/* Maßpfeil: Layover-Versatz zwischen projiziertem Dach- und Fußpunkt */}
        <line x1={roofProjX} y1={ARROW_Y} x2={footProjX} y2={ARROW_Y} stroke={buildingColor} strokeWidth={1.2} />
        <line x1={roofProjX} y1={ARROW_Y - 4} x2={roofProjX} y2={ARROW_Y + 4} stroke={buildingColor} strokeWidth={1.2} />
        <line x1={footProjX} y1={ARROW_Y - 4} x2={footProjX} y2={ARROW_Y + 4} stroke={buildingColor} strokeWidth={1.2} />
        <polyline
          points={`${roofProjX + 5},${ARROW_Y - 3} ${roofProjX},${ARROW_Y} ${roofProjX + 5},${ARROW_Y + 3}`}
          fill="none"
          stroke={buildingColor}
          strokeWidth={1.2}
        />
        <polyline
          points={`${footProjX - 5},${ARROW_Y - 3} ${footProjX},${ARROW_Y} ${footProjX - 5},${ARROW_Y + 3}`}
          fill="none"
          stroke={buildingColor}
          strokeWidth={1.2}
        />
        <text x={(roofProjX + footProjX) / 2} y={ARROW_Y - 6} textAnchor="middle" fontSize={9} fontWeight={600} fill={buildingColor}>
          Layover-Versatz (h · cot θ)
        </text>
        <text x={roofProjX} y={ARROW_Y + 13} textAnchor="middle" fontSize={8} className="fill-current text-muted-foreground">
          Dach
        </text>
        <text x={footProjX} y={ARROW_Y + 13} textAnchor="middle" fontSize={8} className="fill-current text-muted-foreground">
          Fuß
        </text>

        {/* Szenen-Marker auf der Oberfläche */}
        {flatMarkers.map((x) => (
          <circle key={`fs-${x}`} cx={x} cy={GROUND_Y} r={2.6} fill="hsl(var(--muted-foreground))" />
        ))}
        {hillMarkers.map((m) =>
          hillInShadow ? (
            <g key={`hs-${m.n}`} opacity={0.5}>
              <circle cx={m.x} cy={m.y} r={3.4} fill="hsl(var(--background))" stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} />
              <line x1={m.x - 2.2} y1={m.y - 2.2} x2={m.x + 2.2} y2={m.y + 2.2} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <line x1={m.x - 2.2} y1={m.y + 2.2} x2={m.x + 2.2} y2={m.y - 2.2} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
            </g>
          ) : (
            <circle key={`hs-${m.n}`} cx={m.x} cy={m.y} r={3.4} fill={ZONE_COLOR[hillZone]} stroke="hsl(var(--background))" strokeWidth={1} />
          )
        )}
        {hillInShadow && (
          <text x={(HILL.x0 + HILL.x1) / 2} y={BAND_Y - 5} textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(var(--muted-foreground))">
            kein Signal (Radarschatten)
          </text>
        )}

        {/* Hochhaus-Marker: Fuß (hohl) und Dach (gefüllt) */}
        <circle cx={BUILDING_CX} cy={GROUND_Y} r={4} fill="hsl(var(--background))" stroke={buildingColor} strokeWidth={1.6} />
        <text x={BUILDING_CX + 8} y={GROUND_Y - 3} fontSize={8.5} fontWeight={600} fill={buildingColor}>
          Fuß
        </text>
        <circle cx={BUILDING_CX} cy={BUILDING.topY} r={4.5} fill={buildingColor} stroke="hsl(var(--background))" strokeWidth={1} />
        <text x={BUILDING_CX} y={BUILDING.topY - 6} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={buildingColor}>
          Dach
        </text>

        {/* Radar oben: Senkrechte + θ-Winkel */}
        <line x1={40} y1={30} x2={40} y2={72} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <line x1={40} y1={30} x2={40 + dir.x * 42} y2={30 + dir.y * 42} stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} />
        <text x={40 + dir.x * 26} y={30 + dir.y * 24} fontSize={9} className="fill-current text-muted-foreground">
          θ
        </text>
        <g transform="translate(40 26)">
          <Satellite width={20} height={20} x={-10} y={-10} className="text-foreground" strokeWidth={1.6} />
          <text y={-14} textAnchor="middle" fontSize={9} className="fill-current text-muted-foreground">
            Radar, θ = {formatDegrees(thetaDeg, 0)}
          </text>
        </g>
      </svg>

      {/* Live-Klassifikation + Punktverhalten */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className="grid gap-1 rounded-md border px-3 py-2.5 text-xs"
          style={{ borderColor: ZONE_COLOR[hillZone], backgroundColor: hillTint }}
        >
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ZONE_COLOR[hillZone] }} />
            Hang: {slantZoneLabels[hillZone]}
          </span>
          <span className="leading-relaxed text-muted-foreground">{ZONE_EXPLAIN[hillZone]}</span>
          <span className="leading-relaxed text-foreground">{ZONE_POINTS[hillZone]}</span>
        </div>
        <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
          <span className="text-foreground">Ground Range = x − h · cot θ</span>
          <span>
            cot θ = {cotTheta.toFixed(2)} (θ = {formatDegrees(thetaDeg, 0)})
          </span>
          <span>Grenze Layover: Hang &gt; θ = {formatDegrees(thetaDeg, 0)}</span>
          <span>Grenze Schatten: abgewandt &gt; 90° − θ = {formatDegrees(90 - thetaDeg, 0)}</span>
          <span>
            Hochhaus ({BUILDING_SLOPE_DEG}°): {slantZoneLabels[buildingZone]} — Dach vor Fuß
          </span>
        </div>
      </div>
    </div>
  );
}
