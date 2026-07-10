import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RELIABILITY_BAND_THRESHOLDS,
  reliabilityBandFromScore,
  runStatusToken,
  tokens,
  type ReliabilityBand,
  type RunStatusToken,
} from "../../lib/designTokens";
import {
  formatMlClusterKindForModel,
  ML_CLUSTER_KIND_COLORS,
  ML_CLUSTER_KIND_DESCRIPTIONS,
  type MlClusterKind,
} from "../../lib/mlClusterKind";
import type { ReliabilityReasonTone } from "../../lib/reliabilityReasons";

/* ---------------- ReliabilityMeter ---------------- */

const reliabilityBandLabels: Record<ReliabilityBand, string> = {
  high: "hoch",
  medium: "mittel",
  low: "gering",
  unknown: "unbekannt",
};

export type ReliabilityMeterProps = {
  score: number | null | undefined;
  /** Band aus dem Backend; ohne Angabe wird es aus dem Score abgeleitet. */
  band?: string | null;
  label?: ReactNode;
  className?: string;
};

/**
 * Beschriftete Drei-Segment-Leiste (gering/mittel/hoch) mit Score-Marker —
 * ersetzt die rohe Darstellung "0.62 / medium".
 */
export function ReliabilityMeter({ score, band, label, className }: ReliabilityMeterProps) {
  const resolvedBand: ReliabilityBand =
    band === "high" || band === "medium" || band === "low"
      ? band
      : reliabilityBandFromScore(score);
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
          {clamped === null ? "—" : clamped.toFixed(2)}
        </span>
      </div>
      <div className="relative flex h-2.5 w-full gap-0.5" role="img"
        aria-label={`Zuverlässigkeit ${clamped === null ? "unbekannt" : clamped.toFixed(2)} (${reliabilityBandLabels[resolvedBand]})`}
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
            style={{ left: `calc(${clamped * 100}% - 1.5px)`, backgroundColor: "hsl(var(--foreground))" }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className={resolvedBand === "low" ? "font-bold" : undefined}
          style={resolvedBand === "low" ? { color } : undefined}>gering</span>
        <span className={resolvedBand === "medium" ? "font-bold" : undefined}
          style={resolvedBand === "medium" ? { color } : undefined}>mittel</span>
        <span className={resolvedBand === "high" ? "font-bold" : undefined}
          style={resolvedBand === "high" ? { color } : undefined}>hoch</span>
      </div>
    </div>
  );
}

/* ---------------- ScoreBar ---------------- */

export type ScoreBarProps = {
  label: ReactNode;
  value: number | null | undefined;
  /** "higher-better" faerbt hohe Werte gruen, "higher-worse" rot (z. B. Anomalie). */
  direction?: "higher-better" | "higher-worse";
  /** Optionaler Schwellenmarker (0..1). */
  threshold?: number;
  className?: string;
};

/** Kompakter 0..1-Balken mit Wert — fuer Qualitaets-/Anomalie-Minimeter. */
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
          {clamped === null ? "—" : clamped.toFixed(2)}
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
  kind: MlClusterKind | null | undefined;
  modelSetVersion?: string | null;
  className?: string;
  style?: CSSProperties;
};

/**
 * Cluster-Typ-Chip: neutraler Badge mit Farbpunkt (nie Petrol/Violett als
 * Flaeche, damit keine Kollision mit der Markenfarbe entsteht).
 */
export function KindBadge({ kind, modelSetVersion, className, style }: KindBadgeProps) {
  if (!kind) return null;
  const dotColor =
    kind === "standard" ? "hsl(var(--muted-foreground))" : ML_CLUSTER_KIND_COLORS[kind];
  return (
    <span
      title={ML_CLUSTER_KIND_DESCRIPTIONS[kind]}
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground",
        className
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <span className="truncate">
        {formatMlClusterKindForModel(kind, modelSetVersion)}
      </span>
    </span>
  );
}

/* ---------------- StatusBadge ---------------- */

const runStatusLabels: Record<RunStatusToken, string> = {
  queued: "In Warteschlange",
  running: "Läuft",
  succeeded: "Abgeschlossen",
  failed: "Fehlgeschlagen",
};

const runStatusIcons: Record<RunStatusToken, typeof Clock3> = {
  queued: Clock3,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: AlertTriangle,
};

export type StatusBadgeProps = {
  status: string | null | undefined;
  /** Kompakt: nur Icon + Farbe (fuer enge Zeilen). */
  iconOnly?: boolean;
  className?: string;
};

export function StatusBadge({ status, iconOnly = false, className }: StatusBadgeProps) {
  const token = runStatusToken(status);
  const color = tokens.runStatus[token];
  const Icon = runStatusIcons[token];
  return (
    <span
      title={runStatusLabels[token]}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold",
        className
      )}
      style={{ color }}
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", token === "running" && "animate-spin")}
        strokeWidth={2.2}
      />
      {!iconOnly && <span>{runStatusLabels[token]}</span>}
    </span>
  );
}

export function runStatusLabel(status: string | null | undefined): string {
  return runStatusLabels[runStatusToken(status)];
}

/* ---------------- FindingCard ---------------- */

const findingToneColors: Record<ReliabilityReasonTone, string> = {
  neutral: "hsl(var(--muted-foreground))",
  warning: tokens.reliability.medium,
  bad: tokens.reliability.low,
};

export type FindingCardProps = {
  label: ReactNode;
  detail?: ReactNode;
  tone?: ReliabilityReasonTone;
  aside?: ReactNode;
  className?: string;
};

/** Grund-Karte fuer "Warum diese Bewertung?": Ton-Punkt, fettes Label, Klartext. */
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
          <span className="min-w-0 break-words font-semibold text-foreground">
            {label}
          </span>
        </div>
        {aside && <span className="shrink-0">{aside}</span>}
      </div>
      {detail && (
        <div className="mt-1.5 pl-4 leading-relaxed text-muted-foreground">{detail}</div>
      )}
    </div>
  );
}
