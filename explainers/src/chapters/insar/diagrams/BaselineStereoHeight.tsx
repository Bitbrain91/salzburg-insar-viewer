/**
 * Kapitel „Lage & Höhe", Diagramm 6.3: „Baseline-Stereo: Höhe aus dem Stapel".
 *
 * Kernbotschaft: Die Feinhöhe eines Punkts ist der über den Bildstapel
 * gefittete DEM-Restfehler ε (TRE §11.3 S.61; §2.1.1.1 S.12: Höhe „estimated
 * from the phase values"). Jede Szene blickt von einer minimal anderen
 * Orbitposition (Baseline Bn, TRE §9 S.50; Sentinel-1-Röhre < 50 m, §10
 * S.55) — der Phasenrest je Szene wächst proportional zu Bn·ε, und die
 * Steigung dieser Geraden IST die Höhenschätzung (Stereo-Prinzip).
 *
 * Der Readout-Kontrast löst das Wellenlängen-Paradoxon: Bei Bewegung
 * entspricht ein Phasenumlauf λ/2 (Millimeter), bei der Höhe der
 * Mehrdeutigkeitshöhe hₐ = λ·R·sinθ/(2·Bn) (zig bis hunderte Meter), weil
 * die Höhe nur über die winzige Blickwinkel-Parallaxe wirkt. hₐ-Formel und
 * Schrägentfernungs-Größenordnung: STANDARDWISSEN über die Handbücher
 * hinaus (FOOTNOTES.heightOfAmbiguity). Baselines und Streu-Offsets der
 * Punktwolke: DIDAKTIK, deterministisch.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { LabeledSlider } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import {
  baselinePresets,
  FOOTNOTES,
  fringeSpacingMm,
  geoAccuracy1Sigma,
  heightEstimation,
  heightOfAmbiguityM,
  topoResidualPhaseRad,
  type BaselinePresetId,
  type SensorId,
} from "@/content/insarFacts";
import { formatMeters, formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";
import { ConditionsNote, ScopeBadge, SensorSwitch, sensorColors } from "../insarUi";

/** DIDAKTIK: deterministische Streu-Offsets (Anteile eines Umlaufs) je Szene. */
const NOISE_FRACTIONS = [0.035, -0.045, 0.02, -0.025, 0.05, -0.03, 0.015, -0.04] as const;

const FIT_COLOR = tokens.series.displacement;
const AMBIG_COLOR = tokens.reliability.medium;

/* ---- linke Szene: zwei Orbitpositionen, ε über der Referenzfläche ---- */
const SC_W = 280;
const SC_H = 216;
const SC_REF_Y = 168;
const SC_TARGET_X = 196;
const SC_SAT_Y = 30;
const SC_SAT_X = 92;
const SC_PX_PER_M = 1.7;

/* ---- rechter Plot: Phasenrest über Bn ------------------------------- */
const PL_W = 340;
const PL_H = 216;
const PL_PAD = { l: 40, r: 12, t: 14, b: 30 };
const BN_DOMAIN = 200; // m
const FR_DOMAIN = 1.3; // Umläufe

function plotX(bnM: number): number {
  return PL_PAD.l + ((bnM + BN_DOMAIN) / (2 * BN_DOMAIN)) * (PL_W - PL_PAD.l - PL_PAD.r);
}
function plotY(fraction: number): number {
  const clamped = Math.max(-FR_DOMAIN, Math.min(FR_DOMAIN, fraction));
  return PL_PAD.t + (1 - (clamped + FR_DOMAIN) / (2 * FR_DOMAIN)) * (PL_H - PL_PAD.t - PL_PAD.b);
}

export function BaselineStereoHeight() {
  const [sensor, setSensor] = useState<SensorId>("s1");
  const [preset, setPreset] = useState<BaselinePresetId>("eng");
  const [epsM, setEpsM] = useState(16);

  const baselines = baselinePresets[preset].bnM;
  const maxBn = Math.max(...baselines.map(Math.abs));
  const fractionAt = (bnM: number) => topoResidualPhaseRad(epsM, bnM, sensor) / (2 * Math.PI);
  const points = baselines.map((bn, i) => ({
    bn,
    fraction: fractionAt(bn) + NOISE_FRACTIONS[i],
  }));
  const anyAmbiguous = points.some((p) => Math.abs(p.fraction) > 0.5);
  const ha = heightOfAmbiguityM(sensor, maxBn);

  const satGapPx = preset === "eng" ? 26 : 62;
  const targetY = SC_REF_Y - epsM * SC_PX_PER_M;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SensorSwitch value={sensor} onChange={setSensor} />
        <div
          role="group"
          aria-label="Baseline-Spanne wählen"
          className="grid w-fit grid-cols-2 gap-0.5 rounded-lg border border-border bg-muted p-0.5"
        >
          {(Object.keys(baselinePresets) as BaselinePresetId[]).map((id) => {
            const isActive = id === preset;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setPreset(id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
                  isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Baselines {baselinePresets[id].label}
              </button>
            );
          })}
        </div>
      </div>

      <LabeledSlider
        label="Wahre Höhe des Streuers über der Referenzfläche (DEM-Restfehler ε)"
        valueLabel={formatMeters(epsM, 0)}
        min={-20}
        max={40}
        step={2}
        value={[epsM]}
        onValueChange={([value]) => setEpsM(value)}
      />

      <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
        {/* Szene: zwei von vielen Orbitpositionen */}
        <figure className="grid content-start gap-1.5">
          <svg
            viewBox={`0 0 ${SC_W} ${SC_H}`}
            role="img"
            aria-label="Zwei leicht versetzte Satellitenpositionen blicken auf denselben Streuer, der um ε über der Referenzfläche liegt."
            className="w-full rounded-md border border-border bg-background"
          >
            {/* zwei Orbitpositionen mit Bn-Abstand */}
            <g transform={`translate(${SC_SAT_X} ${SC_SAT_Y})`}>
              <Satellite width={18} height={18} x={-9} y={-9} className="text-foreground" strokeWidth={1.6} />
            </g>
            <g transform={`translate(${SC_SAT_X + satGapPx} ${SC_SAT_Y})`} opacity={0.55}>
              <Satellite width={18} height={18} x={-9} y={-9} className="text-foreground" strokeWidth={1.6} />
            </g>
            <line
              x1={SC_SAT_X}
              y1={SC_SAT_Y - 16}
              x2={SC_SAT_X + satGapPx}
              y2={SC_SAT_Y - 16}
              className="stroke-muted-foreground"
              strokeWidth={1}
              markerStart="url(#bsh-muted)"
              markerEnd="url(#bsh-muted)"
            />
            <text
              x={SC_SAT_X + satGapPx / 2}
              y={SC_SAT_Y - 21}
              textAnchor="middle"
              fontSize={8.5}
              className="fill-muted-foreground"
            >
              Bn (überzeichnet)
            </text>
            <defs>
              <marker id="bsh-muted" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
              </marker>
              <marker id="bsh-eps" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 Z" fill={FIT_COLOR} />
              </marker>
            </defs>

            {/* Blickstrahlen beider Positionen auf den Streuer */}
            <line x1={SC_SAT_X} y1={SC_SAT_Y + 10} x2={SC_TARGET_X} y2={targetY} stroke={sensorColors[sensor]} strokeWidth={1.5} />
            <line
              x1={SC_SAT_X + satGapPx}
              y1={SC_SAT_Y + 10}
              x2={SC_TARGET_X}
              y2={targetY}
              stroke={sensorColors[sensor]}
              strokeWidth={1.3}
              strokeDasharray="5 3"
              opacity={0.7}
            />

            {/* Referenzfläche + Streuer + ε-Pfeil */}
            <line x1={8} y1={SC_REF_Y} x2={SC_W - 8} y2={SC_REF_Y} className="stroke-border" strokeWidth={1.6} />
            <text x={12} y={SC_REF_Y + 12} fontSize={8.5} className="fill-muted-foreground">
              Referenzfläche (Höhenmodell)
            </text>
            <circle cx={SC_TARGET_X} cy={targetY} r={4.5} fill={FIT_COLOR} stroke="white" strokeWidth={1.5} className="transition-all duration-300" />
            {Math.abs(epsM) >= 2 && (
              <g className="transition-all duration-300">
                <line
                  x1={SC_TARGET_X + 16}
                  y1={SC_REF_Y}
                  x2={SC_TARGET_X + 16}
                  y2={targetY}
                  stroke={FIT_COLOR}
                  strokeWidth={1.3}
                  markerStart="url(#bsh-eps)"
                  markerEnd="url(#bsh-eps)"
                />
                <text x={SC_TARGET_X + 22} y={(SC_REF_Y + targetY) / 2 + 3} fontSize={9} fontWeight={600} fill={FIT_COLOR}>
                  ε
                </text>
              </g>
            )}
          </svg>
          <figcaption className="text-[11px] leading-relaxed text-muted-foreground">
            Zwei von vielen Aufnahmepositionen: Jede Szene des Stapels blickt mit eigener
            Baseline Bn minimal anders auf den Streuer — die Höhe ε wird als winzige Parallaxe
            in der Phase sichtbar.
          </figcaption>
        </figure>

        {/* Stapel-Plot: Phasenrest über Bn */}
        <figure className="grid content-start gap-1.5">
          <svg
            viewBox={`0 0 ${PL_W} ${PL_H}`}
            role="img"
            aria-label="Streudiagramm: Phasenrest je Szene über der Baseline, mit Fit-Gerade durch den Ursprung; die Steigung entspricht der Höhe ε."
            className="w-full rounded-md border border-border bg-background"
          >
            {/* ±½-Umlauf-Band */}
            <rect
              x={PL_PAD.l}
              y={plotY(0.5)}
              width={PL_W - PL_PAD.l - PL_PAD.r}
              height={plotY(-0.5) - plotY(0.5)}
              fill={FIT_COLOR}
              opacity={0.06}
            />
            {[0.5, -0.5].map((band) => (
              <line
                key={band}
                x1={PL_PAD.l}
                y1={plotY(band)}
                x2={PL_W - PL_PAD.r}
                y2={plotY(band)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}
            <text x={PL_W - PL_PAD.r - 2} y={plotY(0.5) - 3} textAnchor="end" fontSize={8} className="fill-muted-foreground">
              +½ Umlauf
            </text>
            <text x={PL_W - PL_PAD.r - 2} y={plotY(-0.5) + 9} textAnchor="end" fontSize={8} className="fill-muted-foreground">
              −½ Umlauf
            </text>

            {/* Achsen */}
            <line x1={PL_PAD.l} y1={plotY(0)} x2={PL_W - PL_PAD.r} y2={plotY(0)} className="stroke-muted-foreground" strokeWidth={1} opacity={0.6} />
            <line x1={plotX(0)} y1={PL_PAD.t} x2={plotX(0)} y2={PL_H - PL_PAD.b} className="stroke-muted-foreground" strokeWidth={1} opacity={0.35} />
            {[-200, -100, 100, 200].map((tick) => (
              <text key={tick} x={plotX(tick)} y={PL_H - PL_PAD.b + 12} textAnchor="middle" fontSize={8} className="fill-muted-foreground">
                {tick}
              </text>
            ))}
            <text x={(PL_PAD.l + PL_W - PL_PAD.r) / 2} y={PL_H - 4} textAnchor="middle" fontSize={8.5} className="fill-muted-foreground">
              senkrechte Baseline Bn [m]
            </text>
            <text
              x={12}
              y={(PL_PAD.t + PL_H - PL_PAD.b) / 2}
              textAnchor="middle"
              fontSize={8.5}
              className="fill-muted-foreground"
              transform={`rotate(-90 12 ${(PL_PAD.t + PL_H - PL_PAD.b) / 2})`}
            >
              Phasenrest [Umläufe]
            </text>

            {/* Fit-Gerade durch den Ursprung: Steigung ∝ ε */}
            <line
              x1={plotX(-BN_DOMAIN)}
              y1={plotY(fractionAt(-BN_DOMAIN))}
              x2={plotX(BN_DOMAIN)}
              y2={plotY(fractionAt(BN_DOMAIN))}
              stroke={FIT_COLOR}
              strokeWidth={1.8}
              className="transition-all duration-300"
            />

            {/* Szenen-Punkte */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={plotX(p.bn)}
                cy={plotY(p.fraction)}
                r={3.4}
                fill={Math.abs(p.fraction) > 0.5 ? AMBIG_COLOR : FIT_COLOR}
                stroke="white"
                strokeWidth={1}
                className="transition-all duration-300"
              />
            ))}
          </svg>
          <figcaption className="text-[11px] leading-relaxed text-muted-foreground">
            Jeder Punkt ist eine Szene des Stapels (hier 8 didaktische von real ~100). Die
            Verarbeitung legt eine Gerade durch die Wolke:{" "}
            <span className="font-semibold text-foreground">die Steigung ist die Höhe ε.</span>
            {anyAmbiguous && (
              <>
                {" "}
                Punkte außerhalb von ±½ Umlauf wären einzeln mehrdeutig — erst der gemeinsame
                Fit über viele verschiedene Baselines legt ε fest.
              </>
            )}
          </figcaption>
        </figure>
      </div>

      {/* Kontrast-Readout: warum Meter statt Millimeter */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
          <span className="font-semibold text-foreground">Bewegung (Kap. 2)</span>
          <span className="text-muted-foreground">
            1 Phasenumlauf = λ/2 ={" "}
            <span className="font-mono font-semibold text-foreground">
              {formatNumber(fringeSpacingMm(sensor), 1)} mm
            </span>{" "}
            Wegänderung — Millimeter-Maßband.
          </span>
        </div>
        <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
          <span className="font-semibold text-foreground">Höhe (dieses Diagramm)</span>
          <span className="text-muted-foreground">
            1 Phasenumlauf ≈ hₐ ={" "}
            <span className="font-mono font-semibold text-foreground">
              {formatMeters(ha, 0)}
            </span>{" "}
            Höhe (bei Bn = {formatMeters(maxBn, 0)}) — deshalb Meter-Präzision:{" "}
            <span className="font-mono">±{formatMeters(geoAccuracy1Sigma[sensor].heightM, 1)}</span> (1σ).
          </span>
        </div>
      </div>

      <FindingCard
        tone="neutral"
        label={`Steigung der Fit-Geraden ⇒ ε ≈ ${formatMeters(epsM, 0)}`}
        detail="Genau dieser Fit über den Bildstapel ist die Höhenschätzung: gelieferte Höhe = Referenzhöhe + ε, und h_stdev beziffert die Streuung des Fits. Das Höhenmodell liefert nur den Startwert — die Dachkante darf deshalb höher liegen, als das Geländemodell es kennt."
      />

      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope="allgemein" detail="Stereo-Prinzip" />
        {preset === "eng" && (
          <span className="text-[11px] text-muted-foreground">
            „Eng" entspricht der Sentinel-1-Orbitalröhre unter {heightEstimation.s1OrbitalTubeMaxM} m
            (TRE §10 S. 55); Baselines generell bis einige hundert Meter (TRE §9 S. 50).
          </span>
        )}
      </div>

      <ConditionsNote variant="geo" />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {FOOTNOTES.heightOfAmbiguity}
      </p>
    </div>
  );
}
