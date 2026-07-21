/**
 * Gesamtflussdiagramm der Pipeline (Station 0): der chronologische Weg der
 * Punkte vom Roh-Input bis zum Gebäudebefund, inklusive der Seitenausgänge
 * (gate_excluded, foreign, noise) und des getrennten Annex-Pfads, der erst
 * beim Differential-Level wieder einmündet. Alle Knoten sind klickbar und
 * springen zur jeweiligen Station. Reihenfolge = methodik.md §1–9.
 */
import { tokens } from "@/lib/designTokens";
import type { ChapterId } from "@/content/chapters";

const W = 720;
const H = 1000;
/** Hauptpfad ("Spine") */
const SPINE_X = 260;
const NODE_X = 100;
const NODE_W = 320;
/** Seitenausgänge rechts */
const SIDE_X = 480;
const SIDE_W = 224;
const SIDE_CX = SIDE_X + SIDE_W / 2;
/** Annex-Pfad links */
const ANNEX_X = 48;

const COLORS = {
  spine: "hsl(156 6% 38%)",
  excluded: tokens.clusterRole.excluded,
  noise: tokens.clusterRole.noise,
  foreign: tokens.clusterKind.foreign,
  annex: tokens.clusterKind.annex,
};

function navigate(id: ChapterId) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

type SpineNodeProps = {
  y: number;
  h?: number;
  station?: number;
  titel: string;
  sub?: string;
  chapter: ChapterId;
};

function SpineNode({ y, h = 56, station, titel, sub, chapter }: SpineNodeProps) {
  return (
    <g
      onClick={() => navigate(chapter)}
      className="cursor-pointer"
      role="link"
      aria-label={`Zu Station ${station ?? ""} ${titel}`}
    >
      <rect
        x={NODE_X}
        y={y}
        width={NODE_W}
        height={h}
        rx={10}
        fill="hsl(45 50% 98%)"
        stroke="hsl(100 9% 78%)"
        strokeWidth={1.2}
        className="transition-all hover:stroke-[#0c766e]"
      />
      {station !== undefined && (
        <>
          <circle cx={NODE_X + 26} cy={y + h / 2} r={11} fill="#0c766e" />
          <text
            x={NODE_X + 26}
            y={y + h / 2 + 3.5}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="white"
            fontFamily="IBM Plex Mono, monospace"
          >
            {station}
          </text>
        </>
      )}
      <text
        x={station !== undefined ? NODE_X + 46 : NODE_X + NODE_W / 2}
        y={sub ? y + h / 2 - 5 : y + h / 2 + 4}
        textAnchor={station !== undefined ? "start" : "middle"}
        fontSize={12.5}
        fontWeight={700}
        fill="hsl(156 14% 11%)"
      >
        {titel}
      </text>
      {sub && (
        <text
          x={station !== undefined ? NODE_X + 46 : NODE_X + NODE_W / 2}
          y={y + h / 2 + 11}
          textAnchor={station !== undefined ? "start" : "middle"}
          fontSize={9.5}
          fill="hsl(156 6% 38%)"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

type SideBoxProps = {
  y: number;
  titel: string;
  sub: string;
  color: string;
  chapter: ChapterId;
  fromY: number;
};

/** Seitenausgang rechts mit gestricheltem Abzweigpfeil vom Hauptpfad. */
function SideBox({ y, titel, sub, color, chapter, fromY }: SideBoxProps) {
  return (
    <g onClick={() => navigate(chapter)} className="cursor-pointer" role="link" aria-label={titel}>
      <path
        d={`M ${NODE_X + NODE_W} ${fromY} H ${SIDE_X - 6}`}
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeDasharray="4 3"
        markerEnd="url(#flowArrowSide)"
      />
      <rect
        x={SIDE_X}
        y={y}
        width={SIDE_W}
        height={46}
        rx={9}
        fill={`${color}12`}
        stroke={color}
        strokeWidth={1}
      />
      <circle cx={SIDE_X + 15} cy={y + 23} r={4} fill={color} />
      <text x={SIDE_X + 26} y={y + 19} fontSize={10.5} fontWeight={700} fill="hsl(156 14% 11%)">
        {titel}
      </text>
      <text x={SIDE_X + 26} y={y + 33} fontSize={9} fill="hsl(156 6% 38%)">
        {sub}
      </text>
    </g>
  );
}

/** Vertikaler Pfeil auf dem Hauptpfad. */
function SpineArrow({ fromY, toY, label }: { fromY: number; toY: number; label?: string }) {
  return (
    <g>
      <line
        x1={SPINE_X}
        y1={fromY}
        x2={SPINE_X}
        y2={toY - 6}
        stroke={COLORS.spine}
        strokeWidth={1.5}
        markerEnd="url(#flowArrow)"
      />
      {label && (
        <text x={SPINE_X + 8} y={(fromY + toY) / 2 + 3} fontSize={9} fill="hsl(156 6% 38%)">
          {label}
        </text>
      )}
    </g>
  );
}

export function PipelineFlow() {
  // Zeilenraster des Hauptpfads
  const yInput = 16;
  const y1 = 96; // Zuordnung
  const y2 = 188; // Qualitaet
  const y3 = 280; // Trennung
  const y4 = 372; // Cluster
  const y5 = 468; // Bewertung
  const yTracks = 560; // Track-Split
  const y6 = 640; // Bewegung
  const y7 = 732; // Differenzial
  const y8 = 824; // Zuverlaessigkeit
  const y9 = 916; // Befund
  const NODE_H = 56;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="section-title">
        Der Gesamtablauf — chronologisch vom Rohpunkt zum Befund (klicken zum Springen)
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Gesamtflussdiagramm der Pipeline"
          className="w-full"
          style={{ minWidth: 640 }}
        >
          <defs>
            <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={COLORS.spine} />
            </marker>
            <marker
              id="flowArrowSide"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="hsl(156 6% 55%)" />
            </marker>
          </defs>

          {/* Input */}
          <SpineNode
            y={yInput}
            h={48}
            titel="InSAR-Punkte je Track + BEV-Gebäude"
            sub="Rohdaten des Analyse-Laufs (Kartenausschnitt)"
            chapter="einfuehrung"
          />
          <SpineArrow fromY={yInput + 48} toY={y1} />

          {/* 1 Zuordnung */}
          <SpineNode
            y={y1}
            station={1}
            titel="Zuordnung zum Gebäude"
            sub="within → directional_buffer (Candidate Area) → nearest"
            chapter="zuordnung"
          />
          <SpineArrow fromY={y1 + NODE_H} toY={y2} />

          {/* 2 Qualitaet + Exit gate_excluded */}
          <SpineNode
            y={y2}
            station={2}
            titel="Qualitätsgates + Quer-Versatz-Check"
            sub="Epochen, Abdeckung, Kohärenz; k2x für nearest-Punkte"
            chapter="qualitaet"
          />
          <SideBox
            y={y2 + 5}
            fromY={y2 + NODE_H / 2}
            titel="gate_excluded"
            sub="bleibt sichtbar (grau), zählt nicht mit"
            color={COLORS.excluded}
            chapter="qualitaet"
          />
          <SpineArrow fromY={y2 + NODE_H} toY={y3} label="kept-Punkte" />

          {/* 3 Trennung + Exit foreign + Annex-Pfad */}
          <SpineNode
            y={y3}
            station={3}
            titel="v4-Trennung: Anbau & Fremdreflektor"
            sub="drei Prüfungen: Dachniveau · Blickseite · Layover-Reichweite"
            chapter="trennung"
          />
          <SideBox
            y={y3 + 5}
            fromY={y3 + NODE_H / 2}
            titel="foreign — Fremdreflektor"
            sub="nie Hauptcluster, nie Differential-Quelle"
            color={COLORS.foreign}
            chapter="trennung"
          />
          {/* Annex-Pfad: links abzweigen, parallel nach unten, beim Differential einmuenden */}
          <path
            d={`M ${NODE_X} ${y3 + NODE_H / 2} H ${ANNEX_X} V ${y7 + NODE_H / 2} H ${NODE_X - 6}`}
            fill="none"
            stroke={COLORS.annex}
            strokeWidth={1.4}
            strokeDasharray="5 3"
            markerEnd="url(#flowArrowSide)"
          />
          <g transform={`translate(${ANNEX_X - 12} ${(y3 + y7) / 2 + 40}) rotate(-90)`}>
            <text fontSize={9.5} fontWeight={600} fill={COLORS.annex} textAnchor="middle">
              annex — Anbaucluster (getrennt vom Hauptdach)
            </text>
          </g>
          <SpineArrow fromY={y3 + NODE_H} toY={y4} />

          {/* 4 Cluster + Exit noise */}
          <SpineNode
            y={y4}
            station={4}
            h={60}
            titel="Clustering je Gebäude × Track"
            sub="< 3 insufficient · 3–5 Small-N · ≥ 6 HDBSCAN"
            chapter="cluster"
          />
          <SideBox
            y={y4 + 7}
            fromY={y4 + 30}
            titel="noise — Ausreißer"
            sub="rot markiert, drückt die Zuverlässigkeit"
            color={COLORS.noise}
            chapter="cluster"
          />
          <SpineArrow fromY={y4 + 60} toY={y5} label="core-Cluster" />

          {/* 5 Bewertung */}
          <SpineNode
            y={y5}
            station={5}
            titel="Punkt- und Cluster-Bewertung"
            sub="anomaly/quality → Label; Verlässlichkeit → Hauptcluster-Wahl"
            chapter="bewertung"
          />

          {/* Track-Split */}
          {(
            [
              { x: NODE_X, label: "Track 44 (ASC)", sub: "Median Vertikal-Proxy" },
              { x: NODE_X + 170, label: "Track 95 (DSC)", sub: "Median Vertikal-Proxy" },
            ] as const
          ).map((track) => (
            <g
              key={track.label}
              onClick={() => navigate("bewegung")}
              className="cursor-pointer"
              role="link"
              aria-label={track.label}
            >
              <rect
                x={track.x}
                y={yTracks}
                width={150}
                height={42}
                rx={9}
                fill="hsl(105 20% 95%)"
                stroke="hsl(100 9% 78%)"
                strokeWidth={1}
              />
              <text
                x={track.x + 75}
                y={yTracks + 18}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                fill="hsl(156 14% 11%)"
              >
                {track.label}
              </text>
              <text
                x={track.x + 75}
                y={yTracks + 32}
                textAnchor="middle"
                fontSize={9}
                fill="hsl(156 6% 38%)"
              >
                {track.sub}
              </text>
            </g>
          ))}
          {/* Split- und Merge-Pfeile */}
          <path
            d={`M ${SPINE_X} ${y5 + NODE_H} V ${y5 + NODE_H + 14} H ${NODE_X + 75} V ${yTracks - 6}`}
            fill="none"
            stroke={COLORS.spine}
            strokeWidth={1.3}
            markerEnd="url(#flowArrow)"
          />
          <path
            d={`M ${SPINE_X} ${y5 + NODE_H} V ${y5 + NODE_H + 14} H ${NODE_X + 245} V ${yTracks - 6}`}
            fill="none"
            stroke={COLORS.spine}
            strokeWidth={1.3}
            markerEnd="url(#flowArrow)"
          />
          <path
            d={`M ${NODE_X + 75} ${yTracks + 42} V ${yTracks + 56} H ${SPINE_X} V ${y6 - 6}`}
            fill="none"
            stroke={COLORS.spine}
            strokeWidth={1.3}
            markerEnd="url(#flowArrow)"
          />
          <path
            d={`M ${NODE_X + 245} ${yTracks + 42} V ${yTracks + 56} H ${SPINE_X}`}
            fill="none"
            stroke={COLORS.spine}
            strokeWidth={1.3}
          />

          {/* 6 Bewegung */}
          <SpineNode
            y={y6}
            station={6}
            titel="Gebäudebewegung + Track-Vergleich"
            sub="Hauptcluster je Track; allowed_diff, track_agreement_score"
            chapter="bewegung"
          />
          <SpineArrow fromY={y6 + NODE_H} toY={y7} />

          {/* 7 Differenzial */}
          <SpineNode
            y={y7}
            station={7}
            titel="Differenzielle Bewegung (diffv2)"
            sub="none · candidate · significant · confirmed"
            chapter="differenzial"
          />
          <SpineArrow fromY={y7 + NODE_H} toY={y8} />

          {/* 8 Zuverlaessigkeit */}
          <SpineNode
            y={y8}
            station={8}
            titel="Zuverlässigkeit + Nachbarschaft"
            sub="Score, Abzüge, Band-Deckel; Nachbarn nur als Diagnose"
            chapter="zuverlaessigkeit"
          />
          <SpineArrow fromY={y8 + NODE_H} toY={y9} />

          {/* 9 Befund (Ergebnis) */}
          <g onClick={() => navigate("befund")} className="cursor-pointer" role="link" aria-label="Zum Befund">
            <rect
              x={NODE_X}
              y={y9}
              width={NODE_W}
              height={72}
              rx={10}
              fill="#0c766e10"
              stroke="#0c766e"
              strokeWidth={1.4}
            />
            <circle cx={NODE_X + 26} cy={y9 + 36} r={11} fill="#0c766e" />
            <text
              x={NODE_X + 26}
              y={y9 + 39.5}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill="white"
              fontFamily="IBM Plex Mono, monospace"
            >
              9
            </text>
            <text x={NODE_X + 46} y={y9 + 26} fontSize={12.5} fontWeight={700} fill="hsl(156 14% 11%)">
              Der Befund im Viewer
            </text>
            <text x={NODE_X + 46} y={y9 + 42} fontSize={9.5} fill="hsl(156 6% 38%)">
              Status · Bewegung (mm/a) · Differential-Level ·
            </text>
            <text x={NODE_X + 46} y={y9 + 55} fontSize={9.5} fill="hsl(156 6% 38%)">
              Zuverlässigkeitsband — keine Schadensdiagnose
            </text>
          </g>

          {/* Legende der Seitenpfade */}
          <g transform={`translate(${SIDE_X} ${y6})`} fontSize={9.5}>
            <text fontWeight={700} fill="hsl(156 14% 11%)">
              Lesehilfe
            </text>
            <text y={18} fill="hsl(156 6% 38%)">
              Durchgezogen: Weg der gewerteten Punkte.
            </text>
            <text y={32} fill="hsl(156 6% 38%)">
              Gestrichelt: Seitenpfade — nichts wird
            </text>
            <text y={46} fill="hsl(156 6% 38%)">
              gelöscht, alles bleibt sichtbar.
            </text>
            <text y={64} fill={COLORS.annex}>
              Violett: Anbau-Pfad mündet erst bei
            </text>
            <text y={78} fill={COLORS.annex}>
              Station 7 wieder ein (Differential).
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
