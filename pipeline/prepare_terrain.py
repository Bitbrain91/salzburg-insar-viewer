from __future__ import annotations

import argparse
import gzip
import os
import shutil
import subprocess
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.merge import merge
from rasterio.transform import array_bounds
from rasterio.warp import calculate_default_transform, reproject, transform_bounds
from shapely.geometry import mapping

from config import (
    PARQUET_DIR,
    PROJECT_ROOT,
    RASTER_TILES_DIR,
    TERRAIN_DERIVED_DIR,
    TERRAIN_RAW_DIR,
    area_choices,
    iter_area_items,
)


DEFAULT_GDAL_IMAGE = os.getenv("GDAL_IMAGE", "ghcr.io/osgeo/gdal:ubuntu-small-latest")
TARGET_CRS = "EPSG:25833"
WEB_CRS = "EPSG:3857"
TERRAIN_SOURCE = "srtm"
TERRAIN_PADDING_DEG = 0.01
POINT_TERRAIN_OUT = PARQUET_DIR / "insar_point_terrain.parquet"
BUILDING_TERRAIN_OUT = PARQUET_DIR / "building_terrain_context.parquet"
POINT_TERRAIN_COLUMNS = [
    "area_id",
    "dataset_id",
    "code",
    "track",
    "terrain_source",
    "terrain_resolution_m",
    "terrain_elevation_m",
    "slope_deg",
    "aspect_deg",
]
BUILDING_TERRAIN_COLUMNS = [
    "area_id",
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


def _docker_available() -> bool:
    if shutil.which("docker") is None:
        return False
    result = subprocess.run(
        ["docker", "--version"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def _find_raw_inputs(raw_dir: Path) -> list[Path]:
    inputs: list[Path] = []
    for pattern in ("*.hgt", "*.hgt.gz", "*.tif", "*.tiff", "*.img"):
        inputs.extend(sorted(raw_dir.glob(pattern)))
    return inputs


def _ensure_uncompressed_inputs(raw_inputs: list[Path], overwrite: bool) -> list[Path]:
    resolved: list[Path] = []
    seen: set[Path] = set()
    for path in raw_inputs:
        if path.suffix != ".gz":
            target = path
            if target not in seen:
                resolved.append(target)
                seen.add(target)
            continue
        target = path.with_suffix("")
        if overwrite or not target.exists():
            print(f"Decompressing {path.name}...")
            with gzip.open(path, "rb") as src, target.open("wb") as dst:
                dst.write(src.read())
        if target not in seen:
            resolved.append(target)
            seen.add(target)
    return resolved


def _area_bbox(area_id: str) -> tuple[float, float, float, float]:
    areas = list(iter_area_items(area_id))
    missing = [area_id for area_id, area in areas if "bbox" not in area]
    if missing:
        raise ValueError(f"Missing terrain bbox for area(s): {', '.join(missing)}")
    min_lons = [float(area["bbox"][0]) for _, area in areas]
    min_lats = [float(area["bbox"][1]) for _, area in areas]
    max_lons = [float(area["bbox"][2]) for _, area in areas]
    max_lats = [float(area["bbox"][3]) for _, area in areas]
    return min(min_lons), min(min_lats), max(max_lons), max(max_lats)


def _expanded_bbox(area_id: str) -> tuple[float, float, float, float]:
    min_lon, min_lat, max_lon, max_lat = _area_bbox(area_id)
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


def _write_single_band_raster(
    path: Path,
    data: np.ndarray,
    transform,
    *,
    dtype: str,
    nodata: float | int,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=data.shape[0],
        width=data.shape[1],
        count=1,
        dtype=dtype,
        crs=TARGET_CRS,
        transform=transform,
        nodata=nodata,
        compress="deflate",
    ) as dst:
        dst.write(data.astype(dtype), 1)


def _build_derived_rasters_python(
    raw_inputs: list[Path],
    area_id: str,
    overwrite: bool,
) -> tuple[Path, Path, Path]:
    elevation_25833 = TERRAIN_DERIVED_DIR / "srtm_elevation_25833.tif"
    hillshade_25833 = TERRAIN_DERIVED_DIR / "srtm_hillshade_25833.tif"
    slope_25833 = TERRAIN_DERIVED_DIR / "srtm_slope_25833.tif"
    aspect_25833 = TERRAIN_DERIVED_DIR / "srtm_aspect_25833.tif"

    if (
        not overwrite
        and elevation_25833.exists()
        and slope_25833.exists()
        and aspect_25833.exists()
    ):
        return elevation_25833, slope_25833, aspect_25833

    min_lon, min_lat, max_lon, max_lat = _expanded_bbox(area_id)
    print("Building terrain rasters with rasterio fallback...")
    datasets = [rasterio.open(path) for path in raw_inputs]
    try:
        mosaic, src_transform = merge(
            datasets,
            bounds=(min_lon, min_lat, max_lon, max_lat),
            nodata=-9999,
        )
        source = mosaic[0].astype("float32")
        src_height, src_width = source.shape
        src_bounds = array_bounds(src_height, src_width, src_transform)
        dst_transform, dst_width, dst_height = calculate_default_transform(
            "EPSG:4326",
            TARGET_CRS,
            src_width,
            src_height,
            *src_bounds,
        )
        elevation = np.full((dst_height, dst_width), -9999.0, dtype="float32")
        reproject(
            source,
            elevation,
            src_transform=src_transform,
            src_crs="EPSG:4326",
            src_nodata=-9999,
            dst_transform=dst_transform,
            dst_crs=TARGET_CRS,
            dst_nodata=-9999,
            resampling=Resampling.bilinear,
        )
    finally:
        for dataset in datasets:
            dataset.close()

    nodata_mask = (elevation == -9999) | ~np.isfinite(elevation)
    elevation_work = np.where(nodata_mask, np.nan, elevation)
    x_res = abs(float(dst_transform.a))
    y_res = abs(float(dst_transform.e))
    grad_y, grad_x = np.gradient(elevation_work, y_res, x_res)
    gradient = np.sqrt(np.square(grad_x) + np.square(grad_y))
    slope = np.degrees(np.arctan(gradient)).astype("float32")
    aspect = ((np.degrees(np.arctan2(-grad_x, grad_y)) + 360.0) % 360.0).astype("float32")

    zenith = np.radians(45.0)
    azimuth = np.radians(315.0)
    slope_rad = np.arctan(gradient)
    aspect_rad = np.radians(aspect)
    hillshade = 255.0 * (
        np.cos(zenith) * np.cos(slope_rad)
        + np.sin(zenith) * np.sin(slope_rad) * np.cos(azimuth - aspect_rad)
    )
    hillshade = np.nan_to_num(hillshade, nan=0.0, posinf=255.0, neginf=0.0)
    hillshade = np.clip(hillshade, 0.0, 255.0).astype("uint8")

    elevation_out = np.where(nodata_mask, -9999.0, elevation).astype("float32")
    slope_out = np.where(nodata_mask | ~np.isfinite(slope), -9999.0, slope).astype("float32")
    aspect_out = np.where(nodata_mask | ~np.isfinite(aspect), -9999.0, aspect).astype("float32")
    hillshade_out = np.where(nodata_mask, 0, hillshade).astype("uint8")

    _write_single_band_raster(elevation_25833, elevation_out, dst_transform, dtype="float32", nodata=-9999)
    _write_single_band_raster(slope_25833, slope_out, dst_transform, dtype="float32", nodata=-9999)
    _write_single_band_raster(aspect_25833, aspect_out, dst_transform, dtype="float32", nodata=-9999)
    _write_single_band_raster(hillshade_25833, hillshade_out, dst_transform, dtype="uint8", nodata=0)
    return elevation_25833, slope_25833, aspect_25833


def build_derived_rasters(image: str, overwrite: bool, area_id: str) -> tuple[Path, Path, Path]:
    TERRAIN_RAW_DIR.mkdir(parents=True, exist_ok=True)
    TERRAIN_DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    RASTER_TILES_DIR.mkdir(parents=True, exist_ok=True)

    raw_inputs = _find_raw_inputs(TERRAIN_RAW_DIR)
    if not raw_inputs:
        raise FileNotFoundError(
            f"No SRTM files found in {TERRAIN_RAW_DIR}. Add .hgt or .tif tiles before running."
        )
    raw_inputs = _ensure_uncompressed_inputs(raw_inputs, overwrite=overwrite)
    if not _docker_available():
        return _build_derived_rasters_python(raw_inputs, area_id, overwrite)

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

    min_lon, min_lat, max_lon, max_lat = _expanded_bbox(area_id)
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


def _path_context(path: Path) -> tuple[str, str]:
    rel = path.relative_to(PARQUET_DIR)
    if len(rel.parts) >= 3:
        return rel.parts[0], rel.parts[1]
    raise ValueError(f"InSAR parquet must live under <area_id>/<dataset_id>/: {path}")


def _discover_point_files(area_id: str) -> list[Path]:
    return [
        path
        for path in sorted(PARQUET_DIR.glob("*/*/insar_points_t*.parquet"))
        if area_id == "all" or _path_context(path)[0] == area_id
    ]


def _sample_points(
    elevation_path: Path,
    slope_path: Path,
    aspect_path: Path,
    area_id: str,
) -> pd.DataFrame:
    point_files = _discover_point_files(area_id)
    point_frames = []
    for path in point_files:
        if not path.exists():
            continue
        path_area_id, path_dataset_id = _path_context(path)
        gdf = gpd.read_parquet(path).to_crs(TARGET_CRS)
        missing = {"area_id", "dataset_id", "code", "track"} - set(gdf.columns)
        if missing:
            raise ValueError(f"InSAR point parquet is missing required columns: {path}")
        if gdf[["area_id", "dataset_id", "code", "track"]].isna().any().any():
            raise ValueError(f"InSAR point parquet contains empty identity values: {path}")
        if not (gdf["area_id"].astype(str) == path_area_id).all():
            raise ValueError(f"InSAR point parquet area_id does not match its path: {path}")
        if not (gdf["dataset_id"].astype(str) == path_dataset_id).all():
            raise ValueError(f"InSAR point parquet dataset_id does not match its path: {path}")
        gdf = gdf[["area_id", "dataset_id", "code", "track", "geometry"]]
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
            "area_id": points["area_id"].astype(str),
            "dataset_id": points["dataset_id"].astype(str),
            "track": points["track"].astype(int),
            "terrain_source": TERRAIN_SOURCE,
            "terrain_resolution_m": resolution_m,
            "terrain_elevation_m": terrain_elevation,
            "slope_deg": terrain_slope,
            "aspect_deg": terrain_aspect,
        }
    )
    return result[POINT_TERRAIN_COLUMNS]


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
    area_id: str,
) -> pd.DataFrame:
    if not parquet_path.exists():
        return pd.DataFrame(columns=BUILDING_TERRAIN_COLUMNS)

    buildings = gpd.read_parquet(parquet_path).to_crs(TARGET_CRS)
    if "area_id" not in buildings.columns:
        raise ValueError(f"Building parquet must contain area_id: {parquet_path}")
    if buildings["area_id"].isna().any():
        raise ValueError(f"Building parquet contains empty area_id values: {parquet_path}")
    if area_id != "all":
        buildings = buildings[buildings["area_id"] == area_id].copy()
    buildings = buildings[["area_id", id_column, "geometry"]]
    if buildings.empty:
        return pd.DataFrame(columns=BUILDING_TERRAIN_COLUMNS)

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
            "area_id",
            "building_id",
            "terrain_elevation_mean_m",
            "terrain_elevation_min_m",
            "terrain_elevation_max_m",
            "slope_mean_deg",
            "slope_max_deg",
            "relief_range_m",
        ]
    ].copy()
    result.insert(1, "building_source", source)
    result.insert(3, "terrain_source", TERRAIN_SOURCE)
    result.insert(4, "terrain_resolution_m", resolution_m)
    return result[BUILDING_TERRAIN_COLUMNS]


def _sample_buildings(elevation_path: Path, slope_path: Path, area_id: str) -> pd.DataFrame:
    gba = _building_context_for_source(
        "gba",
        PARQUET_DIR / "gba_buildings.parquet",
        "gba_id",
        elevation_path,
        slope_path,
        area_id,
    )
    osm = _building_context_for_source(
        "osm",
        PARQUET_DIR / "osm_buildings.parquet",
        "osm_id",
        elevation_path,
        slope_path,
        area_id,
    )
    return pd.concat([gba, osm], ignore_index=True)[BUILDING_TERRAIN_COLUMNS]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--area", choices=area_choices(), default="salzburg")
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
            area_id=args.area,
        )

    if not args.skip_points:
        print("Sampling SRTM terrain values for InSAR points...")
        point_df = _sample_points(elevation_path, slope_path, aspect_path, args.area)
        point_df.to_parquet(POINT_TERRAIN_OUT, index=False)
        print(f"Saved point terrain context: {POINT_TERRAIN_OUT}")

    if not args.skip_buildings:
        print("Sampling SRTM terrain values for buildings...")
        building_df = _sample_buildings(elevation_path, slope_path, args.area)
        building_df.to_parquet(BUILDING_TERRAIN_OUT, index=False)
        print(f"Saved building terrain context: {BUILDING_TERRAIN_OUT}")


if __name__ == "__main__":
    main()
