/**
 * Interaktiver Track-Vergleich (Stufe 7).
 *
 * Korrektheitsanker: verticalProxyMmA (velocity / max(cos(inz), 0,30),
 * Z. 2909–2911), allowedDiffMmA (1,0 + 0,15 · Hangneigung, Z. 1629) und
 * trackAgreementScore (exp(−diff/allowed), Z. 1647) aus facts.ts.
 */
import { useState } from "react";
import { Satellite } from "lucide-react";
import { LabeledSlider } from "@/components/ui";
import { ScoreBar } from "@/components/ui/insights";
import {
  allowedDiffMmA,
  buildingReliability,
  trackAgreementScore,
  verticalProxyMmA,
} from "@/content/facts";
import { formatDegrees, formatMmPerYear, formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";

export function CrossTrackComparator() {
  const [v44, setV44] = useState(-2.4);
  const [v95, setV95] = useState(-1.8);
  const [incidence, setIncidence] = useState(38.5);
  const [slope, setSlope] = useState(4);

  const proxy44 = verticalProxyMmA(v44, incidence);
  const proxy95 = verticalProxyMmA(v95, incidence);
  const diff = Math.abs(proxy44 - proxy95);
  const allowed = allowedDiffMmA(slope);
  const agreement = trackAgreementScore(diff, allowed);
  const buildingMotion = (proxy44 + proxy95) / 2;

  const trackCard = (track: 44 | 95, velocity: number, proxy: number) => (
    <div className="grid gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-foreground">
        <Satellite className="h-3.5 w-3.5" strokeWidth={2} />
        Track {track} {track === 44 ? "(ASC, blickt von Westen)" : "(DSC, blickt von Osten)"}
      </p>
      <p className="font-mono text-muted-foreground">
        LOS-Geschwindigkeit: {formatMmPerYear(velocity)}
        <br />
        Vertikal-Proxy: v / max(cos {formatDegrees(incidence)} | 0,30) ={" "}
        <span className="font-semibold text-foreground">{formatMmPerYear(proxy)}</span>
      </p>
    </div>
  );

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSlider
          label="Hauptcluster-Bewegung Track 44 (LOS)"
          valueLabel={formatMmPerYear(v44)}
          min={-8}
          max={8}
          step={0.1}
          value={[v44]}
          onValueChange={([value]) => setV44(value)}
        />
        <LabeledSlider
          label="Hauptcluster-Bewegung Track 95 (LOS)"
          valueLabel={formatMmPerYear(v95)}
          min={-8}
          max={8}
          step={0.1}
          value={[v95]}
          onValueChange={([value]) => setV95(value)}
        />
        <LabeledSlider
          label="Einfallswinkel (beide Tracks)"
          valueLabel={formatDegrees(incidence)}
          min={30}
          max={45}
          step={0.5}
          value={[incidence]}
          onValueChange={([value]) => setIncidence(value)}
        />
        <LabeledSlider
          label="Mittlere Hangneigung am Gebäude"
          valueLabel={formatDegrees(slope, 0)}
          min={0}
          max={30}
          step={1}
          value={[slope]}
          onValueChange={([value]) => setSlope(value)}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {trackCard(44, v44, proxy44)}
        {trackCard(95, v95, proxy95)}
      </div>

      {/* Differenz gegen Toleranzband */}
      <div className="grid gap-1.5 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">
            Differenz der Vertikal-Proxies vs. hangabhängige Toleranz
          </span>
          <span className="font-mono font-semibold text-foreground">
            {formatNumber(diff, 2)} / {formatNumber(allowed, 2)} mm/a
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.min(allowed / 8, 1) * 100}%`,
              backgroundColor: `${tokens.pointLabel.normal}26`,
            }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/50"
            style={{ left: `${Math.min(allowed / 8, 1) * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
            style={{
              left: `calc(${Math.min(diff / 8, 1) * 100}% - 4px)`,
              backgroundColor:
                diff <= allowed ? tokens.pointLabel.normal : tokens.pointLabel.suspect,
            }}
          />
        </div>
        <p className="font-mono text-muted-foreground">
          allowed_diff = 1,0 + 0,15 · {formatNumber(slope, 0)}° ={" "}
          {formatNumber(allowed, 2)} mm/a — an Hängen ist mehr Abweichung erlaubt, weil die
          Blickgeometrien dort systematisch auseinanderlaufen.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <ScoreBar
          label="track_agreement_score = exp(−Differenz / Toleranz)"
          value={agreement}
        />
        <p className="font-mono text-xs text-muted-foreground sm:text-right">
          Gebäudebewegung (Mittel):{" "}
          <span className="font-semibold text-foreground">{formatMmPerYear(buildingMotion)}</span>
        </p>
      </div>
      {agreement < buildingReliability.caps.agreementTensionThreshold && (
        <p className="rounded-md border border-border bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
          Übereinstimmung unter{" "}
          {formatNumber(buildingReliability.caps.agreementTensionThreshold, 2)}: Das Gebäude erhält
          das Spannungs-Flag <span className="font-mono">agreement_tension</span> und einen
          Zuverlässigkeitsabzug (Station 8); unter{" "}
          {formatNumber(buildingReliability.caps.veryLowAgreementThreshold, 2)} wird das Band
          zusätzlich auf „gering" gedeckelt.
        </p>
      )}
    </div>
  );
}
