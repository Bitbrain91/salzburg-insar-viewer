/**
 * Interaktive Seitenansicht der v4-Bauteil-/Fremdreflektortrennung (Stufe 4).
 *
 * Korrektheitsanker: a8HeightOutlier, a6AntiLayover, a7ReachExcess und
 * routeSeparation aus facts.ts replizieren _component_a8/_a6/_a7 und das
 * anti_foreign-Routing (_assign_side_group Z. 1133–1160). Konvention wie in
 * Station 1: Satellit links, Range-Richtung (Layover-Verschiebung) zeigt
 * nach links; die satellitenabgewandte Seite ist rechts.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { KindBadge } from "@/components/ui/insights";
import { LabeledSlider } from "@/components/ui";
import {
  a6AntiLayover,
  a7ReachExcess,
  a8HeightOutlier,
  routeSeparation,
  separation,
  type SeparationReason,
} from "@/content/facts";
import { formatDegrees, formatMeters } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";

const SCALE = 6; // px pro Meter
const VIEW_W = 560;
const VIEW_H = 300;
const GROUND_Y = 260;
const BUILDING_CX = VIEW_W / 2;
/** Gebäude-Querschnitt: Halbbreite und Dachhöhe (Meter). */
const B_HW = 10;
const ROOF_H = 12;
/** Dach-Anker für a8: Median 12 m, MAD 0,3 m (≥ 2 Anker vorhanden). */
const ANCHOR_MEDIAN = ROOF_H;
const ANCHOR_MAD = 0.3;

const SEPARATOR_LABELS: Record<SeparationReason, string> = {
  height_outlier: "Unter Dachniveau (a8)",
  anti_layover: "Falsche Seite (a6)",
  reach_height_excess: "Über Layover-Reichweite (a7)",
};

export function SeparatorPlayground() {
  const [posM, setPosM] = useState(16); // Punktposition relativ zur Gebäudemitte
  const [pointHeightM, setPointHeightM] = useState(7);
  const [incidenceDeg, setIncidenceDeg] = useState(38.5);
  const [source, setSource] = useState<"bev" | "gba">("bev");

  const distanceM = Math.max(Math.abs(posM) - B_HW, 0);
  // Satellit links: Range-Richtung zeigt nach links. Punkt rechts des
  // Grundrisses => Versatz entgegen der Range-Richtung => dot = -1.
  const dot = posM > B_HW ? -1 : posM < -B_HW ? 1 : 0;

  const reasons: SeparationReason[] = [];
  if (
    a8HeightOutlier({
      pointHeightM,
      anchorMedianM: ANCHOR_MEDIAN,
      anchorMadM: ANCHOR_MAD,
      anchorCount: 4,
    })
  ) {
    reasons.push("height_outlier");
  }
  if (a6AntiLayover({ distanceM, dot })) reasons.push("anti_layover");
  if (
    a7ReachExcess({ distanceM, incidenceDeg, plausibleHeightM: ROOF_H, source })
  ) {
    reasons.push("reach_height_excess");
  }
  const kind = routeSeparation(reasons, source);

  // Zonen-Geometrie
  const a8Tol = Math.max(separation.madK * ANCHOR_MAD, separation.madFloorM);
  const a8BandTopM = ANCHOR_MEDIAN - a8Tol;
  const a8BandBottomM = Math.max(ANCHOR_MEDIAN - separation.a8MaxBelowM, 0);
  const plausibleH = source === "gba" ? ROOF_H / separation.heightSaturationRatio : ROOF_H;
  const a7BoundaryM =
    Math.tan((incidenceDeg * Math.PI) / 180) * (plausibleH + separation.heightMarginM);

  const xPx = (m: number) => BUILDING_CX + m * SCALE;
  const yPx = (m: number) => GROUND_Y - m * SCALE;

  const pointColor =
    kind === "annex"
      ? tokens.clusterKind.annex
      : kind === "foreign"
        ? tokens.clusterKind.foreign
        : "hsl(156 6% 38%)";

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3 sm:grid-cols-3">
          <LabeledSlider
            label="Position des Punkts"
            valueLabel={`${posM > 0 ? "+" : ""}${formatMeters(posM, 0)}`}
            min={-25}
            max={25}
            step={1}
            value={[posM]}
            onValueChange={([value]) => setPosM(value)}
          />
          <LabeledSlider
            label="Höhe des Punkts"
            valueLabel={formatMeters(pointHeightM, 1)}
            min={0}
            max={16}
            step={0.5}
            value={[pointHeightM]}
            onValueChange={([value]) => setPointHeightM(value)}
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
          {(["bev", "gba"] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setSource(candidate)}
              className={cn(
                "rounded px-3 py-1.5 uppercase transition-colors",
                source === candidate
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {candidate}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Seitenansicht der Bauteil- und Fremdreflektortrennung"
        className="w-full rounded-md border border-border bg-background"
      >
        {/* a6-Zone: satellitenabgewandte Seite ab 1,5 m */}
        <rect
          x={xPx(B_HW + separation.antiComponentMinM)}
          y={40}
          width={VIEW_W - xPx(B_HW + separation.antiComponentMinM)}
          height={GROUND_Y - 40}
          fill={tokens.clusterKind.foreign}
          fillOpacity={0.08}
        />
        <text
          x={VIEW_W - 8}
          y={54}
          textAnchor="end"
          fontSize={9.5}
          fill={tokens.clusterKind.foreign}
        >
          Falsche Seite: vom Satelliten abgewandt (a6)
        </text>

        {/* a7-Grenzen: |d_fp| = tan(inz) · (h_plausibel + 3 m) */}
        {[-1, 1].map((side) => (
          <g key={side}>
            <line
              x1={xPx(side * (B_HW + a7BoundaryM))}
              y1={44}
              x2={xPx(side * (B_HW + a7BoundaryM))}
              y2={GROUND_Y}
              stroke={tokens.differential.candidate}
              strokeWidth={1.2}
              strokeDasharray="6 4"
            />
          </g>
        ))}
        <text
          x={xPx(-(B_HW + a7BoundaryM))}
          y={GROUND_Y + 16}
          textAnchor="middle"
          fontSize={9.5}
          fill={tokens.differential.candidate}
        >
          Layover-Reichweite {formatMeters(a7BoundaryM)} (a7)
        </text>

        {/* a8-Anbauband (1–8 m unter dem Dachmedian) */}
        <rect
          x={xPx(-25)}
          y={yPx(a8BandTopM)}
          width={50 * SCALE}
          height={yPx(a8BandBottomM) - yPx(a8BandTopM)}
          fill={tokens.clusterKind.annex}
          fillOpacity={0.1}
        />
        <text x={xPx(-24)} y={yPx(a8BandTopM) + 11} fontSize={9.5} fill={tokens.clusterKind.annex}>
          Anbau-Band: {formatMeters(a8Tol)}–{formatMeters(separation.a8MaxBelowM, 0)} unter dem
          Dach (a8)
        </text>

        {/* Boden */}
        <line
          x1={0}
          y1={GROUND_Y}
          x2={VIEW_W}
          y2={GROUND_Y}
          stroke="hsl(156 14% 11%)"
          strokeWidth={1.4}
        />

        {/* Gebäude-Querschnitt */}
        <rect
          x={xPx(-B_HW)}
          y={yPx(ROOF_H)}
          width={2 * B_HW * SCALE}
          height={ROOF_H * SCALE}
          fill="hsl(156 14% 11% / 0.08)"
          stroke="hsl(156 14% 11%)"
          strokeWidth={1.6}
        />
        {/* Dach-Anker */}
        {[-7, -2.5, 2.5, 7].map((anchorX) => (
          <circle
            key={anchorX}
            cx={xPx(anchorX)}
            cy={yPx(ROOF_H)}
            r={3.5}
            fill="hsl(156 14% 11%)"
          />
        ))}
        <text
          x={BUILDING_CX}
          y={yPx(ROOF_H) - 8}
          textAnchor="middle"
          fontSize={9.5}
          className="fill-current text-muted-foreground"
        >
          Dach-Anker (Median {formatMeters(ANCHOR_MEDIAN, 0)})
        </text>

        {/* Radarstrahl vom Satelliten (links oben, Einfallswinkel zur Senkrechten) */}
        <g>
          <Satellite
            width={22}
            height={22}
            x={30}
            y={16}
            className="text-foreground"
            strokeWidth={1.6}
          />
          <line
            x1={52}
            y1={38}
            x2={xPx(-B_HW / 2)}
            y2={yPx(ROOF_H)}
            stroke="hsl(156 6% 38%)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
          <text x={60} y={30} fontSize={9.5} className="fill-current text-muted-foreground">
            Radar-Blick, Einfallswinkel {formatDegrees(incidenceDeg)}
          </text>
        </g>

        {/* Kandidatenpunkt */}
        <g>
          <line
            x1={xPx(posM)}
            y1={yPx(pointHeightM)}
            x2={xPx(posM)}
            y2={GROUND_Y}
            stroke={pointColor}
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.6}
          />
          <circle
            cx={xPx(posM)}
            cy={yPx(pointHeightM)}
            r={7}
            fill={pointColor}
            stroke="white"
            strokeWidth={2}
          />
        </g>
      </svg>

      <div className="grid gap-2.5 rounded-md border border-border bg-background px-3 py-2.5 text-xs md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Ausgelöste Prüfungen:</span>
          {reasons.length === 0 && (
            <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              keine
            </span>
          )}
          {reasons.map((reason) => (
            <span
              key={reason}
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{
                backgroundColor:
                  reason === "height_outlier"
                    ? `${tokens.clusterKind.annex}1a`
                    : `${tokens.clusterKind.foreign}1a`,
                color:
                  reason === "height_outlier"
                    ? tokens.clusterKind.annex
                    : tokens.clusterKind.foreign,
              }}
            >
              {SEPARATOR_LABELS[reason]}
            </span>
          ))}
          <span className="text-muted-foreground">
            (Abstand zum Grundriss: {formatMeters(distanceM)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Ergebnis:</span>
          <KindBadge kind={kind} />
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Einstufungsregel (intern <span className="font-mono">anti_foreign</span>): Ein Punkt auf
        der falschen Seite — oder im BEV-Kontext über der Layover-Reichweite — ist ein
        Fremdreflektor. Im GBA-Kontext kann ein Punkt über der Reichweite dagegen ein unkartierter
        Anbau sein und bleibt anbau-fähig (Referenzfall 96959851). Nur die Prüfung „unter
        Dachniveau" allein spricht für einen Anbau.
      </p>
    </div>
  );
}
