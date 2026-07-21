/**
 * Benotungs-Simulator: Soll-Label × Ist-Zustand → Verdict + Gate-Wirkung.
 * Rechenkern ist `gradeReferenceLabel()` aus `silverFacts.ts` — die exakte
 * Replikation von `check_reference_labels` (phase7_clustering_experiments.py);
 * diese Komponente ist reine Anzeige.
 */
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/designTokens";
import {
  gradeReferenceLabel,
  POINT_STATES,
  pointStateInfo,
  SILVER_LABELS,
  verdictInfo,
  type LabelVerdict,
  type PointState,
  type SilverLabel,
} from "@/content/silverFacts";
import { LabelBadge, silverLabelColors, silverLabelKurz } from "../silverUi";

/** Die vier Verdicts, die eine Scorecard sofort auf Rot stellen. */
const ROTE_GATES = (Object.keys(verdictInfo) as LabelVerdict[]).filter(
  (verdict) => verdictInfo[verdict].rotesGate
);

const PRESETS: { titel: string; label: SilverLabel; state: PointState }[] = [
  { titel: "NSVF80S01 im BEV-Lauf", label: "roof", state: "excluded" },
  { titel: "A9A7E442-Punkte unter v3", label: "foreign", state: "annex" },
  { titel: "Anbau korrekt getrennt", label: "annex", state: "annex" },
];

export function GradingSimulator() {
  const [label, setLabel] = useState<SilverLabel>("roof");
  const [state, setState] = useState<PointState>("main_core");

  const verdict = gradeReferenceLabel(label, state);
  const info = verdictInfo[verdict];

  return (
    <Card className="grid gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.titel}
            size="sm"
            variant="outline"
            onClick={() => {
              setLabel(preset.label);
              setState(preset.state);
            }}
          >
            {preset.titel}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Soll: das Label aus dem Korpus */}
        <div className="grid content-start gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Soll — Label im Korpus
          </p>
          <div className="grid gap-1.5">
            {SILVER_LABELS.map((kandidat) => (
              <button
                key={kandidat}
                type="button"
                onClick={() => setLabel(kandidat)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                  label === kandidat
                    ? "border-foreground/50 bg-card shadow-sm"
                    : "border-border bg-background hover:bg-card"
                )}
                aria-pressed={label === kandidat}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: silverLabelColors[kandidat] }}
                />
                <span className="font-semibold text-foreground">{silverLabelKurz[kandidat]}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{kandidat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ist: Zustand des Punkts im Kandidaten-Lauf */}
        <div className="grid content-start gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ist — Zustand im Pipeline-Lauf
          </p>
          <div className="grid gap-1.5">
            {POINT_STATES.map((kandidat) => (
              <button
                key={kandidat}
                type="button"
                onClick={() => setState(kandidat)}
                title={pointStateInfo[kandidat].text}
                className={cn(
                  "flex items-baseline gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                  state === kandidat
                    ? "border-foreground/50 bg-card shadow-sm"
                    : "border-border bg-background hover:bg-card"
                )}
                aria-pressed={state === kandidat}
              >
                <span className="font-semibold text-foreground">
                  {pointStateInfo[kandidat].label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{kandidat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verdict */}
      <FindingCard
        tone={info.ton === "neutral" ? "neutral" : info.ton}
        label={
          <span className="inline-flex flex-wrap items-center gap-2">
            {info.label}
            <span className="font-mono text-[10px] font-normal text-muted-foreground">
              {verdict}
            </span>
          </span>
        }
        aside={<LabelBadge label={label} />}
        detail={info.text}
      />

      {/* Gate-Leiste: welches rote Gate feuert? */}
      <div className="grid gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Rote Scorecard-Gates
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROTE_GATES.map((gate) => {
            const feuert = verdict === gate;
            return (
              <span
                key={gate}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors",
                  feuert
                    ? "border-transparent text-white"
                    : "border-border bg-card text-muted-foreground"
                )}
                style={feuert ? { backgroundColor: tokens.reliability.low } : undefined}
              >
                {gate}
                {feuert ? " ⟵ feuert" : ""}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Ein einziges feuerndes Gate stellt die gesamte Scorecard auf Rot — egal, wie gut alle
          anderen Kennzahlen aussehen. Genau so blieb der v4-Release-Kandidat trotz vieler grüner
          Prüfungen „geprüft, nicht akzeptiert“.
        </p>
      </div>
    </Card>
  );
}
