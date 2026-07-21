/**
 * Interaktive Drei-Wege-Verzweigung des Clusterings (Stufe 5).
 *
 * Korrektheitsanker: clusterBranch/hdbscanParams/velocityToleranceMmA aus
 * facts.ts replizieren _cluster_building_groups (Z. 1042–1066),
 * _apply_small_n_fallback (Z. 1223–1229) und _apply_density_clustering
 * (Z. 1264–1265).
 */
import { useState } from "react";
import { LabeledSlider } from "@/components/ui";
import {
  clusterBranch,
  clustering,
  hdbscanParams,
  velocityToleranceMmA,
} from "@/content/facts";
import { formatMmPerYear, formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { cn } from "@/lib/utils";

const BRANCHES = [
  {
    key: "insufficient" as const,
    bereich: "unter 3 Punkte",
    titel: "Kein Clustering",
    text: "Alle Punkte erhalten den ehrlichen Status insufficient_support — zu wenig Evidenz für eine Gruppenaussage.",
  },
  {
    key: "small_n" as const,
    bereich: "3–5 Punkte",
    titel: "Small-N-Fallback (smalln_strict)",
    text: "Konservative Konsistenzprüfung statt Dichteclustering: Nur wenn sich mindestens 2 Punkte einig bewegen, entsteht ein Pseudo-Core.",
  },
  {
    key: "hdbscan" as const,
    bereich: "ab 6 Punkten",
    titel: "HDBSCAN",
    text: "Dichtebasiertes Clustering auf 6 gewichteten Features; nicht zuordenbare Punkte werden ehrlich als Noise markiert.",
  },
];

export function ClusteringBranchDemo() {
  const [n, setN] = useState(8);
  const [velocityStd, setVelocityStd] = useState(0.5);
  const branch = clusterBranch(n);
  const params = hdbscanParams(n);
  const vTol = velocityToleranceMmA(velocityStd);

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSlider
          label="Behaltene Punkte am Gebäude × Track (kept)"
          valueLabel={formatNumber(n, 0)}
          min={0}
          max={15}
          step={1}
          value={[n]}
          onValueChange={([value]) => setN(value)}
        />
        {branch === "small_n" && (
          <LabeledSlider
            label="Geschwindigkeitsunsicherheit (velocity_std)"
            valueLabel={formatMmPerYear(velocityStd).replace("+", "")}
            min={0}
            max={2}
            step={0.1}
            value={[velocityStd]}
            onValueChange={([value]) => setVelocityStd(value)}
          />
        )}
      </div>

      {/* Punktreihe als visuelle n-Anzeige */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: 15 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-3.5 w-3.5 rounded-full border transition-colors",
              index < n ? "border-transparent" : "border-border bg-background"
            )}
            style={index < n ? { backgroundColor: tokens.series.displacement } : undefined}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">= {n} kept-Punkte</span>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {BRANCHES.map((candidate) => {
          const active = candidate.key === branch;
          return (
            <div
              key={candidate.key}
              className={cn(
                "rounded-md border px-3 py-2.5 text-xs transition-all",
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-background opacity-60"
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {candidate.bereich}
              </p>
              <p className={cn("font-semibold", active ? "text-primary" : "text-foreground")}>
                {candidate.titel}
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">{candidate.text}</p>
            </div>
          );
        })}
      </div>

      {branch === "hdbscan" && (
        <div className="grid gap-3 rounded-md border border-border bg-background px-3 py-3 text-xs md:grid-cols-2">
          <div>
            <p className="font-semibold text-foreground">Parameter für n = {n}</p>
            <p className="mt-1 font-mono text-muted-foreground">
              min_cluster_size = max(2 | min(8 | ⌈0,2 · {n}⌉)) ={" "}
              <span className="font-semibold text-foreground">{params.minClusterSize}</span>
              <br />
              min_samples = ⌊{params.minClusterSize} / 2⌋ ={" "}
              <span className="font-semibold text-foreground">{params.minSamples}</span>
              <br />
              cluster_selection_method = eom, allow_single_cluster
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Punkte mit Label ≥ 0 werden <span className="font-mono">core</span>, Label −1 wird{" "}
              <span className="font-mono">noise</span>. Grenzwertige Noise-Punkte können in den
              nächstgelegenen Cluster zurückgeholt werden, wenn Abweichung und Kohärenz es
              rechtfertigen.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Die 6 Features und ihre Gewichte</p>
            <ul className="mt-1 grid gap-1">
              {clustering.featureWeights.map((feature) => (
                <li key={feature.key} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 truncate font-mono text-[10px] text-muted-foreground">
                    {feature.key}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(feature.weight / 1.3) * 100}%`,
                        backgroundColor: tokens.series.displacement,
                      }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono font-semibold text-foreground">
                    {formatNumber(feature.weight, 2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              Robust skaliert (RobustScaler, Quantile 15–85) — die Bewegung wiegt am stärksten.
            </p>
          </div>
        </div>
      )}

      {branch === "small_n" && (
        <div className="grid gap-2 rounded-md border border-border bg-background px-3 py-3 text-xs">
          <p className="font-semibold text-foreground">Konsistenzprüfung</p>
          <p className="font-mono text-muted-foreground">
            |v − median| ≤ max(1 mm/a | 2 · velocity_std) ={" "}
            <span className="font-semibold text-foreground">
              {formatMmPerYear(vTol).replace("+", "")}
            </span>
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Bewegen sich mindestens {clustering.smallNMinConsistent} Punkte innerhalb dieser
            Toleranz, entsteht <span className="font-mono">cluster_0</span>; Punkte mit lokaler
            Abweichung über {formatNumber(clustering.smallNNoiseThreshold, 2)} werden{" "}
            <span className="font-mono">noise</span>. Ohne Konsistenz gibt es keinen Pseudo-Core —
            alle Punkte werden ehrlich <span className="font-mono">weak_support</span>{" "}
            (Wahrscheinlichkeit 0,30).
          </p>
        </div>
      )}

      {branch === "insufficient" && (
        <div className="rounded-md border border-border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          Alle Punkte erhalten <span className="font-mono">cluster_role = insufficient_support</span>{" "}
          und das Label <span className="font-mono">suspect</span> — die Karte zeigt sie gelblich.
          Das Gebäude bekommt in Station 6–8 keinen belastbaren Befund.
        </div>
      )}
    </div>
  );
}
