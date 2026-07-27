/**
 * Hero-Diagramm (Kapitel 1): Draufsicht einer kleinen Szene (Gebäude mit
 * Anbau, Baum, Auto, Gartenhaus) mit einem halbtransparenten Auflösungs-
 * Zellraster darüber. Der SensorSwitch schaltet die Zellgröße zwischen
 * Sentinel-1 IW (5 × 20 m) und TerraSAR-X Stripmap (3 × 3 m) — beide Werte
 * kommen aus sensors[…].cellRangeM/cellAzimuthM, nichts ist hartkodiert.
 *
 * Kernbotschaft: In eine Zelle fallen oft mehrere Objekte; das SAR-Bild
 * speichert für die ganze Zelle nur eine komplexe Zahl (Amplitude + Phase),
 * und viele Elementarstreuer darin interferieren (Speckle). Die Zellgröße
 * entscheidet, wie grob diese Vermischung ausfällt.
 */
import { useState, type ReactElement } from "react";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { FOOTNOTES, sensors, type SensorId } from "@/content/insarFacts";
import { tokens } from "@/lib/designTokens";
import { formatNumber } from "@/lib/format";
import { ScopeBadge, SensorSwitch, sensorColors } from "../insarUi";

/* Szene in Metern (Draufsicht): x = Range (nach rechts), y = Azimut (nach unten). */
const SCENE_W = 48;
const SCENE_H = 36;
const SCALE = 9.5;
const OX = 34;
const OY = 22;
const SVG_W = OX + SCENE_W * SCALE + 10;
const SVG_H = OY + SCENE_H * SCALE + 16;

const GREEN = tokens.reliability.high;

type RectObject = {
  id: string;
  kind: "rect";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
type CircleObject = { id: string; kind: "circle"; label: string; cx: number; cy: number; r: number };
type SceneObject = RectObject | CircleObject;

const OBJECTS: SceneObject[] = [
  { id: "main", kind: "rect", label: "Gebäude (Hauptdach)", x: 10, y: 8, w: 30, h: 15 },
  { id: "annex", kind: "rect", label: "Anbau", x: 22, y: 23, w: 9, h: 8 },
  { id: "tree", kind: "circle", label: "Baum", cx: 44, cy: 12, r: 3 },
  { id: "car", kind: "rect", label: "Auto", x: 3, y: 26, w: 5, h: 2.5 },
  { id: "shed", kind: "rect", label: "Gartenhaus", x: 3, y: 4, w: 6, h: 5 },
];

const BUILDING_IDS = ["main", "annex"];

const px = (mx: number) => OX + mx * SCALE;
const py = (my: number) => OY + my * SCALE;

type MRect = { x0: number; y0: number; x1: number; y1: number };

function rectsOverlap(a: MRect, b: MRect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function objectInCell(object: SceneObject, cell: MRect): boolean {
  if (object.kind === "rect") {
    return rectsOverlap(cell, {
      x0: object.x,
      y0: object.y,
      x1: object.x + object.w,
      y1: object.y + object.h,
    });
  }
  const nearestX = Math.max(cell.x0, Math.min(object.cx, cell.x1));
  const nearestY = Math.max(cell.y0, Math.min(object.cy, cell.y1));
  return Math.hypot(object.cx - nearestX, object.cy - nearestY) <= object.r;
}

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

export function ResolutionCellExplorer() {
  const [sensor, setSensor] = useState<SensorId>("s1");
  // Boden-Sondierungspunkt in Metern: bleibt beim Sensorwechsel gleich, die
  // Zelle darum herum ändert nur ihre Größe. Default liegt bewusst dort, wo
  // sich Hauptdach und Anbau eine grobe S1-Zelle teilen.
  const [probe, setProbe] = useState<{ mx: number; my: number }>({ mx: 33, my: 20 });

  const cw = sensors[sensor].cellRangeM;
  const ch = sensors[sensor].cellAzimuthM;
  const cols = Math.ceil(SCENE_W / cw);
  const rows = Math.ceil(SCENE_H / ch);

  const cellMRect = (c: number, r: number): MRect => ({
    x0: c * cw,
    y0: r * ch,
    x1: Math.min((c + 1) * cw, SCENE_W),
    y1: Math.min((r + 1) * ch, SCENE_H),
  });

  // Zellen, die den Gebäude-Grundriss (Hauptdach + Anbau) berühren.
  let buildingCells = 0;
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const cell = cellMRect(c, r);
      if (OBJECTS.some((o) => BUILDING_IDS.includes(o.id) && objectInCell(o, cell))) {
        buildingCells += 1;
      }
    }
  }

  const selCol = clamp(Math.floor(probe.mx / cw), 0, cols - 1);
  const selRow = clamp(Math.floor(probe.my / ch), 0, rows - 1);
  const selCell = cellMRect(selCol, selRow);
  const objectsInCell = OBJECTS.filter((o) => objectInCell(o, selCell));

  const color = sensorColors[sensor];

  const gridLines: ReactElement[] = [];
  for (let c = 0; c <= cols; c += 1) {
    const x = px(Math.min(c * cw, SCENE_W));
    gridLines.push(
      <line key={`v${c}`} x1={x} y1={py(0)} x2={x} y2={py(SCENE_H)} stroke={color} strokeOpacity={0.32} strokeWidth={0.8} />
    );
  }
  for (let r = 0; r <= rows; r += 1) {
    const y = py(Math.min(r * ch, SCENE_H));
    gridLines.push(
      <line key={`h${r}`} x1={px(0)} y1={y} x2={px(SCENE_W)} y2={y} stroke={color} strokeOpacity={0.32} strokeWidth={0.8} />
    );
  }

  const clickCells: ReactElement[] = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const cell = cellMRect(c, r);
      const isSelected = c === selCol && r === selRow;
      clickCells.push(
        <rect
          key={`cell-${c}-${r}`}
          x={px(cell.x0)}
          y={py(cell.y0)}
          width={(cell.x1 - cell.x0) * SCALE}
          height={(cell.y1 - cell.y0) * SCALE}
          fill="transparent"
          className="cursor-pointer"
          role="button"
          aria-pressed={isSelected}
          aria-label={`Zelle Spalte ${c + 1}, Reihe ${r + 1}`}
          onClick={() => setProbe({ mx: (cell.x0 + cell.x1) / 2, my: (cell.y0 + cell.y1) / 2 })}
        />
      );
    }
  }

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SensorSwitch value={sensor} onChange={setSensor} />
        <ScopeBadge scope={sensor} detail={sensors[sensor].modeLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            role="img"
            aria-label="Draufsicht einer Szene mit Auflösungs-Zellraster"
            className="w-full rounded-md border border-border bg-background"
            style={{ minWidth: 420 }}
          >
            {/* Achsenbeschriftung */}
            <text x={px(SCENE_W / 2)} y={14} textAnchor="middle" fontSize={9.5} className="fill-muted-foreground">
              Range → {formatNumber(cw, 0)} m / Zelle
            </text>
            <text
              transform={`translate(12 ${py(SCENE_H / 2)}) rotate(-90)`}
              textAnchor="middle"
              fontSize={9.5}
              className="fill-muted-foreground"
            >
              Azimut → {formatNumber(ch, 0)} m / Zelle
            </text>

            {/* Szene-Objekte (Formen) */}
            <rect
              x={px(10)}
              y={py(8)}
              width={30 * SCALE}
              height={15 * SCALE}
              className="fill-foreground stroke-foreground"
              fillOpacity={0.1}
              strokeWidth={1.5}
            />
            <rect
              x={px(22)}
              y={py(23)}
              width={9 * SCALE}
              height={8 * SCALE}
              className="fill-foreground stroke-foreground"
              fillOpacity={0.05}
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
            <circle cx={px(44)} cy={py(12)} r={3 * SCALE} fill={GREEN} fillOpacity={0.18} stroke={GREEN} strokeWidth={1.2} />
            <rect
              x={px(3)}
              y={py(26)}
              width={5 * SCALE}
              height={2.5 * SCALE}
              className="fill-muted-foreground stroke-muted-foreground"
              fillOpacity={0.2}
              strokeWidth={1}
            />
            <rect
              x={px(3)}
              y={py(4)}
              width={6 * SCALE}
              height={5 * SCALE}
              className="fill-muted-foreground stroke-muted-foreground"
              fillOpacity={0.2}
              strokeWidth={1}
            />

            {/* Zellraster */}
            {gridLines}

            {/* Ausgewählte Zelle */}
            <rect
              x={px(selCell.x0)}
              y={py(selCell.y0)}
              width={(selCell.x1 - selCell.x0) * SCALE}
              height={(selCell.y1 - selCell.y0) * SCALE}
              fill={color}
              fillOpacity={0.22}
              stroke={color}
              strokeWidth={2}
              style={{ pointerEvents: "none" }}
            />

            {/* Objekt-Beschriftungen (über dem Raster, klicken geht hindurch) */}
            <g style={{ pointerEvents: "none" }} fontWeight={600}>
              <text x={px(25)} y={py(15.5)} textAnchor="middle" fontSize={9} className="fill-foreground">
                Gebäude
              </text>
              <text x={px(26.5)} y={py(27.5)} textAnchor="middle" fontSize={8} className="fill-foreground">
                Anbau
              </text>
              <text x={px(44)} y={py(16.5)} textAnchor="middle" fontSize={8} fill={GREEN}>
                Baum
              </text>
              <text x={px(5.5)} y={py(25)} textAnchor="middle" fontSize={7.5} className="fill-muted-foreground">
                Auto
              </text>
              <text x={px(6)} y={py(6.7)} textAnchor="middle" fontSize={7.5} className="fill-muted-foreground">
                Gartenhaus
              </text>
            </g>

            {/* Klickbare Zellen (oben, transparent) */}
            {clickCells}
          </svg>
        </div>

        {/* Seitenpanel */}
        <div className="grid content-start gap-3">
          <div className="rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-xs">
            <p className="font-semibold text-foreground">
              {buildingCells} Zellen decken das Gebäude
            </p>
            <p className="mt-0.5 text-muted-foreground">
              bei {formatNumber(cw, 0)} × {formatNumber(ch, 0)} m Zellgröße ({sensors[sensor].name})
            </p>
          </div>

          <div className="grid gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
            <p className="font-semibold text-foreground">Ausgewählte Zelle</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {formatNumber(cw, 0)} × {formatNumber(ch, 0)} m = {formatNumber(cw * ch, 0)} m²
            </p>
            <div>
              <p className="text-muted-foreground">In dieser Zelle liegt:</p>
              <ul className="mt-1 grid gap-0.5">
                {objectsInCell.length > 0 ? (
                  objectsInCell.map((o) => (
                    <li key={o.id} className="font-medium text-foreground">
                      · {o.label}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">· nur Boden / Umgebung</li>
                )}
              </ul>
            </div>
            {objectsInCell.length > 1 && (
              <p className="rounded bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
                Mehrere Objekte teilen sich diese Zelle — ihre Echos verschmelzen zu einem einzigen Wert.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Viele Elementarstreuer in der Zelle interferieren mal verstärkend, mal auslöschend
              (<GlossaryTerm term="speckle">Speckle</GlossaryTerm>).
            </p>
            <p className="text-[11px] font-medium leading-relaxed text-foreground">
              Das SAR-Bild speichert für diese Zelle genau eine komplexe Zahl (Amplitude + Phase).
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{FOOTNOTES.tsxCellModes}</p>
    </div>
  );
}
