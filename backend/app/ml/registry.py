from __future__ import annotations

from .pipelines.assignment import AssignmentPipeline
from .pipelines.clustering import ClusteringPipeline
from .pipelines.hybrid import HybridPipeline


_PIPELINES = {
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
