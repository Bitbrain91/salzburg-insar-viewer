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
    eff_area: Optional[float] = None
    amp_mean: Optional[float] = None
    amp_std: Optional[float] = None
    geometry: GeometryPoint
    gba_id: Optional[str] = None
    osm_id: Optional[int] = None
    terrain: Optional[PointTerrainContext] = None


class TimeseriesPoint(BaseModel):
    date: date
    displacement: Optional[float] = None
    amplitude: Optional[float] = None


class TimeseriesResponse(BaseModel):
    code: str
    track: int
    measurements: List[TimeseriesPoint]


class BuildingDetail(BaseModel):
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
    tracks: List[dict]


class MLRunCreate(BaseModel):
    pipeline: str
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
    explain_top_features: List[MLExplainReason] = Field(default_factory=list)


class MLBuildingPointSummary(BaseModel):
    code: str
    track: int
    label: Optional[str] = None
    quality_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    cross_track_consistency: Optional[float] = None
    distance_m: Optional[float] = None


class MLBuildingAnalysis(BaseModel):
    run_id: str
    pipeline: str
    run_type: str
    building_source: str
    building_id: str
    point_count: int = 0
    track_counts: dict[str, int] = Field(default_factory=dict)
    label_counts: dict[str, int] = Field(default_factory=dict)
    assignment_methods: dict[str, int] = Field(default_factory=dict)
    avg_quality_score: Optional[float] = None
    avg_anomaly_score: Optional[float] = None
    avg_cross_track_consistency: Optional[float] = None
    median_distance_m: Optional[float] = None
    top_points: List[MLBuildingPointSummary] = Field(default_factory=list)


class MLPointAnalysisResponse(BaseModel):
    status: Literal["ready", "pending", "missing"]
    analysis: Optional[MLPointAnalysis] = None
    message: Optional[str] = None
