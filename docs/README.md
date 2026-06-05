# Docs Overview

Dieser Ordner ist nach Themen statt nach Einzeldateien organisiert. Neue Doku sollte moeglichst in die passende Unterstruktur gelegt werden statt direkt in `docs/`.

## Struktur

- `docs/workflows/`
  - repo-weite Arbeitsweisen, z. B. der AI-Supervisor-Workflow
- `docs/pipelines/`
  - pipeline-spezifische Methodik, Plaene, Runbooks und Supervisor-Artefakte
  - aktueller Fokus: `docs/pipelines/anomaly_local_v1/`
- `docs/research/`
  - fachliche Analyse, externe Grundlagen und Rohdaten-Auswertung
- `docs/project/`
  - Projektziele, Antraege und uebergeordnete Produktdokumente
- `docs/architecture/`
  - Diagramme und Systemdarstellungen
- `docs/archive/`
  - alte oder ersetzte Doku, die nicht mehr aktiver Arbeitsstand ist

## Wichtige Einstiege

- Workflow-Standard: `docs/workflows/ai_supervisor_workflow.md`
- Aktueller Umsetzungsplan fuer `anomaly_local_v1`: `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- Supervisor-Startprompt fuer `anomaly_local_v1`: `docs/pipelines/anomaly_local_v1/supervisor_prompt.md`
- Runbook mit festen Test-AOIs: `docs/pipelines/anomaly_local_v1/runbook.md`
- Fachliche Methodik der aktiven Pipeline: `docs/pipelines/anomaly_local_v1/methodik.md`
- Rohdatenanalyse: `docs/research/Datenanalyse_InSAR_Salzburg.md`

## Area-aware Datenpipeline

Gebiets- und Dataset-Metadaten stehen in `pipeline/areas_manifest.json`. Neue
InSAR-Ausgaben liegen unter `data/parquet/<area_id>/<dataset_id>/`, Gebaeude
zusaetzlich unter `data/parquet/<area_id>/`. Kombinierte Gebaeude-Parquets bleiben
unter `data/parquet/gba_buildings.parquet` und `data/parquet/osm_buildings.parquet`
und enthalten `area_id`.

Bad Gastein vorbereiten:
```bash
python pipeline/download_gba.py --area bad_gastein
python pipeline/prepare_insar.py --area bad_gastein --dataset bad_gastein_snt --track 22
python pipeline/prepare_insar.py --area bad_gastein --dataset bad_gastein_snt --track 44
python pipeline/prepare_insar.py --area bad_gastein --dataset bad_gastein_snt --track 95
python pipeline/prepare_insar.py --area bad_gastein --dataset bad_gastein_tsx_paz --track 70
python pipeline/prepare_insar.py --area bad_gastein --dataset bad_gastein_tsx_paz --track 93
python pipeline/prepare_buildings.py --area all --osm-source local
python pipeline/prepare_terrain.py --area all --overwrite
```

PostGIS und Tiles:
```bash
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar \
  --skip-schema --area-id bad_gastein --only points
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar \
  --skip-schema --area-id bad_gastein --only timeseries
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar \
  --skip-schema --area-id bad_gastein --only gba
python pipeline/load_terrain_context.py --dsn postgresql://insar:insar@localhost:5432/insar
SKIP_TIPPECANOE=1 ./pipeline/build_tiles.sh  # nur GeoJSONL pruefen
./pipeline/build_tiles.sh                    # erzeugt MBTiles via Docker/Tippecanoe
```

Der erste `load_postgis.py`-Befehl ist fuer eine frische DB. Bei einer bereits
geladenen Salzburg-DB zuerst die SQL-Migrationen anwenden und danach die scoped
Bad-Gastein-Befehle mit `--skip-schema --area-id bad_gastein` verwenden.

Tiles: `insar_points.mbtiles` mit Layer `insar_points`, `gba.mbtiles` mit
Layer `gba`, `osm.mbtiles` mit Layer `osm`.

Bad-Gastein-GBA wird ueber den TUM GlobalBuildingAtlas WFS geladen:
`https://tubvsig-so2sat-vm1.srv.mwn.de/geoserver/ows`, Feature-Type
`global3D:lod1_global`. In WSL-Setups ohne Docker kann `build_tiles.sh` auch mit
einem lokalen Tippecanoe-Binary laufen:
`TIPPECANOE_BIN=/path/to/tippecanoe ./pipeline/build_tiles.sh`.

## Ablageregeln

- Neue pipeline-spezifische Dokumente unter `docs/pipelines/<pipeline_name>/`.
- Neue supervisorbezogene Artefakte immer neben dem zugehoerigen Pipeline-Plan ablegen.
- Externe oder abgeloeste Dokumente nicht loeschen, sondern nach `docs/archive/` verschieben.
- Diagramme nach Moeglichkeit in den thematisch passenden Unterordner legen, z. B. `docs/architecture/` oder `docs/pipelines/<pipeline_name>/diagrams/`.
- Root-Dateien direkt unter `docs/` nur fuer Uebersichten wie diese `README.md`.
