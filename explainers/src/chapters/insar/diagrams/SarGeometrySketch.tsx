/**
 * Schrägsicht-Geometrie eines SAR-Satelliten (Kapitel 1), Querschnitt in der
 * Range-Ebene: Flugbahn, Off-Nadir-Blick, Swath und die beiden Bildachsen
 * Range (quer zur Bahn) und Azimut (entlang der Bahn). Der ASC/DSC-Umschalter
 * spiegelt die Blickrichtung — rechtsblickende Systeme (Sentinel-1, TerraSAR-X)
 * schauen aufsteigend nach Osten, absteigend nach Westen.
 *
 * Allgemeingültige Geometrie (rechtsblickendes SAR) — daher ScopeBadge
 * „allgemein". Kein hartkodierter Winkel: θ steht symbolisch, weil der
 * Off-Nadir-Bereich sensor- und modusabhängig ist (siehe Kapitel 8).
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/designTokens";
import { ScopeBadge } from "../insarUi";

const TEAL = tokens.series.displacement;

const W = 560;
const H = 300;
const GROUND_Y = 244;
const SAT_Y = 52;
const ARC_R = 46;

type Pass = "asc" | "dsc";

const PASS_INFO: Record<Pass, { kurz: string; lang: string; blick: string }> = {
  asc: { kurz: "ASC", lang: "aufsteigend", blick: "blickt nach Osten" },
  dsc: { kurz: "DSC", lang: "absteigend", blick: "blickt nach Westen" },
};

/** Polyline-Bogen zwischen zwei Winkeln (Bildschirmkoordinaten, y nach unten). */
function arcPath(cx: number, cy: number, r: number, deg0: number, deg1: number, steps = 18): string {
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = ((deg0 + ((deg1 - deg0) * i) / steps) * Math.PI) / 180;
    points.push(`${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M ${points.join(" L ")}`;
}

export function SarGeometrySketch() {
  const [pass, setPass] = useState<Pass>("asc");
  const asc = pass === "asc";
  const sx = asc ? 1 : -1;

  const satX = asc ? 92 : W - 92;
  const targetX = asc ? 380 : W - 380;
  const nadirX = satX;

  const beamAngle = (Math.atan2(GROUND_Y - SAT_Y, targetX - satX) * 180) / Math.PI;
  const nadirAngle = 90;
  const midAngle = (nadirAngle + beamAngle) / 2;
  const midRad = (midAngle * Math.PI) / 180;

  const swathHalf = 62;
  const midBeamX = (satX + targetX) / 2;
  const midBeamY = (SAT_Y + GROUND_Y) / 2;

  const info = PASS_INFO[pass];

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border border-border bg-background p-1 text-xs font-semibold">
          {(Object.keys(PASS_INFO) as Pass[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={pass === candidate}
              onClick={() => setPass(candidate)}
              className={cn(
                "rounded px-3 py-1.5 transition-colors",
                pass === candidate
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {PASS_INFO[candidate].kurz} ({PASS_INFO[candidate].lang})
            </button>
          ))}
        </div>
        <ScopeBadge scope="allgemein" detail="rechtsblickend" />
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Side-looking-Geometrie, ${info.lang}er Orbit, ${info.blick}`}
          className="w-full rounded-md border border-border bg-background"
          style={{ minWidth: 480 }}
        >
          <defs>
            <marker id="geoArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={TEAL} />
            </marker>
            <marker id="geoArrowMuted" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
            </marker>
          </defs>

          {/* Boden */}
          <line x1={24} y1={GROUND_Y} x2={W - 24} y2={GROUND_Y} className="stroke-border" strokeWidth={2} />
          <text x={30} y={GROUND_Y + 16} fontSize={10} className="fill-muted-foreground">
            West
          </text>
          <text x={W - 30} y={GROUND_Y + 16} fontSize={10} textAnchor="end" className="fill-muted-foreground">
            Ost
          </text>

          {/* Swath auf dem Boden */}
          <line
            x1={targetX - swathHalf}
            y1={GROUND_Y}
            x2={targetX + swathHalf}
            y2={GROUND_Y}
            stroke={TEAL}
            strokeWidth={5}
            strokeOpacity={0.35}
            strokeLinecap="round"
          />
          <text x={targetX} y={GROUND_Y + 30} fontSize={10} textAnchor="middle" className="fill-muted-foreground">
            Swath (beleuchteter Streifen)
          </text>

          {/* Nadir (senkrecht unter dem Satelliten) */}
          <line
            x1={nadirX}
            y1={SAT_Y + 6}
            x2={nadirX}
            y2={GROUND_Y}
            className="stroke-muted-foreground"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          <text x={nadirX} y={GROUND_Y - 6} fontSize={9} textAnchor="middle" className="fill-muted-foreground">
            Nadir
          </text>

          {/* Blicklinie (LOS) */}
          <line
            x1={satX}
            y1={SAT_Y + 4}
            x2={targetX}
            y2={GROUND_Y - 2}
            stroke={TEAL}
            strokeWidth={2}
            markerEnd="url(#geoArrow)"
          />
          <text
            x={midBeamX + sx * 10}
            y={midBeamY - 8}
            fontSize={10.5}
            fontWeight={600}
            textAnchor={asc ? "end" : "start"}
            fill={TEAL}
          >
            Blickrichtung (LOS)
          </text>

          {/* Off-Nadir-Winkel */}
          <path d={arcPath(satX, SAT_Y, ARC_R, nadirAngle, beamAngle)} fill="none" stroke={TEAL} strokeWidth={1.4} />
          <text
            x={satX + (ARC_R + 12) * Math.cos(midRad)}
            y={SAT_Y + (ARC_R + 12) * Math.sin(midRad) + 3}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fill={TEAL}
          >
            θ
          </text>
          <text
            x={satX + (ARC_R + 12) * Math.cos(midRad)}
            y={SAT_Y + (ARC_R + 12) * Math.sin(midRad) + 15}
            fontSize={8.5}
            textAnchor="middle"
            className="fill-muted-foreground"
          >
            Off-Nadir
          </text>

          {/* Pass-Beschriftung oben mittig, frei vom Strahlengang */}
          <text x={W / 2} y={18} fontSize={11} fontWeight={700} textAnchor="middle" className="fill-foreground">
            {info.kurz} · {info.blick}
          </text>

          {/* Satellit */}
          <g transform={`translate(${satX} ${SAT_Y})`}>
            <Satellite width={24} height={24} x={-12} y={-12} className="text-foreground" strokeWidth={1.6} />
          </g>

          {/* Azimut-Achse (Flugbahn, aus der Bildebene heraus) — zur offenen Bildmitte */}
          <line
            x1={satX}
            y1={SAT_Y}
            x2={satX + sx * 34}
            y2={SAT_Y - 24}
            className="stroke-muted-foreground"
            strokeWidth={1.4}
            markerEnd="url(#geoArrowMuted)"
          />
          <text
            x={satX + sx * 38}
            y={SAT_Y - 24}
            fontSize={9.5}
            textAnchor={asc ? "start" : "end"}
            className="fill-muted-foreground"
          >
            Azimut (Flugbahn)
          </text>

          {/* Zielobjekt */}
          <rect
            x={targetX - 14}
            y={GROUND_Y - 20}
            width={28}
            height={20}
            className="fill-foreground stroke-foreground"
            fillOpacity={0.1}
            strokeWidth={1.4}
          />

          {/* Range-Achse am Boden */}
          <line
            x1={nadirX}
            y1={GROUND_Y + 40}
            x2={targetX + sx * 46}
            y2={GROUND_Y + 40}
            className="stroke-muted-foreground"
            strokeWidth={1.4}
            markerEnd="url(#geoArrowMuted)"
          />
          <text
            x={(nadirX + targetX) / 2}
            y={GROUND_Y + 54}
            fontSize={9.5}
            textAnchor="middle"
            className="fill-muted-foreground"
          >
            Range (quer zur Flugbahn)
          </text>
        </svg>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Das Radar blickt nie senkrecht nach unten, sondern schräg zur Seite. Quer zur Flugbahn misst
        es in <span className="font-semibold text-foreground">Range</span>, entlang der Flugbahn in{" "}
        <span className="font-semibold text-foreground">Azimut</span>. Rechtsblickende Systeme sehen
        dasselbe Gebiet aufsteigend von Westen, absteigend von Osten — zwei Blickrichtungen, die
        später zusammen ein 2D-Bild ergeben.
      </p>
    </div>
  );
}
