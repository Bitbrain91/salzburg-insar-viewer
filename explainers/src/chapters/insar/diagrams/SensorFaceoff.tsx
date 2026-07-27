/**
 * Sensor-Gegenüberstellung (Kap. 8): zwei Kennzahl-Vergleichskarten
 * (Sentinel-1 / TerraSAR-X), drei Steckbriefe der realen Salzburger
 * Datensätze und ein schmaler Missions-Zeitstrahl der belegten Zeitspannen.
 *
 * Reine DOM-/SVG-Darstellung ohne Laufzeit-Interaktion — alle Werte kommen
 * aus `insarFacts` (kein hartkodierter Zahlenwert). Die vier dokumentierten
 * Quellen-Diskrepanzen/Modushinweise werden als sichtbare Fußnoten gerendert;
 * Genauigkeitswerte erscheinen nie ohne die `ConditionsNote`.
 */
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { formatDegrees } from "@/lib/format";
import {
  aliasingLimitMm,
  convergence,
  FOOTNOTES,
  geoAccuracy1Sigma,
  salzburgS1,
  salzburgTsx,
  sensorIds,
  sensors,
  timeline,
  type Scope,
  type SensorId,
} from "@/content/insarFacts";
import { ConditionsNote, ScopeBadge, scopeColors, scopeLabels, sensorColors } from "../insarUi";

/** Österreichische Zahlanzeige ohne erzwungene Nachkommastellen. */
function num(value: number, maxDigits = 1): string {
  return value.toLocaleString("de-AT", { maximumFractionDigits: maxDigits });
}

/** Ganzzahl mit Tausenderpunkt, z. B. 923.017. */
function count(value: number): string {
  return value.toLocaleString("de-AT");
}

/** Fußnotenmarker (hochgestellt), verweist auf den nummerierten Block unten. */
function Fn({ n }: { n: number }) {
  return <sup className="ml-0.5 font-mono text-[9px] font-bold text-primary">{n}</sup>;
}

/**
 * Nummerierte Fußnoten der Vergleichstabelle (Reihenfolge = Markernummer):
 * 1 λ-Diskrepanz S1, 2 TSX-Zellmodi, 3 S1-Wiederkehr, 4 Ost-Diskrepanz S1.
 */
const compareFootnotes: string[] = [
  FOOTNOTES.s1Wavelength,
  FOOTNOTES.tsxCellModes,
  FOOTNOTES.s1Revisit,
  FOOTNOTES.s1EastAccuracy,
];

type CompareRow = {
  key: string;
  label: string;
  render: (sensor: SensorId) => ReactNode;
};

const compareRows: CompareRow[] = [
  {
    key: "band",
    label: "Band / Wellenlänge",
    render: (s) => (
      <>
        {sensors[s].band}-Band · {num(sensors[s].wavelengthCm, 2)} cm
        {s === "s1" && <Fn n={1} />}
      </>
    ),
  },
  {
    key: "cell",
    label: "Auflösungszelle",
    render: (s) => (
      <span className="flex flex-col items-end">
        <span>
          {sensors[s].cellRangeM} × {sensors[s].cellAzimuthM} m{s === "tsx" && <Fn n={2} />}
        </span>
        <span className="text-[10px] font-normal text-muted-foreground">{sensors[s].modeLabel}</span>
      </span>
    ),
  },
  {
    key: "revisit",
    label: "Wiederkehr",
    render: (s) => {
      const opts = sensors[s].revisitDaysOptions;
      return opts.length > 1 ? (
        <>
          {opts[0]}–{opts[opts.length - 1]} Tage
          <Fn n={3} />
        </>
      ) : (
        <>{opts[0]} Tage</>
      );
    },
  },
  {
    key: "aliasing",
    label: "λ/4-Grenze je Intervall",
    render: (s) => <>{num(aliasingLimitMm(s), 1)} mm</>,
  },
  {
    key: "geo",
    label: "Geokodierung 1σ (N / O / H)",
    render: (s) => {
      const g = geoAccuracy1Sigma[s];
      return (
        <>
          N ±{num(g.northM)} m · O ±{num(g.eastM)} m{s === "s1" && <Fn n={4} />} · H ±
          {num(g.heightM)} m
        </>
      );
    },
  },
  {
    key: "convergence",
    label: "Einschwingzeit bis σ(Rate) < 1 mm/a",
    render: (s) => {
      const c = convergence[s];
      return (
        <>
          {c.monthsToSigma1[0]}–{c.monthsToSigma1[1]} Monate · ~{c.scenesApprox} Szenen
        </>
      );
    },
  },
];

/** Eine Sensor-Vergleichskarte mit farbiger Akzentleiste. */
function SensorCard({ sensor }: { sensor: SensorId }) {
  const s = sensors[sensor];
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: sensorColors[sensor] }} />
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="grid gap-0.5">
            <h4 className="text-base font-bold text-foreground">{s.name}</h4>
            <p className="text-[11px] text-muted-foreground">{s.band}-Band</p>
          </div>
          <ScopeBadge scope={sensor} detail={`${s.band}-Band`} />
        </div>
        <dl className="grid gap-0 text-xs">
          {compareRows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_auto] items-start gap-3 border-t border-border py-2 first:border-t-0"
            >
              <dt className="leading-snug text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-mono font-semibold text-foreground">
                {row.render(sensor)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

/** Schlüssel-Wert-Steckbrief eines konkreten Salzburg-Datensatzes. */
function Steckbrief({
  title,
  scope,
  detail,
  rows,
}: {
  title: string;
  scope: Scope;
  detail: string;
  rows: Array<[string, ReactNode]>;
}) {
  return (
    <Card className="grid content-start gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold leading-snug text-foreground">{title}</h4>
        <ScopeBadge scope={scope} detail={detail} />
      </div>
      <dl className="grid gap-1.5 text-xs">
        {rows.map(([schluessel, wert]) => (
          <div key={schluessel} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{schluessel}</dt>
            <dd className="text-right font-medium text-foreground">{wert}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Schmaler SVG-Zeitstrahl der belegten Zeitspannen (nur Quellen-Daten). */
function MissionTimeline() {
  const yearMin = Math.min(...timeline.map((t) => t.von));
  const yearMax = Math.max(...timeline.map((t) => t.bis));

  const VIEW_W = 640;
  const ML = 10;
  const MR = 10;
  const MT = 10;
  const MB = 26;
  const rowH = 32;
  const barH = 15;
  const plotW = VIEW_W - ML - MR;
  const axisY = MT + timeline.length * rowH + 4;
  const VIEW_H = MT + timeline.length * rowH + MB;

  const x = (year: number) => ML + ((year - yearMin) / (yearMax - yearMin)) * plotW;

  const tickSet = new Set<number>([yearMin, yearMax]);
  for (let y = Math.ceil(yearMin / 5) * 5; y <= yearMax; y += 5) tickSet.add(y);
  const tickYears = [...tickSet].sort((a, b) => a - b);

  const scopesPresent = [...new Set(timeline.map((t) => t.scope))] as Scope[];

  return (
    <div className="grid gap-3">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Zeitstrahl der belegten Aufnahme-Zeitspannen von 1992 bis 2025"
        className="w-full"
      >
        {/* Jahres-Gitternetz */}
        <g className="text-muted-foreground" stroke="currentColor" opacity={0.25}>
          {tickYears.map((year) => (
            <line key={year} x1={x(year)} y1={MT} x2={x(year)} y2={axisY} strokeWidth={1} />
          ))}
        </g>

        {/* Balken je belegter Zeitspanne */}
        {timeline.map((span, i) => {
          const rowTop = MT + i * rowH;
          const barY = rowTop + 13;
          const bx = x(span.von);
          const bw = Math.max(x(span.bis) - x(span.von), 2);
          // Späte Zeitspannen beschriften am Balkenende, sonst läuft das
          // Label rechts aus dem Zeichenbereich (z. B. Salzburg Sentinel-1).
          const labelAtEnd = bx > ML + (VIEW_W - ML - MR) / 2;
          return (
            <g key={span.label}>
              <text
                x={labelAtEnd ? bx + bw : bx}
                y={rowTop + 9}
                fontSize={10.5}
                fontWeight={600}
                textAnchor={labelAtEnd ? "end" : "start"}
                className="fill-current text-foreground"
              >
                {span.label}
              </text>
              <rect
                x={bx}
                y={barY}
                width={bw}
                height={barH}
                rx={3}
                fill={scopeColors[span.scope]}
                opacity={0.85}
              >
                <title>
                  {span.label} ({span.von}–{span.bis}) — {span.quelle}
                </title>
              </rect>
            </g>
          );
        })}

        {/* Jahresachse */}
        <line
          x1={ML}
          y1={axisY}
          x2={VIEW_W - MR}
          y2={axisY}
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
        />
        {tickYears.map((year) => (
          <text
            key={year}
            x={x(year)}
            y={axisY + 15}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-current text-muted-foreground"
          >
            {year}
          </text>
        ))}
      </svg>

      {/* Legende + Herkunftshinweis */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {scopesPresent.map((scope) => (
          <span key={scope} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: scopeColors[scope] }}
            />
            {scopeLabels[scope]}
          </span>
        ))}
        <span className="text-muted-foreground/80">
          Nur belegte Zeitspannen — Quelle je Balken als Tooltip.
        </span>
      </div>
    </div>
  );
}

export function SensorFaceoff() {
  const tsxRows: Array<[string, ReactNode]> = [
    ["Bahn", `absteigend (${salzburgTsx.pass})`],
    ["Modus", salzburgTsx.mode],
    ["Einfallswinkel θ", formatDegrees(salzburgTsx.thetaDeg, 2)],
    ["Szenen", `${salzburgTsx.scenes} (${salzburgTsx.discardedScenes} verworfen)`],
    ["Zeitraum", salzburgTsx.period],
    ["Punkte", count(salzburgTsx.points)],
    [
      "Dichte",
      `~${count(salzburgTsx.densityPerKm2)} Pkt/km² (${num(salzburgTsx.areaKm2)} km²)`,
    ],
    ["Verarbeitung", salzburgTsx.processing],
    ["Referenzpunkt", salzburgTsx.refPoint],
  ];

  const s1Detail = `${sensors.s1.band}-Band`;
  const ascRows: Array<[string, ReactNode]> = [
    ["Track", `T${salzburgS1.asc.track}`],
    ["Blickrichtung", salzburgS1.asc.blick],
    ["Punkte (Bewegungsdaten)", count(salzburgS1.asc.points)],
    ["Epochen", `${salzburgS1.asc.epochs}`],
    ["Zeitraum", salzburgS1.asc.period],
    ["Amplituden-Rohdaten", `${count(salzburgS1.ampPoints.asc)} Pkt (separat)`],
  ];
  const dscRows: Array<[string, ReactNode]> = [
    ["Track", `T${salzburgS1.dsc.track}`],
    ["Blickrichtung", salzburgS1.dsc.blick],
    ["Punkte (Bewegungsdaten)", count(salzburgS1.dsc.points)],
    ["Epochen", `${salzburgS1.dsc.epochs}`],
    ["Zeitraum", salzburgS1.dsc.period],
    ["Amplituden-Rohdaten", `${count(salzburgS1.ampPoints.dsc)} Pkt (separat)`],
  ];

  return (
    <div className="grid gap-6">
      {/* (a) Kennzahlen im direkten Vergleich */}
      <section className="grid gap-3">
        <h3 className="text-sm font-bold text-foreground">Kennzahlen im direkten Vergleich</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {sensorIds.map((s) => (
            <SensorCard key={s} sensor={s} />
          ))}
        </div>
        <Card className="grid gap-3 p-4">
          <ConditionsNote />
          <ol className="grid gap-1.5">
            {compareFootnotes.map((text, i) => (
              <li
                key={i}
                className="grid grid-cols-[1.1rem_1fr] gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
              >
                <span className="font-mono font-bold text-primary">{i + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* (b) Die realen Salzburger Datensätze */}
      <section className="grid gap-3">
        <h3 className="text-sm font-bold text-foreground">Die realen Salzburger Datensätze</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Steckbrief
            title={`${sensors.tsx.name} — Track ${salzburgTsx.track}`}
            scope="tsx"
            detail={`${sensors.tsx.band}-Band`}
            rows={tsxRows}
          />
          <Steckbrief
            title={`${sensors.s1.name} — Track ${salzburgS1.asc.track}`}
            scope="s1"
            detail={s1Detail}
            rows={ascRows}
          />
          <Steckbrief
            title={`${sensors.s1.name} — Track ${salzburgS1.dsc.track}`}
            scope="s1"
            detail={s1Detail}
            rows={dscRows}
          />
        </div>
      </section>

      {/* (c) Belegte Zeitspannen */}
      <section className="grid gap-3">
        <h3 className="text-sm font-bold text-foreground">
          Belegte Zeitspannen {Math.min(...timeline.map((t) => t.von))}–
          {Math.max(...timeline.map((t) => t.bis))}
        </h3>
        <Card className="p-4">
          <MissionTimeline />
        </Card>
      </section>
    </div>
  );
}
