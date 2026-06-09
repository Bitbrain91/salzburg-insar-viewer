# Bad Gastein Integration Verification

Stand: 2026-06-05

## Datenartefakte

- `data/gba/bad_gastein_gba.geojson`: 5057 GBA-Gebaeude aus dem TUM GlobalBuildingAtlas WFS.
- Bad-Gastein-InSAR-Parquets:
  - `bad_gastein_snt` Track 22: 78226 Punkte, 7040340 Displacement-Zeilen
  - `bad_gastein_snt` Track 44: 127384 Punkte, 11719328 Displacement-Zeilen
  - `bad_gastein_snt` Track 95: 119973 Punkte, 10797570 Displacement-Zeilen
  - `bad_gastein_tsx_paz` Track 70: 288146 Punkte, 16424322 Displacement-Zeilen
  - `bad_gastein_tsx_paz` Track 93: 512017 Punkte, 33281105 Displacement-Zeilen
- Summe Bad Gastein: 1125746 Punkte, 79262665 Displacement-Zeilen.
- `data/parquet/gba_buildings.parquet`: Salzburg 57489, Bad Gastein 5057.
- `data/parquet/osm_buildings.parquet`: Salzburg 49240. Bad-Gastein-OSM ist nicht als lokales Parquet vorhanden; Bad-Gastein-ML nutzt GBA.
- `data/parquet/insar_point_terrain.parquet`: Salzburg/SNT 550764, Bad-Gastein/SNT 325583, Bad-Gastein/TSX-PAZ 800163.
- `data/parquet/building_terrain_context.parquet`: Salzburg 106729, Bad Gastein 5057.

## Tiles

`./pipeline/build_tiles.sh` exportiert nur noch die generischen Layer. Die MBTiles wurden mit Docker/Tippecanoe gebaut.

- `data/tiles_v2/insar_points.mbtiles`: 315150336 Bytes, Layer `insar_points`, 7813 Tiles
- `data/tiles_v2/gba.mbtiles`: 23781376 Bytes, Layer `gba`, 955 Tiles
- `data/tiles_v2/osm.mbtiles`: 8830976 Bytes, Layer `osm`, 403 Tiles
- Entfernt: alte track-spezifische Root-Parquets/GeoJSONL/MBTiles.

## Checks

- `backend/.venv-wsl/bin/python -m compileall backend/app`: OK
- Pipeline-Python-Syntax (`py_compile`): OK
- `bash -n pipeline/build_tiles.sh`: OK
- `npm run build` in `frontend/`: OK
- `git diff --check`: OK, nur Git-CRLF-Warnungen im Arbeitsbaum.
- Altpfad-/Default-Suchlaeufe fuer alte InSAR-Layer, Salzburg-Runtime-Defaults und feste 44/95-Hauptclusterfelder: OK, keine Treffer ausser realen Tracknummern in Manifest/Metadaten.
- Track-Geometrie: SNT22 ist verifiziert und `direction_dependent_ml=true` mit Blickrichtung 280.2 deg, Sensor-Bearing 100.2 deg und Default-Einfallswinkel 45.66 deg; Bad-Gastein-SNT 44/95 und TSX/PAZ 70/93 sind fuer direction-dependent ML aktiv.
- Frontend-Konfiguration dedupliziert Dataset-Track-Platzhalter gegen die detaillierten Track-Metadaten aus `/api/config`.
- Kartenlayer filtern kombinierte InSAR- und Gebaeude-Tiles nach `area_id`; Gebaeude-Highlights nutzen `area_id` plus Gebaeude-ID.
- ML-Startpanel sendet `area_id` und `dataset_id`; Track-Auswahl kommt aus `/api/config` und aktiviert verifizierte Tracks inklusive Bad-Gastein-SNT22.
- Playwright-MCP-Smoke: Salzburg und Bad Gastein zeigen InSAR-Punkte; AOI-Wechsel Salzburg -> Bad Gastein setzt die Karte auf `#10.5/47.0866/13.1389/-10/45`; Bad Gastein zeigt SNT 22/44/95 und TSX/PAZ 70/93 inklusive dynamischer Kameraoptionen.
- Playwright-MCP-Punktklick: Bad-Gastein-TSX/PAZ-Punkt `DWLVQXL`, Track 70, laedt `/api/points/...area_id=bad_gastein&dataset_id=bad_gastein_tsx_paz` und die passende Zeitreihe.

## PostGIS

Docker Desktop wurde ueber Windows gestartet und die Compose-Services wurden mit
`/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe compose up -d`
gestartet.

- Bestehende Salzburg-DB wurde migriert, ohne Tabellen per `schema.sql` zu droppen.
- Bad-Gastein-Daten wurden scoped mit `pipeline/load_postgis.py --area-id bad_gastein` geladen.
- Identitaetsspalten `area_id`/`dataset_id` und `insar_points.sensor` sind in PostGIS `NOT NULL` und defaultfrei.
- API ohne Punktidentitaet (`/api/points/<code>` ohne `area_id`/`dataset_id`) liefert 400 statt still nach Salzburg aufzufuellen.
- PostGIS-Counts nach Load:
  - Salzburg/SNT Punkte: Track 44 = 247388, Track 95 = 303376
  - Bad-Gastein/SNT Punkte: Track 22 = 78226, Track 44 = 127384, Track 95 = 119973
  - Bad-Gastein/TSX-PAZ Punkte: Track 70 = 288146, Track 93 = 512017
  - Bad-Gastein/SNT Displacement: Track 22 = 7040340, Track 44 = 11719328, Track 95 = 10797570
  - Bad-Gastein/TSX-PAZ Displacement: Track 70 = 16424322, Track 93 = 33281105
  - GBA-Gebaeude: Salzburg 57489, Bad Gastein 5057
  - Terrain-Kontext: Salzburg/SNT 550764, Bad-Gastein/SNT 325583, Bad-Gastein/TSX-PAZ 800163

## ML-Smoke

Synchronous CLI-Smokes mit derselben Bad-Gastein-BBox:

```bash
backend/.venv-wsl/bin/python -m backend.app.ml.cli \
  --pipeline anomaly_local_v1 \
  --area-id bad_gastein \
  --dataset-id <dataset_id> \
  --source gba \
  --bbox 13.09,47.09,13.12,47.115 \
  --params '{"max_distance_m":15,"min_valid_epochs":24}'
```

- SNT App-Run: `c7515149-1d6b-4808-abdc-6787675e4398`, MLflow Run `ae5293a39a64476a93fa6d6a10f68048`, Status `succeeded`
- SNT Resultpunkte: 1907, Tracks `{44,95}`, zugeordnete Punkte 1078, zugeordnete Gebaeude 142
- SNT Metriken: `full_cross_track_points=428`, `buildings_with_full_track_support=41`
- TSX/PAZ App-Run: `c9f9f55d-3eb2-4a89-a70d-dfce59d911ac`, MLflow Run `48e097031dff421fa90425591d8f6624`, Status `succeeded`
- TSX/PAZ Resultpunkte: 13009, Tracks `{70,93}`, zugeordnete Punkte 6585, zugeordnete Gebaeude 176
- TSX/PAZ Metriken: `full_cross_track_points=0`, `buildings_with_full_track_support=0`
- Beide Runs: keine fremden `area_id`/`dataset_id`-Resultzeilen; `main_cluster_by_track` wird geschrieben; feste 44/95-Hauptclusterfelder werden nicht mehr geschrieben.
