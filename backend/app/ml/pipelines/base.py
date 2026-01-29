from __future__ import annotations

from typing import Any, Dict


class BasePipeline:
    name: str = "base"
    version: str = "0.1.0"
    run_type: str = "generic"

    def default_params(self) -> Dict[str, Any]:
        return {}

    async def run(self, pool, config) -> Dict[str, Any]:
        raise NotImplementedError("Pipeline must implement run()")
