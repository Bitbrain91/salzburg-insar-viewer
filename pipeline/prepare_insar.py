from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import pyogrio

from config import (
    AMP_PREFIX,
    TIMESERIES_PREFIX,
    area_choices,
    dataset_choices,
    dataset_parquet_dir,
    iter_dataset_items,
    resolve_gpkg_path,
    resolve_repo_path,
    track_choices,
)

ALIAS_MAP = {
    "code": ["code", "CODE"],
    "velocity": ["velocity", "vel", "VEL"],
    "velocity_std": ["velocity_std", "v_stdev", "V_STDEV"],
    "coherence": ["coherence", "COHERENCE"],
    "std_def": ["std_def", "STD_DEF"],
    "height": ["height", "H", "HEIGHT"],
    "height_std": ["height_std", "h_stdev", "H_STDEV"],
    "acceleration": ["acceleration", "acc", "ACC"],
    "acceleration_std": ["acceleration_std", "a_stdev", "A_STDEV"],
    "season_amp": ["season_amp", "SEASON_AMP", "SEAS"],
    "season_phs": ["season_phs", "SEASON_PHS"],
    "s_amp_std": ["s_amp_std", "S_AMP_STD"],
    "s_phs_std": ["s_phs_std", "S_PHS_STD"],
    "incidence_angle": ["incidence_angle", "INCIDENCE_ANGLE"],
    "look_angle": ["look_angle", "LOOK_ANGLE"],
    "eff_area": ["eff_area", "EFF_AREA"],
    "track": ["track", "TRACK"],
    "los": ["los", "LOS"],
}

POINT_COLUMNS = [
    "area_id",
    "dataset_id",
    "sensor",
    "code",
    "track",
    "los",
    "velocity",
    "velocity_std",
    "coherence",
    "std_def",
    "height",
    "height_std",
    "acceleration",
    "acceleration_std",
    "season_amp",
    "season_phs",
    "s_amp_std",
    "s_phs_std",
    "incidence_angle",
    "look_angle",
    "eff_area",
    "amp_mean",
    "amp_std",
    "geometry",
]

TIMESERIES_CHUNK_SIZE = 10_000

TIMESERIES_SCHEMA = pa.schema(
    [
        ("area_id", pa.string()),
        ("dataset_id", pa.string()),
        ("code", pa.string()),
        ("track", pa.int64()),
        ("date", pa.date32()),
        ("displacement", pa.float64()),
    ]
)


def _resolve_column(columns: list[str], canonical: str) -> str | None:
    for name in ALIAS_MAP.get(canonical, [canonical]):
        if name in columns:
            return name
    lower_map = {c.lower(): c for c in columns}
    for name in ALIAS_MAP.get(canonical, [canonical]):
        if name.lower() in lower_map:
            return lower_map[name.lower()]
    return None


def _standardize_columns(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    columns = list(gdf.columns)
    rename = {}
    for canonical in ALIAS_MAP.keys():
        actual = _resolve_column(columns, canonical)
        if actual and actual != canonical:
            rename[actual] = canonical
    if rename:
        gdf = gdf.rename(columns=rename)
    return gdf


def _first_feature_layer(path: Path | str) -> str:
    layers = pyogrio.list_layers(path)
    for name, geometry_type in layers:
        if geometry_type is not None:
            return str(name)
    return str(layers[0][0])


def _read_dataframe(
    path: Path | str,
    *,
    layer: str,
    columns: list[str] | None = None,
    skip_features: int | None = None,
    max_features: int | None = None,
    read_geometry: bool = True,
) -> gpd.GeoDataFrame | pd.DataFrame:
    kwargs: dict[str, Any] = {"layer": layer}
    if columns is not None:
        kwargs["columns"] = columns
    if skip_features is not None:
        kwargs["skip_features"] = skip_features
    if max_features is not None:
        kwargs["max_features"] = max_features
    if not read_geometry:
        kwargs["read_geometry"] = False
    try:
        frame = pyogrio.read_dataframe(path, **kwargs)
    except TypeError:
        if read_geometry:
            raise
        kwargs.pop("read_geometry", None)
        frame = pyogrio.read_dataframe(path, **kwargs)
        geometry_columns = [column for column in frame.columns if column == "geometry"]
        if geometry_columns:
            frame = pd.DataFrame(frame.drop(columns=geometry_columns))
    return frame


def _source_fields(path: Path | str, layer: str) -> list[str]:
    return list(pyogrio.read_info(path, layer=layer)["fields"])


def _point_source_columns(source_columns: list[str]) -> list[str]:
    selected = {
        actual
        for canonical in POINT_COLUMNS
        if (actual := _resolve_column(source_columns, canonical)) is not None
    }
    return [column for column in source_columns if column in selected]


def _load_amplitude_stats(amp_path: Path) -> pd.DataFrame:
    amp_layer = _first_feature_layer(amp_path)
    amp_columns = pyogrio.read_info(amp_path, layer=amp_layer)["fields"]
    amp_cols = [c for c in amp_columns if c.startswith(AMP_PREFIX)]
    if not amp_cols:
        return pd.DataFrame(columns=["CODE", "amp_mean", "amp_std"])

    df = pyogrio.read_dataframe(amp_path, layer=amp_layer, columns=["CODE"] + amp_cols)
    df["CODE"] = df["CODE"].astype(str)
    amp_values = df[amp_cols]
    df["amp_mean"] = amp_values.mean(axis=1)
    df["amp_std"] = amp_values.std(axis=1)
    return df[["CODE", "amp_mean", "amp_std"]]


def _write_timeseries_chunk(
    writer: pq.ParquetWriter | None,
    output_path: Path,
    chunk: pd.DataFrame,
    id_cols: list[str],
    ts_cols: list[str],
) -> tuple[pq.ParquetWriter, int]:
    ts_df = chunk[id_cols + ts_cols].melt(
        id_vars=id_cols,
        var_name="date",
        value_name="displacement",
    )
    ts_df["date"] = pd.to_datetime(ts_df["date"].str[1:], format="%Y%m%d").dt.date
    ts_df = ts_df.dropna(subset=["displacement"])
    ts_df["track"] = ts_df["track"].astype("int64")
    ts_df["displacement"] = pd.to_numeric(ts_df["displacement"], errors="coerce")
    ts_df = ts_df.dropna(subset=["displacement"])
    ts_df = ts_df[["area_id", "dataset_id", "code", "track", "date", "displacement"]]

    table = pa.Table.from_pandas(ts_df, schema=TIMESERIES_SCHEMA, preserve_index=False)
    if writer is None:
        writer = pq.ParquetWriter(output_path, TIMESERIES_SCHEMA, compression="snappy")
    writer.write_table(table)
    return writer, len(ts_df)


def _write_empty_timeseries(output_path: Path) -> None:
    empty = pa.Table.from_arrays(
        [pa.array([], type=field.type) for field in TIMESERIES_SCHEMA],
        schema=TIMESERIES_SCHEMA,
    )
    pq.write_table(empty, output_path, compression="snappy")


def _extract_timeseries_from_source(
    path: Path | str,
    *,
    layer: str,
    track_id: int,
    area_id: str,
    dataset_id: str,
    output_path: Path,
    id_cols: list[str],
    chunk_size: int = TIMESERIES_CHUNK_SIZE,
) -> bool:
    info = pyogrio.read_info(path, layer=layer)
    source_columns = list(info["fields"])
    ts_cols = [c for c in source_columns if c.lower().startswith(TIMESERIES_PREFIX)]
    if not ts_cols:
        return False
    ts_cols = sorted(ts_cols)
    code_column = _resolve_column(source_columns, "code")
    if code_column is None:
        raise ValueError(f"{layer} has no code column for timeseries export")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    writer: pq.ParquetWriter | None = None
    written = 0
    feature_count = info.get("features")
    source_read_columns = [code_column] + ts_cols
    try:
        if isinstance(feature_count, int) and feature_count >= 0:
            for offset in range(0, feature_count, chunk_size):
                chunk = _read_dataframe(
                    path,
                    layer=layer,
                    columns=source_read_columns,
                    skip_features=offset,
                    max_features=chunk_size,
                    read_geometry=False,
                )
                if chunk.empty:
                    continue
                chunk = chunk.rename(columns={code_column: "code"})
                chunk["area_id"] = area_id
                chunk["dataset_id"] = dataset_id
                chunk["code"] = chunk["code"].astype(str)
                chunk["track"] = track_id
                writer, rows = _write_timeseries_chunk(writer, output_path, chunk, id_cols, ts_cols)
                written += rows
                print(
                    f"    Timeseries progress: {min(offset + chunk_size, feature_count):,}/{feature_count:,} features, "
                    f"{written:,} rows",
                    end="\r",
                )
        else:
            chunk = _read_dataframe(
                path,
                layer=layer,
                columns=source_read_columns,
                read_geometry=False,
            )
            chunk = chunk.rename(columns={code_column: "code"})
            chunk["area_id"] = area_id
            chunk["dataset_id"] = dataset_id
            chunk["code"] = chunk["code"].astype(str)
            chunk["track"] = track_id
            writer, written = _write_timeseries_chunk(writer, output_path, chunk, id_cols, ts_cols)
    finally:
        if writer is not None:
            writer.close()

    if writer is None:
        _write_empty_timeseries(output_path)
    if isinstance(feature_count, int) and feature_count >= 0:
        print()
    print(f"    Wrote {written:,} displacement rows")
    return True


def _extract_amplitude_timeseries(
    amp_path: Path,
    track_id: int,
    area_id: str,
    dataset_id: str,
    output_path: Path,
    id_cols: list[str],
) -> bool:
    amp_layer = _first_feature_layer(amp_path)
    amp_columns = pyogrio.read_info(amp_path, layer=amp_layer)["fields"]
    amp_cols = [c for c in amp_columns if c.startswith(AMP_PREFIX)]
    if not amp_cols:
        return False

    df = pyogrio.read_dataframe(amp_path, layer=amp_layer, columns=["CODE"] + amp_cols)
    df = df.rename(columns={"CODE": "code"})
    df["area_id"] = area_id
    df["dataset_id"] = dataset_id
    df["code"] = df["code"].astype(str)
    df["track"] = track_id

    ts_df = df[id_cols + amp_cols].melt(
        id_vars=id_cols,
        var_name="date",
        value_name="amplitude",
    )
    ts_df["date"] = pd.to_datetime(ts_df["date"].str[1:], format="%Y%m%d")
    ts_df = ts_df.dropna(subset=["amplitude"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ts_df.to_parquet(output_path, index=False)
    return True


def _apply_track_defaults(movement: gpd.GeoDataFrame, defaults: dict[str, Any]) -> gpd.GeoDataFrame:
    for column, value in defaults.items():
        if column not in movement.columns:
            movement[column] = pd.NA
        movement[column] = movement[column].fillna(value)
    return movement


def _write_track_outputs(
    movement: gpd.GeoDataFrame,
    points: gpd.GeoDataFrame,
    *,
    track_id: int,
    area_id: str,
    dataset_id: str,
    output_dir: Path,
    amp_path: Path | None,
    movement_path: Path | str,
    layer: str,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    out_points = output_dir / f"insar_points_t{track_id}.parquet"
    points[POINT_COLUMNS].to_parquet(out_points, index=False)
    print(f"Saved points: {out_points}")

    out_ts = output_dir / f"insar_timeseries_t{track_id}.parquet"
    id_cols = ["area_id", "dataset_id", "code", "track"]
    if _extract_timeseries_from_source(
        movement_path,
        layer=layer,
        track_id=track_id,
        area_id=area_id,
        dataset_id=dataset_id,
        output_path=out_ts,
        id_cols=id_cols,
    ):
        print(f"Saved timeseries: {out_ts}")
    else:
        print(f"No displacement timeseries columns found for track {track_id}")

    if amp_path is not None:
        out_amp_ts = output_dir / f"insar_amplitude_timeseries_t{track_id}.parquet"
        if _extract_amplitude_timeseries(
            amp_path,
            track_id,
            area_id,
            dataset_id,
            out_amp_ts,
            id_cols,
        ):
            print(f"Saved amplitude timeseries: {out_amp_ts}")


def prepare_track(
    dataset_id: str,
    dataset: dict[str, Any],
    track_config: dict[str, Any],
) -> None:
    area_id = dataset["area_id"]
    sensor = dataset.get("sensor")
    if not sensor:
        raise ValueError(f"{dataset_id} is missing required sensor metadata")
    track_id = int(track_config["track_id"])
    movement_path = resolve_gpkg_path(dataset["movement"])
    layer = str(track_config["layer"])

    source_columns = _source_fields(movement_path, layer)
    point_source_columns = _point_source_columns(source_columns)
    movement = _read_dataframe(movement_path, layer=layer, columns=point_source_columns)
    movement = _standardize_columns(movement)
    if movement.crs is None:
        raise ValueError(f"{dataset_id} track {track_id} has no CRS")
    movement = movement.to_crs(epsg=4326)

    if "code" not in movement.columns:
        raise ValueError(f"{dataset_id} track {track_id} has no code column")
    movement["code"] = movement["code"].astype(str)
    movement["track"] = track_id
    movement["los"] = movement.get("los", track_config.get("los", pd.NA))
    movement["area_id"] = area_id
    movement["dataset_id"] = dataset_id
    movement["sensor"] = sensor
    movement = _apply_track_defaults(movement, track_config.get("defaults", {}))

    amp_path = None
    if "amplitude_path" in track_config:
        amp_path = resolve_repo_path(track_config["amplitude_path"])
        amp_stats = _load_amplitude_stats(amp_path)
        movement = movement.merge(amp_stats, left_on="code", right_on="CODE", how="left")
        if "CODE" in movement.columns:
            movement = movement.drop(columns=["CODE"])

    for col in POINT_COLUMNS:
        if col not in movement.columns:
            movement[col] = pd.NA
    points = movement[POINT_COLUMNS].copy()

    area_output_dir = dataset_parquet_dir(area_id, dataset_id)
    _write_track_outputs(
        movement,
        points,
        track_id=track_id,
        area_id=area_id,
        dataset_id=dataset_id,
        output_dir=area_output_dir,
        amp_path=amp_path,
        movement_path=movement_path,
        layer=layer,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--area", choices=area_choices(), default="salzburg")
    parser.add_argument("--dataset", choices=dataset_choices(), default="all")
    parser.add_argument("--track", choices=track_choices(), default="all")
    args = parser.parse_args()

    selected = list(iter_dataset_items(args.area, args.dataset))
    if not selected:
        raise SystemExit("No datasets matched the selected --area/--dataset filters")

    prepared = 0
    for dataset_id, dataset in selected:
        for track_config in dataset["tracks"]:
            track_id = str(track_config["track_id"])
            if args.track != "all" and args.track != track_id:
                continue
            prepare_track(dataset_id, dataset, track_config)
            prepared += 1

    if prepared == 0:
        raise SystemExit("No tracks matched the selected --track filter")


if __name__ == "__main__":
    main()
