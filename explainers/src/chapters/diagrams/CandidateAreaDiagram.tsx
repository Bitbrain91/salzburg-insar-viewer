/**
 * Interaktive Vogelperspektive der Punktzuordnung (Stufe 1).
 *
 * Korrektheitsanker: range_offset = clamp(hoehe * tan(inzidenz) *
 * buffer_multiplier, 3 m, 30 m) plus 2 m lateraler Slack; nearest-Fallback
 * bis 15 m (facts.assignment, points_query Z. 420–468). Die Beispielpunkte
 * werden live mit derselben Prioritätslogik klassifiziert:
 * within → directional_buffer → nearest → unassigned.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { LabeledSlider } from "@/components/ui";
import { assignment, rangeOffsetM } from "@/content/facts";
import { formatDegrees, formatMeters } from "@/lib/format";
import { cn } from "@/lib/utils";

const SCALE = 4; // px pro Meter
const VIEW_W = 560;
const VIEW_H = 300;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2 - 10;
/** Gebäudegrundriss (Halbmaße in Metern). */
const HW = 11;
const HH = 7;

const POINT_COLORS = {
  within: "#059669",
  directional_buffer: "#2563eb",
  nearest: "#d97706",
  unassigned: "#9aa0a6",
} as const;

const POINT_LABELS = {
  within: "within — im Grundriss",
  directional_buffer: "directional_buffer — in der Candidate Area",
  nearest: "nearest — Fallback bis 15 m",
  unassigned: "nicht zugeordnet",
} as const;

type AssignmentMethod = keyof typeof POINT_COLORS;

/** Beispielpunkte in lokalen Metern; x ist relativ zur Range-Richtung (dir). */
const SAMPLE_POINTS: Array<{ id: string; alongDir: number; y: number }> = [
  { id: "A", alongDir: 5, y: -3.5 },
  { id: "B", alongDir: -8, y: 4.5 },
  { id: "C", alongDir: HW + 5, y: -2 },
  { id: "D", alongDir: HW + 20, y: 3 },
  { id: "E", alongDir: -(HW + 5), y: 2 },
  { id: "F", alongDir: 2, y: HH + 6 },
  { id: "G", alongDir: -(HW + 14), y: -12 },
];

function distToRect(px: number, py: number, cx: number, cy: number, hw: number, hh: number) {
  const dx = Math.max(Math.abs(px - cx) - hw, 0);
  const dy = Math.max(Math.abs(py - cy) - hh, 0);
  return Math.hypot(dx, dy);
}

function classify(
  xM: number,
  yM: number,
  dir: 1 | -1,
  rangeOffset: number
): AssignmentMethod {
  const footprintDist = distToRect(xM, yM, 0, 0, HW, HH);
  if (footprintDist === 0) return "within";
  // Union aus Grundriss und verschobener Kopie = Rechteck, verlängert um
  // range_offset in Range-Richtung, gepuffert um lateral_slack.
  const unionCx = (dir * rangeOffset) / 2;
  const unionHw = HW + rangeOffset / 2;
  if (distToRect(xM, yM, unionCx, 0, unionHw, HH) <= assignment.lateralSlackM) {
    return "directional_buffer";
  }
  if (footprintDist <= assignment.maxDistanceM) return "nearest";
  return "unassigned";
}

export function CandidateAreaDiagram() {
  const [heightM, setHeightM] = useState<number>(assignment.defaultHeightM);
  const [incidenceDeg, setIncidenceDeg] = useState<number>(assignment.defaultIncidenceDeg);
  const [track, setTrack] = useState<44 | 95>(44);

  // ASC (Track 44) blickt von Westen: Layover verschiebt Dachpunkte nach
  // Westen (links); DSC (Track 95) spiegelbildlich nach Osten (rechts).
  const dir: 1 | -1 = track === 44 ? -1 : 1;
  const rangeOffset = rangeOffsetM(heightM, incidenceDeg);
  const rawOffset = heightM * Math.tan((incidenceDeg * Math.PI) / 180);
  const clampedAtMax = rawOffset > assignment.maxBufferM;
  const clampedAtMin = rawOffset < assignment.minBufferM;

  const toPx = (xM: number, yM: number) => ({ x: CX + xM * SCALE, y: CY + yM * SCALE });

  const unionX = CX + (dir === 1 ? -HW : -(HW + rangeOffset)) * SCALE;
  const unionW = (2 * HW + rangeOffset) * SCALE;
  const slackPx = assignment.lateralSlackM * SCALE;
  const nearestPx = assignment.maxDistanceM * SCALE;

  const points = SAMPLE_POINTS.map((point) => {
    const xM = point.alongDir * dir;
    return { ...point, xM, method: classify(xM, point.y, dir, rangeOffset) };
  });

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledSlider
            label="Gebäudehöhe"
            valueLabel={formatMeters(heightM, 0)}
            min={3}
            max={40}
            step={1}
            value={[heightM]}
            onValueChange={([value]) => setHeightM(value)}
          />
          <LabeledSlider
            label="Einfallswinkel"
            valueLabel={formatDegrees(incidenceDeg)}
            min={30}
            max={45}
            step={0.5}
            value={[incidenceDeg]}
            onValueChange={([value]) => setIncidenceDeg(value)}
          />
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-background p-1 text-xs font-semibold">
          {([44, 95] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setTrack(candidate)}
              className={cn(
                "rounded px-3 py-1.5 transition-colors",
                track === candidate
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Track {candidate} {candidate === 44 ? "(ASC)" : "(DSC)"}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Candidate Area aus der Vogelperspektive"
        className="w-full rounded-md border border-border bg-background"
      >
        {/* nearest-Suchring (15 m um den Grundriss) */}
        <rect
          x={CX - HW * SCALE - nearestPx}
          y={CY - HH * SCALE - nearestPx}
          width={2 * (HW * SCALE + nearestPx)}
          height={2 * (HH * SCALE + nearestPx)}
          rx={nearestPx}
          fill="none"
          stroke={POINT_COLORS.nearest}
          strokeWidth={1}
          strokeDasharray="5 4"
          opacity={0.6}
        />
        {/* Candidate Area: Union + lateraler Slack */}
        <rect
          x={unionX - slackPx}
          y={CY - HH * SCALE - slackPx}
          width={unionW + 2 * slackPx}
          height={2 * (HH * SCALE + slackPx)}
          rx={slackPx}
          fill={POINT_COLORS.directional_buffer}
          fillOpacity={0.12}
          stroke={POINT_COLORS.directional_buffer}
          strokeWidth={1.2}
        />
        {/* Verschobene Grundriss-Kopie */}
        <rect
          x={CX + (dir === 1 ? rangeOffset - HW : -(HW + rangeOffset)) * SCALE}
          y={CY - HH * SCALE}
          width={2 * HW * SCALE}
          height={2 * HH * SCALE}
          fill="none"
          stroke={POINT_COLORS.directional_buffer}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        {/* Gebäudegrundriss */}
        <rect
          x={CX - HW * SCALE}
          y={CY - HH * SCALE}
          width={2 * HW * SCALE}
          height={2 * HH * SCALE}
          fill="hsl(156 14% 11% / 0.08)"
          stroke="hsl(156 14% 11%)"
          strokeWidth={1.6}
        />
        <text
          x={CX - HW * SCALE + 7}
          y={CY + HH * SCALE - 8}
          className="fill-current text-foreground"
          fontSize={11}
          fontWeight={600}
        >
          Grundriss
        </text>

        {/* Range-Pfeil: Verschiebungsrichtung des Layovers */}
        <g
          transform={`translate(${CX + dir * (HW * SCALE + 14)} ${CY - HH * SCALE - 22})`}
          opacity={0.9}
        >
          <line
            x1={-dir * 30}
            y1={0}
            x2={dir * 8}
            y2={0}
            stroke={POINT_COLORS.directional_buffer}
            strokeWidth={1.5}
            markerEnd="url(#arrow)"
          />
          <text
            x={-dir * 12}
            y={-6}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-current text-muted-foreground"
          >
            range_offset {formatMeters(rangeOffset)}
          </text>
        </g>
        <defs>
          <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill={POINT_COLORS.directional_buffer} />
          </marker>
        </defs>

        {/* Satellit auf der Blickseite */}
        <g transform={`translate(${dir === -1 ? 52 : VIEW_W - 52} 30)`}>
          <Satellite
            width={22}
            height={22}
            x={-11}
            y={-11}
            className="text-foreground"
            strokeWidth={1.6}
          />
          <text
            y={24}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-current text-muted-foreground"
          >
            Track {track} {track === 44 ? "(ASC)" : "(DSC)"}
          </text>
        </g>

        {/* Beispielpunkte */}
        {points.map((point) => {
          const { x, y } = toPx(point.xM, point.y);
          return (
            <g key={point.id}>
              <circle
                cx={x}
                cy={y}
                r={6}
                fill={POINT_COLORS[point.method]}
                stroke="white"
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={y + 3}
                textAnchor="middle"
                fontSize={8}
                fontWeight={700}
                fill="white"
              >
                {point.id}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="grid gap-2 text-xs md:grid-cols-[1fr_auto]">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.keys(POINT_COLORS) as AssignmentMethod[]).map((method) => (
            <li key={method} className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: POINT_COLORS[method] }}
              />
              <span className="font-mono">{POINT_LABELS[method]}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-muted-foreground">
          range_offset ={" "}
          <span className="font-semibold text-foreground">{formatMeters(rangeOffset)}</span>
          {clampedAtMax && " (Obergrenze 30 m)"}
          {clampedAtMin && " (Untergrenze 3 m)"}
        </p>
      </div>
    </div>
  );
}
