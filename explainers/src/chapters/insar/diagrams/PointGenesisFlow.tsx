/**
 * Kompaktes Fluss-Schaubild der Entstehungskette (Kapitel 0), Vorbild
 * PipelineFlow.tsx — hier bewusst kleiner und horizontal: fünf Stationen vom
 * Orbit bis zur Punktwolke. Jede Station ist klickbar und springt per
 * goToAnchor zum zuständigen Kapitel. Rein didaktisch, keine Zahlen — daher
 * durchgängig „allgemein".
 */
import type { InsarChapterId } from "@/content/insarChapters";
import { tokens } from "@/lib/designTokens";
import { goToAnchor } from "../insarUi";

const TEAL = tokens.series.displacement;

type Station = {
  nr: number;
  titel: string;
  desc: [string, string];
  chapter: InsarChapterId;
};

const STATIONS: Station[] = [
  { nr: 1, titel: "Orbit", desc: ["Radarpuls schräg zur", "Seite abgestrahlt."], chapter: "insar-aufnahme" },
  { nr: 2, titel: "SAR-Bild", desc: ["Je Zelle: Amplitude", "und Phase (komplex)."], chapter: "insar-aufnahme" },
  { nr: 3, titel: "Interferogramm", desc: ["Phasendifferenz", "zweier Aufnahmen."], chapter: "insar-phase" },
  { nr: 4, titel: "Bildstapel", desc: ["Viele Szenen trennen", "Signal von Störung."], chapter: "insar-stoerungen" },
  { nr: 5, titel: "Punktwolke", desc: ["Nur stabile Ziele", "werden Messpunkte."], chapter: "insar-punkte" },
];

const NODE_W = 138;
const NODE_H = 84;
const GAP = 24;
const OX = 10;
const OY = 8;
const W = OX * 2 + STATIONS.length * NODE_W + (STATIONS.length - 1) * GAP;
const H = OY + NODE_H + 8;
const ARROW_Y = OY + NODE_H / 2;

function nodeX(index: number): number {
  return OX + index * (NODE_W + GAP);
}

export function PointGenesisFlow() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="section-title">
        Die Kette in fünf Stationen — klicke eine Station, um zum Kapitel zu springen
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Entstehungskette der InSAR-Punkte: Orbit, SAR-Bild, Interferogramm, Bildstapel, Punktwolke"
          className="w-full"
          style={{ minWidth: 620 }}
        >
          <defs>
            <marker
              id="genesisArrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill={TEAL} />
            </marker>
          </defs>

          {STATIONS.slice(0, -1).map((station, index) => (
            <line
              key={`arrow-${station.nr}`}
              x1={nodeX(index) + NODE_W}
              y1={ARROW_Y}
              x2={nodeX(index + 1) - 5}
              y2={ARROW_Y}
              stroke={TEAL}
              strokeWidth={1.6}
              markerEnd="url(#genesisArrow)"
            />
          ))}

          {STATIONS.map((station, index) => {
            const x = nodeX(index);
            const cx = x + NODE_W / 2;
            return (
              <g
                key={station.nr}
                onClick={() => goToAnchor(station.chapter)}
                className="group cursor-pointer"
                role="link"
                aria-label={`Zu Station ${station.nr}: ${station.titel}`}
              >
                <rect
                  x={x}
                  y={OY}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  className="fill-card stroke-border transition-colors group-hover:stroke-primary"
                  strokeWidth={1.2}
                />
                <circle cx={cx} cy={OY + 18} r={12} fill={TEAL} />
                <text
                  x={cx}
                  y={OY + 21.5}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  className="fill-primary-foreground"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {station.nr}
                </text>
                <text
                  x={cx}
                  y={OY + 44}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={700}
                  className="fill-foreground"
                >
                  {station.titel}
                </text>
                <text x={cx} y={OY + 60} textAnchor="middle" fontSize={9} className="fill-muted-foreground">
                  {station.desc[0]}
                </text>
                <text x={cx} y={OY + 71} textAnchor="middle" fontSize={9} className="fill-muted-foreground">
                  {station.desc[1]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
