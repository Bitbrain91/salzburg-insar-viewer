/**
 * Single Source of Truth für alle im Explainer angezeigten Zahlen, Gewichte
 * und Schwellen der aktiven Pipeline.
 *
 * Quelle: `backend/app/ml/pipelines/anomaly_local_v1.py` (Zeilenangaben als
 * Kommentar je Konstante, Stand 2026-07-13) und
 * `docs/pipelines/anomaly_local_v1/methodik.md`.
 *
 * Regel: Komponenten zeigen ausschließlich Werte aus diesem Modul an —
 * keine Zahl wird in einer Komponente hartkodiert. Ändert sich die Pipeline,
 * wird dieses Modul im selben Ticket nachgezogen.
 */

/** Versionsmarker (anomaly_local_v1.py Z. 30, 37, 165). */
export const PIPELINE_NAME = "anomaly_local_v1";
export const MODEL_SET_VERSION = "local_hdbscan_rulegate_v4_k2xhf_diffv2";
export const FEATURE_SET_VERSION = "anomaly_local_v1_phase1";

/* ------------------------------------------------------------------ */
/* Stufe 1: Punktzuordnung (default_params Z. 182–198, points_query)   */
/* ------------------------------------------------------------------ */

export const assignment = {
  bufferMultiplier: 1.0, // Z. 185
  minBufferM: 3.0, // Z. 186
  maxBufferM: 30.0, // Z. 187
  lateralSlackM: 2.0, // Z. 188
  defaultHeightM: 12.0, // Z. 189
  defaultIncidenceDeg: 38.5, // Z. 190
  maxDistanceM: 15.0, // Z. 191 (nearest-Fallback)
} as const;

/**
 * Range-Offset der Candidate Area (points_query Z. 420–428):
 * clamp(hoehe * tan(inzidenz) * buffer_multiplier, min_buffer, max_buffer).
 */
export function rangeOffsetM(heightM: number, incidenceDeg: number): number {
  const raw =
    heightM * Math.tan((incidenceDeg * Math.PI) / 180) * assignment.bufferMultiplier;
  return Math.max(assignment.minBufferM, Math.min(assignment.maxBufferM, raw));
}

/* ------------------------------------------------------------------ */
/* Stufe 3: Qualitaetsgates (_apply_gate_rules Z. 838–866)             */
/* ------------------------------------------------------------------ */

export const gates = {
  minValidEpochs: 24, // Z. 192 / 850
  minValidEpochRatio: 0.5, // Z. 193 / 852
  coherenceFloor: 0.45, // Z. 194 / 847: max(0.45, track_p05)
} as const;

export type GateReason =
  | "no_building_assignment"
  | "too_few_valid_epochs"
  | "too_sparse_timeseries"
  | "low_coherence";

/** Gate-Prüfung wie _apply_gate_rules (Z. 842–858). */
export function evaluateGates(input: {
  hasBuilding: boolean;
  validEpochCount: number;
  validEpochRatio: number;
  coherence: number;
  trackP05: number;
}): GateReason[] {
  const reasons: GateReason[] = [];
  const coherenceThreshold = Math.max(gates.coherenceFloor, input.trackP05);
  if (!input.hasBuilding) reasons.push("no_building_assignment");
  if (input.validEpochCount < gates.minValidEpochs) reasons.push("too_few_valid_epochs");
  if (input.validEpochRatio < gates.minValidEpochRatio) reasons.push("too_sparse_timeseries");
  if (input.coherence < coherenceThreshold) reasons.push("low_coherence");
  return reasons;
}

/**
 * k2x-Cross-Look-Toleranz für nearest-Punkte (_apply_crosslook_policy
 * Z. 917–921): median + 3 * 1.4826 * MAD + 3 m Geocoding-Marge + sqrt(eff_area).
 */
export const crossLook = {
  madFactor: 3.0 * 1.4826, // Z. 921
  geocodingMarginM: 3.0, // Z. 921
} as const;

export function crossLookLimitM(medianM: number, madM: number, effAreaM2: number): number {
  return (
    medianM + crossLook.madFactor * madM + crossLook.geocodingMarginM + Math.sqrt(Math.max(effAreaM2, 0))
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 4 (v4): Bauteil-/Fremdreflektortrennung (Konstanten Z. 52–63) */
/* ------------------------------------------------------------------ */

export const separation = {
  offFootprintEpsM: 0.5, // OFF_FOOTPRINT_EPS_M
  heightSaturationRatio: 0.735, // HEIGHT_SATURATION_RATIO (nur gba)
  heightMarginM: 3.0, // HEIGHT_MARGIN_M (a7)
  madK: 3.0 * 1.4826, // MAD_K (a8)
  madFloorM: 1.0, // MAD_FLOOR_M (a8)
  antiLayoverDot: -0.2, // ANTI_LAYOVER_DOT (a6)
  antiComponentMinM: 1.5, // ANTI_COMPONENT_MIN_M (a6)
  a8MaxBelowM: 8.0, // Z. 976: tol < delta_below <= 8.0
  a8MinAnchors: 2, // Z. 970
  annexRecruitMinDistanceM: 2.0, // Z. 1180 (annex_velocity_growth)
  annexMinConsistent: 2, // Z. 1195
} as const;

export type SeparationReason = "height_outlier" | "anti_layover" | "reach_height_excess";

/** a8 Hoehenprofil (Z. 963–977): einseitiges Anbau-Band unter den Dach-Ankern. */
export function a8HeightOutlier(input: {
  pointHeightM: number;
  anchorMedianM: number;
  anchorMadM: number;
  anchorCount: number;
}): boolean {
  if (input.anchorCount < separation.a8MinAnchors) return false;
  const tol = Math.max(separation.madK * input.anchorMadM, separation.madFloorM);
  const deltaBelow = input.anchorMedianM - input.pointHeightM;
  return tol < deltaBelow && deltaBelow <= separation.a8MaxBelowM;
}

/** a6 Anti-Layover (Z. 986–1000): Versatz entgegen der Range-Richtung. */
export function a6AntiLayover(input: { distanceM: number; dot: number }): boolean {
  return (
    input.distanceM > separation.offFootprintEpsM &&
    input.dot < separation.antiLayoverDot &&
    input.distanceM * -input.dot > separation.antiComponentMinM
  );
}

/** a7 Reichweite (Z. 1006–1020): implizite Reflektorhoehe d/tan(inz). */
export function a7ReachExcess(input: {
  distanceM: number;
  incidenceDeg: number;
  plausibleHeightM: number;
  source: "bev" | "gba";
}): boolean {
  if (input.distanceM <= separation.offFootprintEpsM) return false;
  const plausible =
    input.source === "gba"
      ? input.plausibleHeightM / separation.heightSaturationRatio
      : input.plausibleHeightM;
  const impliedH =
    input.distanceM / Math.max(Math.tan((input.incidenceDeg * Math.PI) / 180), 1e-6);
  return impliedH > plausible + separation.heightMarginM;
}

/**
 * P8-F-Evidenzrouting "anti_foreign" (_assign_side_group Z. 1133–1141):
 * anti_layover ODER (bev UND reach_height_excess) -> foreign; übrige
 * Kandidaten -> annex-Seed. foreign gewinnt vor annex.
 */
export function routeSeparation(
  reasons: SeparationReason[],
  source: "bev" | "gba"
): "standard" | "annex" | "foreign" {
  if (reasons.length === 0) return "standard";
  if (reasons.includes("anti_layover")) return "foreign";
  if (source === "bev" && reasons.includes("reach_height_excess")) return "foreign";
  return "annex";
}

/* ------------------------------------------------------------------ */
/* Stufe 5: Clustering (_cluster_building_groups Z. 1042–1066)         */
/* ------------------------------------------------------------------ */

export const clustering = {
  insufficientBelow: 3, // Z. 1042: < 3 -> insufficient_support
  smallNMax: 5, // Z. 1063: <= 5 -> Small-N-Fallback
  smallNNoiseThreshold: 0.8, // Z. 197 (small_n_noise_threshold)
  smallNMinConsistent: 2, // Z. 1229
  /** Velocity-Konsistenz (Z. 1225–1228): |v - median| <= max(1 mm/a, 2*v_std). */
  velocityToleranceFloor: 1.0,
  velocityToleranceFactor: 2.0,
  /** HDBSCAN-Featurematrix (_cluster_matrix Z. 2499–2516). */
  featureWeights: [
    { key: "along_look_offset_m", label: "Längs-Versatz", weight: 1.1 },
    { key: "cross_look_offset_m", label: "Quer-Versatz", weight: 1.0 },
    { key: "height_rank_in_building", label: "Höhenrang", weight: 0.75 },
    { key: "velocity", label: "Geschwindigkeit", weight: 1.3 },
    { key: "acceleration", label: "Beschleunigung", weight: 0.9 },
    { key: "coherence_penalty", label: "Kohärenz-Malus", weight: 0.8 },
  ],
  robustScalerQuantiles: [15, 85] as const, // Z. 2514
} as const;

/** HDBSCAN-Parameter als Funktion von n (Z. 1264–1265). */
export function hdbscanParams(n: number): { minClusterSize: number; minSamples: number } {
  const minClusterSize = Math.max(2, Math.min(8, Math.ceil(0.2 * n)));
  return { minClusterSize, minSamples: Math.max(1, Math.floor(minClusterSize / 2)) };
}

export type ClusterBranch = "insufficient" | "small_n" | "hdbscan";

export function clusterBranch(n: number): ClusterBranch {
  if (n < clustering.insufficientBelow) return "insufficient";
  if (n <= clustering.smallNMax) return "small_n";
  return "hdbscan";
}

/** Velocity-Toleranz (Z. 1182, 1225–1227): max(1 mm/a, 2 * velocity_std). */
export function velocityToleranceMmA(velocityStd: number): number {
  return Math.max(
    clustering.velocityToleranceFloor,
    clustering.velocityToleranceFactor * velocityStd
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 6: Punkt- und Clusterbewertung (_score_records Z. 2258–2302)  */
/* ------------------------------------------------------------------ */

export const pointScoring = {
  /** anomaly_score-Gewichte (Z. 2274–2275). */
  anomalyWeights: { clusterOutlier: 0.6, localDeviation: 0.25, rulePenalty: 0.15 },
  /** quality_score-Gewichte (Z. 2282–2291). */
  qualityWeights: { inverseAnomaly: 0.45, crossTrack: 0.25, keptSupport: 0.2, signal: 0.1 },
  noiseAnomalyFloor: 0.8, // Z. 2277–2278
  gateExcludedAnomalyFloor: 0.9, // Z. 2265
  gateExcludedQualityCap: 0.15, // Z. 2267–2270
  insufficientSupportQualityCap: 0.65, // Z. 2293
  labelNormalThreshold: 0.7, // Z. 195 (quality_normal_threshold)
  labelOutlierThreshold: 0.4, // Z. 196 (quality_outlier_threshold)
} as const;

export function anomalyScore(
  clusterOutlier: number,
  localDeviation: number,
  rulePenalty: number
): number {
  const w = pointScoring.anomalyWeights;
  return clamp01(
    w.clusterOutlier * clusterOutlier + w.localDeviation * localDeviation + w.rulePenalty * rulePenalty
  );
}

export function qualityScore(
  anomaly: number,
  crossTrack: number,
  keptSupport: number,
  signal: number
): number {
  const w = pointScoring.qualityWeights;
  return clamp01(
    w.inverseAnomaly * (1 - anomaly) + w.crossTrack * crossTrack + w.keptSupport * keptSupport + w.signal * signal
  );
}

export type PointLabel = "normal" | "suspect" | "outlier";

/** Labelableitung (_label_for_quality; Schwellen Z. 195–196). */
export function labelForQuality(quality: number): PointLabel {
  if (quality >= pointScoring.labelNormalThreshold) return "normal";
  if (quality < pointScoring.labelOutlierThreshold) return "outlier";
  return "suspect";
}

/** Regel-Penalties (_score_rule_penalty Z. 2322–2358), max. Gewicht je Regel. */
export const rulePenalties = [
  { key: "nearest_assignment", label: "Nur nearest-Zuordnung", weight: 0.2 },
  { key: "directional_assignment", label: "Zuordnung über Candidate Area", weight: 0.05 },
  { key: "high_velocity_std", label: "Hohe Geschwindigkeitsunsicherheit", weight: 0.2 },
  { key: "unstable_amplitude", label: "Instabile Amplitude", weight: 0.12 },
  { key: "unsupported_step", label: "Ungestützter Sprung in der Zeitreihe", weight: 0.2 },
  { key: "weak_local_support", label: "Wenig lokale Stützung", weight: 0.15 },
  { key: "cross_track_mismatch", label: "ASC/DSC widersprechen sich", weight: 0.18 },
] as const;

export const clusterScoring = {
  /** cluster_reliability_score (Z. 1514–1524). */
  weights: { support: 0.45, signal: 0.35, assignment: 0.2 },
  supportSaturationN: 4, // min(point_count / 4, 1)
  reliableCoreMinPoints: 2, // Z. 1511
} as const;

export function clusterReliabilityScore(
  pointCount: number,
  medianCoherence: number,
  assignmentQuality: number
): number {
  const w = clusterScoring.weights;
  return clamp01(
    w.support * Math.min(pointCount / clusterScoring.supportSaturationN, 1) +
      w.signal * clamp01(medianCoherence) +
      w.assignment * assignmentQuality
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 7: Gebaeudebewegung + Cross-Track (Z. 1625–1654, 2909–2911)   */
/* ------------------------------------------------------------------ */

export const crossTrack = {
  /** allowed_diff = 1.0 + 0.15 * slope_mean (Z. 1629). */
  allowedDiffBaseMmA: 1.0,
  allowedDiffSlopeFactor: 0.15,
  /** vertical_proxy = velocity / max(cos(inzidenz), 0.30) (Z. 2909–2911). */
  cosineFloor: 0.3,
  fullSupportMinPoints: 2, // Z. 1649–1653
  ascTrack: 44,
  dscTrack: 95,
} as const;

export function verticalProxyMmA(velocityMmA: number, incidenceDeg: number): number {
  return velocityMmA / Math.max(Math.cos((incidenceDeg * Math.PI) / 180), crossTrack.cosineFloor);
}

export function allowedDiffMmA(slopeMeanDeg: number): number {
  return crossTrack.allowedDiffBaseMmA + crossTrack.allowedDiffSlopeFactor * slopeMeanDeg;
}

/** track_agreement_score = exp(-diff/allowed_diff) (Z. 1647). */
export function trackAgreementScore(diffMmA: number, allowedMmA: number): number {
  return Math.exp(-(diffMmA / Math.max(allowedMmA, 1e-9)));
}

export type BuildingStatus =
  | "ok"
  | "single_track_only"
  | "small_n"
  | "noise_dominated"
  | "insufficient_support";

export const BUILDING_STATUS_LABELS: Record<BuildingStatus, string> = {
  ok: "Belastbar",
  single_track_only: "Nur ein Track",
  small_n: "Wenige Punkte",
  noise_dominated: "Rauschdominiert",
  insufficient_support: "Zu wenig Datenpunkte",
};

/** Statuslogik (Z. 1801–1810), Prüfreihenfolge wie im Code. */
export function buildingStatus(input: {
  keptPoints: number;
  hasMainCluster: boolean;
  noisePoints: number;
  mainSupportTotal: number;
  trackCount: number;
}): BuildingStatus {
  if (input.keptPoints < 3 || !input.hasMainCluster) return "insufficient_support";
  if (input.noisePoints > input.keptPoints * 0.5) return "noise_dominated";
  if (input.mainSupportTotal < 4) return "small_n";
  if (input.trackCount === 1) return "single_track_only";
  return "ok";
}

/* ------------------------------------------------------------------ */
/* Stufe 8: Differenzielle Bewegung v2 (Z. 1656–1777, 2883–2894)       */
/* ------------------------------------------------------------------ */

export const differential = {
  /** candidate_threshold = max(1.5, allowed_diff) (Z. 1663). */
  candidateFloorMmA: 1.5,
  /** significant: |delta| >= 2 * sigma_delta (Z. 1726). */
  sigmaFactor: 2.0,
  /** small_n_guard: Signifikanz erst ab 3 Punkten je Cluster (Z. 1725). */
  minPointsForSignificance: 3,
  /** Sekundärcluster: core und >= 2 Punkte, nicht Main (Z. 1675–1681). */
  secondaryMinPoints: 2,
  /** se = 1.253 * max(mad_sigma, noise_floor) / sqrt(n) (Z. 2886). */
  medianSeFactor: 1.253, // sqrt(pi/2)
  /** season_amp_mismatch: |sek - main| > 2.0 (Z. 1750). */
  seasonAmpMismatchThreshold: 2.0,
} as const;

export type DifferentialDowngrade =
  | "small_n_guard"
  | "season_amp_mismatch"
  | "unstable_amplitude";

export type DifferentialLevel = "none" | "candidate" | "significant" | "confirmed";

const LEVEL_RANK: Record<DifferentialLevel, number> = {
  none: 0,
  candidate: 1,
  significant: 2,
  confirmed: 3,
};
const RANK_TO_LEVEL: DifferentialLevel[] = ["none", "candidate", "significant", "confirmed"];

/**
 * Levellogik für EINEN Sekundärcluster, 1:1 wie Z. 1712–1767:
 * unter der Kandidatenschwelle kein Beitrag; sonst candidate ->
 * significant (2-Sigma + Mindeststützung) -> confirmed (zweiter Track,
 * gleiches Vorzeichen, über Schwelle); Downgrades senken je einen Rang,
 * Floor bleibt candidate.
 */
export function differentialLevel(input: {
  deltaAbsMmA: number;
  sigmaDeltaMmA: number;
  nMain: number;
  nSecondary: number;
  candidateThresholdMmA: number;
  confirmedByOtherTrack: boolean;
  seasonAmpMismatch: boolean;
  unstableAmplitude: boolean;
}): { level: DifferentialLevel; downgrades: DifferentialDowngrade[] } {
  if (input.deltaAbsMmA < input.candidateThresholdMmA) {
    return { level: "none", downgrades: [] };
  }
  const smallNGuard =
    Math.min(input.nMain, input.nSecondary) < differential.minPointsForSignificance;
  const passesSigma = input.deltaAbsMmA >= differential.sigmaFactor * input.sigmaDeltaMmA;
  let rank = LEVEL_RANK.candidate;
  if (passesSigma && !smallNGuard) rank = LEVEL_RANK.significant;
  if (rank >= LEVEL_RANK.significant && input.confirmedByOtherTrack) {
    rank = LEVEL_RANK.confirmed;
  }
  const downgrades: DifferentialDowngrade[] = [];
  if (smallNGuard && passesSigma) downgrades.push("small_n_guard");
  if (input.seasonAmpMismatch) downgrades.push("season_amp_mismatch");
  if (input.unstableAmplitude) downgrades.push("unstable_amplitude");
  const effective = Math.max(LEVEL_RANK.candidate, rank - downgrades.length);
  return { level: RANK_TO_LEVEL[effective], downgrades };
}

export function candidateThresholdMmA(allowedMmA: number): number {
  return Math.max(differential.candidateFloorMmA, allowedMmA);
}

/* ------------------------------------------------------------------ */
/* Stufe 9: building_reliability_score (Z. 1861–1899)                  */
/* ------------------------------------------------------------------ */

export const buildingReliability = {
  /** Positive Komponenten (Z. 1880–1885). */
  weights: { support: 0.35, signal: 0.25, assignment: 0.2, agreement: 0.2 },
  supportSaturationN: 6, // min(support_total / 6, 1)
  agreementFallback: 0.5, // Z. 1877–1879 (nur ein Track o. fehlender Score)
  /** Abzüge (Z. 1886–1890 + Retuning Z. 1823–1850). */
  penalties: {
    singleTrack: 0.15,
    lowSupport: 0.1, // support_total < 4
    noiseDominance: 0.15, // noise > 50 % der kept-Punkte
    differentialSignificant: 0.15, // Level significant/confirmed
    weakMainClusterSupport: 0.1, // Main-Support < 3 auf einem Track
    lowTrackAgreement: 0.1, // agreement < 0.25
  },
  /** Band-Caps (Z. 1896–1899). */
  caps: {
    weakSecondaryTrackBand: "medium" as const, // Main-Track mit Support < 3 bei >= 2 Tracks
    veryLowAgreementBand: "low" as const, // agreement < 0.10 bei Status ok
    agreementTensionThreshold: 0.25, // Z. 1812
    veryLowAgreementThreshold: 0.1, // Z. 1815–1819
  },
} as const;

export function buildingReliabilityScore(input: {
  mainSupportTotal: number;
  signal: number;
  assignment: number;
  agreement: number | null;
  singleTrack: boolean;
  noiseDominated: boolean;
  differentialSignificantOrConfirmed: boolean;
  weakMainClusterSupport: boolean;
  lowTrackAgreement: boolean;
}): number {
  const w = buildingReliability.weights;
  const p = buildingReliability.penalties;
  const agreement = input.agreement ?? buildingReliability.agreementFallback;
  return clamp01(
    w.support * Math.min(input.mainSupportTotal / buildingReliability.supportSaturationN, 1) +
      w.signal * input.signal +
      w.assignment * input.assignment +
      w.agreement * agreement -
      (input.singleTrack ? p.singleTrack : 0) -
      (input.mainSupportTotal < 4 ? p.lowSupport : 0) -
      (input.noiseDominated ? p.noiseDominance : 0) -
      (input.differentialSignificantOrConfirmed ? p.differentialSignificant : 0) -
      (input.weakMainClusterSupport ? p.weakMainClusterSupport : 0) -
      (input.lowTrackAgreement ? p.lowTrackAgreement : 0)
  );
}

/* ------------------------------------------------------------------ */
/* Nachbarschaftskontext (Konstanten Z. 30–46)                         */
/* ------------------------------------------------------------------ */

export const neighbourhood = {
  radiusM: 25.0, // NEIGHBOUR_BUILDING_RADIUS_M
  maxNeighbours: 8, // MAX_NEIGHBOUR_BUILDINGS
} as const;

/* ------------------------------------------------------------------ */

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
