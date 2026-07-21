/**
 * Interaktiver Gate-Simulator (Stufe 3).
 *
 * Korrektheitsanker: evaluateGates aus facts.ts repliziert
 * _apply_gate_rules (Z. 842–858): < 24 Epochen, < 50 % Abdeckung,
 * coherence < max(0.45, track_p05), fehlende Gebäudezuordnung.
 * Cross-Look-Panel: crossLookLimitM (Z. 917–923).
 */
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { LabeledSlider, Toggle } from "@/components/ui";
import {
  crossLookLimitM,
  evaluateGates,
  gates,
  type GateReason,
} from "@/content/facts";
import { formatMeters, formatNumber, formatPercent } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";

const GATE_INFO: Record<GateReason, { titel: string; regel: string }> = {
  no_building_assignment: {
    titel: "Gebäudezuordnung vorhanden?",
    regel: "Punkte ohne Gebäude werden nicht gebäudelokal bewertet.",
  },
  too_few_valid_epochs: {
    titel: `Genug Messungen? (mindestens ${gates.minValidEpochs} Epochen)`,
    regel: "Zu kurze Zeitreihen tragen keine belastbare Bewegungsaussage.",
  },
  too_sparse_timeseries: {
    titel: "Zeitreihe dicht genug? (mindestens 50 % der Track-Epochen)",
    regel: "Große Lücken machen Trends und Sprünge unzuverlässig.",
  },
  low_coherence: {
    titel: "Signal stabil genug? (Kohärenz über Schwelle)",
    regel: "Schwelle: max(0,45 | 5. Perzentil des Tracks) — selbstkalibrierend.",
  },
};

export function GatesFunnel() {
  const [hasBuilding, setHasBuilding] = useState(true);
  const [epochs, setEpochs] = useState(48);
  const [ratioPct, setRatioPct] = useState(80);
  const [coherence, setCoherence] = useState(0.72);
  const [trackP05, setTrackP05] = useState(0.45);

  const reasons = evaluateGates({
    hasBuilding,
    validEpochCount: epochs,
    validEpochRatio: ratioPct / 100,
    coherence,
    trackP05,
  });
  const excluded = reasons.length > 0;
  const coherenceThreshold = Math.max(gates.coherenceFloor, trackP05);

  // Cross-Look-Panel für nearest-Punkte
  const [crossOffset, setCrossOffset] = useState(6);
  const [anchorMedian, setAnchorMedian] = useState(4);
  const [anchorMad, setAnchorMad] = useState(1);
  const [effArea, setEffArea] = useState(9);
  const crossLimit = crossLookLimitM(anchorMedian, anchorMad, effArea);
  const crossDemoted = crossOffset > crossLimit;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledSlider
            label="Gültige Epochen"
            valueLabel={formatNumber(epochs, 0)}
            min={0}
            max={60}
            step={1}
            value={[epochs]}
            onValueChange={([value]) => setEpochs(value)}
          />
          <LabeledSlider
            label="Abdeckung der Track-Epochen"
            valueLabel={formatPercent(ratioPct / 100)}
            min={0}
            max={100}
            step={1}
            value={[ratioPct]}
            onValueChange={([value]) => setRatioPct(value)}
          />
          <LabeledSlider
            label="Kohärenz des Punkts"
            valueLabel={formatNumber(coherence, 2)}
            min={0}
            max={1}
            step={0.01}
            value={[coherence]}
            onValueChange={([value]) => setCoherence(value)}
          />
          <LabeledSlider
            label="Track-Kohärenz (5. Perzentil)"
            valueLabel={formatNumber(trackP05, 2)}
            min={0.3}
            max={0.6}
            step={0.01}
            value={[trackP05]}
            onValueChange={([value]) => setTrackP05(value)}
          />
        </div>
        <Toggle
          checked={hasBuilding}
          onCheckedChange={setHasBuilding}
          label="Punkt hat eine Gebäudezuordnung (Station 1)"
        />

        <ol className="grid gap-1.5">
          {(Object.keys(GATE_INFO) as GateReason[]).map((gate, index) => {
            const fired = reasons.includes(gate);
            return (
              <li
                key={gate}
                className={cn(
                  "flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs transition-colors",
                  fired ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"
                )}
              >
                {fired ? (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: tokens.pointLabel.outlier }}
                  />
                ) : (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: tokens.pointLabel.normal }}
                  />
                )}
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">
                    Gate {index + 1}: {GATE_INFO[gate].titel}
                  </span>
                  <span className="block text-muted-foreground">{GATE_INFO[gate].regel}</span>
                  {fired && (
                    <span className="mt-1 inline-block rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
                      gate_reason: {gate}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        <div
          className={cn(
            "rounded-md border px-3 py-2.5 text-sm font-semibold",
            excluded
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-border bg-secondary text-foreground"
          )}
        >
          {excluded ? (
            <>
              Ergebnis: <span className="font-mono">gate_excluded</span> — der Punkt fließt nicht in
              Clustering und Bewertung ein, bleibt aber mit seinen Gründen auf der Karte sichtbar
              (grau).
            </>
          ) : (
            <>
              Ergebnis: Punkt <span className="font-mono">behalten (kept)</span> — er nimmt an
              Clustering und Bewertung teil. Aktive Kohärenzschwelle:{" "}
              <span className="font-mono">{formatNumber(coherenceThreshold, 2)}</span>.
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="section-title !mb-1">Zusatzprüfung für nearest-Punkte: Quer-Versatz (k2x)</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Längs-Versatz zum Gebäude kann Radarprojektion sein — Quer-Versatz nicht. Ein{" "}
            <span className="font-mono">nearest</span>-Punkt wird demotiert, wenn sein Quer-Versatz
            die selbstkalibrierte Toleranz der geometrisch gesicherten Ankerpunkte (within /
            directional_buffer) überschreitet. Ohne Anker wird konservativ demotiert.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledSlider
            label="Quer-Versatz des nearest-Punkts"
            valueLabel={formatMeters(crossOffset)}
            min={0}
            max={30}
            step={0.5}
            value={[crossOffset]}
            onValueChange={([value]) => setCrossOffset(value)}
          />
          <LabeledSlider
            label="Median |Quer-Versatz| der Anker"
            valueLabel={formatMeters(anchorMedian)}
            min={0}
            max={10}
            step={0.5}
            value={[anchorMedian]}
            onValueChange={([value]) => setAnchorMedian(value)}
          />
          <LabeledSlider
            label="MAD der Anker"
            valueLabel={formatMeters(anchorMad)}
            min={0}
            max={3}
            step={0.1}
            value={[anchorMad]}
            onValueChange={([value]) => setAnchorMad(value)}
          />
          <LabeledSlider
            label="Punktfläche (eff_area)"
            valueLabel={`${formatNumber(effArea, 0)} m²`}
            min={0}
            max={100}
            step={1}
            value={[effArea]}
            onValueChange={([value]) => setEffArea(value)}
          />
        </div>
        {/* Toleranz-Visualisierung */}
        <div className="relative h-8 overflow-hidden rounded-md bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-l-md"
            style={{
              width: `${Math.min(crossLimit / 30, 1) * 100}%`,
              backgroundColor: `${tokens.pointLabel.normal}22`,
            }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/60"
            style={{ left: `${Math.min(crossLimit / 30, 1) * 100}%` }}
            title="Toleranzgrenze"
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{
              left: `calc(${Math.min(crossOffset / 30, 1) * 100}% - 7px)`,
              backgroundColor: crossDemoted ? tokens.pointLabel.outlier : tokens.pointLabel.normal,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Toleranz ={" "}
          <span className="font-mono">
            {formatMeters(anchorMedian)} + 3 · 1,4826 · {formatMeters(anchorMad)} + 3 m + √
            {formatNumber(effArea, 0)} m² = <strong>{formatMeters(crossLimit)}</strong>
          </span>{" "}
          →{" "}
          {crossDemoted ? (
            <span className="font-semibold" style={{ color: tokens.pointLabel.outlier }}>
              demotiert (nearest_crosslook_outlier)
            </span>
          ) : (
            <span className="font-semibold" style={{ color: tokens.pointLabel.normal }}>
              plausibel — Punkt bleibt kept
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
