/**
 * Hero-Diagramm des Datenpunkt-Explainers: Warum wird eine Bildzelle zum
 * Messpunkt — und wann nicht? Eine schematische Stadtszene aus sieben
 * Objektklassen (citySceneObjects), jede anklickbar; über Persistent
 * Scatterern sitzt ein Punkt-Marker, über Distributed Scatterern eine
 * Flächen-Schraffur, über instabilen Flächen nichts.
 *
 * Physik hinter der Einstufung: TRE §2.1 S.10, §11.6 S.65–66 (PS/DS),
 * §11.2.2 S.60 (Dekorrelation, Vegetation als Hauptursache). Die
 * Kohärenz-Reihen sind DIDAKTISCHE Beispielwerte aus insarFacts
 * (citySceneObjects), keine Messdaten — es wird nichts im Render gewürfelt.
 *
 * Geltungsbereich: allgemein (sensorunabhängig). Farben nur aus
 * designTokens; die Szenenobjekte sind bewusst monochrom (kein Sensor,
 * keine Bewertung), einzig das PS/DS/kein-Punkt-Urteil trägt Farbe.
 */
import { useState } from "react";
import { Card, LabeledSlider, Toggle } from "@/components/ui";
import { FindingCard, type FindingTone } from "@/components/ui/insights";
import {
  citySceneObjects,
  coherence,
  type CitySceneVerdict,
} from "@/content/insarFacts";
import { tokens } from "@/lib/designTokens";
import { formatNumber, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Szenen-Geometrie (Koordinaten-Konstanten, viewBox-Einheiten). */
const VIEW_W = 720;
const VIEW_H = 320;
const GROUND_Y = 285;
const HB_Y = 150;
const HB_H = 150;
const HB_HALF = 47;

/** Layout je Objekt: Mittelpunkt und Ort des Markers (PS-Punkt bzw. DS-Fläche). */
const LAYOUT: Record<
  string,
  { cx: number; ps?: { x: number; y: number }; ds?: { x: number; y: number; w: number; h: number } }
> = {
  dachkante: { cx: 72, ps: { x: 44, y: 203 } },
  laterne: { cx: 170, ps: { x: 170, y: 219 } },
  felswand: { cx: 268, ps: { x: 290, y: 219 } },
  parkplatz: { cx: 366, ds: { x: 322, y: 259, w: 88, h: 24 } },
  wiese: { cx: 464 },
  wald: { cx: 562 },
  wasser: { cx: 660 },
};

const VERDICT_META: Record<
  CitySceneVerdict,
  { tone: FindingTone; color: string; kurz: string; lang: string }
> = {
  ps: { tone: "good", color: tokens.reliability.high, kurz: "PS", lang: "Permanent Scatterer" },
  ds: {
    tone: "neutral",
    color: "hsl(var(--muted-foreground))",
    kurz: "DS",
    lang: "Distributed Scatterer",
  },
  none: { tone: "warning", color: tokens.reliability.medium, kurz: "—", lang: "kein Messpunkt" },
};

const INK_STROKE = "hsl(var(--foreground))";
const INK_FILL = "hsl(var(--muted-foreground))";

/** Rein strukturelle Zeichnung eines Objekts (keine Farbsemantik). */
function SceneShape({ id, cx }: { id: string; cx: number }) {
  switch (id) {
    case "dachkante":
      return (
        <g fill={INK_FILL} stroke={INK_STROKE}>
          <rect
            x={cx - 34}
            y={205}
            width={68}
            height={80}
            fillOpacity={0.14}
            strokeOpacity={0.5}
            strokeWidth={1.4}
          />
          {[0, 1, 2].map((row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={cx - 22 + col * 26}
                y={218 + row * 20}
                width={16}
                height={12}
                fill={INK_STROKE}
                fillOpacity={0.16}
                stroke="none"
              />
            ))
          )}
          {/* Dachkante als betonter Winkelreflektor */}
          <line
            x1={cx - 38}
            y1={205}
            x2={cx + 38}
            y2={205}
            strokeOpacity={0.75}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        </g>
      );
    case "laterne":
      return (
        <g stroke={INK_STROKE} fill={INK_FILL}>
          <line
            x1={cx}
            y1={GROUND_Y}
            x2={cx}
            y2={228}
            strokeOpacity={0.6}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={224} r={4.5} fillOpacity={0.4} strokeOpacity={0.6} strokeWidth={1.2} />
        </g>
      );
    case "felswand":
      return (
        <polygon
          points={`${cx - 40},${GROUND_Y} ${cx - 30},250 ${cx - 12},262 ${cx - 2},230 ${cx + 12},244 ${cx + 22},224 ${cx + 40},${GROUND_Y}`}
          fill={INK_FILL}
          fillOpacity={0.16}
          stroke={INK_STROKE}
          strokeOpacity={0.5}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      );
    case "parkplatz":
      return (
        <g stroke={INK_STROKE}>
          <rect
            x={cx - 44}
            y={277}
            width={88}
            height={8}
            fill={INK_FILL}
            fillOpacity={0.2}
            strokeOpacity={0.4}
            strokeWidth={1}
          />
          {[-28, -8, 12, 32].map((dx) => (
            <line
              key={dx}
              x1={cx + dx}
              y1={278}
              x2={cx + dx}
              y2={284}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          ))}
        </g>
      );
    case "wiese":
      return (
        <g stroke={INK_STROKE}>
          <path
            d={`M ${cx - 44} ${GROUND_Y} Q ${cx} 279 ${cx + 44} ${GROUND_Y}`}
            fill="none"
            strokeOpacity={0.4}
            strokeWidth={1.2}
          />
          {[-32, -18, -4, 10, 24, 36].map((dx, i) => (
            <line
              key={dx}
              x1={cx + dx}
              y1={GROUND_Y - 2}
              x2={cx + dx + (i % 2 === 0 ? 2 : -2)}
              y2={GROUND_Y - 12}
              strokeOpacity={0.45}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    case "wald":
      return (
        <g stroke={INK_STROKE} fill={INK_FILL}>
          {[-26, 2, 28].map((dx, i) => {
            const h = i === 1 ? 46 : 38;
            const top = GROUND_Y - h;
            return (
              <g key={dx}>
                <line
                  x1={cx + dx}
                  y1={GROUND_Y}
                  x2={cx + dx}
                  y2={GROUND_Y - 10}
                  strokeOpacity={0.5}
                  strokeWidth={2}
                />
                <polygon
                  points={`${cx + dx},${top} ${cx + dx - 13},${GROUND_Y - 8} ${cx + dx + 13},${GROUND_Y - 8}`}
                  fillOpacity={0.16}
                  strokeOpacity={0.45}
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>
      );
    case "wasser":
      return (
        <g stroke={INK_STROKE}>
          <rect
            x={cx - 46}
            y={278}
            width={92}
            height={7}
            fill={INK_FILL}
            fillOpacity={0.12}
            stroke="none"
          />
          {[280, 284].map((y) => (
            <path
              key={y}
              d={`M ${cx - 44} ${y} q 11 -4 22 0 t 22 0 t 22 0`}
              fill="none"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}

export function PsDsCityScene() {
  const [threshold, setThreshold] = useState<number>(coherence.attributeReliableAbove);
  const [onlyPs, setOnlyPs] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(citySceneObjects[0].id);

  const selected = citySceneObjects.find((o) => o.id === selectedId) ?? citySceneObjects[0];
  const selMeta = VERDICT_META[selected.verdict];

  const pointCount = citySceneObjects.filter(
    (o) =>
      o.verdict !== "none" &&
      o.meanCoherence >= threshold &&
      (!onlyPs || o.verdict === "ps")
  ).length;

  return (
    <Card className="grid gap-4 p-4">
      {/* Steuerung */}
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-1.5">
          <LabeledSlider
            label="Stabilitäts-Schwelle (Punkt-Attribut coherence)"
            valueLabel={formatScore(threshold)}
            min={0}
            max={1}
            step={0.05}
            value={[threshold]}
            onValueChange={([value]) => setThreshold(value)}
          />
          {/* Markierungen an den Interpretationsschwellen */}
          <div className="relative h-4">
            {[coherence.interferogramUnreliableBelow, coherence.attributeReliableAbove].map((mark) => (
              <div
                key={mark}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${mark * 100}%` }}
              >
                <span className="h-2 w-px bg-border" />
                <span className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                  {formatScore(mark)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Zwei Begriffe, zwei Marken: unter {formatScore(coherence.interferogramUnreliableBelow)}{" "}
            gilt ein einzelnes Interferogramm als unzuverlässig; das gelieferte Punkt-Attribut
            coherence (ein Wert je Punkt, über den ganzen Stapel) gilt ab{" "}
            {formatScore(coherence.attributeReliableAbove)} als zuverlässig. Der Slider illustriert
            das Auswahlprinzip — Punkte unter der Schwelle blenden aus.
          </p>
        </div>
        <div className="grid gap-2">
          <Toggle checked={onlyPs} onCheckedChange={setOnlyPs} label="Nur PS anzeigen" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Bei Schwelle {formatScore(threshold)}:{" "}
            <span className="font-mono font-semibold text-foreground">{pointCount}</span> von{" "}
            {citySceneObjects.length} Objekten liefern einen Punkt.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        {/* Szene */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Schematische Stadtszene mit sieben Objektklassen und ihren InSAR-Messpunkten"
          className="h-auto w-full rounded-md border border-border bg-background"
        >
          <defs>
            <pattern
              id="psds-hatch"
              width={7}
              height={7}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={7}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.6}
              />
            </pattern>
          </defs>

          <line
            x1={0}
            y1={GROUND_Y}
            x2={VIEW_W}
            y2={GROUND_Y}
            stroke={INK_STROKE}
            strokeOpacity={0.35}
            strokeWidth={1.4}
          />

          {citySceneObjects.map((obj) => {
            const lo = LAYOUT[obj.id];
            const meta = VERDICT_META[obj.verdict];
            const isSelected = obj.id === selectedId;
            const belowThreshold = obj.meanCoherence < threshold;
            const hiddenByOnlyPs = onlyPs && obj.verdict === "ds";
            const markerOpacity = hiddenByOnlyPs ? 0 : belowThreshold ? 0.12 : 1;

            const select = () => setSelectedId(obj.id);

            return (
              <g
                key={obj.id}
                className="group cursor-pointer"
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${obj.label}: ${meta.lang}`}
                onClick={select}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select();
                  }
                }}
              >
                {/* Klick-/Fokusfläche über dem ganzen Slot */}
                <rect
                  x={lo.cx - HB_HALF}
                  y={HB_Y}
                  width={HB_HALF * 2}
                  height={HB_H}
                  fill="transparent"
                />
                {/* Auswahl-/Hover-Ring */}
                <rect
                  x={lo.cx - HB_HALF}
                  y={HB_Y}
                  width={HB_HALF * 2}
                  height={HB_H}
                  rx={8}
                  fill="none"
                  stroke={INK_STROKE}
                  strokeOpacity={0.5}
                  strokeWidth={1.4}
                  className={cn(
                    "transition-opacity",
                    isSelected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-100"
                  )}
                />

                <SceneShape id={obj.id} cx={lo.cx} />

                {/* PS-Punkt-Marker */}
                {lo.ps && (
                  <g
                    style={{ opacity: markerOpacity }}
                    className="transition-opacity duration-500"
                  >
                    <circle cx={lo.ps.x} cy={lo.ps.y} r={9} fill={meta.color} fillOpacity={0.2} />
                    <circle
                      cx={lo.ps.x}
                      cy={lo.ps.y}
                      r={4.5}
                      fill={meta.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={1.6}
                    />
                  </g>
                )}

                {/* DS-Flächen-Schraffur */}
                {lo.ds && (
                  <g
                    style={{ opacity: markerOpacity }}
                    className="transition-opacity duration-500"
                  >
                    <rect
                      x={lo.ds.x}
                      y={lo.ds.y}
                      width={lo.ds.w}
                      height={lo.ds.h}
                      rx={2}
                      fill="url(#psds-hatch)"
                      stroke={meta.color}
                      strokeOpacity={0.5}
                      strokeWidth={1}
                    />
                  </g>
                )}

                <text
                  x={lo.cx}
                  y={303}
                  textAnchor="middle"
                  fontSize={10.5}
                  className={cn(
                    "fill-current transition-colors",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                  style={isSelected ? { fontWeight: 600 } : undefined}
                >
                  {obj.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Detail-Panel */}
        <div className="grid content-start gap-3 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{selected.label}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: selMeta.color }}
              />
              {selMeta.kurz === "—" ? selMeta.lang : `${selMeta.lang} (${selMeta.kurz})`}
            </span>
          </div>

          {/* Stabilitäts-Sparkline (schematisch) */}
          <div className="grid gap-1">
            <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
              <span>Echo-Stabilität über die Aufnahmen (schematisch)</span>
              <span className="font-mono font-semibold text-foreground">
                {formatScore(selected.meanCoherence)}
              </span>
            </div>
            <CoherenceSparkline series={selected.coherenceSeries} threshold={threshold} color={selMeta.color} />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Die Lieferung enthält daraus EINEN Wert je Punkt (Attribut coherence) — hier{" "}
              {formatScore(selected.meanCoherence)},{" "}
              {selected.meanCoherence >= threshold ? "über" : "unter"} der Schwelle{" "}
              {formatScore(threshold)}.
            </p>
          </div>

          <FindingCard
            tone={selMeta.tone}
            label={
              selected.verdict === "none"
                ? "Kein Messpunkt"
                : `Wird ${selMeta.kurz} — ${selMeta.lang}`
            }
            detail={selected.begruendung}
          />

          <div className="flex items-baseline justify-between border-t border-border pt-2 text-[11px]">
            <span className="text-muted-foreground">Effektive Fläche (eff_area)</span>
            <span className="font-mono font-semibold text-foreground">
              {selected.verdict === "ds"
                ? `${formatNumber(selected.effAreaM2, 0)} m²`
                : selected.verdict === "ps"
                  ? "0 m² (punktförmig)"
                  : "—"}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Didaktische Beispielwerte: Die Stabilitäts-Reihen illustrieren das typische Verhalten der
        Objektklassen (PS/DS-Physik nach TRE §2.1 S. 10, §11.6 S. 65–66) — sie sind keine Messdaten
        und keine Größe der Lieferung. Die echte Punktauswahl trifft die Stapel-Analyse der
        Verarbeitung (SqueeSAR); die Schwelle hier veranschaulicht nur das Prinzip.
      </p>
    </Card>
  );
}

/* Kleine Kohärenz-Zeitreihe mit eingezeichneter Schwelle. */
function CoherenceSparkline({
  series,
  threshold,
  color,
}: {
  series: readonly number[];
  threshold: number;
  color: string;
}) {
  const W = 244;
  const H = 88;
  const padX = 10;
  const padTop = 8;
  const padBottom = 12;
  const x = (i: number) => padX + (i / (series.length - 1)) * (W - 2 * padX);
  const y = (v: number) => padTop + (1 - v) * (H - padTop - padBottom);

  const linePoints = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Schematische Echo-Stabilität des gewählten Objekts über die Aufnahmen"
      className="h-auto w-full rounded border border-border bg-card"
    >
      {/* Guides an den Interpretationsschwellen */}
      {[coherence.interferogramUnreliableBelow, coherence.attributeReliableAbove].map((g) => (
        <line
          key={g}
          x1={padX}
          y1={y(g)}
          x2={W - padX}
          y2={y(g)}
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}
      {/* aktuelle Schwelle */}
      <line
        x1={padX}
        y1={y(threshold)}
        x2={W - padX}
        y2={y(threshold)}
        stroke={tokens.reliability.medium}
        strokeWidth={1.4}
      />
      <text
        x={W - padX}
        y={y(threshold) - 3}
        textAnchor="end"
        fontSize={8}
        fill={tokens.reliability.medium}
      >
        Schwelle {formatScore(threshold)}
      </text>
      {/* Zeitreihe */}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={1.8} fill={color} />
      ))}
    </svg>
  );
}
