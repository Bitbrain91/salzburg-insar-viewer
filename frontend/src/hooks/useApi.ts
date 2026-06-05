import { useQuery } from "@tanstack/react-query";
import type { AppConfigResponse } from "../lib/configMetadata";

export const apiBase =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "");

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${apiBase}${url}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export type PointTerrainContext = {
  source: string;
  resolution_m: number | null;
  elevation_m: number | null;
  slope_deg: number | null;
  aspect_deg: number | null;
};

export type BuildingTerrainContext = {
  source: string;
  resolution_m: number | null;
  elevation_mean_m: number | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  slope_mean_deg: number | null;
  slope_max_deg: number | null;
  relief_range_m: number | null;
};

export type PointDetail = {
  area_id?: string | null;
  dataset_id?: string | null;
  sensor?: string | null;
  area_label?: string | null;
  dataset_label?: string | null;
  code: string;
  track: number;
  los: string;
  velocity: number;
  velocity_std: number | null;
  coherence: number | null;
  height: number | null;
  height_std: number | null;
  acceleration: number | null;
  acceleration_std: number | null;
  season_amp: number | null;
  season_phs: number | null;
  s_amp_std: number | null;
  s_phs_std: number | null;
  incidence_angle: number | null;
  eff_area: number | null;
  amp_mean: number | null;
  amp_std: number | null;
  geometry: { lon: number; lat: number };
  terrain: PointTerrainContext | null;
};

export type BuildingDetail = {
  area_id?: string | null;
  id: string;
  source: "gba" | "osm";
  height: number | null;
  name?: string | null;
  building_type?: string | null;
  geometry: Record<string, unknown>;
  attributes: Record<string, unknown>;
  terrain: BuildingTerrainContext | null;
};

export type MlMetricValue = string | number | boolean | null;

export type MlRunSummary = {
  run_id: string;
  status: string;
  pipeline: string;
  run_type: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  area_id?: string | null;
  dataset_id?: string | null;
  source?: string | null;
  track?: number | null;
};

export type MlRunDetail = MlRunSummary & {
  params: Record<string, unknown>;
  mlflow_run_id?: string | null;
  metrics: Record<string, MlMetricValue>;
  error?: string | null;
};

export type MlRunCreatePayload = {
  pipeline: string;
  area_id?: string | null;
  dataset_id?: string | null;
  source?: string | null;
  track?: number | null;
  bbox?: number[] | null;
  params?: Record<string, number>;
};

export type MlRunDeleteResponse = {
  run_id: string;
  db_deleted: boolean;
  mlflow_deleted: boolean;
  mlflow_error?: string | null;
};

export type MlPipelineListResponse = {
  pipelines: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type MlRunRecolorResponse = {
  run_id: string;
  building_colors: number;
};

export type MlPointExplainReason = {
  key: string;
  severity: number;
  summary: string;
};

export type MlPointNeighbourContext = {
  context_available?: boolean;
  candidate_neighbour_count?: number;
  eligible_neighbour_cluster_count?: number;
  best_neighbour_building_id?: string | null;
  best_neighbour_cluster_id?: string | null;
  own_cluster_fit_score?: number | null;
  neighbour_fit_score?: number | null;
  neighbour_fit_delta?: number | null;
  own_fit_weak_flag?: boolean;
  neighbour_misassignment_flag?: boolean;
  neighbour_event_score?: number | null;
  neighbour_event_flag?: boolean;
  supporting_neighbour_count?: number;
};

export type MlPointAnalysis = {
  area_id?: string | null;
  dataset_id?: string | null;
  sensor?: string | null;
  run_id: string;
  pipeline: string;
  run_type: string;
  code: string;
  track: number;
  quality_score: number | null;
  anomaly_score: number | null;
  cross_track_consistency: number | null;
  label: string | null;
  building_source: string | null;
  building_id: string | null;
  distance_m: number | null;
  feature_set_version: string | null;
  model_set_version: string | null;
  detector_scores: Record<string, number>;
  feature_flags: Record<string, unknown>;
  building_context: Record<string, unknown>;
  cross_track_summary: Record<string, unknown>;
  neighbour_context: MlPointNeighbourContext;
  cluster_role: string | null;
  cluster_probability: number | null;
  cluster_outlier_score: number | null;
  gate_excluded: boolean | null;
  gate_reasons: string[];
  kept_for_scoring: boolean | null;
  explain_top_features: MlPointExplainReason[];
};

export type MlPointAnalysisResponse = {
  status: "ready" | "pending" | "missing";
  analysis: MlPointAnalysis | null;
  message: string | null;
};

export type MlBuildingPointSummary = {
  area_id?: string | null;
  dataset_id?: string | null;
  sensor?: string | null;
  code: string;
  track: number;
  cluster_id: string | null;
  cluster_role: string | null;
  label: string | null;
  quality_score: number | null;
  anomaly_score: number | null;
  cross_track_consistency: number | null;
  distance_m: number | null;
  gate_excluded: boolean | null;
};

export type MlBuildingClusterSummary = {
  area_id?: string | null;
  dataset_id?: string | null;
  sensor?: string | null;
  cluster_id: string;
  building_source: string;
  building_id: string;
  track: number;
  cluster_role: string;
  is_main_cluster: boolean;
  cluster_rank: number | null;
  point_count: number;
  median_velocity_mm_a: number | null;
  median_vertical_proxy_mm_a: number | null;
  median_coherence: number | null;
  median_height_rank: number | null;
  cluster_reliability_score: number | null;
  motion_delta_to_main_mm_a: number | null;
  cluster_centroid_x_m: number | null;
  cluster_centroid_y_m: number | null;
  neighbour_candidate_building_count: number;
  best_neighbour_building_id: string | null;
  best_neighbour_cluster_id: string | null;
  best_neighbour_consistency_score: number | null;
  supporting_neighbour_building_count: number;
  neighbour_event_candidate_flag: boolean;
};

export type MlReliabilityPenalty = {
  key: string;
  score_delta: number | null;
  cap_band: string | null;
  tracks: string[];
  threshold_min_points: number | null;
  threshold_max_score: number | null;
  observed_score: number | null;
};

export type MlBuildingNeighbourhoodSummary = {
  neighbour_context_available: boolean;
  neighbour_candidate_building_count: number;
  neighbour_misassignment_point_count: number;
  neighbour_misassignment_share: number | null;
  neighbour_event_flag: boolean;
  neighbour_event_score: number | null;
  neighbour_consistency_score: number | null;
  supporting_neighbour_count: number;
  supporting_track_count: number;
};

export type MlBuildingAnalysis = MlBuildingNeighbourhoodSummary & {
  area_id?: string | null;
  run_id: string;
  pipeline: string;
  run_type: string;
  building_source: string;
  building_id: string;
  point_count: number;
  kept_point_count: number;
  noise_point_count: number;
  excluded_point_count: number;
  cluster_count: number;
  reliable_cluster_count: number;
  building_motion_mm_a: number | null;
  building_reliability_score: number | null;
  building_reliability_band: string | null;
  track_agreement_score: number | null;
  weak_secondary_track_flag: boolean;
  agreement_tension_flag: boolean;
  reliability_penalties: MlReliabilityPenalty[];
  differential_motion_flag: boolean;
  building_status: string | null;
  main_cluster_by_track: Record<string, string | null>;
  track_motion_mm_a: Record<string, number | null>;
  track_counts: Record<string, number>;
  label_counts: Record<string, number>;
  assignment_methods: Record<string, number>;
  avg_quality_score: number | null;
  avg_anomaly_score: number | null;
  avg_cross_track_consistency: number | null;
  median_distance_m: number | null;
  clusters: MlBuildingClusterSummary[];
  top_points: MlBuildingPointSummary[];
};

export type GeoJsonFeature = {
  type: "Feature";
  geometry: Record<string, unknown>;
  properties: Record<string, unknown>;
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type MlBuildingVisualizationPointsResponse = {
  run_id: string;
  pipeline: string;
  run_type: string;
  building_source: string;
  building_id: string;
  point_count: number;
  feature_collection: GeoJsonFeatureCollection;
};

export type MlBuildingVisualizationSummary = MlBuildingNeighbourhoodSummary & {
  point_count: number;
  kept_point_count: number;
  noise_point_count: number;
  excluded_point_count: number;
  cluster_count: number;
  reliable_cluster_count: number;
  building_motion_mm_a: number | null;
  building_reliability_score: number | null;
  building_reliability_band: string | null;
  track_agreement_score: number | null;
  weak_secondary_track_flag: boolean;
  agreement_tension_flag: boolean;
  reliability_penalties: MlReliabilityPenalty[];
  building_status: string | null;
  differential_motion_flag: boolean;
};

export type MlBuildingVisualizationContextResponse = {
  run_id: string;
  pipeline: string;
  run_type: string;
  building_source: string;
  building_id: string;
  bounds: number[];
  building: GeoJsonFeature | null;
  candidate_areas: GeoJsonFeatureCollection;
  cluster_hulls: GeoJsonFeatureCollection;
  summary: MlBuildingVisualizationSummary;
};

export type PointIdentityQuery = {
  track?: number | null;
  areaId?: string | null;
  datasetId?: string | null;
};

function buildPointQuery(identity: PointIdentityQuery = {}) {
  if (!identity.areaId || !identity.datasetId) {
    throw new Error("areaId and datasetId are required for point API requests");
  }
  const params = new URLSearchParams();
  if (identity.track !== undefined && identity.track !== null) {
    params.set("track", String(identity.track));
  }
  if (identity.areaId) {
    params.set("area_id", identity.areaId);
  }
  if (identity.datasetId) {
    params.set("dataset_id", identity.datasetId);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getConfig() {
  return fetchJson<AppConfigResponse>(`/api/config`);
}

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: getConfig,
    staleTime: 60_000,
    retry: false,
  });
}

export function getPointDetail(code: string, identity: PointIdentityQuery = {}) {
  const query = buildPointQuery(identity);
  return fetchJson<PointDetail>(`/api/points/${encodeURIComponent(code)}${query}`);
}

export function getPointTimeseries(code: string, identity: PointIdentityQuery = {}) {
  const query = buildPointQuery(identity);
  return fetchJson(`/api/points/${encodeURIComponent(code)}/timeseries${query}`);
}

export function getBuildingDetail(source: "gba" | "osm", id: string, areaId: string) {
  if (!areaId) {
    throw new Error("areaId is required for building API requests");
  }
  const suffix = source === "gba" ? "gba" : "osm";
  const query = `?area_id=${encodeURIComponent(areaId)}`;
  return fetchJson<BuildingDetail>(
    `/api/buildings/${suffix}/${encodeURIComponent(id)}${query}`
  );
}

export function getMlBuildingAnalysis(
  runId: string,
  source: "gba" | "osm",
  id: string,
  areaId?: string | null
) {
  const query = areaId ? `?area_id=${encodeURIComponent(areaId)}` : "";
  return fetchJson<MlBuildingAnalysis>(
    `/api/ml/runs/${encodeURIComponent(runId)}/buildings/${source}/${encodeURIComponent(id)}${query}`
  );
}

export function getMlBuildingPoints(
  runId: string,
  source: "gba" | "osm",
  id: string,
  areaId?: string | null
) {
  const query = areaId ? `?area_id=${encodeURIComponent(areaId)}` : "";
  return fetchJson<MlBuildingVisualizationPointsResponse>(
    `/api/ml/runs/${encodeURIComponent(runId)}/buildings/${source}/${encodeURIComponent(id)}/points${query}`
  );
}

export function getMlBuildingContext(
  runId: string,
  source: "gba" | "osm",
  id: string,
  areaId?: string | null
) {
  const query = areaId ? `?area_id=${encodeURIComponent(areaId)}` : "";
  return fetchJson<MlBuildingVisualizationContextResponse>(
    `/api/ml/runs/${encodeURIComponent(runId)}/buildings/${source}/${encodeURIComponent(id)}/context${query}`
  );
}

export function listMlPipelines() {
  return fetchJson<MlPipelineListResponse>(`/api/ml/pipelines`);
}

export function listMlRuns() {
  return fetchJson<MlRunSummary[]>(`/api/ml/runs`);
}

export function getMlRunDetail(runId: string) {
  return fetchJson<MlRunDetail>(`/api/ml/runs/${encodeURIComponent(runId)}`);
}

export function getMlPointAnalysis(
  runId: string,
  code: string,
  identity: PointIdentityQuery & { track: number }
) {
  const query = buildPointQuery(identity);
  return fetchJson<MlPointAnalysisResponse>(
    `/api/ml/runs/${encodeURIComponent(runId)}/points/${encodeURIComponent(code)}${query}`
  );
}

export function createMlRun(payload: MlRunCreatePayload) {
  return fetchJson<MlRunSummary>(`/api/ml/runs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteMlRun(runId: string, force = false) {
  const query = force ? "?force=true" : "";
  return fetchJson<MlRunDeleteResponse>(`/api/ml/runs/${encodeURIComponent(runId)}${query}`, {
    method: "DELETE",
  });
}

export function recolorMlRun(runId: string) {
  return fetchJson<MlRunRecolorResponse>(`/api/ml/runs/${encodeURIComponent(runId)}/recolor`, {
    method: "POST",
  });
}
