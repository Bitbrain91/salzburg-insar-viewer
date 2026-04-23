from __future__ import annotations

from .pipelines.anomaly_local_v1 import AnomalyLocalV1Pipeline


_PIPELINES = {
    AnomalyLocalV1Pipeline.name: AnomalyLocalV1Pipeline,
}


def list_pipelines() -> list[str]:
    return sorted(_PIPELINES.keys())


def get_pipeline(name: str):
    pipeline_cls = _PIPELINES.get(name)
    if not pipeline_cls:
        raise ValueError(f"Unknown pipeline '{name}'")
    return pipeline_cls()
