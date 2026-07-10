import type { MlBuildingAnalysis } from "../hooks/useApi";
import {
  differentialMotionLevelLabels,
  fmtNum,
  formatPenalty,
  formatTrackMotionDetail,
  trackSuffix,
} from "./formatters";

/**
 * Uebersetzt Reliability-Penalties und Flags des Gebaeude-Rollups in
 * priorisierte, erklaerte Gruende. Verbatim aus InspectorPanel extrahiert
 * (Stage 2 des UX-Redesigns) — Domaenenlogik, Verhalten unveraendert.
 */

export type ReliabilityReasonTone = "neutral" | "warning" | "bad";

export type ReliabilityReason = {
  key: string;
  label: string;
  detail: string;
  tone: ReliabilityReasonTone;
  priority: number;
};

export const reliabilityReasonVariant = (tone: ReliabilityReasonTone) =>
  tone === "bad" ? "destructive" : tone === "warning" ? "warning" : "secondary";

export const buildReliabilityReasons = (
  analysis: MlBuildingAnalysis
): ReliabilityReason[] => {
  const reasons: ReliabilityReason[] = [];
  const isLow = analysis.building_reliability_band === "low";
  const motionDetail = formatTrackMotionDetail(analysis.track_motion_mm_a);

  if (analysis.agreement_tension_flag) {
    reasons.push({
      key: "agreement_tension",
      label: "Track-Spannung",
      detail: motionDetail
        ? `Tracks widersprechen sich deutlich: ${motionDetail}.`
        : "Die Haupttracks passen nur schwach zueinander.",
      tone: isLow ? "bad" : "warning",
      priority: 100,
    });
  }

  if (analysis.weak_secondary_track_flag) {
    const tracks = analysis.reliability_penalties.flatMap((penalty) =>
      penalty.key === "weak_secondary_track_band_cap" ||
      penalty.key === "weak_main_cluster_support"
        ? penalty.tracks
        : []
    );
    reasons.push({
      key: "weak_secondary_track",
      label: `Schwacher Sekundaertrack${trackSuffix([...new Set(tracks)])}`,
      detail: "Ein Track hat zu wenig belastbare Hauptcluster-Stuetzung.",
      tone: "warning",
      priority: 85,
    });
  }

  for (const penalty of analysis.reliability_penalties) {
    if (penalty.key === "very_low_track_agreement_band_cap") {
      reasons.push({
        key: penalty.key,
        label: `Bandgrenze ${penalty.cap_band || "low"}`,
        detail:
          "Die Zuverlaessigkeit wurde wegen sehr niedriger Track-Uebereinstimmung gedeckelt.",
        tone: "bad",
        priority: 95,
      });
      continue;
    }
    if (penalty.key === "low_track_agreement") {
      const observed = penalty.observed_score ?? analysis.track_agreement_score;
      const threshold = penalty.threshold_max_score ?? 0.25;
      reasons.push({
        key: penalty.key,
        label: "Niedrige Track-Uebereinstimmung",
        detail: `Track-Agreement ${fmtNum(observed)}, Grenzwert ${fmtNum(threshold)}${
          penalty.score_delta === null ? "" : `, Score ${penalty.score_delta.toFixed(2)}`
        }.`,
        tone: isLow ? "bad" : "warning",
        priority: 90,
      });
      continue;
    }
    if (penalty.key === "weak_secondary_track_band_cap") {
      reasons.push({
        key: penalty.key,
        label: `Bandgrenze ${penalty.cap_band || "medium"}${trackSuffix(penalty.tracks)}`,
        detail: "Ein schwacher Sekundaertrack begrenzt das Zuverlaessigkeitsband.",
        tone: "warning",
        priority: 82,
      });
      continue;
    }
    if (penalty.key === "weak_main_cluster_support") {
      reasons.push({
        key: penalty.key,
        label: `Schwache Hauptcluster-Stuetzung${trackSuffix(penalty.tracks)}`,
        detail: `Zu wenig belastbare Punkte im Hauptcluster${
          penalty.threshold_min_points === null
            ? "."
            : `; erwartet mindestens ${penalty.threshold_min_points}.`
        }`,
        tone: "warning",
        priority: 80,
      });
      continue;
    }
    reasons.push({
      key: penalty.key,
      label: formatPenalty(penalty),
      detail: "Pipeline-Anpassung beeinflusst den Zuverlaessigkeitswert.",
      tone: "warning",
      priority: 50,
    });
  }

  if (analysis.differential_motion_level && analysis.differential_motion_level !== "none") {
    const level = analysis.differential_motion_level;
    const levelText = differentialMotionLevelLabels[level];
    const confirmed = level === "significant" || level === "confirmed";
    reasons.push({
      key: "differential_motion",
      label: `Differenzielle Bewegung (${levelText})`,
      detail: confirmed
        ? "Mehrere belastbare Bewegungsmuster liegen am Gebaeude vor; die Differenz ist statistisch abgesichert."
        : "Mehrere belastbare Bewegungsmuster liegen am Gebaeude vor (Kandidat).",
      tone: "warning",
      priority: confirmed ? 90 : 88,
    });
  }

  if (analysis.building_status && !["ok", "—"].includes(analysis.building_status)) {
    const statusDetails: Record<string, string> = {
      insufficient_support: "Zu wenige nutzbare Punkte fuer einen belastbaren Gebaeuderollup.",
      noise_dominated: "Mehr als die Haelfte der behaltenen Punkte ist Rauschen.",
      small_n: "Der Hauptcluster hat nur eine kleine Punktstuetzung.",
      single_track_only: "Es gibt nur einen belastbaren Track fuer dieses Gebaeude.",
    };
    reasons.push({
      key: `status_${analysis.building_status}`,
      label: `Status: ${analysis.building_status}`,
      detail:
        statusDetails[analysis.building_status] ||
        "Der Gebaeudestatus reduziert die Aussagekraft der Zusammenfassung.",
      tone: analysis.building_reliability_band === "high" ? "neutral" : "warning",
      priority: 75,
    });
  }

  const seen = new Set<string>();
  return reasons
    .sort((a, b) => b.priority - a.priority)
    .filter((reason) => {
      if (seen.has(reason.key)) return false;
      seen.add(reason.key);
      return true;
    });
};

export const reliabilityReasonSummary = (analysis: MlBuildingAnalysis) => {
  const reasons = buildReliabilityReasons(analysis);
  return reasons.length
    ? reasons.slice(0, 2).map((reason) => reason.label).join(" / ")
    : "—";
};
