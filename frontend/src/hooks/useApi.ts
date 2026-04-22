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
  gba_id: string | null;
  osm_id: number | null;
  terrain: PointTerrainContext | null;
};

export type BuildingDetail = {
  id: string;
  source: "gba" | "osm";
  height: number | null;
  name?: string | null;
  building_type?: string | null;
  geometry: Record<string, unknown>;
  attributes: Record<string, unknown>;
  terrain: BuildingTerrainContext | null;
};

export type MlPointExplainReason = {
  key: string;
  severity: number;
  summary: string;
};

export type MlPointAnalysis = {
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
  cluster_id: string;
  track: number;
  point_count: number;
  median_velocity: number | null;
  median_coherence: number | null;
  median_height_rank: number | null;
};

export type MlBuildingAnalysis = {
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
  track_agreement_score: number | null;
  building_status: string | null;
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
  summary: Record<string, unknown>;
};

export function getPointDetail(code: string, track?: number) {
  const query = track ? `?track=${track}` : "";
  return fetchJson<PointDetail>(`/api/points/${encodeURIComponent(code)}${query}`);
}

export function getPointTimeseries(code: string, track?: number) {
  const query = track ? `?track=${track}` : "";
  return fetchJson(`/api/points/${encodeURIComponent(code)}/timeseries${query}`);
}

export function getBuildingDetail(source: "gba" | "osm", id: string) {
  const suffix = source === "gba" ? "gba" : "osm";
  return fetchJson<BuildingDetail>(`/api/buildings/${suffix}/${encodeURIComponent(id)}`);
}

export function getBuildingPoints(source: "gba" | "osm", id: string) {
  return fetchJson(`/api/buildings/${source}/${encodeURIComponent(id)}/points`);
}

export function getMlBuildingAnalysis(
  runId: string,
  source: "gba" | "osm",
  id: string
) {
  return fetchJson<MlBuildingAnalysis>(
    `/api/ml/runs/${encodeURIComponent(runId)}/buildings/${source}/${encodeURIComponent(id)}`
  );
}

export function getMlBuildingPoints(
  runId: string,
  source: "gba" | "osm",
  id: string
) {
  return fetchJson<MlBuildingVisualizationPointsResponse>(
    `/api/ml/runs/${encodeURIComponent(runId)}/buildings/${source}/${encodeURIComponent(id)}/points`
  );
}

export function getMlBuildingContext(
  runId: string,
  source: "gba" | "osm",
  id: string
) {
  return fetchJson<MlBuildingVisualizationContextResponse>(
    `/api/ml/runs/${encodeURIComponent(runId)}/buildings/${source}/${encodeURIComponent(id)}/context`
  );
}

export function listMlPipelines() {
  return fetchJson(`/api/ml/pipelines`);
}

export function listMlRuns() {
  return fetchJson(`/api/ml/runs`);
}

export function getMlRunDetail(runId: string) {
  return fetchJson(`/api/ml/runs/${encodeURIComponent(runId)}`);
}

export function getMlPointAnalysis(runId: string, code: string, track: number) {
  return fetchJson<MlPointAnalysisResponse>(
    `/api/ml/runs/${encodeURIComponent(runId)}/points/${encodeURIComponent(code)}?track=${track}`
  );
}

export function createMlRun(payload: any) {
  return fetchJson(`/api/ml/runs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteMlRun(runId: string, force = false) {
  const query = force ? "?force=true" : "";
  return fetchJson(`/api/ml/runs/${encodeURIComponent(runId)}${query}`, {
    method: "DELETE",
  });
}

export function recolorMlRun(runId: string) {
  return fetchJson(`/api/ml/runs/${encodeURIComponent(runId)}/recolor`, {
    method: "POST",
  });
}
