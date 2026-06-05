from __future__ import annotations

import math
from dataclasses import asdict, dataclass

from ..area_metadata import dataset_track_contracts

CONTRACT_VERSION = "augmenterra_track_geometry_v2"


@dataclass(frozen=True)
class TrackGeometry:
    area_id: str
    dataset_id: str
    sensor: str
    track: int
    los: str
    name: str
    look_bearing_deg: float
    sensor_bearing_deg: float
    default_incidence_deg: float
    range_dx: float
    range_dy: float
    geometry_status: str = "verified"
    direction_dependent_ml: bool = True
    contract_version: str = CONTRACT_VERSION

    @property
    def look_dx(self) -> float:
        return _dx_from_bearing(self.look_bearing_deg)

    @property
    def look_dy(self) -> float:
        return _dy_from_bearing(self.look_bearing_deg)

    def as_contract_dict(self) -> dict[str, int | str | float]:
        return asdict(self)


def _dx_from_bearing(bearing_deg: float) -> float:
    return math.sin(math.radians(bearing_deg))


def _dy_from_bearing(bearing_deg: float) -> float:
    return math.cos(math.radians(bearing_deg))


def _track_geometry(
    track: int,
    los: str,
    name: str,
    look_bearing_deg: float,
    sensor_bearing_deg: float,
    default_incidence_deg: float,
    *,
    area_id: str,
    dataset_id: str,
    sensor: str,
    geometry_status: str = "verified",
    direction_dependent_ml: bool = True,
) -> TrackGeometry:
    return TrackGeometry(
        area_id=area_id,
        dataset_id=dataset_id,
        sensor=sensor,
        track=track,
        los=los,
        name=name,
        look_bearing_deg=look_bearing_deg,
        sensor_bearing_deg=sensor_bearing_deg,
        default_incidence_deg=default_incidence_deg,
        range_dx=_dx_from_bearing(sensor_bearing_deg),
        range_dy=_dy_from_bearing(sensor_bearing_deg),
        geometry_status=geometry_status,
        direction_dependent_ml=direction_dependent_ml,
    )


TRACK_GEOMETRIES_BY_DATASET_TRACK = {
    ("salzburg_snt", 44): _track_geometry(
        track=44,
        los="A",
        name="Salzburg SNT Track 44 (Ascending)",
        look_bearing_deg=81.4,
        sensor_bearing_deg=261.4,
        default_incidence_deg=38.81,
        area_id="salzburg",
        dataset_id="salzburg_snt",
        sensor="SNT",
    ),
    ("salzburg_snt", 95): _track_geometry(
        track=95,
        los="D",
        name="Salzburg SNT Track 95 (Descending)",
        look_bearing_deg=281.5,
        sensor_bearing_deg=101.5,
        default_incidence_deg=38.48,
        area_id="salzburg",
        dataset_id="salzburg_snt",
        sensor="SNT",
    ),
    ("bad_gastein_snt", 22): _track_geometry(
        track=22,
        los="D",
        name="Bad Gastein SNT Track 22 (Unverified)",
        look_bearing_deg=90.0,
        sensor_bearing_deg=270.0,
        default_incidence_deg=45.56,
        area_id="bad_gastein",
        dataset_id="bad_gastein_snt",
        sensor="SNT",
        geometry_status="unverified",
        direction_dependent_ml=False,
    ),
    ("bad_gastein_snt", 44): _track_geometry(
        track=44,
        los="A",
        name="Bad Gastein SNT Track 44 (Ascending)",
        look_bearing_deg=81.4,
        sensor_bearing_deg=261.4,
        default_incidence_deg=38.32,
        area_id="bad_gastein",
        dataset_id="bad_gastein_snt",
        sensor="SNT",
    ),
    ("bad_gastein_snt", 95): _track_geometry(
        track=95,
        los="D",
        name="Bad Gastein SNT Track 95 (Descending)",
        look_bearing_deg=281.5,
        sensor_bearing_deg=101.5,
        default_incidence_deg=37.16,
        area_id="bad_gastein",
        dataset_id="bad_gastein_snt",
        sensor="SNT",
    ),
    ("bad_gastein_tsx_paz", 70): _track_geometry(
        track=70,
        los="D",
        name="Bad Gastein TSX/PAZ Track 70 (Descending)",
        look_bearing_deg=279.45,
        sensor_bearing_deg=99.45,
        default_incidence_deg=51.68,
        area_id="bad_gastein",
        dataset_id="bad_gastein_tsx_paz",
        sensor="TSX/PAZ",
    ),
    ("bad_gastein_tsx_paz", 93): _track_geometry(
        track=93,
        los="A",
        name="Bad Gastein TSX/PAZ Track 93 (Ascending)",
        look_bearing_deg=83.77,
        sensor_bearing_deg=263.77,
        default_incidence_deg=53.9,
        area_id="bad_gastein",
        dataset_id="bad_gastein_tsx_paz",
        sensor="TSX/PAZ",
    ),
}

def get_track_geometry(
    track: int,
    los: str | None = None,
    dataset_id: str | None = None,
) -> TrackGeometry:
    if dataset_id is None:
        raise KeyError(f"dataset_id is required for track geometry lookup: track={track}")
    geometry = TRACK_GEOMETRIES_BY_DATASET_TRACK.get((dataset_id, track))
    if geometry is None:
        raise KeyError(f"Unknown track geometry: dataset_id={dataset_id}, track={track}")
    return geometry


def track_geometries_contract(
    *,
    area_id: str | None = None,
    dataset_id: str | None = None,
    direction_dependent_only: bool = False,
) -> list[dict[str, int | str | float | bool]]:
    metadata_tracks = dataset_track_contracts(
        area_id=area_id,
        dataset_id=dataset_id,
        direction_dependent_only=direction_dependent_only,
    )
    rows = []
    for metadata in metadata_tracks:
        geometry = TRACK_GEOMETRIES_BY_DATASET_TRACK.get(
            (str(metadata["dataset_id"]), int(metadata["track"]))
        )
        if geometry is None:
            raise KeyError(
                "Missing configured track geometry: "
                f"dataset_id={metadata['dataset_id']}, track={metadata['track']}"
            )
        rows.append(geometry.as_contract_dict())
    return sorted(rows, key=lambda row: (str(row["area_id"]), str(row["dataset_id"]), int(row["track"])))


def track_geometry_values_cte(
    name: str = "track_geometry",
    *,
    area_id: str | None = None,
    dataset_id: str | None = None,
    direction_dependent_only: bool = False,
) -> str:
    if dataset_id is None:
        raise ValueError("dataset_id is required for track geometry SQL generation")
    geometries = track_geometries_contract(
        area_id=area_id,
        dataset_id=dataset_id,
        direction_dependent_only=direction_dependent_only,
    )
    if not geometries:
        raise KeyError(f"No configured track geometries for dataset_id={dataset_id}")
    rows = ",\n        ".join(_sql_values_row(geometry) for geometry in geometries)
    return f"""
    {name}(
        area_id,
        dataset_id,
        sensor,
        track,
        los,
        name,
        look_bearing_deg,
        sensor_bearing_deg,
        default_incidence_deg,
        range_dx,
        range_dy,
        geometry_status,
        direction_dependent_ml,
        contract_version
    ) AS (
        VALUES
        {rows}
    )""".strip()


def _sql_literal(value: object) -> str:
    return str(value).replace("'", "''")


def _sql_values_row(geometry: dict[str, int | str | float | bool]) -> str:
    return (
        f"('{_sql_literal(geometry['area_id'])}', "
        f"'{_sql_literal(geometry['dataset_id'])}', "
        f"'{_sql_literal(geometry['sensor'])}', "
        f"{int(geometry['track'])}, "
        f"'{_sql_literal(geometry['los'])}', "
        f"'{_sql_literal(geometry['name'])}', "
        f"{float(geometry['look_bearing_deg']):.12f}::double precision, "
        f"{float(geometry['sensor_bearing_deg']):.12f}::double precision, "
        f"{float(geometry['default_incidence_deg']):.12f}::double precision, "
        f"{float(geometry['range_dx']):.15f}::double precision, "
        f"{float(geometry['range_dy']):.15f}::double precision, "
        f"'{_sql_literal(geometry['geometry_status'])}', "
        f"{str(bool(geometry['direction_dependent_ml'])).lower()}::boolean, "
        f"'{_sql_literal(geometry['contract_version'])}')"
    )
