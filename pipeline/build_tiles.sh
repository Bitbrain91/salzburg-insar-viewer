#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARQUET_DIR=${PARQUET_DIR:-"$ROOT_DIR/data/parquet"}
GEOJSON_DIR=${GEOJSON_DIR:-"$ROOT_DIR/data/geojson"}
TILES_DIR=${TILES_DIR:-"$ROOT_DIR/data/tiles_v2"}

if [ -z "${PYTHON_BIN:-}" ]; then
  if [ -x "$ROOT_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
  elif [ -x "$ROOT_DIR/.venv-win/Scripts/python.exe" ]; then
    PYTHON_BIN="$ROOT_DIR/.venv-win/Scripts/python.exe"
  elif [ -x "$ROOT_DIR/../.venv-win/Scripts/python.exe" ]; then
    PYTHON_BIN="$ROOT_DIR/../.venv-win/Scripts/python.exe"
  elif [ -x "$ROOT_DIR/../venv/Scripts/python.exe" ]; then
    PYTHON_BIN="$ROOT_DIR/../venv/Scripts/python.exe"
  else
    PYTHON_BIN="python"
  fi
fi

mkdir -p "$GEOJSON_DIR" "$TILES_DIR"

py_path() {
  if [[ "$PYTHON_BIN" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -w "$1"
  else
    printf "%s\n" "$1"
  fi
}

run_export() {
  "$PYTHON_BIN" "$(py_path "$ROOT_DIR/pipeline/export_geojsonl.py")" "$@"
}

has_nested_buildings() {
  local filename=$1
  find "$PARQUET_DIR" -mindepth 2 -maxdepth 2 -name "$filename" -type f -print -quit | grep -q .
}

run_export \
  "$(py_path "$PARQUET_DIR")" \
  "$(py_path "$GEOJSON_DIR/insar_points.geojsonl")" \
  --kind insar_points \
  --id-fields area_id,dataset_id,track,code

if [ -f "$PARQUET_DIR/gba_buildings.parquet" ] || has_nested_buildings "gba_buildings.parquet"; then
  run_export \
    "$(py_path "$PARQUET_DIR")" \
    "$(py_path "$GEOJSON_DIR/gba.geojsonl")" \
    --kind gba \
    --id-fields area_id,gba_id
else
  printf "Skipping GBA GeoJSONL (source parquet not found)\n"
fi

if [ -f "$PARQUET_DIR/osm_buildings.parquet" ] || has_nested_buildings "osm_buildings.parquet"; then
  run_export \
    "$(py_path "$PARQUET_DIR")" \
    "$(py_path "$GEOJSON_DIR/osm.geojsonl")" \
    --kind osm \
    --id-fields area_id,osm_id
else
  printf "Skipping OSM GeoJSONL (source parquet not found)\n"
fi

if [ "${SKIP_TIPPECANOE:-0}" = "1" ]; then
  printf "GeoJSONL generated in %s; skipping Tippecanoe because SKIP_TIPPECANOE=1\n" "$GEOJSON_DIR"
  exit 0
fi

TIPPECANOE_IMAGE=${TIPPECANOE_IMAGE:-"klokantech/tippecanoe:latest"}
TIPPECANOE_BIN=${TIPPECANOE_BIN:-""}

docker_available() {
  command -v docker >/dev/null 2>&1 && docker --version >/dev/null 2>&1
}

run_tippecanoe() {
  local output=$1
  local layer=$2
  local input=$3
  shift 3

  if [ ! -s "$GEOJSON_DIR/$input" ]; then
    printf "Skipping %s (missing or empty %s)\n" "$output" "$input"
    return
  fi

  if [ -n "$TIPPECANOE_BIN" ] && [ -x "$TIPPECANOE_BIN" ]; then
    "$TIPPECANOE_BIN" -o "$TILES_DIR/$output" -l "$layer" --force "$@" "$GEOJSON_DIR/$input"
  elif command -v tippecanoe >/dev/null 2>&1; then
    tippecanoe -o "$TILES_DIR/$output" -l "$layer" --force "$@" "$GEOJSON_DIR/$input"
  elif docker_available; then
    docker run --rm -v "$GEOJSON_DIR:/data" -v "$TILES_DIR:/out" "$TIPPECANOE_IMAGE" \
      tippecanoe -o "/out/$output" -l "$layer" --force "$@" "/data/$input"
  else
    printf "Cannot build %s: install tippecanoe, set TIPPECANOE_BIN, or enable Docker.\\n" "$output" >&2
    exit 127
  fi
}

run_tippecanoe insar_points.mbtiles insar_points insar_points.geojsonl \
  --minimum-zoom=8 --maximum-zoom=16 \
  --drop-fraction-as-needed \
  --extend-zooms-if-still-dropping \
  --buffer=32

run_tippecanoe gba.mbtiles gba gba.geojsonl \
  --maximum-zoom=15 --no-feature-limit --no-tile-size-limit

run_tippecanoe osm.mbtiles osm osm.geojsonl \
  --maximum-zoom=15 --no-feature-limit --no-tile-size-limit

printf "MBTiles generated in %s\n" "$TILES_DIR"
