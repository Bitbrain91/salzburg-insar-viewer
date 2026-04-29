from __future__ import annotations

import math
from dataclasses import asdict, dataclass


CONTRACT_VERSION = "augmenterra_track_geometry_v1"


@dataclass(frozen=True)
class TrackGeometry:
    track: int
    los: str
    name: str
    look_bearing_deg: float
    sensor_bearing_deg: float
    default_incidence_deg: float
    range_dx: float
    range_dy: float
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
) -> TrackGeometry:
    return TrackGeometry(
        track=track,
        los=los,
        name=name,
        look_bearing_deg=look_bearing_deg,
        sensor_bearing_deg=sensor_bearing_deg,
        default_incidence_deg=default_incidence_deg,
        range_dx=_dx_from_bearing(sensor_bearing_deg),
        range_dy=_dy_from_bearing(sensor_bearing_deg),
    )


TRACK_GEOMETRIES = {
    44: _track_geometry(
        track=44,
        los="A",
        name="Track 44 (Ascending)",
        look_bearing_deg=81.4,
        sensor_bearing_deg=261.4,
        default_incidence_deg=38.81,
    ),
    95: _track_geometry(
        track=95,
        los="D",
        name="Track 95 (Descending)",
        look_bearing_deg=281.5,
        sensor_bearing_deg=101.5,
        default_incidence_deg=38.48,
    ),
}


def fallback_track_geometry(track: int, los: str | None = None) -> TrackGeometry:
    los_value = (los or "").upper()
    ascending = los_value == "A" or track == 44
    look_bearing_deg = 90.0 if ascending else 270.0
    sensor_bearing_deg = 270.0 if ascending else 90.0
    return _track_geometry(
        track=track,
        los="A" if ascending else "D",
        name=f"Track {track}",
        look_bearing_deg=look_bearing_deg,
        sensor_bearing_deg=sensor_bearing_deg,
        default_incidence_deg=38.5,
    )


def get_track_geometry(track: int, los: str | None = None) -> TrackGeometry:
    return TRACK_GEOMETRIES.get(track) or fallback_track_geometry(track, los)


def track_geometries_contract() -> list[dict[str, int | str | float]]:
    return [TRACK_GEOMETRIES[track].as_contract_dict() for track in sorted(TRACK_GEOMETRIES)]


def track_geometry_values_cte(name: str = "track_geometry") -> str:
    rows = ",\n        ".join(_sql_values_row(geometry) for geometry in track_geometries_contract())
    return f"""
    {name}(
        track,
        los,
        name,
        look_bearing_deg,
        sensor_bearing_deg,
        default_incidence_deg,
        range_dx,
        range_dy,
        contract_version
    ) AS (
        VALUES
        {rows}
    )""".strip()


def _sql_values_row(geometry: dict[str, int | str | float]) -> str:
    return (
        f"({int(geometry['track'])}, "
        f"'{geometry['los']}', "
        f"'{geometry['name']}', "
        f"{float(geometry['look_bearing_deg']):.12f}::double precision, "
        f"{float(geometry['sensor_bearing_deg']):.12f}::double precision, "
        f"{float(geometry['default_incidence_deg']):.12f}::double precision, "
        f"{float(geometry['range_dx']):.15f}::double precision, "
        f"{float(geometry['range_dy']):.15f}::double precision, "
        f"'{geometry['contract_version']}')"
    )
