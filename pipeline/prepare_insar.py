from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pyogrio

from config import (
    AMP_PREFIX,
    GPKG_AMP_T44,
    GPKG_AMP_T95,
    GPKG_MOVEMENT,
    LAYER_T44,
    LAYER_T95,
    PARQUET_DIR,
    TIMESERIES_PREFIX,
)

ALIAS_MAP = {
    "code": ["code", "CODE"],
    "velocity": ["velocity", "vel", "VEL"],
    "velocity_std": ["velocity_std", "v_stdev", "V_STDEV"],
    "coherence": ["coherence", "COHERENCE"],
    "height": ["height", "H"],
    "height_std": ["height_std", "h_stdev", "H_STDEV"],
    "acceleration": ["acceleration", "acc", "ACC"],
    "acceleration_std": ["acceleration_std", "a_stdev", "A_STDEV"],
    "season_amp": ["season_amp", "SEASON_AMP", "SEAS"],
    "season_phs": ["season_phs", "SEASON_PHS"],
    "s_amp_std": ["s_amp_std", "S_AMP_STD"],
    "s_phs_std": ["s_phs_std", "S_PHS_STD"],
    "incidence_angle": ["incidence_angle", "INCIDENCE_ANGLE"],
    "eff_area": ["eff_area", "EFF_AREA"],
    "track": ["track", "TRACK"],
    "los": ["los", "LOS"],
}


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


def _load_amplitude_stats(amp_path: Path) -> pd.DataFrame:
    amp_layer = pyogrio.list_layers(amp_path)[:, 0].tolist()[0]
    amp_columns = pyogrio.read_info(amp_path, layer=amp_layer)["fields"]
    amp_cols = [c for c in amp_columns if c.startswith(AMP_PREFIX)]

    df = pyogrio.read_dataframe(amp_path, layer=amp_layer, columns=["CODE"] + amp_cols)
    amp_values = df[amp_cols]
    df["amp_mean"] = amp_values.mean(axis=1)
    df["amp_std"] = amp_values.std(axis=1)
    return df[["CODE", "amp_mean", "amp_std"]]


def _extract_timeseries(df: pd.DataFrame, track: int, output_path: Path) -> None:
    ts_cols = [c for c in df.columns if c.lower().startswith(TIMESERIES_PREFIX)]
    if not ts_cols:
        return

    id_cols = ["code", "track"]
    ts_df = df[id_cols + ts_cols].melt(
        id_vars=id_cols,
        var_name="date",
        value_name="displacement",
    )
    ts_df["date"] = pd.to_datetime(ts_df["date"].str[1:], format="%Y%m%d")
    ts_df = ts_df.dropna(subset=["displacement"])
    ts_df.to_parquet(output_path, index=False)


def _extract_amplitude_timeseries(amp_path: Path, track: int, output_path: Path) -> None:
    amp_layer = pyogrio.list_layers(amp_path)[:, 0].tolist()[0]
    amp_columns = pyogrio.read_info(amp_path, layer=amp_layer)["fields"]
    amp_cols = [c for c in amp_columns if c.startswith(AMP_PREFIX)]
    if not amp_cols:
        return

    df = pyogrio.read_dataframe(amp_path, layer=amp_layer, columns=["CODE"] + amp_cols)
    df = df.rename(columns={"CODE": "code"})
    df["code"] = df["code"].astype(str)
    df["track"] = track

    ts_df = df[["code", "track"] + amp_cols].melt(
        id_vars=["code", "track"],
        var_name="date",
        value_name="amplitude",
    )
    ts_df["date"] = pd.to_datetime(ts_df["date"].str[1:], format="%Y%m%d")
    ts_df = ts_df.dropna(subset=["amplitude"])
    ts_df.to_parquet(output_path, index=False)


def prepare_track(track_id: int, layer: str, amp_path: Path) -> None:
    PARQUET_DIR.mkdir(parents=True, exist_ok=True)

    movement = pyogrio.read_dataframe(GPKG_MOVEMENT, layer=layer)
    movement = _standardize_columns(movement)
    if "code" in movement.columns:
        movement["code"] = movement["code"].astype(str)

    amp_stats = _load_amplitude_stats(amp_path)

    # join amplitude stats
    code_col = _resolve_column(list(movement.columns), "code") or "code"
    movement = movement.merge(amp_stats, left_on=code_col, right_on="CODE", how="left")
    if "CODE" in movement.columns:
        movement = movement.drop(columns=["CODE"])

    # ensure track column
    if "track" not in movement.columns:
        movement["track"] = track_id

    # keep core columns
    keep = [
        "code",
        "track",
        "los",
        "velocity",
        "velocity_std",
        "coherence",
        "height",
        "height_std",
        "acceleration",
        "acceleration_std",
        "season_amp",
        "season_phs",
        "s_amp_std",
        "s_phs_std",
        "incidence_angle",
        "eff_area",
        "amp_mean",
        "amp_std",
        "geometry",
    ]
    for col in keep:
        if col not in movement.columns:
            movement[col] = pd.NA

    out_points = PARQUET_DIR / f"insar_points_t{track_id}.parquet"
    movement[keep].to_parquet(out_points, index=False)

    # timeseries (wide -> long)
    out_ts = PARQUET_DIR / f"insar_timeseries_t{track_id}.parquet"
    ts_source = movement[["code", "track"] + [c for c in movement.columns if c.lower().startswith(TIMESERIES_PREFIX)]]
    _extract_timeseries(ts_source, track_id, out_ts)

    out_amp_ts = PARQUET_DIR / f"insar_amplitude_timeseries_t{track_id}.parquet"
    _extract_amplitude_timeseries(amp_path, track_id, out_amp_ts)

    print(f"Saved points: {out_points}")
    print(f"Saved timeseries: {out_ts}")
    print(f"Saved amplitude timeseries: {out_amp_ts}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--track", choices=["44", "95", "all"], default="all")
    args = parser.parse_args()

    if args.track in ("44", "all"):
        prepare_track(44, LAYER_T44, GPKG_AMP_T44)
    if args.track in ("95", "all"):
        prepare_track(95, LAYER_T95, GPKG_AMP_T95)


if __name__ == "__main__":
    main()
