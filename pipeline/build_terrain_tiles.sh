#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DERIVED_DIR="$ROOT_DIR/data/terrain/derived"
RASTER_DIR="${RASTER_TILES_DIR:-"$ROOT_DIR/data/raster_tiles"}"
GDAL_IMAGE="${GDAL_IMAGE:-ghcr.io/osgeo/gdal:ubuntu-small-latest}"

HILLSHADE_SRC="$DERIVED_DIR/srtm_hillshade_3857.tif"
SLOPE_SRC="$DERIVED_DIR/srtm_slope_color_3857.tif"
HILLSHADE_OUT="$RASTER_DIR/relief_hillshade"
SLOPE_OUT="$RASTER_DIR/relief_slope"

if [ ! -f "$HILLSHADE_SRC" ]; then
  echo "Missing hillshade raster: $HILLSHADE_SRC" >&2
  exit 1
fi

if [ ! -f "$SLOPE_SRC" ]; then
  echo "Missing colorized slope raster: $SLOPE_SRC" >&2
  exit 1
fi

rm -rf "$HILLSHADE_OUT" "$SLOPE_OUT"
mkdir -p "$HILLSHADE_OUT" "$SLOPE_OUT"

docker run --rm -v "$ROOT_DIR:/workspace" -v "$RASTER_DIR:/raster_out" -w /workspace "$GDAL_IMAGE" \
  gdal2tiles.py --xyz --zoom=8-15 -w none -r bilinear \
    /workspace/data/terrain/derived/srtm_hillshade_3857.tif \
    /raster_out/relief_hillshade

docker run --rm -v "$ROOT_DIR:/workspace" -v "$RASTER_DIR:/raster_out" -w /workspace "$GDAL_IMAGE" \
  gdal2tiles.py --xyz --zoom=8-15 -w none -r near \
    /workspace/data/terrain/derived/srtm_slope_color_3857.tif \
    /raster_out/relief_slope

printf "Terrain raster tiles generated in %s\n" "$RASTER_DIR"
