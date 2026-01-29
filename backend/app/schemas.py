from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class GeometryPoint(BaseModel):
    lon: float
    lat: float


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
    incidence_angle: Optional[float] = None
    amp_mean: Optional[float] = None
    amp_std: Optional[float] = None
    geometry: GeometryPoint
    gba_id: Optional[str] = None
    osm_id: Optional[int] = None


class TimeseriesPoint(BaseModel):
    date: date
    displacement: float


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
