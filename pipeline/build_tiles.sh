#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GEOJSON_DIR="$ROOT_DIR/data/geojson"
TILES_DIR=${TILES_DIR:-"$ROOT_DIR/data/tiles_v2"}
if [ -x "$ROOT_DIR/../.venv-win/Scripts/python.exe" ]; then
  DEFAULT_PYTHON_BIN="$ROOT_DIR/../.venv-win/Scripts/python.exe"
else
  DEFAULT_PYTHON_BIN="$ROOT_DIR/../venv/Scripts/python.exe"
fi
PYTHON_BIN=${PYTHON_BIN:-"$DEFAULT_PYTHON_BIN"}

mkdir -p "$GEOJSON_DIR" "$TILES_DIR"

to_win() {
  wslpath -w "$1"
}

"$PYTHON_BIN" "$(to_win "$ROOT_DIR/pipeline/export_geojsonl.py")" "$(to_win "$ROOT_DIR/data/parquet/insar_points_t44.parquet")" "$(to_win "$GEOJSON_DIR/insar_t44.geojsonl")" --id-field code
"$PYTHON_BIN" "$(to_win "$ROOT_DIR/pipeline/export_geojsonl.py")" "$(to_win "$ROOT_DIR/data/parquet/insar_points_t95.parquet")" "$(to_win "$GEOJSON_DIR/insar_t95.geojsonl")" --id-field code
"$PYTHON_BIN" "$(to_win "$ROOT_DIR/pipeline/export_geojsonl.py")" "$(to_win "$ROOT_DIR/data/parquet/gba_buildings.parquet")" "$(to_win "$GEOJSON_DIR/gba.geojsonl")" --id-field gba_id
"$PYTHON_BIN" "$(to_win "$ROOT_DIR/pipeline/export_geojsonl.py")" "$(to_win "$ROOT_DIR/data/parquet/osm_buildings.parquet")" "$(to_win "$GEOJSON_DIR/osm.geojsonl")" --id-field osm_id

TIPPECANOE_IMAGE=${TIPPECANOE_IMAGE:-"klokantech/tippecanoe:latest"}

# InSAR points

docker run --rm -v "$GEOJSON_DIR:/data" -v "$TILES_DIR:/out" "$TIPPECANOE_IMAGE" \
  tippecanoe -o /out/insar_t44.mbtiles -l insar_t44 --force \
    --minimum-zoom=8 --maximum-zoom=16 \
    --drop-fraction-as-needed \
    --extend-zooms-if-still-dropping \
    --buffer=32 \
    /data/insar_t44.geojsonl

docker run --rm -v "$GEOJSON_DIR:/data" -v "$TILES_DIR:/out" "$TIPPECANOE_IMAGE" \
  tippecanoe -o /out/insar_t95.mbtiles -l insar_t95 --force \
    --minimum-zoom=8 --maximum-zoom=16 \
    --drop-fraction-as-needed \
    --extend-zooms-if-still-dropping \
    --buffer=32 \
    /data/insar_t95.geojsonl

# Buildings

docker run --rm -v "$GEOJSON_DIR:/data" -v "$TILES_DIR:/out" "$TIPPECANOE_IMAGE" \
  tippecanoe -o /out/gba.mbtiles -l gba --force \
    --maximum-zoom=15 --no-feature-limit --no-tile-size-limit \
    /data/gba.geojsonl

docker run --rm -v "$GEOJSON_DIR:/data" -v "$TILES_DIR:/out" "$TIPPECANOE_IMAGE" \
  tippecanoe -o /out/osm.mbtiles -l osm --force \
    --maximum-zoom=15 --no-feature-limit --no-tile-size-limit \
    /data/osm.geojsonl

printf "MBTiles generated in %s\n" "$TILES_DIR"
