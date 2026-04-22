from __future__ import annotations

from .pipelines.anomaly_local_v1 import AnomalyLocalV1Pipeline
from .pipelines.anomaly_v1 import AnomalyV1Pipeline
from .pipelines.assignment import AssignmentPipeline
from .pipelines.clustering import ClusteringPipeline
from .pipelines.hybrid import HybridPipeline


_PIPELINES = {
    AnomalyLocalV1Pipeline.name: AnomalyLocalV1Pipeline,
    AnomalyV1Pipeline.name: AnomalyV1Pipeline,
    AssignmentPipeline.name: AssignmentPipeline,
    ClusteringPipeline.name: ClusteringPipeline,
    HybridPipeline.name: HybridPipeline,
}


def list_pipelines() -> list[str]:
    return sorted(_PIPELINES.keys())


def get_pipeline(name: str):
    pipeline_cls = _PIPELINES.get(name)
    if not pipeline_cls:
        raise ValueError(f"Unknown pipeline '{name}'")
    return pipeline_cls()
