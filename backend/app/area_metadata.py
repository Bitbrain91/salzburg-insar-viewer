from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable


DEFAULT_AREA_ID = "salzburg"


@dataclass(frozen=True)
class AreaMetadata:
    area_id: str
    name: str
    default_dataset_id: str
    bounds: tuple[float, float, float, float]


@dataclass(frozen=True)
class DatasetMetadata:
    dataset_id: str
    area_id: str
    name: str
    sensor: str
    default: bool = False


@dataclass(frozen=True)
class DatasetTrackMetadata:
    area_id: str
    dataset_id: str
    track: int
    los: str
    sensor: str
    name: str
    geometry_status: str
    direction_dependent_ml: bool
    displayable: bool = True


AREAS: tuple[AreaMetadata, ...] = (
    AreaMetadata(
        area_id="salzburg",
        name="Salzburg",
        default_dataset_id="salzburg_snt",
        bounds=(12.95, 47.75, 13.15, 47.85),
    ),
    AreaMetadata(
        area_id="bad_gastein",
        name="Bad Gastein",
        default_dataset_id="bad_gastein_snt",
        bounds=(13.000531, 47.013449, 13.277222, 47.159603),
    ),
)

DATASETS: tuple[DatasetMetadata, ...] = (
    DatasetMetadata(
        dataset_id="salzburg_snt",
        area_id="salzburg",
        name="Salzburg SNT",
        sensor="SNT",
        default=True,
    ),
    DatasetMetadata(
        dataset_id="bad_gastein_snt",
        area_id="bad_gastein",
        name="Bad Gastein SNT",
        sensor="SNT",
        default=True,
    ),
    DatasetMetadata(
        dataset_id="bad_gastein_tsx_paz",
        area_id="bad_gastein",
        name="Bad Gastein TSX/PAZ",
        sensor="TSX/PAZ",
    ),
)

DATASET_TRACKS: tuple[DatasetTrackMetadata, ...] = (
    DatasetTrackMetadata(
        area_id="salzburg",
        dataset_id="salzburg_snt",
        track=44,
        los="A",
        sensor="SNT",
        name="Salzburg SNT Track 44 (Ascending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
    DatasetTrackMetadata(
        area_id="salzburg",
        dataset_id="salzburg_snt",
        track=95,
        los="D",
        sensor="SNT",
        name="Salzburg SNT Track 95 (Descending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
    DatasetTrackMetadata(
        area_id="bad_gastein",
        dataset_id="bad_gastein_snt",
        track=22,
        los="D",
        sensor="SNT",
        name="Bad Gastein SNT Track 22 (Descending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
    DatasetTrackMetadata(
        area_id="bad_gastein",
        dataset_id="bad_gastein_snt",
        track=44,
        los="A",
        sensor="SNT",
        name="Bad Gastein SNT Track 44 (Ascending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
    DatasetTrackMetadata(
        area_id="bad_gastein",
        dataset_id="bad_gastein_snt",
        track=95,
        los="D",
        sensor="SNT",
        name="Bad Gastein SNT Track 95 (Descending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
    DatasetTrackMetadata(
        area_id="bad_gastein",
        dataset_id="bad_gastein_tsx_paz",
        track=70,
        los="D",
        sensor="TSX/PAZ",
        name="Bad Gastein TSX/PAZ Track 70 (Descending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
    DatasetTrackMetadata(
        area_id="bad_gastein",
        dataset_id="bad_gastein_tsx_paz",
        track=93,
        los="A",
        sensor="TSX/PAZ",
        name="Bad Gastein TSX/PAZ Track 93 (Ascending)",
        geometry_status="verified",
        direction_dependent_ml=True,
    ),
)

DATASET_DIRECTIONAL_TRACK_PAIRS: dict[str, tuple[int, int]] = {
    "salzburg_snt": (44, 95),
    "bad_gastein_snt": (44, 95),
    "bad_gastein_tsx_paz": (93, 70),
}

AREAS_BY_ID = {area.area_id: area for area in AREAS}
DATASETS_BY_ID = {dataset.dataset_id: dataset for dataset in DATASETS}
DATASET_TRACKS_BY_ID: dict[str, tuple[DatasetTrackMetadata, ...]] = {
    dataset.dataset_id: tuple(track for track in DATASET_TRACKS if track.dataset_id == dataset.dataset_id)
    for dataset in DATASETS
}


def area_contracts() -> list[dict]:
    return [asdict(area) for area in AREAS]


def dataset_contracts() -> list[dict]:
    return [
        {
            **asdict(dataset),
            "tracks": [track.track for track in DATASET_TRACKS_BY_ID.get(dataset.dataset_id, ())],
        }
        for dataset in DATASETS
    ]


def dataset_track_contracts(
    *,
    area_id: str | None = None,
    dataset_id: str | None = None,
    direction_dependent_only: bool = False,
) -> list[dict]:
    tracks: Iterable[DatasetTrackMetadata] = DATASET_TRACKS
    if area_id is not None:
        tracks = (track for track in tracks if track.area_id == area_id)
    if dataset_id is not None:
        tracks = (track for track in tracks if track.dataset_id == dataset_id)
    if direction_dependent_only:
        tracks = (track for track in tracks if track.direction_dependent_ml)
    return [asdict(track) for track in tracks]


def default_dataset_for_area(area_id: str | None) -> str:
    if area_id is None:
        raise ValueError("area_id is required to resolve the default dataset")
    area = AREAS_BY_ID.get(area_id)
    if area is None:
        raise ValueError(f"Unknown area_id '{area_id}'")
    return area.default_dataset_id


def resolve_area_dataset(
    area_id: str | None,
    dataset_id: str | None,
    *,
    default_dataset_when_omitted: bool = True,
) -> tuple[str, str | None]:
    if dataset_id is not None:
        dataset = DATASETS_BY_ID.get(dataset_id)
        if dataset is None:
            raise ValueError(f"Unknown dataset_id '{dataset_id}'")
        if area_id is not None and area_id != dataset.area_id:
            raise ValueError(
                f"dataset_id '{dataset_id}' belongs to area_id '{dataset.area_id}', not '{area_id}'"
            )
        return dataset.area_id, dataset.dataset_id

    if area_id is None:
        raise ValueError("area_id or dataset_id is required")
    resolved_area_id = area_id
    if resolved_area_id not in AREAS_BY_ID:
        raise ValueError(f"Unknown area_id '{resolved_area_id}'")
    if default_dataset_when_omitted:
        return resolved_area_id, default_dataset_for_area(resolved_area_id)
    return resolved_area_id, None


def directional_track_pair(dataset_id: str | None) -> tuple[int, int] | None:
    if dataset_id is None:
        return None
    return DATASET_DIRECTIONAL_TRACK_PAIRS.get(dataset_id)
