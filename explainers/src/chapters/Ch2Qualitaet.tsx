import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { gates } from "@/content/facts";
import { formatNumber, formatPercent } from "@/lib/format";
import { GatesFunnel } from "./diagrams/GatesFunnel";

const FEATURE_GROUPS: Array<{ titel: string; features: string[] }> = [
  {
    titel: "Bewegung",
    features: ["velocity", "velocity_std", "acceleration", "season_amp"],
  },
  {
    titel: "Signal",
    features: ["coherence", "amp_mean", "amp_ts_cv", "amp_ts_spike_rate"],
  },
  {
    titel: "Geometrie",
    features: [
      "along_look_offset_m",
      "cross_look_offset_m",
      "height_rank_in_building",
      "local_density",
    ],
  },
  {
    titel: "Zeitreihe",
    features: ["ts_slope", "ts_residual_std", "ts_primary_step_abs", "ts_missing_rate"],
  },
  {
    titel: "Terrain",
    features: ["slope_mean_deg", "slope_max_deg", "relief_range_m"],
  },
];

export function Ch2Qualitaet() {
  return (
    <Chapter
      meta={chapterById.qualitaet}
      techDetails={
        <>
          <p>
            Harte Gates (Reihenfolge wie im Code): fehlende Gebäudezuordnung; weniger als{" "}
            {formatNumber(gates.minValidEpochs, 0)} gültige Displacement-Epochen; weniger als{" "}
            {formatPercent(gates.minValidEpochRatio)} der erwarteten Track-Epochen;{" "}
            <span className="font-mono">
              coherence &lt; max({formatNumber(gates.coherenceFloor, 2)} | track_p05)
            </span>
            . Jeder Ausschluss speichert alle ausgelösten{" "}
            <GlossaryTerm term="gateReasons">Gate-Gründe</GlossaryTerm>; der erste wird als{" "}
            <span className="font-mono">degraded_reason</span> geführt.
          </p>
          <p>
            Cross-Look-Politik (k2x): Toleranz ={" "}
            <span className="font-mono">
              median(|quer| der Anker) + 3 · 1,4826 · MAD + 3 m + √eff_area
            </span>
            . Demotionsgründe: <span className="font-mono">nearest_crosslook_outlier</span>,{" "}
            <span className="font-mono">nearest_no_geometric_anchor</span> (keine Anker — dann gibt
            es keine geometrische Referenz),{" "}
            <span className="font-mono">nearest_crosslook_unknown</span> (Quer-Versatz nicht
            berechenbar). <GlossaryTerm term="madToleranz">Median/MAD</GlossaryTerm> statt
            Perzentil, weil die Candidate Area selbst Fremdpunkte fangen kann (Referenzfall
            96959851). Demotierte Punkte bleiben sichtbar, tragen aber weder zu Clustern noch zu
            Scores bei (Asymmetrie-Prinzip).
          </p>
          <p>
            Fehlende Amplitude-Zeitreihen sind zulässig und werden nicht erfunden — betroffene
            Prüfungen werden dann übersprungen.
          </p>
        </>
      }
    >
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="section-title">Was die Pipeline über jeden Punkt weiß</p>
        <div className="grid gap-2.5">
          {FEATURE_GROUPS.map((group) => (
            <div key={group.titel} className="flex flex-wrap items-baseline gap-1.5">
              <span className="w-20 shrink-0 text-xs font-semibold text-foreground">
                {group.titel}
              </span>
              {group.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {feature}
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Diese Merkmale speisen die Gates, das Clustering (Station 4) und die Bewertung (Station
          5). Vier davon entscheiden hart über die Teilnahme — probiere es aus:
        </p>
      </div>
      <GatesFunnel />
    </Chapter>
  );
}
