import type { MlBuildingAnalysis } from "../../../hooks/useApi";
import {
  differentialMotionLevelLabels,
  formatSignedTrackMotion,
} from "../../../lib/formatters";
import { buildReliabilityReasons } from "../../../lib/reliabilityReasons";
import { Badge, ReliabilityMeter } from "../../ui";

const statusLabels: Record<string, { label: string; tone: "secondary" | "warning" }> = {
  ok: { label: "Belastbar", tone: "secondary" },
  single_track_only: { label: "Nur ein Track", tone: "warning" },
  small_n: { label: "Wenige Punkte", tone: "warning" },
  noise_dominated: { label: "Rauschdominiert", tone: "warning" },
  insufficient_support: { label: "Zu wenig Datenpunkte", tone: "warning" },
};

const statusTooltips: Record<string, string> = {
  ok: "Der Gebäuderollup stützt sich auf ausreichend belastbare Punkte.",
  insufficient_support: "Zu wenige nutzbare Punkte für einen belastbaren Gebäuderollup.",
  noise_dominated: "Mehr als die Hälfte der behaltenen Punkte ist Rauschen.",
  small_n: "Der Hauptcluster hat nur eine kleine Punktstützung.",
  single_track_only: "Es gibt nur einen belastbaren Track für dieses Gebäude.",
};

const bandWords: Record<string, string> = {
  high: "hoch",
  medium: "mittel",
  low: "gering",
};

function directionWord(motion: number | null): "Senkung" | "Hebung" | "stabil" | null {
  if (motion === null || motion === undefined || Number.isNaN(motion)) return null;
  if (motion < -1) return "Senkung";
  if (motion > 1) return "Hebung";
  return "stabil";
}

function verdictSentence(analysis: MlBuildingAnalysis): string {
  const motion = analysis.building_motion_mm_a;
  const direction = directionWord(motion ?? null);
  const band = bandWords[analysis.building_reliability_band ?? ""] ?? "nicht bestimmbar";
  const reasons = buildReliabilityReasons(analysis);
  const reasonClause = reasons.length
    ? `: ${reasons[0].detail.replace(/\.$/, "")}.`
    : ". Alle Prüfungen waren unauffällig.";

  let movementClause: string;
  if (direction === null || motion === null || motion === undefined) {
    movementClause = "Für dieses Gebäude liegt keine belastbare Bewegungsaussage vor";
  } else if (direction === "stabil") {
    movementClause = `Dieses Gebäude ist im aktiven Lauf stabil (${formatSignedTrackMotion(motion)})`;
  } else {
    movementClause = `Dieses Gebäude ${
      direction === "Senkung" ? "senkt sich" : "hebt sich"
    } im aktiven Lauf um ${Math.abs(motion).toFixed(2).replace(".", ",")} mm pro Jahr`;
  }
  return `${movementClause}. Die Einschätzung ist ${band} abgesichert${reasonClause}`;
}

export type BuildingVerdictProps = {
  analysis: MlBuildingAnalysis;
  runTitle: string;
};

/** Oberste Befund-Karte des Gebäudes: Hauptaussage, Meter, Status, Kurzbefund. */
export function BuildingVerdict({ analysis, runTitle }: BuildingVerdictProps) {
  const motion = analysis.building_motion_mm_a ?? null;
  const direction = directionWord(motion);
  const status = analysis.building_status
    ? statusLabels[analysis.building_status] ?? {
        label: analysis.building_status,
        tone: "warning" as const,
      }
    : null;
  const level = analysis.differential_motion_level;
  const showDifferential = level !== null && level !== undefined && level !== "none";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-2xl font-bold text-foreground">
          {formatSignedTrackMotion(motion)}
        </span>
        {direction && (
          <span className="text-sm font-semibold text-muted-foreground">{direction}</span>
        )}
      </div>

      <ReliabilityMeter
        score={analysis.building_reliability_score}
        band={analysis.building_reliability_band}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {status && (
          <Badge
            variant={status.tone}
            title={statusTooltips[analysis.building_status ?? ""] ?? undefined}
          >
            {status.label}
          </Badge>
        )}
        {showDifferential && (
          <Badge
            variant="warning"
            title="Mehrere belastbare Bewegungsmuster liegen am Gebäude vor; Stufe gemäß Evidenz."
          >
            Differenzielle Bewegung: {differentialMotionLevelLabels[level]}
          </Badge>
        )}
      </div>

      <p className="text-xs leading-relaxed text-foreground">{verdictSentence(analysis)}</p>

      <div className="text-xs text-muted-foreground">
        Punkte: <span className="font-mono text-foreground">{analysis.kept_point_count}</span> gewertet ·{" "}
        <span className="font-mono text-foreground">{analysis.excluded_point_count}</span> ausgeschlossen ·{" "}
        <span className="font-mono text-foreground">{analysis.noise_point_count}</span> Rauschen
      </div>

      <div className="border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">
        Befund des Laufs ‚{runTitle}' — keine Aussage über Gebäudeschäden.
      </div>
    </div>
  );
}
