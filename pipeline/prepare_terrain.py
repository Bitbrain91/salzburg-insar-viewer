from __future__ import annotations

import argparse
import gzip
import os
import subprocess
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.features import rasterize
from rasterio.mask import mask as raster_mask
from rasterio.warp import transform_bounds
from shapely.geometry import mapping

from config import (
    PARQUET_DIR,
    PROJECT_ROOT,
    RASTER_TILES_DIR,
    SALZBURG_BBOX,
    TERRAIN_DERIVED_DIR,
    TERRAIN_RAW_DIR,
)


DEFAULT_GDAL_IMAGE = os.getenv("GDAL_IMAGE", "ghcr.io/osgeo/gdal:ubuntu-small-latest")
TARGET_CRS = "EPSG:25833"
WEB_CRS = "EPSG:3857"
TERRAIN_SOURCE = "srtm"
TERRAIN_PADDING_DEG = 0.01
POINT_TERRAIN_OUT = PARQUET_DIR / "insar_point_terrain.parquet"
BUILDING_TERRAIN_OUT = PARQUET_DIR / "building_terrain_context.parquet"


def _container_path(path: Path) -> str:
    return f"/workspace/{path.relative_to(PROJECT_ROOT).as_posix()}"


def _run_gdal(args: list[str], image: str) -> None:
    command = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{PROJECT_ROOT}:/workspace",
        "-w",
        "/workspace",
        image,
        *args,
    ]
    subprocess.run(command, check=True)


def _find_raw_inputs(raw_dir: Path) -> list[Path]:
    inputs: list[Path] = []
    for pattern in ("*.hgt", "*.hgt.gz", "*.tif", "*.tiff", "*.img"):
        inputs.extend(sorted(raw_dir.glob(pattern)))
    return inputs


def _ensure_uncompressed_inputs(raw_inputs: list[Path], overwrite: bool) -> list[Path]:
    resolved: list[Path] = []
    for path in raw_inputs:
        if path.suffix != ".gz":
            resolved.append(path)
            continue
        target = path.with_suffix("")
        if overwrite or not target.exists():
            print(f"Decompressing {path.name}...")
            with gzip.open(path, "rb") as src, target.open("wb") as dst:
                dst.write(src.read())
        resolved.append(target)
    return resolved


def _expanded_bbox() -> tuple[float, float, float, float]:
    min_lon, min_lat, max_lon, max_lat = SALZBURG_BBOX
    return (
        min_lon - TERRAIN_PADDING_DEG,
        min_lat - TERRAIN_PADDING_DEG,
        max_lon + TERRAIN_PADDING_DEG,
        max_lat + TERRAIN_PADDING_DEG,
    )


def _write_slope_color_ramp(path: Path) -> None:
    path.write_text(
        "\n".join(
            [
                "0 254 252 232 0",
                "5 254 252 232 160",
                "15 250 217 122 180",
                "25 233 151 77 200",
                "35 194 78 52 220",
                "90 122 35 22 240",
                "nv 0 0 0 0",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def build_derived_rasters(image: str, overwrite: bool) -> tuple[Path, Path, Path]:
    TERRAIN_RAW_DIR.mkdir(parents=True, exist_ok=True)
    TERRAIN_DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    RASTER_TILES_DIR.mkdir(parents=True, exist_ok=True)

    raw_inputs = _find_raw_inputs(TERRAIN_RAW_DIR)
    if not raw_inputs:
        raise FileNotFoundError(
            f"No SRTM files found in {TERRAIN_RAW_DIR}. Add .hgt or .tif tiles before running."
        )
    raw_inputs = _ensure_uncompressed_inputs(raw_inputs, overwrite=overwrite)

    vrt_path = TERRAIN_DERIVED_DIR / "srtm_mosaic.vrt"
    elevation_25833 = TERRAIN_DERIVED_DIR / "srtm_elevation_25833.tif"
    hillshade_25833 = TERRAIN_DERIVED_DIR / "srtm_hillshade_25833.tif"
    slope_25833 = TERRAIN_DERIVED_DIR / "srtm_slope_25833.tif"
    aspect_25833 = TERRAIN_DERIVED_DIR / "srtm_aspect_25833.tif"
    hillshade_3857 = TERRAIN_DERIVED_DIR / "srtm_hillshade_3857.tif"
    slope_color_25833 = TERRAIN_DERIVED_DIR / "srtm_slope_color_25833.tif"
    slope_color_3857 = TERRAIN_DERIVED_DIR / "srtm_slope_color_3857.tif"
    color_ramp = TERRAIN_DERIVED_DIR / "srtm_slope_color.txt"

    if overwrite or not vrt_path.exists():
        print("Building SRTM VRT mosaic...")
        _run_gdal(
            [
                "gdalbuildvrt",
                "-overwrite",
                _container_path(vrt_path),
                *(_container_path(path) for path in raw_inputs),
            ],
            image,
        )

    min_lon, min_lat, max_lon, max_lat = _expanded_bbox()
    te_bounds = transform_bounds("EPSG:4326", TARGET_CRS, min_lon, min_lat, max_lon, max_lat)
    te_args = [str(value) for value in te_bounds]

    if overwrite or not elevation_25833.exists():
        print("Warping elevation raster to EPSG:25833...")
        _run_gdal(
            [
                "gdalwarp",
                "-overwrite",
                "-multi",
                "-r",
                "bilinear",
                "-t_srs",
                TARGET_CRS,
                "-te",
                *te_args,
                "-dstnodata",
                "-9999",
                "-of",
                "GTiff",
                _container_path(vrt_path),
                _container_path(elevation_25833),
            ],
            image,
        )

    if overwrite or not hillshade_25833.exists():
        print("Computing hillshade raster...")
        _run_gdal(
            [
                "gdaldem",
                "hillshade",
                "-compute_edges",
                _container_path(elevation_25833),
                _container_path(hillshade_25833),
            ],
            image,
        )

    if overwrite or not slope_25833.exists():
        print("Computing slope raster...")
        _run_gdal(
            [
                "gdaldem",
                "slope",
                "-compute_edges",
                _container_path(elevation_25833),
                _container_path(slope_25833),
            ],
            image,
        )

    if overwrite or not aspect_25833.exists():
        print("Computing aspect raster...")
        _run_gdal(
            [
                "gdaldem",
                "aspect",
                "-compute_edges",
                "-zero_for_flat",
                _container_path(elevation_25833),
                _container_path(aspect_25833),
            ],
            image,
        )

    if overwrite or not color_ramp.exists():
        _write_slope_color_ramp(color_ramp)

    if overwrite or not slope_color_25833.exists():
        print("Colorizing slope raster...")
        _run_gdal(
            [
                "gdaldem",
                "color-relief",
                "-alpha",
                _container_path(slope_25833),
                _container_path(color_ramp),
                _container_path(slope_color_25833),
            ],
            image,
        )

    if overwrite or not hillshade_3857.exists():
        print("Reprojecting hillshade to EPSG:3857...")
        _run_gdal(
            [
                "gdalwarp",
                "-overwrite",
                "-multi",
                "-r",
                "bilinear",
                "-t_srs",
                WEB_CRS,
                "-dstnodata",
                "0",
                "-of",
                "GTiff",
                _container_path(hillshade_25833),
                _container_path(hillshade_3857),
            ],
            image,
        )

    if overwrite or not slope_color_3857.exists():
        print("Reprojecting colorized slope to EPSG:3857...")
        _run_gdal(
            [
                "gdalwarp",
                "-overwrite",
                "-multi",
                "-r",
                "near",
                "-t_srs",
                WEB_CRS,
                "-dstalpha",
                "-of",
                "GTiff",
                _container_path(slope_color_25833),
                _container_path(slope_color_3857),
            ],
            image,
        )

    return elevation_25833, slope_25833, aspect_25833


def _masked_value(sample) -> float | None:
    value = sample[0]
    if np.ma.is_masked(value):
        return None
    value = float(value)
    if np.isnan(value):
        return None
    return value


def _sample_points(elevation_path: Path, slope_path: Path, aspect_path: Path) -> pd.DataFrame:
    point_files = [
        PARQUET_DIR / "insar_points_t44.parquet",
        PARQUET_DIR / "insar_points_t95.parquet",
    ]
    point_frames = []
    for path in point_files:
        if not path.exists():
            continue
        gdf = gpd.read_parquet(path, columns=["code", "track", "geometry"]).to_crs(TARGET_CRS)
        point_frames.append(gdf)

    if not point_frames:
        raise FileNotFoundError("No InSAR point parquet files found for terrain sampling.")

    points = pd.concat(point_frames, ignore_index=True)
    resolution_m: float
    with rasterio.open(elevation_path) as elevation, rasterio.open(slope_path) as slope, rasterio.open(
        aspect_path
    ) as aspect:
        coords = [(geom.x, geom.y) for geom in points.geometry]
        resolution_m = round(abs(elevation.transform.a), 2)
        terrain_elevation = [_masked_value(sample) for sample in elevation.sample(coords, masked=True)]
        terrain_slope = [_masked_value(sample) for sample in slope.sample(coords, masked=True)]
        terrain_aspect = [_masked_value(sample) for sample in aspect.sample(coords, masked=True)]

    result = pd.DataFrame(
        {
            "code": points["code"].astype(str),
            "track": points["track"].astype(int),
            "terrain_source": TERRAIN_SOURCE,
            "terrain_resolution_m": resolution_m,
            "terrain_elevation_m": terrain_elevation,
            "slope_deg": terrain_slope,
            "aspect_deg": terrain_aspect,
        }
    )
    return result


def _valid_masked_values(data: np.ndarray | np.ma.MaskedArray, nodata: float | None) -> np.ndarray:
    if isinstance(data, np.ma.MaskedArray):
        values = data.compressed()
    else:
        values = data.ravel()
    if nodata is not None:
        values = values[values != nodata]
    values = values[np.isfinite(values)]
    return values.astype(float)


def _building_context_for_source(
    source: str,
    parquet_path: Path,
    id_column: str,
    elevation_path: Path,
    slope_path: Path,
) -> pd.DataFrame:
    if not parquet_path.exists():
        return pd.DataFrame(
            columns=[
                "building_source",
                "building_id",
                "terrain_source",
                "terrain_resolution_m",
                "terrain_elevation_mean_m",
                "terrain_elevation_min_m",
                "terrain_elevation_max_m",
                "slope_mean_deg",
                "slope_max_deg",
                "relief_range_m",
            ]
        )

    buildings = gpd.read_parquet(parquet_path, columns=[id_column, "geometry"]).to_crs(TARGET_CRS)
    if buildings.empty:
        return pd.DataFrame(
            columns=[
                "building_source",
                "building_id",
                "terrain_source",
                "terrain_resolution_m",
                "terrain_elevation_mean_m",
                "terrain_elevation_min_m",
                "terrain_elevation_max_m",
                "slope_mean_deg",
                "slope_max_deg",
                "relief_range_m",
            ]
        )

    with rasterio.open(elevation_path) as elevation, rasterio.open(slope_path) as slope:
        resolution_m = round(abs(elevation.transform.a), 2)
        elevation_array = elevation.read(1, masked=True)
        slope_array = slope.read(1, masked=True)
        shapes = []
        for idx, row in enumerate(buildings.itertuples(index=False), start=1):
            geometry = row.geometry
            if geometry is None or geometry.is_empty:
                continue
            shapes.append((mapping(geometry), idx))

        zone_array = rasterize(
            shapes=shapes,
            out_shape=elevation_array.shape,
            transform=elevation.transform,
            fill=0,
            dtype="int32",
            all_touched=True,
        )

        valid_mask = (~np.ma.getmaskarray(elevation_array)) & (zone_array > 0)
        zone_ids = zone_array[valid_mask]
        if zone_ids.size == 0:
            stats_df = pd.DataFrame(columns=["zone_id"])
        else:
            stats_df = pd.DataFrame(
                {
                    "zone_id": zone_ids.astype(np.int32),
                    "elevation": np.asarray(elevation_array.data[valid_mask], dtype=float),
                    "slope": np.asarray(slope_array.data[valid_mask], dtype=float),
                }
            )
            stats_df = (
                stats_df.groupby("zone_id", sort=False)
                .agg(
                    terrain_elevation_mean_m=("elevation", "mean"),
                    terrain_elevation_min_m=("elevation", "min"),
                    terrain_elevation_max_m=("elevation", "max"),
                    slope_mean_deg=("slope", "mean"),
                    slope_max_deg=("slope", "max"),
                )
                .reset_index()
            )
            stats_df["relief_range_m"] = (
                stats_df["terrain_elevation_max_m"] - stats_df["terrain_elevation_min_m"]
            )

        point_coords = [(geom.representative_point().x, geom.representative_point().y) for geom in buildings.geometry]
        point_elevation = [_masked_value(sample) for sample in elevation.sample(point_coords, masked=True)]
        point_slope = [_masked_value(sample) for sample in slope.sample(point_coords, masked=True)]

    buildings = buildings.reset_index(drop=True).copy()
    buildings["zone_id"] = np.arange(1, len(buildings) + 1, dtype=np.int32)
    buildings["building_id"] = buildings[id_column].astype(str)
    buildings["fallback_elevation"] = point_elevation
    buildings["fallback_slope"] = point_slope

    merged = buildings.merge(stats_df, on="zone_id", how="left")
    merged["terrain_elevation_mean_m"] = merged["terrain_elevation_mean_m"].fillna(merged["fallback_elevation"])
    merged["terrain_elevation_min_m"] = merged["terrain_elevation_min_m"].fillna(merged["fallback_elevation"])
    merged["terrain_elevation_max_m"] = merged["terrain_elevation_max_m"].fillna(merged["fallback_elevation"])
    merged["slope_mean_deg"] = merged["slope_mean_deg"].fillna(merged["fallback_slope"])
    merged["slope_max_deg"] = merged["slope_max_deg"].fillna(merged["fallback_slope"])
    merged["relief_range_m"] = merged["relief_range_m"].fillna(0.0)

    result = merged[
        [
            "building_id",
            "terrain_elevation_mean_m",
            "terrain_elevation_min_m",
            "terrain_elevation_max_m",
            "slope_mean_deg",
            "slope_max_deg",
            "relief_range_m",
        ]
    ].copy()
    result.insert(0, "building_source", source)
    result.insert(2, "terrain_source", TERRAIN_SOURCE)
    result.insert(3, "terrain_resolution_m", resolution_m)
    return result


def _sample_buildings(elevation_path: Path, slope_path: Path) -> pd.DataFrame:
    gba = _building_context_for_source(
        "gba",
        PARQUET_DIR / "gba_buildings.parquet",
        "gba_id",
        elevation_path,
        slope_path,
    )
    osm = _building_context_for_source(
        "osm",
        PARQUET_DIR / "osm_buildings.parquet",
        "osm_id",
        elevation_path,
        slope_path,
    )
    return pd.concat([gba, osm], ignore_index=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gdal-image", default=DEFAULT_GDAL_IMAGE)
    parser.add_argument("--skip-derive", action="store_true")
    parser.add_argument("--skip-points", action="store_true")
    parser.add_argument("--skip-buildings", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    TERRAIN_DERIVED_DIR.mkdir(parents=True, exist_ok=True)

    elevation_path = TERRAIN_DERIVED_DIR / "srtm_elevation_25833.tif"
    slope_path = TERRAIN_DERIVED_DIR / "srtm_slope_25833.tif"
    aspect_path = TERRAIN_DERIVED_DIR / "srtm_aspect_25833.tif"

    if not args.skip_derive:
        elevation_path, slope_path, aspect_path = build_derived_rasters(
            image=args.gdal_image,
            overwrite=args.overwrite,
        )

    if not args.skip_points:
        print("Sampling SRTM terrain values for InSAR points...")
        point_df = _sample_points(elevation_path, slope_path, aspect_path)
        point_df.to_parquet(POINT_TERRAIN_OUT, index=False)
        print(f"Saved point terrain context: {POINT_TERRAIN_OUT}")

    if not args.skip_buildings:
        print("Sampling SRTM terrain values for buildings...")
        building_df = _sample_buildings(elevation_path, slope_path)
        building_df.to_parquet(BUILDING_TERRAIN_OUT, index=False)
        print(f"Saved building terrain context: {BUILDING_TERRAIN_OUT}")


if __name__ == "__main__":
    main()
