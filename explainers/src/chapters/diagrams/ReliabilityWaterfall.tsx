/**
 * Interaktiver Zuverlässigkeits-Wasserfall (Stufe 9).
 *
 * Korrektheitsanker: buildingReliabilityScore aus facts.ts repliziert
 * Z. 1880–1894 (Komponenten 0,35/0,25/0,20/0,20, Abzüge, clip 0..1);
 * Band-Schwellen 0,45/0,75 und Band-Caps Z. 1896–1899.
 */
import { useState } from "react";
import { LabeledSlider, Toggle } from "@/components/ui";
import { FindingCard, ReliabilityMeter } from "@/components/ui/insights";
import { buildingReliability, buildingReliabilityScore } from "@/content/facts";
import { reliabilityBandFromScore, type ReliabilityBand } from "@/lib/designTokens";
import { formatNumber, formatScore } from "@/lib/format";

const POSITIVE_COLOR = "#0c766e";
const NEGATIVE_COLOR = "#d97706";

type WaterfallRow = { label: string; delta: number };

function capBand(band: ReliabilityBand, cap: "medium" | "low"): ReliabilityBand {
  if (band === "unknown") return band;
  if (cap === "low") return "low";
  return band === "high" ? "medium" : band;
}

export function ReliabilityWaterfall() {
  const [support, setSupport] = useState(6);
  const [signal, setSignal] = useState(0.7);
  const [assignment, setAssignment] = useState(0.8);
  const [agreement, setAgreement] = useState(0.7);
  const [singleTrack, setSingleTrack] = useState(false);
  const [noiseDominated, setNoiseDominated] = useState(false);
  const [differentialSignificant, setDifferentialSignificant] = useState(false);
  const [weakMainSupport, setWeakMainSupport] = useState(false);

  const w = buildingReliability.weights;
  const p = buildingReliability.penalties;
  const caps = buildingReliability.caps;

  const effectiveAgreement = singleTrack ? null : agreement;
  const lowTrackAgreement = !singleTrack && agreement < caps.agreementTensionThreshold;
  const veryLowAgreement = !singleTrack && agreement < caps.veryLowAgreementThreshold;

  const score = buildingReliabilityScore({
    mainSupportTotal: support,
    signal,
    assignment,
    agreement: effectiveAgreement,
    singleTrack,
    noiseDominated,
    differentialSignificantOrConfirmed: differentialSignificant,
    weakMainClusterSupport: weakMainSupport,
    lowTrackAgreement,
  });

  let band = reliabilityBandFromScore(score);
  const weakSecondaryCap = weakMainSupport && !singleTrack;
  if (weakSecondaryCap) band = capBand(band, caps.weakSecondaryTrackBand);
  if (veryLowAgreement) band = capBand(band, caps.veryLowAgreementBand);

  const rows: WaterfallRow[] = [
    {
      label: `0,35 · min(${formatNumber(support, 0)}/6 | 1) — Stützung`,
      delta: w.support * Math.min(support / buildingReliability.supportSaturationN, 1),
    },
    { label: "0,25 · Signal (mediane Kohärenz)", delta: w.signal * signal },
    { label: "0,20 · Zuordnungsqualität", delta: w.assignment * assignment },
    {
      label: singleTrack
        ? "0,20 · Track-Übereinstimmung (Fallback 0,50 bei einem Track)"
        : "0,20 · Track-Übereinstimmung",
      delta: w.agreement * (effectiveAgreement ?? buildingReliability.agreementFallback),
    },
  ];
  if (singleTrack) rows.push({ label: "Nur ein Track", delta: -p.singleTrack });
  if (support < 4) rows.push({ label: "Gesamtstützung unter 4 Punkten", delta: -p.lowSupport });
  if (noiseDominated) rows.push({ label: "Rauschdominanz (> 50 % Noise)", delta: -p.noiseDominance });
  if (differentialSignificant)
    rows.push({
      label: "Differential-Level signifikant/bestätigt",
      delta: -p.differentialSignificant,
    });
  if (weakMainSupport)
    rows.push({ label: "Schwacher Hauptcluster (< 3 Punkte) auf einem Track", delta: -p.weakMainClusterSupport });
  if (lowTrackAgreement)
    rows.push({
      label: `Track-Übereinstimmung unter ${formatNumber(caps.agreementTensionThreshold, 2)}`,
      delta: -p.lowTrackAgreement,
    });

  // Laufende Summe für die Wasserfall-Darstellung (ungeclippt zur Anschauung).
  let running = 0;
  const bars = rows.map((row) => {
    const from = running;
    running = running + row.delta;
    return { ...row, from, to: running };
  });

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSlider
          label="Hauptcluster-Stützung gesamt (beide Tracks)"
          valueLabel={formatNumber(support, 0)}
          min={0}
          max={10}
          step={1}
          value={[support]}
          onValueChange={([value]) => setSupport(value)}
        />
        <LabeledSlider
          label="Signal (mediane Kohärenz der Hauptcluster)"
          valueLabel={formatScore(signal)}
          min={0}
          max={1}
          step={0.01}
          value={[signal]}
          onValueChange={([value]) => setSignal(value)}
        />
        <LabeledSlider
          label="Zuordnungsqualität"
          valueLabel={formatScore(assignment)}
          min={0}
          max={1}
          step={0.01}
          value={[assignment]}
          onValueChange={([value]) => setAssignment(value)}
        />
        <LabeledSlider
          label="Track-Übereinstimmung"
          valueLabel={singleTrack ? "— (ein Track)" : formatScore(agreement)}
          min={0}
          max={1}
          step={0.01}
          value={[agreement]}
          onValueChange={([value]) => setAgreement(value)}
          disabled={singleTrack}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle checked={singleTrack} onCheckedChange={setSingleTrack} label="Nur ein Track verfügbar" />
        <Toggle
          checked={noiseDominated}
          onCheckedChange={setNoiseDominated}
          label="Rauschdominiert (> 50 % Noise-Punkte)"
        />
        <Toggle
          checked={differentialSignificant}
          onCheckedChange={setDifferentialSignificant}
          label="Differential-Level signifikant oder bestätigt"
        />
        <Toggle
          checked={weakMainSupport}
          onCheckedChange={setWeakMainSupport}
          label="Ein Hauptcluster hat unter 3 Punkte"
        />
      </div>

      {/* Wasserfall */}
      <div className="grid gap-1">
        {bars.map((bar) => {
          const positive = bar.delta >= 0;
          const left = Math.max(0, Math.min(bar.from, bar.to));
          const width = Math.abs(bar.to - bar.from);
          return (
            <div key={bar.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
              <div className="relative h-5 overflow-hidden rounded bg-muted/60">
                <div
                  className="absolute inset-y-0 rounded-sm"
                  style={{
                    left: `${left * 100}%`,
                    width: `${width * 100}%`,
                    backgroundColor: positive ? POSITIVE_COLOR : NEGATIVE_COLOR,
                    opacity: positive ? 0.85 : 0.9,
                  }}
                />
                <span className="absolute inset-y-0 left-1.5 flex items-center text-[10px] font-medium text-foreground mix-blend-multiply">
                  {bar.label}
                </span>
              </div>
              <span
                className="w-14 text-right font-mono font-semibold"
                style={{ color: positive ? POSITIVE_COLOR : NEGATIVE_COLOR }}
              >
                {positive ? "+" : "−"}
                {formatScore(Math.abs(bar.delta))}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 border-t border-border pt-3">
        <ReliabilityMeter
          score={score}
          band={band}
          label="building_reliability_score (auf 0..1 begrenzt)"
        />
        {weakSecondaryCap && (
          <FindingCard
            tone="warning"
            label="Band-Deckel: höchstens „mittel“"
            detail="Bei mehreren Tracks mit einem schwach gestützten Hauptcluster wird das Band unabhängig vom Score auf „mittel“ gedeckelt."
          />
        )}
        {veryLowAgreement && (
          <FindingCard
            tone="bad"
            label="Band-Deckel: „gering“"
            detail={`Track-Übereinstimmung unter ${formatNumber(caps.veryLowAgreementThreshold, 2)} deckelt das Band auf „gering“ — die Blickrichtungen widersprechen sich zu stark.`}
          />
        )}
      </div>
    </div>
  );
}
