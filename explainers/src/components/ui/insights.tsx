/**
 * Befund-Primitives — angepasste Kopie der Viewer-Patterns aus
 * `frontend/src/components/ui/insights.tsx` (Cross-App-Imports sind nicht
 * möglich). Die visuelle Sprache (Ampel, Band-Leiste, Farbpunkt-Badges)
 * entspricht bewusst dem produktiven Viewer.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ML_CLUSTER_KIND_DESCRIPTIONS,
  ML_CLUSTER_KIND_LABELS,
  RELIABILITY_BAND_LABELS,
  RELIABILITY_BAND_THRESHOLDS,
  reliabilityBandFromScore,
  tokens,
  type MlClusterKind,
  type ReliabilityBand,
} from "@/lib/designTokens";
import { formatScore } from "@/lib/format";

/* ---------------- ReliabilityMeter ---------------- */

export type ReliabilityMeterProps = {
  score: number | null | undefined;
  band?: ReliabilityBand;
  label?: ReactNode;
  className?: string;
};

/** Beschriftete Drei-Segment-Leiste (gering/mittel/hoch) mit Score-Marker. */
export function ReliabilityMeter({ score, band, label, className }: ReliabilityMeterProps) {
  const resolvedBand: ReliabilityBand = band ?? reliabilityBandFromScore(score);
  const color = tokens.reliability[resolvedBand];
  const clamped =
    score === null || score === undefined ? null : Math.min(Math.max(score, 0), 1);
  const segments: Array<{ band: ReliabilityBand; from: number; to: number }> = [
    { band: "low", from: 0, to: RELIABILITY_BAND_THRESHOLDS.medium },
    {
      band: "medium",
      from: RELIABILITY_BAND_THRESHOLDS.medium,
      to: RELIABILITY_BAND_THRESHOLDS.high,
    },
    { band: "high", from: RELIABILITY_BAND_THRESHOLDS.high, to: 1 },
  ];

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {label ?? "Zuverlässigkeit der Einschätzung"}
        </span>
        <span className="font-mono font-semibold text-foreground">
          {clamped === null ? "—" : formatScore(clamped)}
        </span>
      </div>
      <div
        className="relative flex h-2.5 w-full gap-0.5"
        role="img"
        aria-label={`Zuverlässigkeit ${clamped === null ? "unbekannt" : formatScore(clamped)} (${RELIABILITY_BAND_LABELS[resolvedBand]})`}
      >
        {segments.map((segment) => (
          <div
            key={segment.band}
            className="h-full rounded-sm transition-colors"
            style={{
              flexGrow: segment.to - segment.from,
              backgroundColor:
                segment.band === resolvedBand ? color : "hsl(var(--muted))",
              opacity: segment.band === resolvedBand ? 1 : 0.9,
            }}
          />
        ))}
        {clamped !== null && (
          <div
            className="absolute -top-0.5 h-3.5 w-[3px] rounded-full border border-background"
            style={{
              left: `calc(${clamped * 100}% - 1.5px)`,
              backgroundColor: "hsl(var(--foreground))",
            }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        {(["low", "medium", "high"] as const).map((segmentBand) => (
          <span
            key={segmentBand}
            className={resolvedBand === segmentBand ? "font-bold" : undefined}
            style={resolvedBand === segmentBand ? { color } : undefined}
          >
            {RELIABILITY_BAND_LABELS[segmentBand]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ScoreBar ---------------- */

export type ScoreBarProps = {
  label: ReactNode;
  value: number | null | undefined;
  /** "higher-better" färbt hohe Werte grün, "higher-worse" rot (z. B. Anomalie). */
  direction?: "higher-better" | "higher-worse";
  /** Optionaler Schwellenmarker (0..1). */
  threshold?: number;
  className?: string;
};

/** Kompakter 0..1-Balken mit Wert — für Qualitäts-/Anomalie-Minimeter. */
export function ScoreBar({
  label,
  value,
  direction = "higher-better",
  threshold,
  className,
}: ScoreBarProps) {
  const clamped =
    value === null || value === undefined ? null : Math.min(Math.max(value, 0), 1);
  const goodness =
    clamped === null ? null : direction === "higher-better" ? clamped : 1 - clamped;
  const color =
    goodness === null
      ? tokens.reliability.unknown
      : goodness >= 0.7
        ? tokens.reliability.high
        : goodness >= 0.4
          ? tokens.reliability.medium
          : tokens.reliability.low;

  return (
    <div className={cn("grid gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">
          {clamped === null ? "—" : formatScore(clamped)}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {clamped !== null && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${clamped * 100}%`, backgroundColor: color }}
          />
        )}
        {threshold !== undefined && (
          <div
            className="absolute top-0 h-full w-px bg-foreground/50"
            style={{ left: `${Math.min(Math.max(threshold, 0), 1) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- KindBadge ---------------- */

export type KindBadgeProps = {
  kind: MlClusterKind;
  className?: string;
};

/**
 * Cluster-Typ-Chip: neutraler Badge mit Farbpunkt (nie Petrol/Violett als
 * Fläche, damit keine Kollision mit der Markenfarbe entsteht).
 */
export function KindBadge({ kind, className }: KindBadgeProps) {
  const dotColor =
    kind === "standard" ? "hsl(var(--muted-foreground))" : tokens.clusterKind[kind];
  return (
    <span
      title={ML_CLUSTER_KIND_DESCRIPTIONS[kind]}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground",
        className
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="truncate">{ML_CLUSTER_KIND_LABELS[kind]}</span>
    </span>
  );
}

/* ---------------- FindingCard ---------------- */

export type FindingTone = "neutral" | "warning" | "bad" | "good";

const findingToneColors: Record<FindingTone, string> = {
  neutral: "hsl(var(--muted-foreground))",
  warning: tokens.reliability.medium,
  bad: tokens.reliability.low,
  good: tokens.reliability.high,
};

export type FindingCardProps = {
  label: ReactNode;
  detail?: ReactNode;
  tone?: FindingTone;
  aside?: ReactNode;
  className?: string;
};

/** Grund-Karte für "Warum diese Bewertung?": Ton-Punkt, fettes Label, Klartext. */
export function FindingCard({
  label,
  detail,
  tone = "neutral",
  aside,
  className,
}: FindingCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card px-3 py-2.5 text-xs",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-2">
          <span
            className="mt-px h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: findingToneColors[tone] }}
          />
          <span className="min-w-0 break-words font-semibold text-foreground">{label}</span>
        </div>
        {aside && <span className="shrink-0">{aside}</span>}
      </div>
      {detail && (
        <div className="mt-1.5 pl-4 leading-relaxed text-muted-foreground">{detail}</div>
      )}
    </div>
  );
}
