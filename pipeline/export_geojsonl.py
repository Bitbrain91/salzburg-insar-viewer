from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import mapping

def _guess_parquet_root(path: Path) -> Path:
    if len(path.parents) >= 3 and path.parents[2].name == "parquet":
        return path.parents[2]
    return path.parent


def _path_context(path: Path, parquet_root: Path) -> tuple[str, str]:
    try:
        rel = path.relative_to(parquet_root)
    except ValueError:
        raise ValueError(f"InSAR parquet is outside parquet root: {path}") from None
    if len(rel.parts) >= 3:
        return rel.parts[0], rel.parts[1]
    raise ValueError(f"InSAR parquet must live under <area_id>/<dataset_id>/: {path}")


def _discover_insar_points(parquet_root: Path) -> list[Path]:
    return sorted(parquet_root.glob("*/*/insar_points_t*.parquet"))


def _discover_buildings(parquet_root: Path, filename: str) -> list[Path]:
    combined = parquet_root / filename
    if combined.exists():
        return [combined]
    return sorted(parquet_root.glob(f"*/{filename}"))


def _infer_kind(input_path: Path) -> str:
    name = input_path.name
    if input_path.is_dir():
        return "auto"
    if name.startswith("insar_points_t"):
        return "insar_points"
    if name == "gba_buildings.parquet":
        return "gba"
    if name == "osm_buildings.parquet":
        return "osm"
    return "auto"


def _resolve_inputs(input_path: Path, kind: str) -> tuple[list[Path], Path, str]:
    if input_path.is_file():
        resolved_kind = _infer_kind(input_path) if kind == "auto" else kind
        return [input_path], _guess_parquet_root(input_path), resolved_kind

    if not input_path.is_dir():
        raise FileNotFoundError(f"Input path not found: {input_path}")

    if kind == "auto":
        raise ValueError("--kind is required when input is a directory")
    if kind == "insar_points":
        paths = _discover_insar_points(input_path)
    elif kind == "gba":
        paths = _discover_buildings(input_path, "gba_buildings.parquet")
    elif kind == "osm":
        paths = _discover_buildings(input_path, "osm_buildings.parquet")
    else:
        raise ValueError(f"Unsupported export kind: {kind}")
    return paths, input_path, kind


def _clean_value(value):
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _clean_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean_value(v) for v in value]
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


def _apply_context(gdf: gpd.GeoDataFrame, path: Path, parquet_root: Path, kind: str) -> gpd.GeoDataFrame:
    gdf = gdf.copy()
    if kind == "insar_points":
        area_id, dataset_id = _path_context(path, parquet_root)
        required = {"area_id", "dataset_id", "sensor", "code", "track"}
        missing = required - set(gdf.columns)
        if missing:
            raise ValueError(f"InSAR point parquet is missing required columns: {', '.join(sorted(missing))}: {path}")
        if gdf[list(required)].isna().any().any():
            raise ValueError(f"InSAR point parquet contains empty identity values: {path}")
        if not (gdf["area_id"].astype(str) == area_id).all():
            raise ValueError(f"InSAR point parquet area_id does not match its path: {path}")
        if not (gdf["dataset_id"].astype(str) == dataset_id).all():
            raise ValueError(f"InSAR point parquet dataset_id does not match its path: {path}")
    elif kind in {"gba", "osm"}:
        if "area_id" not in gdf.columns:
            raise ValueError(f"{kind} parquet must contain area_id: {path}")
        if gdf["area_id"].isna().any():
            raise ValueError(f"{kind} parquet contains empty area_id values: {path}")
    return gdf


def _feature_id(
    props: dict,
    idx,
    id_field: str | None,
    id_fields: list[str] | None,
) -> str:
    if id_fields:
        values = [props.get(field) for field in id_fields]
        if all(value is not None for value in values):
            return ":".join(str(value) for value in values)
    if id_field and id_field in props and props[id_field] is not None:
        return str(props[id_field])
    return str(idx)


def to_geojsonl(
    input_path: Path,
    output_path: Path,
    id_field: str | None = None,
    *,
    id_fields: list[str] | None = None,
    kind: str = "auto",
    track: int | None = None,
) -> None:
    input_paths, parquet_root, resolved_kind = _resolve_inputs(input_path, kind)
    if not input_paths:
        raise FileNotFoundError(f"No parquet inputs found for {resolved_kind} in {input_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with output_path.open("w", encoding="utf-8") as f:
        for path in input_paths:
            gdf = gpd.read_parquet(path)
            gdf = _apply_context(gdf, path, parquet_root, resolved_kind)
            if track is not None and "track" in gdf.columns:
                gdf = gdf[gdf["track"].astype(int) == track].copy()
            if gdf.empty:
                continue
            gdf = gdf.to_crs(epsg=4326)

            for idx, row in gdf.iterrows():
                geom = row.geometry
                if geom is None:
                    continue
                props = {
                    key: _clean_value(value)
                    for key, value in row.drop(labels=["geometry"]).to_dict().items()
                }
                feature = {
                    "type": "Feature",
                    "id": _feature_id(props, idx, id_field, id_fields),
                    "properties": props,
                    "geometry": mapping(geom),
                }
                # allow_nan=False ensures we don't emit invalid JSON for tippecanoe.
                f.write(json.dumps(feature, allow_nan=False))
                f.write("\n")
                written += 1
    print(f"Wrote {written:,} features to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--id-field", default=None)
    parser.add_argument(
        "--id-fields",
        default=None,
        help="Comma-separated fields to join into a stable feature id.",
    )
    parser.add_argument("--kind", choices=["auto", "insar_points", "gba", "osm"], default="auto")
    parser.add_argument("--track", type=int, default=None)
    args = parser.parse_args()

    id_fields = [field.strip() for field in args.id_fields.split(",")] if args.id_fields else None
    to_geojsonl(
        args.input,
        args.output,
        args.id_field,
        id_fields=id_fields,
        kind=args.kind,
        track=args.track,
    )
