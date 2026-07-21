/**
 * Interaktiver Entscheidungs-Stepper für das Differential-Level (Stufe 8).
 *
 * Korrektheitsanker: differentialLevel/candidateThresholdMmA aus facts.ts
 * replizieren die diffv2-Logik 1:1 (Z. 1663, 1712–1767): Schwelle
 * max(1,5 | allowed_diff), significant ab 2 Sigma und ≥ 3 Punkten je
 * Cluster, confirmed durch gleichgerichtetes Delta der zweiten Geometrie,
 * Downgrades je −1 Rang mit Floor candidate.
 */
import { useState } from "react";
import { LabeledSlider, Toggle } from "@/components/ui";
import {
  allowedDiffMmA,
  candidateThresholdMmA,
  differential,
  differentialLevel,
  type DifferentialDowngrade,
  type DifferentialLevel,
} from "@/content/facts";
import { DIFFERENTIAL_LEVEL_LABELS, tokens } from "@/lib/designTokens";
import { formatDegrees, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const LEVEL_ORDER: DifferentialLevel[] = ["none", "candidate", "significant", "confirmed"];

const LEVEL_TEXT: Record<DifferentialLevel, string> = {
  none: "Kein Sekundärcluster überschreitet die Kandidatenschwelle.",
  candidate: "Der Unterschied überschreitet die physikalische Schwelle — Signifikanz oder Stützung reichen aber (noch) nicht.",
  significant: "Der Unterschied ist statistisch belastbar: mindestens doppelt so groß wie seine Unsicherheit, mit ausreichend Punkten auf beiden Seiten.",
  confirmed: "Die zweite Blickrichtung bestätigt ein gleichgerichtetes, über der Schwelle liegendes Delta.",
};

const DOWNGRADE_TEXT: Record<DifferentialDowngrade, string> = {
  small_n_guard: "Zu wenige Punkte für belastbare Signifikanz (unter 3 je Cluster)",
  season_amp_mismatch: "Stark unterschiedliche Saisonalität zwischen den Clustern",
  unstable_amplitude: "Instabile Amplitude des Sekundärclusters",
};

export function DifferentialStepper() {
  const [deltaAbs, setDeltaAbs] = useState(3.2);
  const [sigmaDelta, setSigmaDelta] = useState(1.0);
  const [nMain, setNMain] = useState(5);
  const [nSecondary, setNSecondary] = useState(3);
  const [slope, setSlope] = useState(0);
  const [confirmedByOtherTrack, setConfirmedByOtherTrack] = useState(false);
  const [seasonMismatch, setSeasonMismatch] = useState(false);
  const [unstableAmplitude, setUnstableAmplitude] = useState(false);

  const threshold = candidateThresholdMmA(allowedDiffMmA(slope));
  const { level, downgrades } = differentialLevel({
    deltaAbsMmA: deltaAbs,
    sigmaDeltaMmA: sigmaDelta,
    nMain,
    nSecondary,
    candidateThresholdMmA: threshold,
    confirmedByOtherTrack,
    seasonAmpMismatch: seasonMismatch,
    unstableAmplitude,
  });
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const passesSigma = deltaAbs >= differential.sigmaFactor * sigmaDelta;
  const smallNGuard =
    Math.min(nMain, nSecondary) < differential.minPointsForSignificance;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LabeledSlider
          label="Bewegungsunterschied |Δ| zum Hauptcluster"
          valueLabel={`${formatNumber(deltaAbs, 1)} mm/a`}
          min={0}
          max={8}
          step={0.1}
          value={[deltaAbs]}
          onValueChange={([value]) => setDeltaAbs(value)}
        />
        <LabeledSlider
          label="Unsicherheit σ_Δ des Unterschieds"
          valueLabel={`${formatNumber(sigmaDelta, 2)} mm/a`}
          min={0.1}
          max={3}
          step={0.05}
          value={[sigmaDelta]}
          onValueChange={([value]) => setSigmaDelta(value)}
        />
        <LabeledSlider
          label="Hangneigung (weitet die Schwelle)"
          valueLabel={formatDegrees(slope, 0)}
          min={0}
          max={30}
          step={1}
          value={[slope]}
          onValueChange={([value]) => setSlope(value)}
        />
        <LabeledSlider
          label="Punkte im Hauptcluster"
          valueLabel={formatNumber(nMain, 0)}
          min={2}
          max={10}
          step={1}
          value={[nMain]}
          onValueChange={([value]) => setNMain(value)}
        />
        <LabeledSlider
          label="Punkte im Sekundärcluster"
          valueLabel={formatNumber(nSecondary, 0)}
          min={2}
          max={10}
          step={1}
          value={[nSecondary]}
          onValueChange={([value]) => setNSecondary(value)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Toggle
          checked={confirmedByOtherTrack}
          onCheckedChange={setConfirmedByOtherTrack}
          label="Zweiter Track zeigt gleichgerichtetes Delta über der Schwelle"
        />
        <Toggle
          checked={seasonMismatch}
          onCheckedChange={setSeasonMismatch}
          label="Saisonalität weicht stark ab (> 2 mm)"
        />
        <Toggle
          checked={unstableAmplitude}
          onCheckedChange={setUnstableAmplitude}
          label="Amplitude des Sekundärclusters instabil (> Track-p95)"
        />
      </div>

      {/* Stepper */}
      <ol className="grid gap-1.5">
        {LEVEL_ORDER.map((candidate, index) => {
          const reached = index <= levelIndex;
          const isResult = index === levelIndex;
          const color = tokens.differential[candidate];
          return (
            <li
              key={candidate}
              className={cn(
                "flex items-start gap-3 rounded-md border px-3 py-2.5 text-xs transition-all",
                isResult
                  ? "border-transparent shadow-sm"
                  : reached
                    ? "border-border bg-background"
                    : "border-border bg-background opacity-45"
              )}
              style={isResult ? { backgroundColor: `${color}14`, borderColor: color } : undefined}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white"
                style={{ backgroundColor: reached ? color : "hsl(var(--border))" }}
              >
                {index}
              </span>
              <span className="min-w-0">
                <span
                  className="block font-semibold"
                  style={{ color: reached ? color : undefined }}
                >
                  {DIFFERENTIAL_LEVEL_LABELS[candidate]}
                  <span className="ml-1.5 font-mono text-[10px] font-normal opacity-70">
                    {candidate}
                  </span>
                </span>
                <span className="block text-muted-foreground">{LEVEL_TEXT[candidate]}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Rang-Arithmetik */}
      <div className="grid gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs text-muted-foreground">
        <p>
          Kandidatenschwelle = max(1,5 | allowed_diff) ={" "}
          <span className="font-semibold text-foreground">{formatNumber(threshold, 2)} mm/a</span>{" "}
          → |Δ| {deltaAbs >= threshold ? "≥" : "<"} Schwelle:{" "}
          {deltaAbs >= threshold ? "Kandidat" : "keine differenzielle Bewegung"}
        </p>
        {deltaAbs >= threshold && (
          <>
            <p>
              2-Sigma-Test: |Δ| {passesSigma ? "≥" : "<"} 2 · {formatNumber(sigmaDelta, 2)} ={" "}
              {formatNumber(differential.sigmaFactor * sigmaDelta, 2)} mm/a
              {passesSigma && smallNGuard && " — aber Mindeststützung verfehlt (small_n_guard)"}
            </p>
            {downgrades.length > 0 && (
              <p>
                Downgrades ({downgrades.length}):{" "}
                {downgrades.map((downgrade) => DOWNGRADE_TEXT[downgrade]).join("; ")} — je −1
                Stufe, nie unter „Kandidat"
              </p>
            )}
            <p>
              Ergebnis:{" "}
              <span
                className="font-semibold"
                style={{ color: tokens.differential[level] }}
              >
                differential_motion_level = {level}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
