from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import mapping


def to_geojsonl(input_path: Path, output_path: Path, id_field: str | None = None) -> None:
    gdf = gpd.read_parquet(input_path)
    gdf = gdf.to_crs(epsg=4326)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        for idx, row in gdf.iterrows():
            geom = row.geometry
            if geom is None:
                continue
            props = row.drop(labels=["geometry"]).to_dict()
            # Convert numpy/pandas types to native Python types and drop NaN/NaT.
            cleaned_props = {}
            for k, v in props.items():
                if hasattr(v, "item"):
                    v = v.item()
                if pd.isna(v):
                    cleaned_props[k] = None
                else:
                    cleaned_props[k] = v
            props = cleaned_props
            if id_field and id_field in props:
                feature_id = str(props[id_field])
            else:
                feature_id = str(idx)
            feature = {
                "type": "Feature",
                "id": feature_id,
                "properties": props,
                "geometry": mapping(geom),
            }
            # allow_nan=False ensures we don't emit invalid JSON for tippecanoe
            f.write(json.dumps(feature, allow_nan=False))
            f.write("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--id-field", default=None)
    args = parser.parse_args()

    to_geojsonl(args.input, args.output, args.id_field)
