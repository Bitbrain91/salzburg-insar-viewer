from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = PROJECT_ROOT / "data" / "Daten"
GBA_SOURCE = PROJECT_ROOT / "data" / "gba" / "salzburg_gba.geojson"
GPKG_MOVEMENT = DATA_ROOT / "Stadt_Salzburg.gpkg"
GPKG_AMP_T44 = DATA_ROOT / "ASC_T44_AMP.gpkg"
GPKG_AMP_T95 = DATA_ROOT / "ASC_T95_AMP.gpkg"

PIPELINE_DATA_DIR = PROJECT_ROOT / "data"
PARQUET_DIR = PIPELINE_DATA_DIR / "parquet"
PMTILES_DIR = PIPELINE_DATA_DIR / "pmtiles"
EXTRACTS_DIR = PIPELINE_DATA_DIR / "extracts"

LAYER_T44 = "44"
LAYER_T95 = "95"

TIMESERIES_PREFIX = "d20"
AMP_PREFIX = "D"
