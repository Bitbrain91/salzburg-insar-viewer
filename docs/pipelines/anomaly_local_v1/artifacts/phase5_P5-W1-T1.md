# P5-W1-T1 Audit: Datenlinie, CRS-Vertrag und Artefakt-Baseline

- Ticket-Status: `green`
- Bewertung: `Daten korrekt`
- Scope: Datenlinie, CRS-Vertrag und Artefakt-Baseline fuer InSAR, GBA, OSM, Terrain, PostGIS, MBTiles und API
- Geaenderte Dateien:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W1-T1.md`

Es wurden keine Code-, Schema-, DB- oder Datenartefakte mutiert. Es gab keinen DB-Reload und
keine Datenregeneration.

## DoD-Evidenz

### 1. Datenlinie Raw -> Parquet -> PostGIS/API/Tiles

Aktiver Repo-Vertrag laut Code:

- InSAR Raw-GPKG -> Parquet:
  - `pipeline/prepare_insar.py:114-169`
- GBA GeoJSON / OSM Overpass -> Parquet:
  - `pipeline/prepare_buildings.py:18-40`
  - `pipeline/prepare_buildings.py:133-192`
- Link-Parquets aus Punkt-/Gebaeude-Parquets in UTM 33N:
  - `pipeline/link_points_buildings.py:11-69`
- Terrain-Raw-HGT -> Analyse-Raster -> Terrain-Parquet:
  - `pipeline/prepare_terrain.py:28-34`
  - `pipeline/prepare_terrain.py:140-260`
- Parquet -> PostGIS:
  - `pipeline/load_postgis.py:14-110`
- Parquet -> GeoJSONL -> MBTiles:
  - `pipeline/export_geojsonl.py:12-45`
  - `pipeline/build_tiles.sh:20-57`
- 3857-Raster -> XYZ-Rastertiles:
  - `pipeline/build_terrain_tiles.sh:27-37`
- API/Frontend lesen dieselben Artefaktpfade:
  - `backend/app/config.py:45-52`
  - `backend/app/main.py:26-48`
  - `backend/app/routers/tiles.py:92-116`
  - `backend/app/routers/api.py:88-127`
  - `frontend/src/components/MapView.tsx:1266-1307`

### 2. Parquet-Baseline und Bounds

| Datensatz | Source | Count | CRS | Bounds / Verteilung | Befund |
| --- | --- | ---: | --- | --- | --- |
| `insar_points_t44.parquet` | `Stadt_Salzburg.gpkg` Layer `44` | `247388` | `EPSG:4326` | Bounds `12.985767,47.751343,13.123573,47.853511`; `track=44` nur `247388`; `los=A` nur `247388` | Raw und Parquet stimmen exakt ueberein |
| `insar_points_t95.parquet` | `Stadt_Salzburg.gpkg` Layer `95` | `303376` | `EPSG:4326` | Bounds `12.985729,47.751379,13.119458,47.853543`; `track=95` nur `303376`; `los=D` nur `303376` | Raw und Parquet stimmen exakt ueberein |
| `gba_buildings.parquet` | `salzburg_gba.geojson` | `57489` | `EPSG:4326` | Bounds `12.950006,47.750000,13.149997,47.869998`; Geometrietyp `Polygon` | Raw und Parquet stimmen exakt ueberein |
| `osm_buildings.parquet` | Overpass-Extrakt bei Erzeugung | `49240` | `EPSG:4326` | Bounds `12.948391,47.749585,13.150468,47.850321`; Geometrietypen `49121 Polygon`, `119 MultiPolygon` | Nur Parquet im Repo vorhanden |
| `insar_to_gba.parquet` | aus Punkt-/GBA-Parquet | `483015` | tabellarisch | `182847 within`, `300168 nearest`; Tracks `44:216742`, `95:266273`; Distanz `p95=11.531 m`, `max=15.0 m` | stimmt mit Phase-5-Baseline |
| `insar_to_osm.parquet` | aus Punkt-/OSM-Parquet | `481423` | tabellarisch | `181973 within`, `299450 nearest`; Tracks `44:215852`, `95:265571`; Distanz `p95=11.588 m`, `max=15.0 m` | stimmt mit Phase-5-Baseline |
| `insar_point_terrain.parquet` | SRTM-Sampling | `550764` | tabellarisch | `terrain_source=srtm` nur; `terrain_resolution_m=25.82` | stimmt mit Phase-5-Baseline |
| `building_terrain_context.parquet` | SRTM-Sampling | `106729` | tabellarisch | `terrain_source=srtm` nur; `terrain_resolution_m=25.82`; `gba=57489`, `osm=49240` | stimmt mit Phase-5-Baseline |

Zusatzbefund:

- `pipeline/load_postgis.py:61-110` konvertiert Building-Parquet vor dem DB-Load nach
  `MultiPolygon`.
- Das passt zum Schema `GEOMETRY(MultiPolygon, 4326)` in `backend/sql/schema.sql:63-80`.

### 3. CRS-Vertrag

| Ebene | Beobachtung | Evidenz |
| --- | --- | --- |
| Raw InSAR | `Stadt_Salzburg.gpkg` Layer `44` und `95` sind fachlich `EPSG:4326` | GeoPandas-Readback, Counts/Bounds identisch zu Parquet |
| Raw GBA | `salzburg_gba.geojson` ist `EPSG:4326` | GeoPandas-Readback |
| Raw Terrain | `N47E012.hgt`, `N47E013.hgt` sind geografisch WGS84, `3601x3601`, `1 arc-second` | `gdalinfo -json` via Docker |
| InSAR/GBA/OSM Parquet | alle GeoParquets in `EPSG:4326` | GeoPandas-Readback |
| PostGIS | `insar_points.geom = POINT 4326`, `gba_buildings.geom = MULTIPOLYGON 4326`, `osm_buildings.geom = MULTIPOLYGON 4326` | `backend/sql/schema.sql:17-80`; `geometry_columns` Query |
| Analyse-Terrain | abgeleitete Raster `srtm_elevation_25833.tif`, `srtm_slope_25833.tif`, `srtm_aspect_25833.tif` in `EPSG:25833` | `pipeline/prepare_terrain.py:144-205`; `gdalinfo` |
| Browser-Terrain | `srtm_hillshade_3857.tif`, `srtm_slope_color_3857.tif` in `EPSG:3857` | `pipeline/prepare_terrain.py:224-260`; `gdalinfo` |
| Vector Tiles | MBTiles mit `format=pbf`; aktive Files unter `data/tiles_v2/` | `pipeline/build_tiles.sh:29-55`; MBTiles-Metadaten; `backend/app/routers/tiles.py:92-116` |
| Raster Tiles | `data/raster_tiles/relief_hillshade` und `relief_slope` enthalten je `565` PNG-Tiles | `pipeline/build_terrain_tiles.sh:27-37`; lokaler Dateicount |
| API | Punkt-API liefert `lon/lat` ueber `ST_X/ST_Y`; Building-API liefert GeoJSON aus DB-Geometrie | `backend/app/routers/api.py:95-138` |

### 4. Transformationspunkte `4326 / 32633 / 25833 / 3857`

- `EPSG:4326`
  - Raw InSAR, GBA und Parquet-Baseline.
  - DB-Geometrien fuer aktive Kernlayer.
  - API-Detailantworten und GeoJSON-Export.

- `EPSG:32633`
  - Metrische Linkbildung fuer `within`/`nearest`:
    `pipeline/link_points_buildings.py:11-47`
  - Metrische Building-/Point-Geometrie in der ML-Pipeline:
    `backend/app/ml/pipelines/anomaly_local_v1.py:167-205`
  - Kandidatenflaechen-API: `ST_Transform(geom, 32633)` -> Puffer/Shift -> Ruecktransform nach `4326`:
    `backend/app/routers/ml.py:813-890`

- `EPSG:25833`
  - Terrain-Mosaik und Analyse-Raster fuer Sampling:
    `pipeline/prepare_terrain.py:140-205`
  - Lokaler Messbefund:
    Bounds `345565.879,5289042.506,362375.661,5302794.289`,
    Rasterauflosung ca. `25.82 x 25.85 m`

- `EPSG:3857`
  - Hillshade- und Slope-Color-Raster fuer Browser/Rastertiles:
    `pipeline/prepare_terrain.py:224-260`
    und `pipeline/build_terrain_tiles.sh:27-37`
  - ML-MVT erzeugt Geometrie explizit per `ST_Transform(p.geom, 3857)`:
    `backend/app/routers/ml.py:1039-1115`
  - Klassische MBTiles aus Tippecanoe kommen aus `EPSG:4326` GeoJSONL und liegen dann implizit im
    Web-Mercator-Tilevertrag; die MBTiles-Bounds spiegeln die Source-Bounds wider.

### 5. MBTiles-Baseline

Aktiv laut `backend/.env` und `backend/app/config.py:45-52` ist `PMTILES_DIR=../data/tiles_v2`.

| MBTiles | Meta-Zoom | Beobachteter Zoom | Bounds-Metadaten | Befund |
| --- | --- | --- | --- | --- |
| `insar_t44.mbtiles` | `8..16` | `8..16` | `12.985767,47.751343,13.123573,47.853511` | Bounds exakt wie Punkt-Parquet |
| `insar_t95.mbtiles` | `8..16` | `8..16` | `12.985729,47.751379,13.119458,47.853543` | Bounds exakt wie Punkt-Parquet |
| `gba.mbtiles` | `0..15` | `2..15` | `12.950006,47.750001,13.149997,47.869998` | Bounds praktisch identisch zum GBA-Parquet |
| `osm.mbtiles` | `0..15` | `2..15` | `12.948391,47.749585,13.150468,47.850321` | Bounds identisch zum OSM-Parquet |

`data/pmtiles/*.mbtiles` existiert zusaetzlich mit denselben Dateigroessen, ist aber fuer den
aktiven Backend-Pfad nicht der Primarstand.

## Offene Baseline-Fragen / Risiken

1. `Stadt_Salzburg.gpkg`-Metadaten sind fuer Layer `44`/`95` als Extent unzuverlaessig:
   `pyogrio.read_info(...)` meldet `[-180,-90,180,90]`, waehrend die echten Feature-Bounds lokal
   sind und mit dem Parquet exakt matchen. Fuer kuenftige Audits duerfen die Roh-Layer-Bounds nicht
   nur aus der GPKG-Metadatenansicht gelesen werden.

2. OSM ist im Repo nicht als roher, eingefrorener Input vorhanden. Die eigentliche Rohquelle ist
   ein Live-Overpass-Query (`pipeline/prepare_buildings.py:133-168`); im Repo liegt nur das daraus
   erzeugte Parquet. Der aktuelle Artefaktstand ist intern konsistent, aber die OSM-Raw-Baseline
   ist nicht voll reproduzierbar aus Repo-Dateien allein.

3. Amplitudenabdeckung ist asymmetrisch:
   - Track 44: `523 / 247388` Punkte ohne `amp_mean`/`amp_std` (`0.21%`)
   - Track 95: `60540 / 303376` Punkte ohne `amp_mean`/`amp_std` (`19.96%`)
   Das verletzt den aktiven Artefaktvertrag nicht direkt, weil `prepare_insar.py` bewusst per
   `left join` merged und `methodik.md:48-54` fehlende Amplituden fuer Track 95 bereits als
   empirischen Repo-Befund dokumentiert. Es bleibt aber eine offene Baseline-Frage fuer spaetere
   Feature- oder QA-Arbeit.

4. Artefaktpfad-Namensdrift:
   - `pipeline/config.py` definiert `PMTILES_DIR = data/pmtiles`
   - der aktive Build/Serve-Pfad ist `data/tiles_v2`
   - beide Verzeichnisse enthalten MBTiles mit identischen Dateigroessen
   Das ist kein akuter Datenfehler, aber eine Baseline-Ambiguitaet.

## Verwendete Kommandos

```bash
git status --short --branch
docker compose ps
rg -n "P5-W1-T1|Datenlinie|CRS|Artefakt|Track|LOS|Parquet|tile|baseline" \
  docs/pipelines/anomaly_local_v1/phase5_data_correctness_plan.md \
  docs/pipelines/anomaly_local_v1/phase5_supervisor_prompt.md \
  docs/pipelines/anomaly_local_v1/phase2_execution_plan.md

backend/.venv-wsl/bin/python - <<'PY'
# raw/parquet/link/terrain/mbtiles inspection
PY

backend/.venv-wsl/bin/python - <<'PY'
# raw-vs-parquet count/bounds/track/los comparison
PY

backend/.venv-wsl/bin/python - <<'PY'
# amplitude code coverage and amp_mean/amp_std null audit
PY

python3 - <<'PY'
# dockerized gdalinfo -json over raw and derived terrain rasters
PY

docker compose exec -T db psql -U insar -d insar -P pager=off -c \
  "SELECT f_table_name, f_geometry_column, srid, type FROM geometry_columns ..."

docker compose exec -T db psql -U insar -d insar -P pager=off -c \
  "SELECT 'insar_points' AS table_name, COUNT(*) ..."

ls -lh data/tiles_v2 data/pmtiles
```

## Lokale Verifikation

- `docker compose ps` bestaetigt laufende Services `db` und `mlflow`.
- Die bevorzugte GeoPandas-Umgebung `backend/.venv-wsl/bin/python` funktioniert fuer GPKG- und
  Parquet-Pruefungen; `rasterio` ist dort nicht installiert, daher wurden Rastermetadaten
  reproduzierbar ueber `gdalinfo` im GDAL-Docker-Image geprueft.
- `geometry_columns` bestaetigt live denselben PostGIS-SRID-Vertrag wie das Schema:
  `insar_points = POINT 4326`, `gba_buildings = MULTIPOLYGON 4326`,
  `osm_buildings = MULTIPOLYGON 4326`.
- Die MBTiles-Metadaten in `data/tiles_v2` spiegeln die Parquet-Bounds der Quelllayer wider.
- Die Rastertile-Verzeichnisse `relief_hillshade` und `relief_slope` sind lokal befuellt.

## Schluss

Der aktive Datenvertrag ist fuer dieses Ticket belastbar nachvollziehbar:

- Raw/Parquet zaehlerisch und raeumlich konsistent fuer InSAR und GBA
- erwartete Parquet-Baseline fuer OSM, Links und Terrain bestaetigt
- PostGIS-SRID-Vertrag `4326` bestaetigt
- Transformationskette `4326 -> 32633 -> 4326` fuer metrische Geometrie sowie
  `4326 -> 25833 -> 3857` fuer Terrain sauber im Code und in den Artefakten nachweisbar
- MBTiles- und Rastertile-Baseline lokal vorhanden und mit dem aktiven Backendpfad kompatibel

Die offenen Punkte sind reale Audit-Risiken, aber fuer `P5-W1-T1` keine nachgewiesene
Vertragsverletzung der aktiven Artefakte. Daher bleibt der Ticketstatus `green`.
