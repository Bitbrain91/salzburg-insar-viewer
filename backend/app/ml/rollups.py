from __future__ import annotations

import json
from typing import Any


def parse_meta(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def nested_dict(meta: dict[str, Any], *keys: str) -> dict[str, Any]:
    current: Any = meta
    for key in keys:
        if not isinstance(current, dict):
            return {}
        current = current.get(key)
    return current if isinstance(current, dict) else {}


def nested_list(meta: dict[str, Any], *keys: str) -> list[Any]:
    current: Any = meta
    for key in keys:
        if not isinstance(current, dict):
            return []
        current = current.get(key)
    return current if isinstance(current, list) else []


def nested_object_list(meta: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    values = nested_list(meta, *keys)
    return [item for item in values if isinstance(item, dict)]


def nested_bool(meta: dict[str, Any], *keys: str) -> bool | None:
    current: Any = meta
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    if isinstance(current, bool):
        return current
    if isinstance(current, str):
        lowered = current.strip().lower()
        if lowered in {"true", "false"}:
            return lowered == "true"
    return None


def nested_float(meta: dict[str, Any], *keys: str) -> float | None:
    current: Any = meta
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    if current is None:
        return None
    try:
        return float(current)
    except (TypeError, ValueError):
        return None


def nested_int(meta: dict[str, Any], *keys: str) -> int | None:
    current: Any = meta
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    if current is None:
        return None
    try:
        return int(current)
    except (TypeError, ValueError):
        return None


def nested_str(meta: dict[str, Any], *keys: str) -> str | None:
    current: Any = meta
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    if current is None:
        return None
    return str(current)


def building_rollup_from_meta(meta: dict[str, Any]) -> dict[str, Any]:
    return nested_dict(meta, "building_rollup")


def cluster_rollup_from_meta(meta: dict[str, Any]) -> dict[str, Any]:
    return nested_dict(meta, "cluster_rollup")


def track_motion_map(value: Any) -> dict[str, float | None]:
    if not isinstance(value, dict):
        return {}
    result: dict[str, float | None] = {}
    for key, item in value.items():
        if item is None:
            result[str(key)] = None
            continue
        try:
            result[str(key)] = float(item)
        except (TypeError, ValueError):
            result[str(key)] = None
    return result
