/**
 * Diagramm Kapitel „Störanteile" (Teil B·2): die λ/4-Mehrdeutigkeit.
 *
 * Zeigt wahre gegen gemessene (phasengewrappte) Zeitreihe über zwölf
 * Aufnahme-Intervalle. Alle Werte deterministisch aus insarFacts
 * (dispPerIntervalMm, aliasingLimitMm, isAliased, phaseFromDeltaRMm,
 * wavelengthMm) — kein Zufall, kein Timer. Die gemessene Reihe entsteht durch
 * echtes Wrapping der Intervall-Phase in (−π, π]: solange die Bewegung pro
 * Intervall unter λ/4 bleibt, decken sich beide Kurven; darüber faltet die
 * Messung zurück und unterschätzt die Bewegung.
 *
 * Kernbotschaft: schnelle Bewegung geht am isolierten Ziel verloren, und die Grenze
 * ist sensorspezifisch (ScopeBadges an den λ/4-Werten).
 */
import { useState, type ReactNode } from "react";
import { LabeledSlider } from "@/components/ui";
import {
  aliasingLimitMm,
  dispPerIntervalMm,
  isAliased,
  phaseFromDeltaRMm,
  sensorIds,
  sensors,
  wavelengthMm,
  type SensorId,
} from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";
import { ScopeBadge, SensorSwitch, sensorColors } from "../insarUi";

const N_INTERVALS = 12;

const VIEW_W = 520;
const VIEW_H = 250;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 30;
const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

const TRUE_COLOR = tokens.series.displacement;
const DANGER = tokens.reliability.low;

/** Wickelt eine Phase in das Intervall (−π, π]. */
function wrapPhase(radians: number): number {
  const twoPi = 2 * Math.PI;
  return (((radians + Math.PI) % twoPi) + twoPi) % twoPi - Math.PI;
}

/* Zwei-Uhren-Panel: kleines Zifferblatt je Aufnahme (0° = oben, im Uhrzeigersinn). */
const CLOCK_VIEW = 120;
const CLOCK_C = CLOCK_VIEW / 2;
const CLOCK_R = 44;
const NEEDLE_R = CLOCK_R - 8;
const TRUE_ARC_R = CLOCK_R - 4; // wahre Drehung außen (dezent)
const ASSUMED_ARC_R = CLOCK_R - 16; // angenommene kleinste Drehung innen (betont)

const RAD2DEG = 180 / Math.PI;

/** Punkt auf dem Zifferblatt (Winkel im Uhrzeigersinn ab „oben"). */
function polarPoint(cx: number, cy: number, r: number, theta: number) {
  return { x: cx + r * Math.sin(theta), y: cy - r * Math.cos(theta) };
}

/** Kreisbogen ab „oben" um `sweep` rad (positiv = im Uhrzeigersinn). */
function arcPath(cx: number, cy: number, r: number, sweep: number): string {
  const start = polarPoint(cx, cy, r, 0);
  const end = polarPoint(cx, cy, r, sweep);
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return (
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ` +
    `A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  );
}

/** Winkel (rad) als Gradzahl ohne Vorzeichen, z. B. „260°". */
function fmtDeg(rad: number): string {
  return `${formatNumber(rad * RAD2DEG, 0)}°`;
}

/** Winkel (rad) als vorzeichenbehaftete Gradzahl, z. B. „−90°". */
function fmtDegSigned(rad: number): string {
  const deg = rad * RAD2DEG;
  return `${deg > 0 ? "+" : ""}${formatNumber(deg, 0)}°`;
}

/** Millimeter mit Vorzeichen (positiv = zum Satelliten), z. B. „+7,00 mm". */
function fmtMmSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 2)} mm`;
}

/** Beschreibt eine LOS-Bewegung als „zum/vom Satelliten um … mm" (Vorzeichenkonvention wie ΔR). */
function movementLabel(mm: number): string {
  if (Math.abs(mm) < 0.005) return "keine Bewegung";
  return `Bewegung ${mm > 0 ? "zum" : "vom"} Satelliten um ${formatNumber(Math.abs(mm), 2)} mm`;
}

/**
 * Kleines Zifferblatt mit einem Zeiger. Zusätzliche SVG-Elemente (Bögen,
 * Marker, Grenzachse) werden als `children` unter den Zeiger gelegt.
 */
function ClockDial({
  needleRad,
  needleColor,
  children,
}: {
  needleRad: number;
  needleColor: string;
  children?: ReactNode;
}) {
  const needle = polarPoint(CLOCK_C, CLOCK_C, NEEDLE_R, needleRad);
  return (
    <svg
      viewBox={`0 0 ${CLOCK_VIEW} ${CLOCK_VIEW}`}
      aria-hidden="true"
      className="w-full max-w-[128px]"
    >
      <circle
        cx={CLOCK_C}
        cy={CLOCK_C}
        r={CLOCK_R}
        fill="hsl(var(--background))"
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
      />
      {/* Viertel-Marken (0/90/180/270°) */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        const p1 = polarPoint(CLOCK_C, CLOCK_C, CLOCK_R - 5, a);
        const p2 = polarPoint(CLOCK_C, CLOCK_C, CLOCK_R, a);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            opacity={0.6}
          />
        );
      })}
      {children}
      {/* Zeiger */}
      <line
        x1={CLOCK_C}
        y1={CLOCK_C}
        x2={needle.x}
        y2={needle.y}
        stroke={needleColor}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={CLOCK_C} cy={CLOCK_C} r={3.5} fill={needleColor} />
    </svg>
  );
}

export function AliasingDemo() {
  const [sensor, setSensor] = useState<SensorId>("s1");
  const [revisitDays, setRevisitDays] = useState<number>(sensors.s1.defaultRevisitDays);
  const [velMmPerYear, setVelMmPerYear] = useState(500);

  const changeSensor = (id: SensorId) => {
    setSensor(id);
    setRevisitDays(sensors[id].defaultRevisitDays);
  };

  const dTrue = dispPerIntervalMm(velMmPerYear, revisitDays);
  const lambdaMm = wavelengthMm(sensor);
  // Wahre Zeigerdrehung zwischen den Aufnahmen (kann > 180° / mehrere Umläufe sein)
  // gegen die kleinste Drehung, die die Verarbeitung annimmt (Wrap auf (−180°, +180°]).
  const phaseTrueRad = phaseFromDeltaRMm(dTrue, sensor);
  const assumedRad = wrapPhase(phaseTrueRad);
  const dMeasured = (assumedRad * lambdaMm) / (4 * Math.PI);
  const twoPi = 2 * Math.PI;
  const trueMod = ((phaseTrueRad % twoPi) + twoPi) % twoPi; // Zeigerstellung Uhr 2 (0..2π)
  const fringes = phaseTrueRad / twoPi;
  const turnsNote = fringes >= 1 ? ` (${formatNumber(fringes, 1)} Umläufe)` : "";
  const limit = aliasingLimitMm(sensor);
  const aliased = isAliased(velMmPerYear, revisitDays, sensor);
  const accent = aliased ? DANGER : sensorColors[sensor];
  // Ergebnis-Ton des Uhren-Panels: grün (korrekt) bzw. danger (Fehlinterpretation).
  const panelAccent = aliased ? DANGER : TRUE_COLOR;

  // Ab dieser Rate wird die aktuelle Sensor/Wiederkehr-Kombination mehrdeutig
  // (linear in vel, deshalb ohne Kalenderkonstante herleitbar).
  const crossingVel = limit / dispPerIntervalMm(1, revisitDays);

  const trueCum = Array.from({ length: N_INTERVALS + 1 }, (_, i) => i * dTrue);
  const measCum = Array.from({ length: N_INTERVALS + 1 }, (_, i) => i * dMeasured);

  const values = [...trueCum, ...measCum, 0];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 2) hi = lo + 2;
  const span = hi - lo;
  lo -= span * 0.08;
  hi += span * 0.08;

  const xAt = (i: number) => PAD_L + (i / N_INTERVALS) * PLOT_W;
  const yAt = (v: number) => PAD_T + PLOT_H * (1 - (v - lo) / (hi - lo));

  const truePoints = trueCum.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const measPoints = measCum.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const zeroY = yAt(0);

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      {/* Steuerung */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SensorSwitch value={sensor} onChange={changeSensor} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Wiederkehr:</span>
          {sensors[sensor].revisitDaysOptions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={revisitDays === option}
              onClick={() => setRevisitDays(option)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                revisitDays === option
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {option} Tage
            </button>
          ))}
        </div>
      </div>

      <LabeledSlider
        label="Bewegungsrate entlang der Blicklinie (schnelle Massenbewegung)"
        valueLabel={`${formatNumber(velMmPerYear, 0)} mm/a`}
        min={0}
        max={900}
        step={5}
        value={[velMmPerYear]}
        onValueChange={([value]) => setVelMmPerYear(value)}
      />

      {/* Alarm / Status */}
      <div
        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs font-semibold"
        style={
          aliased
            ? { borderColor: DANGER, backgroundColor: `${DANGER}14`, color: DANGER }
            : undefined
        }
      >
        <span className={aliased ? undefined : "text-foreground"}>
          {aliased ? "Aliasing: am isolierten Einzelziel mehrdeutig" : "eindeutig messbar"}
        </span>
        <span className="font-mono font-normal text-muted-foreground">
          {formatNumber(dTrue, 2)} mm / Intervall
        </span>
      </div>

      {/* Zwei-Uhren-Panel: warum schon λ/4 die Bewegungsrichtung verschluckt */}
      <div className="grid gap-3 rounded-md border border-border bg-background p-3">
        <p className="text-xs font-semibold text-foreground">
          Der Zeiger zeigt nur die Stellung — nicht die Zahl der Umläufe
        </p>
        <div className="grid gap-4 md:grid-cols-[auto_auto_minmax(0,1fr)] md:items-center">
          {/* Uhr 1 — Aufnahme 1 */}
          <div className="grid justify-items-center gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Aufnahme 1</span>
            <ClockDial needleRad={0} needleColor="hsl(var(--foreground))" />
            <span className="text-[10px] text-muted-foreground">Zeiger bei 0°</span>
          </div>

          {/* Uhr 2 — Aufnahme 2: wahre (außen) gegen angenommene (innen) Drehung */}
          <div className="grid justify-items-center gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Aufnahme 2</span>
            <ClockDial needleRad={trueMod} needleColor="hsl(var(--foreground))">
              <marker
                id="aliasTrueArrow"
                markerWidth={6}
                markerHeight={6}
                refX={4.5}
                refY={3}
                orient="auto"
              >
                <path d="M0.5,0.5 L5,3 L0.5,5.5 Z" fill="hsl(var(--muted-foreground))" />
              </marker>
              <marker
                id="aliasAssumedArrow"
                markerWidth={6}
                markerHeight={6}
                refX={4.5}
                refY={3}
                orient="auto"
              >
                <path d="M0.5,0.5 L5,3 L0.5,5.5 Z" fill={panelAccent} />
              </marker>
              {/* Grenzachse 0°/180° */}
              <line
                x1={CLOCK_C}
                y1={CLOCK_C - CLOCK_R}
                x2={CLOCK_C}
                y2={CLOCK_C + CLOCK_R}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={0.75}
                strokeDasharray="2 2"
                opacity={0.5}
              />
              {/* wahre Drehung (dezent, außen) */}
              {trueMod > 0.02 && (
                <path
                  d={arcPath(CLOCK_C, CLOCK_C, TRUE_ARC_R, trueMod)}
                  fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  markerEnd="url(#aliasTrueArrow)"
                />
              )}
              {/* angenommene kleinste Drehung (betont, innen) */}
              {Math.abs(assumedRad) > 0.02 && (
                <path
                  d={arcPath(CLOCK_C, CLOCK_C, ASSUMED_ARC_R, assumedRad)}
                  fill="none"
                  stroke={panelAccent}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  markerEnd="url(#aliasAssumedArrow)"
                />
              )}
            </ClockDial>
            <span className="text-[10px] text-muted-foreground">Zeiger bei {fmtDeg(trueMod)}</span>
          </div>

          {/* Ergebnis-Spalte */}
          <div
            className="grid gap-1.5 rounded-md border px-3 py-2.5 text-xs"
            style={{ borderColor: panelAccent, backgroundColor: `${panelAccent}14` }}
          >
            <span className="font-semibold" style={{ color: panelAccent }}>
              {aliased ? "Fehlinterpretation" : "Interpretation korrekt"}
            </span>
            <div className="grid gap-1 font-mono text-[11px] text-foreground">
              <span>
                <span className="text-muted-foreground">wahre Drehung:</span>{" "}
                {fmtDeg(phaseTrueRad)}
                {turnsNote} — {movementLabel(dTrue)}
              </span>
              <span>
                <span className="text-muted-foreground">angenommene kleinste Drehung:</span>{" "}
                {fmtDegSigned(assumedRad)} — {movementLabel(dMeasured)}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: panelAccent }}>
              {aliased
                ? `Aus ${fmtMmSigned(dTrue)} echter Bewegung werden ${fmtMmSigned(dMeasured)} gemessen.`
                : "Kleinste und wahre Drehung sind gleich — die Bewegung wird richtig rekonstruiert."}
            </span>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Hin- und Rückweg des Signals zählen doppelt (Faktor 2): schon eine Bewegung von λ/4 ={" "}
          {formatNumber(limit, 1)} mm ({sensors[sensor].name}) dreht den Zeiger um eine halbe
          Umdrehung (180°). Ab dieser halben Umdrehung lässt sich „vorwärts“ nicht mehr von
          „rückwärts“ unterscheiden — die Verarbeitung nimmt immer die kleinste Zeigerdrehung an und
          deutet eine größere Bewegung als kleinere Gegenbewegung.
        </p>
      </div>

      {/* Zeitreihen-Plot */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Wahre gegen gemessene, phasengewrappte Bewegungszeitreihe"
        className="w-full rounded-md border border-border bg-background"
      >
        {/* Achsen */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="hsl(var(--border))" strokeWidth={1} />
        <line
          x1={PAD_L}
          y1={zeroY}
          x2={PAD_L + PLOT_W}
          y2={zeroY}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.5}
        />
        <text
          x={PAD_L - 6}
          y={zeroY + 3}
          textAnchor="end"
          fontSize={9}
          className="fill-current text-muted-foreground"
        >
          0
        </text>
        <text
          x={PAD_L + PLOT_W}
          y={PAD_T + PLOT_H + 20}
          textAnchor="end"
          fontSize={9}
          className="fill-current text-muted-foreground"
        >
          Aufnahme-Intervall →
        </text>
        <text
          x={PAD_L}
          y={PAD_T - 5}
          fontSize={9}
          className="fill-current text-muted-foreground"
        >
          kumulierte Bewegung (mm)
        </text>

        {/* wahre Bewegung */}
        <polyline points={truePoints} fill="none" stroke={TRUE_COLOR} strokeWidth={2.5} />
        {/* gemessene (gewrappte) Bewegung */}
        <polyline
          points={measPoints}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeDasharray="5 3"
        />
        {measCum.map((v, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(v)} r={2.6} fill={accent} />
        ))}
      </svg>

      {/* Legende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: TRUE_COLOR }} />
          wahre Bewegung
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: accent }} />
          gemessen (phasengewrappt)
        </span>
      </div>

      {/* Rechnung */}
      <div className="grid gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs text-muted-foreground">
        <p>
          Bewegung/Intervall = {formatNumber(velMmPerYear, 0)} mm/a · {revisitDays} d / Jahr ={" "}
          <span className="font-semibold text-foreground">{formatNumber(dTrue, 2)} mm</span>
        </p>
        <p>
          λ/4-Grenze ({sensors[sensor].name}) ={" "}
          <span className="font-semibold text-foreground">{formatNumber(limit, 1)} mm</span>
        </p>
        <p>
          {formatNumber(dTrue, 2)} mm {aliased ? "≥" : "<"} {formatNumber(limit, 1)} mm →{" "}
          <span className="font-semibold" style={{ color: aliased ? DANGER : "hsl(var(--foreground))" }}>
            {aliased ? "mehrdeutig (Aliasing)" : "eindeutig"}
          </span>
          {" — "}Grenze bei {formatNumber(crossingVel, 0)} mm/a ({revisitDays} d Wiederkehr)
        </p>
      </div>

      {/* Sensorspezifische Grenzwerte */}
      <div className="grid gap-2 sm:grid-cols-2">
        {sensorIds.map((id) => (
          <div
            key={id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs",
              id === sensor ? "border-foreground/40 shadow-sm" : "border-border opacity-70"
            )}
          >
            <ScopeBadge scope={id} detail={`λ/4 = ${formatNumber(aliasingLimitMm(id), 1)} mm`} />
            <span className="text-muted-foreground">
              kürzere Welle → engere Grenze
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Typische Bewegungen in der Stadt (Millimeter bis wenige Zentimeter pro Jahr) liegen weit
        links und werden eindeutig gemessen. Erst schnelle Massenbewegungen wie Rutschungen können
        die λ/4-Grenze pro Intervall überschreiten — dann unterschätzt oder verdreht die Messung die
        Bewegung. Eine kürzere Wiederkehr (mehr Aufnahmen) verschiebt diese Grenze nach oben.
      </p>
    </div>
  );
}
