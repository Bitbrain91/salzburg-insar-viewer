/**
 * Kapitel „Lage & Höhe", zweites Diagramm: drei kleine Querschnitts-Szenen,
 * die zeigen, WO das gemessene Phasenzentrum landet — und dass das nicht immer
 * der sichtbare Ort des Objekts ist.
 *
 * Alle drei Panels teilen dieselbe Szene (Radar schräg oben links, Boden,
 * Gebäude, Baum rechts) und denselben Einfallswinkel (Strahl-Steigung
 * dx/dy = RAY_SLOPE ≈ tan 38,7° zur Vertikalen). Die Strahlen sind parallele
 * Wellenfronten — nur so ist der Rückweg der Zweifachreflexion (Panel 2) exakt
 * parallel zum Einfallsstrahl.
 *
 * - Panel 1 „Dach direkt": Direktecho an der Dachkante, Phasenzentrum dort.
 * - Panel 2 „Double Bounce": Boden + Fassade bilden einen 90°-Winkelreflektor;
 *   der Umweg ist so lang wie ein Direktweg zum Fassadenfuß, dort liegt das
 *   (oft sehr starke) Phasenzentrum.
 * - Panel 3 „Mischzelle": Dachkante und Baumkrone teilen eine Auflösungszelle;
 *   das Phasenzentrum liegt je nach Stärkeverhältnis irgendwo dazwischen.
 *
 * Die Tabellen-Höhenpräzision (±geoAccuracy1Sigma[sensor].heightM, TRE Tab.1
 * S.13) beschreibt NUR die Koordinatenschätzung; welchen Streuer das Echo
 * repräsentiert, ist eine eigene, zusätzliche Unsicherheit ohne Tabellenwert.
 * Double-Bounce/Phasenzentrum = SAR-Standardwissen über die Projekt-Handbücher
 * hinaus (AUG S.10 nennt allgemein Mehrfachreflexionen aus unterschiedlichen
 * Höhenlagen). Alle sichtbaren Zahlen stammen aus insarFacts.
 */
import { useState, type ReactNode } from "react";
import { Satellite } from "lucide-react";
import { geoAccuracy1Sigma, type SensorId } from "@/content/insarFacts";
import { formatMeters } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { ConditionsNote, ScopeBadge, SensorSwitch } from "../insarUi";

/* ---- gemeinsame Szenen-Geometrie (Layout-Koordinaten) ---------------- */
const VIEW_W = 300;
const VIEW_H = 240;
const TOP_Y = 14; // Oberkante: hier treten die parallelen Wellenfronten ein
const GROUND_Y = 188;
const RAY_SLOPE = 0.8; // dx/dy ≈ tan 38,7° zur Vertikalen — in allen Panels gleich

const FACADE_X = 204; // radarzugewandte Wand
const BUILDING_RIGHT = 258;
const ROOF_Y = 98;

const TREE_CROWN = { x: 278, y: 122, r: 20 };
const TREE_TRUNK = { x: 276, w: 5, top: 140 };

const RADAR = { x: 26, y: 24 };

/** x eines abwärts laufenden Strahls (Steigung RAY_SLOPE) auf Höhe y, der durch (px,py) geht. */
const rayX = (px: number, py: number, y: number) => px + RAY_SLOPE * (y - py);

/* ---- Panel 1: Dach direkt -------------------------------------------- */
const P1_ROOF = { x: FACADE_X, y: ROOF_Y }; // Dachkante (radarseitig)
const P1_IN_TOP = { x: rayX(P1_ROOF.x, P1_ROOF.y, TOP_Y), y: TOP_Y };
const P1_RET_BOTTOM = { x: P1_ROOF.x + 7, y: P1_ROOF.y - 3 };
const P1_RET_TOP = { x: P1_IN_TOP.x + 7, y: TOP_Y - 3 };

/* ---- Panel 2: Double Bounce ------------------------------------------ */
const P2_GROUND = { x: 184, y: GROUND_Y }; // Bodenpunkt vor der Fassade
// Reflexion am Boden -> aufwärts nach rechts bis zur Fassade:
const P2_WALL = { x: FACADE_X, y: GROUND_Y - (FACADE_X - P2_GROUND.x) / RAY_SLOPE };
const P2_IN_TOP = { x: rayX(P2_GROUND.x, P2_GROUND.y, TOP_Y), y: TOP_Y };
const P2_FOOT = { x: FACADE_X, y: GROUND_Y }; // Phasenzentrum am Wandfuß
// Rückweg C: parallel zu A (Steigung RAY_SLOPE) durch den Wandpunkt W:
const P2_C_TOP = { x: rayX(P2_WALL.x, P2_WALL.y, 46), y: 46 };

/* ---- Panel 3: Mischzelle --------------------------------------------- */
const P3_ROOF = { x: BUILDING_RIGHT, y: ROOF_Y }; // Streuer 1: Dachkante
const P3_TREE = { x: 272, y: 126 }; // Streuer 2: Baumkrone
const P3_IN_TOP = { x: rayX(P3_ROOF.x, P3_ROOF.y, TOP_Y), y: TOP_Y };
const P3_CELL = { x: 246, y: 86, w: 52, h: 58 };
const P3_PC = { x: 264, y: 111 }; // Phasenzentrum dazwischen
const P3_GUIDE_X = 238;

const PANEL_COLOR = {
  roof: tokens.series.displacement,
  double: tokens.clusterKind.annex,
  mixed: tokens.reliability.unknown,
} as const;

/** Pfeilspitzen-Marker eines Panels (Akzentfarbe + neutral). */
function PanelMarkers({ prefix, accent }: { prefix: string; accent: string }) {
  return (
    <defs>
      <marker
        id={`${prefix}-accent`}
        markerWidth="7"
        markerHeight="7"
        refX="5.5"
        refY="3"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
      </marker>
      <marker
        id={`${prefix}-muted`}
        markerWidth="7"
        markerHeight="7"
        refX="5.5"
        refY="3"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
      </marker>
    </defs>
  );
}

/** Ruhige Grundszene, in allen drei Panels identisch. */
function BaseScene() {
  return (
    <>
      {/* Wellenfronten: parallele Einstrahlung von schräg oben links */}
      {[8, 22, 36].map((x0) => (
        <line
          key={x0}
          x1={x0}
          y1={TOP_Y}
          x2={x0 + RAY_SLOPE * 40}
          y2={TOP_Y + 40}
          className="stroke-muted-foreground"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.45}
        />
      ))}

      {/* Radar-Symbol */}
      <g transform={`translate(${RADAR.x} ${RADAR.y})`}>
        <Satellite width={20} height={20} x={-10} y={-10} className="text-foreground" strokeWidth={1.6} />
        <text y={20} textAnchor="middle" fontSize={8.5} className="fill-muted-foreground">
          Radar
        </text>
      </g>

      {/* Boden */}
      <line x1={6} y1={GROUND_Y} x2={VIEW_W - 6} y2={GROUND_Y} className="stroke-border" strokeWidth={1.6} />

      {/* Gebäude + Dachlinie */}
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

      {/* Baum rechts neben dem Gebäude */}
      <rect
        x={TREE_TRUNK.x}
        y={TREE_TRUNK.top}
        width={TREE_TRUNK.w}
        height={GROUND_Y - TREE_TRUNK.top}
        className="fill-foreground"
        fillOpacity={0.3}
      />
      <circle
        cx={TREE_CROWN.x}
        cy={TREE_CROWN.y}
        r={TREE_CROWN.r}
        className="fill-foreground stroke-foreground"
        fillOpacity={0.08}
        strokeWidth={1.2}
      />
    </>
  );
}

/** Rahmen eines Panels: Titel mit Farbpunkt, SVG-Szene, Kurzerklärung. */
function Panel({
  title,
  ariaLabel,
  dotColor,
  children,
  caption,
}: {
  title: string;
  ariaLabel: string;
  dotColor: string;
  children: ReactNode;
  caption: ReactNode;
}) {
  return (
    <figure className="grid content-start gap-2">
      <figcaption className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        {title}
      </figcaption>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={ariaLabel}
        className="w-full rounded-md border border-border bg-background"
      >
        {children}
      </svg>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{caption}</p>
    </figure>
  );
}

export function HeightPhaseCenter() {
  const [sensor, setSensor] = useState<SensorId>("s1");
  const heightSigma = geoAccuracy1Sigma[sensor].heightM;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-3">
        {/* ---------------- Panel 1: Dach direkt ---------------- */}
        <Panel
          title="Dach direkt"
          dotColor={PANEL_COLOR.roof}
          ariaLabel="Querschnitt: ein Radarstrahl trifft die Dachkante und läuft denselben Weg zurück; das Phasenzentrum sitzt an der Dachkante."
          caption={
            <>
              Direktes Echo: Der Puls trifft die Dachkante und läuft denselben Weg zurück. Die
              gemessene Weglänge passt genau zur Dachkante — das Phasenzentrum sitzt dort, wo das
              Objekt wirklich ist.
            </>
          }
        >
          <PanelMarkers prefix="p1" accent={PANEL_COLOR.roof} />
          <BaseScene />
          {/* Hinweg zur Dachkante */}
          <line
            x1={P1_IN_TOP.x}
            y1={P1_IN_TOP.y}
            x2={P1_ROOF.x}
            y2={P1_ROOF.y}
            stroke={PANEL_COLOR.roof}
            strokeWidth={1.8}
            markerEnd="url(#p1-accent)"
          />
          {/* Rückweg (parallel versetzt, zurück zum Sensor) */}
          <line
            x1={P1_RET_BOTTOM.x}
            y1={P1_RET_BOTTOM.y}
            x2={P1_RET_TOP.x}
            y2={P1_RET_TOP.y}
            stroke={PANEL_COLOR.roof}
            strokeWidth={1.4}
            strokeDasharray="4 3"
            markerEnd="url(#p1-accent)"
          />
          <text x={P1_ROOF.x - 4} y={P1_ROOF.y - 8} textAnchor="end" fontSize={8.5} fontWeight={600} fill={PANEL_COLOR.roof}>
            Dachkante
          </text>
          {/* Phasenzentrum an der Dachkante */}
          <circle cx={P1_ROOF.x} cy={P1_ROOF.y} r={4.5} fill={PANEL_COLOR.roof} stroke="white" strokeWidth={1.5} />
        </Panel>

        {/* ---------------- Panel 2: Double Bounce -------------- */}
        <Panel
          title="Double Bounce"
          dotColor={PANEL_COLOR.double}
          ariaLabel="Querschnitt: der Strahl trifft den Boden vor der Fassade, wird zur Wand gespiegelt und läuft parallel zurück; das Phasenzentrum liegt am Fassadenfuß."
          caption={
            <>
              Boden und Fassade bilden einen 90°-Winkel: Der Strahl trifft den Boden vor dem Haus (A),
              wird zur Wand gespiegelt (B) und läuft parallel zum Einfallsstrahl zurück (C). Das Radar
              misst nur Weglängen — dieser Umweg ist exakt so lang wie ein{" "}
              <strong className="font-semibold text-foreground">Direktweg zum Fassadenfuß</strong>.
              Deshalb erscheint das (oft sehr starke) Echo am Wandfuß, nicht am Dach.
            </>
          }
        >
          <PanelMarkers prefix="p2" accent={PANEL_COLOR.double} />
          <BaseScene />
          {/* Pfad A: Radar -> Bodenpunkt */}
          <line
            x1={P2_IN_TOP.x}
            y1={P2_IN_TOP.y}
            x2={P2_GROUND.x}
            y2={P2_GROUND.y}
            stroke={PANEL_COLOR.double}
            strokeWidth={1.8}
            markerEnd="url(#p2-accent)"
          />
          {/* Pfad B: Bodenpunkt -> Wandpunkt */}
          <line
            x1={P2_GROUND.x}
            y1={P2_GROUND.y}
            x2={P2_WALL.x}
            y2={P2_WALL.y}
            stroke={PANEL_COLOR.double}
            strokeWidth={1.8}
            markerEnd="url(#p2-accent)"
          />
          {/* Pfad C: Wandpunkt -> zurück zum Sensor, parallel zu A */}
          <line
            x1={P2_WALL.x}
            y1={P2_WALL.y}
            x2={P2_C_TOP.x}
            y2={P2_C_TOP.y}
            stroke={PANEL_COLOR.double}
            strokeWidth={1.6}
            strokeDasharray="5 3"
            markerEnd="url(#p2-accent)"
          />
          {/* Reflexionspunkte */}
          <circle cx={P2_GROUND.x} cy={P2_GROUND.y} r={2.6} fill={PANEL_COLOR.double} />
          <circle cx={P2_WALL.x} cy={P2_WALL.y} r={2.6} fill={PANEL_COLOR.double} />
          <text x={P2_GROUND.x - 14} y={104} fontSize={9} fontWeight={700} fill={PANEL_COLOR.double}>
            A
          </text>
          <text x={P2_WALL.x - 16} y={178} fontSize={9} fontWeight={700} fill={PANEL_COLOR.double}>
            B
          </text>
          <text x={148} y={98} fontSize={9} fontWeight={700} fill={PANEL_COLOR.double}>
            C
          </text>
          <text x={140} y={110} fontSize={7.5} fill={PANEL_COLOR.double}>
            parallel zu A
          </text>
          {/* Phasenzentrum am Fassadenfuß */}
          <circle cx={P2_FOOT.x} cy={P2_FOOT.y} r={5} fill={PANEL_COLOR.double} stroke="white" strokeWidth={1.5} />
          <text x={P2_FOOT.x + 2} y={200} textAnchor="middle" fontSize={8} fontWeight={600} fill={PANEL_COLOR.double}>
            Fassadenfuß
          </text>
        </Panel>

        {/* ---------------- Panel 3: Mischzelle ----------------- */}
        <Panel
          title="Mischzelle"
          dotColor={PANEL_COLOR.mixed}
          ariaLabel="Querschnitt: eine Auflösungszelle umfasst Dachkante und Baumkrone in verschiedenen Höhen; das Phasenzentrum liegt dazwischen."
          caption={
            <>
              Teilen sich mehrere Streuer in verschiedenen Höhen eine Auflösungszelle — hier Dachkante
              und Baumkrone daneben —, verschmelzen ihre Echos zu einem. Das Phasenzentrum liegt je
              nach Stärkeverhältnis irgendwo dazwischen.
            </>
          }
        >
          <PanelMarkers prefix="p3" accent={PANEL_COLOR.mixed} />
          <BaseScene />
          {/* Einfallsstrahl in die Zelle (neutral) */}
          <line
            x1={P3_IN_TOP.x}
            y1={P3_IN_TOP.y}
            x2={P3_ROOF.x}
            y2={P3_ROOF.y}
            className="stroke-muted-foreground"
            strokeWidth={1.3}
            strokeDasharray="4 3"
            markerEnd="url(#p3-muted)"
          />
          {/* Auflösungszelle */}
          <rect
            x={P3_CELL.x}
            y={P3_CELL.y}
            width={P3_CELL.w}
            height={P3_CELL.h}
            fill="none"
            stroke={PANEL_COLOR.mixed}
            strokeWidth={1.3}
            strokeDasharray="4 3"
          />
          <text x={P3_CELL.x + P3_CELL.w / 2} y={P3_CELL.y - 4} textAnchor="middle" fontSize={8} fill={PANEL_COLOR.mixed}>
            Auflösungszelle
          </text>
          {/* Höhen-Hilfslinien + Doppelpfeil „Höhe irgendwo dazwischen" */}
          <line x1={P3_ROOF.x} y1={P3_ROOF.y} x2={P3_GUIDE_X} y2={P3_ROOF.y} className="stroke-muted-foreground" strokeWidth={0.9} strokeDasharray="2 2" />
          <line x1={P3_TREE.x} y1={P3_TREE.y} x2={P3_GUIDE_X} y2={P3_TREE.y} className="stroke-muted-foreground" strokeWidth={0.9} strokeDasharray="2 2" />
          <line
            x1={P3_GUIDE_X}
            y1={P3_ROOF.y}
            x2={P3_GUIDE_X}
            y2={P3_TREE.y}
            stroke={PANEL_COLOR.mixed}
            strokeWidth={1.4}
            markerStart="url(#p3-accent)"
            markerEnd="url(#p3-accent)"
          />
          <text x={P3_GUIDE_X - 5} y={(P3_ROOF.y + P3_TREE.y) / 2 + 3} textAnchor="end" fontSize={8} fill={PANEL_COLOR.mixed}>
            Höhe?
          </text>
          {/* Streuer-Marker */}
          <circle cx={P3_ROOF.x} cy={P3_ROOF.y} r={3} className="fill-foreground" />
          <text x={P3_ROOF.x - 5} y={P3_ROOF.y - 5} textAnchor="end" fontSize={8} className="fill-foreground">
            Dach
          </text>
          <circle cx={P3_TREE.x} cy={P3_TREE.y} r={3} className="fill-foreground" />
          <text x={P3_TREE.x + 6} y={P3_TREE.y + 4} fontSize={8} className="fill-foreground">
            Baum
          </text>
          {/* Phasenzentrum dazwischen */}
          <circle cx={P3_PC.x} cy={P3_PC.y} r={5} fill={PANEL_COLOR.mixed} stroke="white" strokeWidth={1.5} />
        </Panel>
      </div>

      {/* Legende der drei Phasenzentren */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {[
          { label: "Dach direkt", color: PANEL_COLOR.roof },
          { label: "Double Bounce", color: PANEL_COLOR.double },
          { label: "Mischzelle", color: PANEL_COLOR.mixed },
        ].map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>

      {/* Sensorabhängige Präzision der Koordinatenschätzung */}
      <div className="grid gap-2 rounded-md border border-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SensorSwitch value={sensor} onChange={setSensor} />
          <ScopeBadge scope={sensor} detail="Höhe 1σ" />
        </div>
        <p className="text-sm text-foreground">
          Höhenpräzision der Koordinatenschätzung (1σ):{" "}
          <span className="font-mono font-semibold">±{formatMeters(heightSigma)}</span>
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Diese Tabellen-Präzision beschreibt nur die Schätzunsicherheit der Koordinate selbst.
          Welchen Streuer das Echo repräsentiert (Panels 1–3), ist eine eigene, zusätzliche
          Unsicherheit ohne Tabellenwert.
        </p>
      </div>

      <ConditionsNote variant="geo" />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Double-Bounce und Phasenzentrum sind etabliertes SAR-Standardwissen über die beiden
        Projekt-Handbücher hinaus; das AUGMENTERRA-Handbuch (S. 10) nennt allgemein
        Mehrfachreflexionen aus unterschiedlichen Höhenlagen.
      </p>
    </div>
  );
}
