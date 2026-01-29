from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class RunConfig:
    run_id: str
    pipeline: str
    source: Optional[str]
    track: Optional[int]
    bbox: Optional[tuple[float, float, float, float]]
    params: dict
