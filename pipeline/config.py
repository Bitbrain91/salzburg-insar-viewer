from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]

PIPELINE_DATA_DIR = PROJECT_ROOT / "data"
PARQUET_DIR = PIPELINE_DATA_DIR / "parquet"
PMTILES_DIR = PIPELINE_DATA_DIR / "pmtiles"
EXTRACTS_DIR = PIPELINE_DATA_DIR / "extracts"
TERRAIN_DIR = PIPELINE_DATA_DIR / "terrain"
TERRAIN_RAW_DIR = TERRAIN_DIR / "srtm" / "raw"
TERRAIN_DERIVED_DIR = TERRAIN_DIR / "derived"
RASTER_TILES_DIR = PIPELINE_DATA_DIR / "raster_tiles"

TIMESERIES_PREFIX = "d20"
AMP_PREFIX = "D"

MANIFEST_PATH = Path(__file__).resolve().with_name("areas_manifest.json")


@lru_cache(maxsize=1)
def load_manifest() -> dict[str, Any]:
    with MANIFEST_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def resolve_repo_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def resolve_gpkg_path(spec: dict[str, Any]) -> Path | str:
    if "path" in spec:
        return resolve_repo_path(spec["path"])
    if "zip_path" in spec and "inner_path" in spec:
        zip_path = resolve_repo_path(spec["zip_path"])
        return f"/vsizip/{zip_path}/{spec['inner_path']}"
    raise ValueError(f"Unsupported GeoPackage path spec: {spec}")


def area_parquet_dir(area_id: str) -> Path:
    return PARQUET_DIR / area_id


def dataset_parquet_dir(area_id: str, dataset_id: str) -> Path:
    return area_parquet_dir(area_id) / dataset_id


def iter_area_items(area_id: str = "salzburg"):
    areas = load_manifest()["areas"]
    if area_id == "all":
        yield from areas.items()
        return
    if area_id not in areas:
        valid = ", ".join(sorted(areas))
        raise ValueError(f"Unknown area_id '{area_id}'. Valid values: {valid}, all")
    yield area_id, areas[area_id]


def iter_dataset_items(area_id: str = "salzburg", dataset_id: str = "all"):
    datasets = load_manifest()["datasets"]
    area_ids = {key for key, _ in iter_area_items(area_id)}
    for current_dataset_id, dataset in datasets.items():
        if dataset_id != "all" and current_dataset_id != dataset_id:
            continue
        if dataset["area_id"] in area_ids:
            yield current_dataset_id, dataset


def area_choices() -> list[str]:
    return sorted(load_manifest()["areas"].keys()) + ["all"]


def dataset_choices() -> list[str]:
    return sorted(load_manifest()["datasets"].keys()) + ["all"]


def track_choices() -> list[str]:
    tracks = {
        str(track["track_id"])
        for dataset in load_manifest()["datasets"].values()
        for track in dataset["tracks"]
    }
    return sorted(tracks, key=int) + ["all"]
