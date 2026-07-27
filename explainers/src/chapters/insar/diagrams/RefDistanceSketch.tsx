/**
 * Diagramm 5.2 „Präzision und REF-Distanz" (Kapitel Referenz): schematische
 * Draufsicht — der eine Referenzpunkt im Zentrum, Beispiel-Messpunkte in
 * wachsender Entfernung mit wachsendem Unsicherheits-Halo, dazu die BELEGTEN
 * Distanz-Bänder (< 1 km Tab.-1/2-Präzisionen; < 4 km Fig.-5-Studie; darüber
 * laut TRE nicht mehr einfach quantifizierbar).
 *
 * SCHEMATISCH: Die Quellen belegen Bänder, keine Kurve (kein mm/a-pro-km-
 * Gradient) — deshalb wachsen die Halos hier nur qualitativ. Alle Aussagen
 * aus refDistanceBands (insarFacts); Halo-Radien sind Layout, keine Daten.
 * Kein framer-motion, kein Zufall — statisches SVG mit Hover-freier Lesart.
 */
import { refDistanceBands, salzburgTsx } from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { ScopeBadge } from "../insarUi";

const W = 640;
const H = 300;
const CX = 190; // REF sitzt links der Mitte, damit rechts Platz für Distanz bleibt
const CY = 150;

/** Maßstab: 1 km → 52 px (nur Layout). */
const PX_PER_KM = 52;
const RING_1KM = 1 * PX_PER_KM;
const RING_4KM = 4 * PX_PER_KM;

/** Beispiel-Messpunkte: Distanz (km) → Halo-Radius (Layout, qualitativ). */
const SAMPLE_POINTS = [
  { km: 0.5, halo: 5 },
  { km: 1.6, halo: 8 },
  { km: 3.1, halo: 11 },
  { km: 5.6, halo: 16 },
] as const;

const BAND_COLORS = [
  tokens.reliability.high,
  tokens.reliability.medium,
  tokens.reliability.unknown,
] as const;

export function RefDistanceSketch() {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ein Referenzpunkt, wachsende Distanz — schematisch
        </p>
        <ScopeBadge scope="allgemein" detail="Bänder aus TRE" />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Schematische Draufsicht: Referenzpunkt mit Distanzringen bei 1 km und 4 km; Beispielpunkte werden mit der Entfernung unsicherer"
        className="w-full rounded-md border border-border bg-background"
      >
        {/* Distanzringe (belegte Bänder) */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_4KM}
          fill={BAND_COLORS[1]}
          fillOpacity={0.06}
          stroke={BAND_COLORS[1]}
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        <circle
          cx={CX}
          cy={CY}
          r={RING_1KM}
          fill={BAND_COLORS[0]}
          fillOpacity={0.1}
          stroke={BAND_COLORS[0]}
          strokeOpacity={0.6}
          strokeWidth={1}
        />
        {/* Ring-Beschriftungen */}
        <text
          x={CX + RING_1KM + 4}
          y={CY - 6}
          fontSize={9.5}
          fontWeight={600}
          fill={BAND_COLORS[0]}
        >
          1 km
        </text>
        <text
          x={CX + RING_1KM + 4}
          y={CY + 5}
          fontSize={8}
          className="fill-current text-muted-foreground"
        >
          Tab.-1/2-Präzisionen gelten
        </text>
        <text
          x={CX + RING_4KM - 46}
          y={CY - RING_4KM + 16}
          fontSize={9.5}
          fontWeight={600}
          fill={BAND_COLORS[1]}
        >
          4 km
        </text>
        <text
          x={CX + RING_4KM - 118}
          y={CY - RING_4KM + 27}
          fontSize={8}
          className="fill-current text-muted-foreground"
        >
          Bereich der Fig.-5-Atmosphärenstudie
        </text>

        {/* REF im Zentrum */}
        <g>
          <circle cx={CX} cy={CY} r={7} fill="hsl(var(--foreground))" />
          <circle cx={CX} cy={CY} r={3} fill="hsl(var(--background))" />
          <text
            x={CX}
            y={CY + 22}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            className="fill-current text-foreground"
          >
            REF
          </text>
          <text
            x={CX}
            y={CY + 33}
            textAnchor="middle"
            fontSize={8}
            className="fill-current text-muted-foreground"
          >
            als unbeweglich angenommen
          </text>
        </g>

        {/* Beispielpunkte entlang einer Linie nach rechts oben */}
        {SAMPLE_POINTS.map((point, i) => {
          const angle = -18 + i * 9; // leicht gefächert, damit Labels nicht kollidieren
          const rad = (angle * Math.PI) / 180;
          const x = CX + point.km * PX_PER_KM * Math.cos(rad);
          const y = CY + point.km * PX_PER_KM * Math.sin(rad);
          const beyond = point.km > 4;
          const color = beyond ? BAND_COLORS[2] : point.km > 1 ? BAND_COLORS[1] : BAND_COLORS[0];
          return (
            <g key={point.km}>
              {/* Vergleichslinie zum REF */}
              <line
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.3}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              {/* Unsicherheits-Halo (schematisch wachsend) */}
              <circle cx={x} cy={y} r={point.halo} fill={color} fillOpacity={0.18} />
              <circle cx={x} cy={y} r={2.6} fill={color} />
              <text
                x={x}
                y={y - point.halo - 4}
                textAnchor="middle"
                fontSize={8.5}
                className="fill-current text-muted-foreground"
              >
                {formatNumber(point.km, 1)} km{beyond ? " — nicht mehr einfach quantifizierbar" : ""}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Band-Karten mit den belegten Aussagen */}
      <div className="grid gap-2 sm:grid-cols-3">
        {refDistanceBands.map((band, i) => (
          <div
            key={band.label}
            className="grid gap-1 rounded-md border border-border bg-background px-3 py-2.5 text-xs"
          >
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: BAND_COLORS[i] }}
              />
              {band.label}
            </span>
            <span className="leading-relaxed text-muted-foreground">{band.aussage}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Schematisch: Die Quellen belegen diese Bänder, aber keine Kurve — die Halo-Größen
        illustrieren nur das Prinzip „weiter weg = unsicherer Vergleich". Zur Einordnung: Der
        Salzburger TSX-Bestand deckt {formatNumber(salzburgTsx.areaKm2, 1)} km² mit einem einzigen
        Referenzpunkt ab — große Teile des Stadtgebiets liegen also mehrere Kilometer vom REF
        entfernt.
      </p>
    </div>
  );
}
