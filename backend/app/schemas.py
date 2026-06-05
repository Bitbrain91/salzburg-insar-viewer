from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class GeometryPoint(BaseModel):
    lon: float
    lat: float


class PointTerrainContext(BaseModel):
    source: str
    resolution_m: Optional[float] = None
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    aspect_deg: Optional[float] = None


class BuildingTerrainContext(BaseModel):
    source: str
    resolution_m: Optional[float] = None
    elevation_mean_m: Optional[float] = None
    elevation_min_m: Optional[float] = None
    elevation_max_m: Optional[float] = None
    slope_mean_deg: Optional[float] = None
    slope_max_deg: Optional[float] = None
    relief_range_m: Optional[float] = None


class InSARPointDetail(BaseModel):
    area_id: str
    dataset_id: str
    sensor: str
    code: str
    track: int
    los: str
    velocity: float
    velocity_std: Optional[float] = None
    coherence: Optional[float] = None
    height: Optional[float] = None
    height_std: Optional[float] = None
    acceleration: Optional[float] = None
    acceleration_std: Optional[float] = None
    season_amp: Optional[float] = None
    season_phs: Optional[float] = None
    s_amp_std: Optional[float] = None
    s_phs_std: Optional[float] = None
    incidence_angle: Optional[float] = None
    look_angle: Optional[float] = None
    eff_area: Optional[float] = None
    amp_mean: Optional[float] = None
    amp_std: Optional[float] = None
    geometry: GeometryPoint
    terrain: Optional[PointTerrainContext] = None


class TimeseriesPoint(BaseModel):
    date: date
    displacement: Optional[float] = None
    amplitude: Optional[float] = None


class TimeseriesResponse(BaseModel):
    area_id: str
    dataset_id: str
    sensor: str
    code: str
    track: int
    measurements: List[TimeseriesPoint]


class BuildingDetail(BaseModel):
    area_id: str
    id: str
    source: str
    height: Optional[float] = None
    name: Optional[str] = None
    building_type: Optional[str] = None
    geometry: dict
    attributes: dict = {}
    terrain: Optional[BuildingTerrainContext] = None


class HealthResponse(BaseModel):
    status: str


class ConfigResponse(BaseModel):
    velocity_thresholds: dict
    areas: List[dict] = Field(default_factory=list)
    datasets: List[dict] = Field(default_factory=list)
    tracks: List[dict]


class MLRunCreate(BaseModel):
    pipeline: str
    area_id: Optional[str] = None
    dataset_id: Optional[str] = None
    source: Optional[str] = None
    track: Optional[int] = None
    bbox: Optional[List[float]] = None
    params: dict = Field(default_factory=dict)


class MLRunSummary(BaseModel):
    run_id: str
    status: str
    pipeline: str
    run_type: str
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    area_id: str
    dataset_id: str
    source: Optional[str] = None
    track: Optional[int] = None


class MLRunDetail(MLRunSummary):
    params: dict = Field(default_factory=dict)
    mlflow_run_id: Optional[str] = None
    metrics: dict = Field(default_factory=dict)
    error: Optional[str] = None


class MLRunDeleteResponse(BaseModel):
    run_id: str
    db_deleted: bool
    mlflow_deleted: bool
    mlflow_error: Optional[str] = None


class MLExplainReason(BaseModel):
    key: str
    severity: float
    summary: str


class MLPointAnalysis(BaseModel):
    run_id: str
    pipeline: str
    run_type: str
    area_id: str
    dataset_id: str
    sensor: Optional[str] = None
    code: str
    track: int
    quality_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    cross_track_consistency: Optional[float] = None
    label: Optional[str] = None
    building_source: Optional[str] = None
    building_id: Optional[str] = None
    distance_m: Optional[float] = None
    feature_set_version: Optional[str] = None
    model_set_version: Optional[str] = None
    detector_scores: dict[str, float] = Field(default_factory=dict)
    feature_flags: dict[str, Any] = Field(default_factory=dict)
    building_context: dict[str, Any] = Field(default_factory=dict)
    cross_track_summary: dict[str, Any] = Field(default_factory=dict)
    neighbour_context: dict[str, Any] = Field(default_factory=dict)
    cluster_role: Optional[str] = None
    cluster_probability: Optional[float] = None
    cluster_outlier_score: Optional[float] = None
    gate_excluded: Optional[bool] = None
    gate_reasons: List[str] = Field(default_factory=list)
    kept_for_scoring: Optional[bool] = None
    explain_top_features: List[MLExplainReason] = Field(default_factory=list)


class MLBuildingPointSummary(BaseModel):
    area_id: str
    dataset_id: str
    sensor: Optional[str] = None
    code: str
    track: int
    cluster_id: Optional[str] = None
    cluster_role: Optional[str] = None
    label: Optional[str] = None
    quality_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    cross_track_consistency: Optional[float] = None
    distance_m: Optional[float] = None
    gate_excluded: Optional[bool] = None


class MLBuildingClusterSummary(BaseModel):
    area_id: str
    dataset_id: str
    sensor: Optional[str] = None
    cluster_id: str
    building_source: str
    building_id: str
    track: int
    cluster_role: str
    is_main_cluster: bool = False
    cluster_rank: Optional[int] = None
    point_count: int
    median_velocity_mm_a: Optional[float] = None
    median_vertical_proxy_mm_a: Optional[float] = None
    median_coherence: Optional[float] = None
    median_height_rank: Optional[float] = None
    cluster_reliability_score: Optional[float] = None
    motion_delta_to_main_mm_a: Optional[float] = None
    cluster_centroid_x_m: Optional[float] = None
    cluster_centroid_y_m: Optional[float] = None
    neighbour_candidate_building_count: int = 0
    best_neighbour_building_id: Optional[str] = None
    best_neighbour_cluster_id: Optional[str] = None
    best_neighbour_consistency_score: Optional[float] = None
    supporting_neighbour_building_count: int = 0
    neighbour_event_candidate_flag: bool = False


class MLReliabilityPenalty(BaseModel):
    key: str
    score_delta: Optional[float] = None
    cap_band: Optional[str] = None
    tracks: List[str] = Field(default_factory=list)
    threshold_min_points: Optional[int] = None
    threshold_max_score: Optional[float] = None
    observed_score: Optional[float] = None


class MLBuildingAnalysis(BaseModel):
    run_id: str
    pipeline: str
    run_type: str
    area_id: str
    building_source: str
    building_id: str
    point_count: int = 0
    kept_point_count: int = 0
    noise_point_count: int = 0
    excluded_point_count: int = 0
    cluster_count: int = 0
    reliable_cluster_count: int = 0
    building_motion_mm_a: Optional[float] = None
    building_reliability_score: Optional[float] = None
    building_reliability_band: Optional[str] = None
    track_agreement_score: Optional[float] = None
    weak_secondary_track_flag: bool = False
    agreement_tension_flag: bool = False
    reliability_penalties: List[MLReliabilityPenalty] = Field(default_factory=list)
    differential_motion_flag: bool = False
    building_status: Optional[str] = None
    main_cluster_by_track: dict[str, Optional[str]] = Field(default_factory=dict)
    neighbour_context_available: bool = False
    neighbour_candidate_building_count: int = 0
    neighbour_misassignment_point_count: int = 0
    neighbour_misassignment_share: Optional[float] = None
    neighbour_event_flag: bool = False
    neighbour_event_score: Optional[float] = None
    neighbour_consistency_score: Optional[float] = None
    supporting_neighbour_count: int = 0
    supporting_track_count: int = 0
    track_motion_mm_a: dict[str, Optional[float]] = Field(default_factory=dict)
    track_counts: dict[str, int] = Field(default_factory=dict)
    label_counts: dict[str, int] = Field(default_factory=dict)
    assignment_methods: dict[str, int] = Field(default_factory=dict)
    avg_quality_score: Optional[float] = None
    avg_anomaly_score: Optional[float] = None
    avg_cross_track_consistency: Optional[float] = None
    median_distance_m: Optional[float] = None
    clusters: List[MLBuildingClusterSummary] = Field(default_factory=list)
    top_points: List[MLBuildingPointSummary] = Field(default_factory=list)


class MLPointAnalysisResponse(BaseModel):
    status: Literal["ready", "pending", "missing"]
    analysis: Optional[MLPointAnalysis] = None
    message: Optional[str] = None


class GeoJsonFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any] = Field(default_factory=dict)


class GeoJsonFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[GeoJsonFeature] = Field(default_factory=list)


class MLBuildingVisualizationPointsResponse(BaseModel):
    run_id: str
    pipeline: str
    run_type: str
    building_source: str
    building_id: str
    point_count: int = 0
    feature_collection: GeoJsonFeatureCollection = Field(default_factory=GeoJsonFeatureCollection)


class MLBuildingVisualizationSummary(BaseModel):
    point_count: int = 0
    kept_point_count: int = 0
    noise_point_count: int = 0
    excluded_point_count: int = 0
    cluster_count: int = 0
    reliable_cluster_count: int = 0
    building_motion_mm_a: Optional[float] = None
    building_reliability_score: Optional[float] = None
    building_reliability_band: Optional[str] = None
    track_agreement_score: Optional[float] = None
    weak_secondary_track_flag: bool = False
    agreement_tension_flag: bool = False
    reliability_penalties: List[MLReliabilityPenalty] = Field(default_factory=list)
    building_status: Optional[str] = None
    differential_motion_flag: bool = False
    neighbour_context_available: bool = False
    neighbour_candidate_building_count: int = 0
    neighbour_misassignment_point_count: int = 0
    neighbour_misassignment_share: Optional[float] = None
    neighbour_event_flag: bool = False
    neighbour_event_score: Optional[float] = None
    neighbour_consistency_score: Optional[float] = None
    supporting_neighbour_count: int = 0
    supporting_track_count: int = 0


class MLBuildingVisualizationContextResponse(BaseModel):
    run_id: str
    pipeline: str
    run_type: str
    building_source: str
    building_id: str
    bounds: List[float] = Field(default_factory=list)
    building: Optional[GeoJsonFeature] = None
    candidate_areas: GeoJsonFeatureCollection = Field(default_factory=GeoJsonFeatureCollection)
    cluster_hulls: GeoJsonFeatureCollection = Field(default_factory=GeoJsonFeatureCollection)
    summary: MLBuildingVisualizationSummary = Field(default_factory=MLBuildingVisualizationSummary)
