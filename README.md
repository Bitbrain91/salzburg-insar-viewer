# Salzburg InSAR Viewer (React + FastAPI)

Dieses Repository ist die neue React-/FastAPI-Architektur des Salzburg InSAR Viewers. Ziel ist eine performante, analytische GIS-Anwendung, die InSAR-Messpunkte, Gebaeudedaten (GBA) und OSM-Gebaeude in einer Oberflaeche zusammenfuehrt und vergleichbar macht.

## 1) Worum geht es in diesem Repository?
Der Salzburg InSAR Viewer stellt bodenbasierte Deformationsmessungen (InSAR) visuell und analytisch dar und verknuepft diese mit Gebaeudeinformationen aus dem Global Building Atlas (GBA) sowie OSM-Gebaeudedaten. Die Anwendung erlaubt:
- Visualisierung grosser Punktwolken (InSAR Tracks 44/95)
- Abfrage von Attributen und Zeitreihen einzelner Punkte
- Gebaeude-Selektion und Zuordnung der naechstgelegenen InSAR-Punkte
- schnelle, kachelbasierte Kartenanzeige (MBTiles + MapLibre)

## 2) Daten: Herkunft, Formate, Beziehungen

### InSAR-Daten
Quelle: lokale GeoPackages im Repo unter `insar_viewer_app/data/Daten`.
Dateien:
- `data/Daten/Stadt_Salzburg.gpkg` (Bewegungs-/InSAR-Layer, Tracks 44 und 95)
- `data/Daten/ASC_T44_AMP.gpkg` (Amplitude-Zeitreihen Track 44)
- `data/Daten/ASC_T95_AMP.gpkg` (Amplitude-Zeitreihen Track 95)

Aufbereitung:
- `pipeline/prepare_insar.py` liest die GPKG-Layer, standardisiert Spalten,
  berechnet `amp_mean`/`amp_std`, extrahiert Amplitude-Zeitreihen und schreibt:
  - `data/parquet/insar_points_t44.parquet`
  - `data/parquet/insar_points_t95.parquet`
  - `data/parquet/insar_timeseries_t44.parquet`
  - `data/parquet/insar_timeseries_t95.parquet`
  - `data/parquet/insar_amplitude_timeseries_t44.parquet`
  - `data/parquet/insar_amplitude_timeseries_t95.parquet`

### Global Building Atlas (GBA)
Quelle: lokales GeoJSON
`data/gba/salzburg_gba.geojson`

Aufbereitung:
- `pipeline/prepare_buildings.py` liest GBA, normiert Hoehe und erzeugt:
  - `data/parquet/gba_buildings.parquet`
  - zusaetzlich `properties` (JSONB) fuer vollstaendige Attributanzeige

### OSM-Gebaeude
Quelle: Overpass API (Online), Salzburg-BBox wird in Kacheln abgefragt
Aufbereitung:
- `pipeline/prepare_buildings.py --osm-source overpass`
- Ergebnis: `data/parquet/osm_buildings.parquet`
- OSM-Tags werden als JSON gespeichert (`tags`)

### Verknuepfung (InSAR <-> Gebaeude)
Ziel: Zu jedem InSAR-Punkt das naechstgelegene GBA/OSM-Gebaeude bestimmen.
Prozess: `pipeline/link_points_buildings.py`
- raeumliche Verknuepfung (within + nearest, UTM-basiert)
- Ergebnis:
  - `data/parquet/insar_to_gba.parquet`
  - `data/parquet/insar_to_osm.parquet`

## 3) Architektur und Zusammenspiel der Komponenten

Datenfluss (vereinfacht):
```
GeoPackage + GBA + OSM
        |
        v
Pipeline (GeoParquet + Links)
        |
        v
PostGIS (relationale + raeumliche Abfragen)
        |
        v
FastAPI Backend
  |- /api/* (Details, Timeseries, Gebaeude, Links)
  `- /mbtiles/* (Kachelserver)
        |
        v
React + MapLibre Frontend
```

### Komponenten
- Frontend (`frontend/`)
  - React + MapLibre GL
  - laedt MBTiles als Vector-Tiles
  - UI: Layer-Toggles, Filter, Inspector, Cross-Reference

- Backend (`backend/`)
  - FastAPI
  - PostGIS-Abfragen fuer Details/Timeseries/Links
  - liefert MBTiles ueber `/mbtiles/{name}/{z}/{x}/{y}.pbf`

- Datenbank (PostGIS in Docker)
  - Schema: `backend/sql/schema.sql`
  - Tabellen: `insar_points`, `insar_timeseries`, `insar_amplitude_timeseries`,
    `gba_buildings`, `osm_buildings`,
    `insar_to_gba`, `insar_to_osm`

- Pipeline (`pipeline/`)
  - konvertiert Rohdaten -> GeoParquet
  - erstellt Linktabellen
  - exportiert GeoJSONL -> MBTiles via Tippecanoe (Docker)

### Tile-Stack
- MBTiles liegen unter `data/tiles_v2/`
- Backend zeigt diese Dateien als Vector-Tiles an
- Frontend konsumiert sie direkt (MapLibre)

## Dokumentation
- Analysebericht der Rohdaten: `docs/Datenanalyse_InSAR_Salzburg.md`

## 4) Verwendung / Inbetriebnahme

### Voraussetzungen
- Python 3.12 empfohlen (Python 3.13 benoetigt lokale Builds fuer pyarrow)
- Node.js 18+ (Windows-Nutzung empfohlen, um OS-Mismatch zu vermeiden)
- Docker Desktop

### 1) PostGIS starten
```bash
cd insar_viewer_app
docker compose up -d
```

MLflow UI (lokal): `http://localhost:5001`  
Artefakte werden unter `./mlruns/` gespeichert (inkl. `mlruns/mlflow.db`).

### 2) Pipeline-Abhaengigkeiten installieren
Linux / WSL:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
```

Windows (empfohlen):
```powershell
python -m venv .venv-win
.\.venv-win\Scripts\Activate.ps1
pip install -r pipeline\requirements.txt
```

### 3) Daten aufbereiten
```bash
python pipeline/prepare_insar.py --track all
python pipeline/prepare_buildings.py --osm-source overpass
python pipeline/link_points_buildings.py --max-distance 15
```

### 4) Daten in PostGIS laden
```bash
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar
```

Nur Teilbereiche laden (z. B. OSM/GBA):
```bash
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar --skip-schema --only osm
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar --skip-schema --only gba
```

### Schema-Update: Amplitude-Zeitreihen (optional)
Wenn du die bestehende DB behalten willst, fuehre ein inkrementelles Schema-Update aus:
```sql
ALTER TABLE insar_points ADD COLUMN s_amp_std DOUBLE PRECISION;
ALTER TABLE insar_points ADD COLUMN s_phs_std DOUBLE PRECISION;
ALTER TABLE insar_points ADD COLUMN eff_area DOUBLE PRECISION;

CREATE TABLE insar_amplitude_timeseries (
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    date DATE NOT NULL,
    amplitude DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (code, track, date)
);
CREATE INDEX insar_amplitude_timeseries_code_idx ON insar_amplitude_timeseries (code);
```
Dann nur die Zeitreihen laden (Displacement + Amplitude):
```sql
TRUNCATE insar_points;
TRUNCATE insar_timeseries;
TRUNCATE insar_amplitude_timeseries;
```
Dann nur die InSAR-Tabellen neu laden:
```bash
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar --skip-schema --only points
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar --skip-schema --only timeseries
```

Alternative: Voll-Reload (Schema wird neu erstellt, alle Daten neu geladen):
```bash
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar
```

### 5) MBTiles erzeugen
```bash
./pipeline/build_tiles.sh
```
Ergebnis liegt in `data/tiles_v2/`.

### 6) Backend starten
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 7) Frontend starten
```bash
cd frontend
npm install
npx vite --host --port 3000
```
Oeffne: `http://localhost:3000`

## 5) ML Pipelines (Assignment / Clustering)
Die Anwendung enthaelt ein schlankes Pipeline-Framework mit MLflow-Tracking.
Ergebnisse werden in PostGIS gespeichert (Tabellen: `ml_runs`, `ml_point_results`, `ml_run_metrics`)
und lassen sich im Frontend als zusaetzliche Layer darstellen. MLflow speichert nur Tracking-Infos
und Artefakte (keine Geodaten).

### ML-Tabellen anlegen (bestehende DB behalten)
Wenn du die bestehenden Daten behalten willst, lege nur die neuen Tabellen an:
```sql
CREATE TABLE IF NOT EXISTS ml_runs (
    run_id UUID PRIMARY KEY,
    mlflow_run_id TEXT,
    pipeline TEXT NOT NULL,
    pipeline_version TEXT NOT NULL,
    run_type TEXT NOT NULL,
    source TEXT,
    track INTEGER,
    bbox JSONB,
    params JSONB,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error TEXT
);
CREATE INDEX IF NOT EXISTS ml_runs_status_idx ON ml_runs (status);
CREATE INDEX IF NOT EXISTS ml_runs_created_idx ON ml_runs (created_at);

CREATE TABLE IF NOT EXISTS ml_point_results (
    run_id UUID NOT NULL,
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    cluster_id TEXT,
    building_source TEXT,
    building_id TEXT,
    distance_m DOUBLE PRECISION,
    score DOUBLE PRECISION,
    meta JSONB,
    PRIMARY KEY (run_id, code, track)
);
CREATE INDEX IF NOT EXISTS ml_point_results_run_idx ON ml_point_results (run_id);
CREATE INDEX IF NOT EXISTS ml_point_results_cluster_idx ON ml_point_results (run_id, cluster_id);
CREATE INDEX IF NOT EXISTS ml_point_results_building_idx ON ml_point_results (run_id, building_id);

CREATE TABLE IF NOT EXISTS ml_run_metrics (
    run_id UUID NOT NULL,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION,
    meta JSONB,
    PRIMARY KEY (run_id, metric)
);
```

CLI-Beispiel:
```bash
python -m backend.app.ml.cli --pipeline assignment --source gba --track 44 \\
  --bbox 12.98,47.75,13.12,47.85 \\
  --params '{"max_distance_m":30,"buffer_multiplier":1.0}'
```

Alternativ lassen sich Runs ueber die UI im linken Panel starten.
Visualisierung: Im Frontend kann der ML-Layer aktiviert werden; zusaetzlich gibt es
eine Gebaeude-Overlay-Ansicht und mehrere Darstellungsmodi (Cluster, Building, Assignment,
Distance, Velocity, Coherence).

### Ergebnisse loeschen (DB + MLflow synchron)
```bash
curl -X DELETE "http://127.0.0.1:8000/api/ml/runs/<RUN_ID>?force=true"
```
`force=true` loescht die DB-Ergebnisse auch dann, wenn MLflow nicht erreichbar ist.

## Environment-Variablen
Frontend (`frontend/.env`):
```
VITE_API_URL=http://127.0.0.1:8000
VITE_TILES_URL=http://127.0.0.1:8000
VITE_BASEMAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
```

Backend (`backend/.env`):
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=insar
POSTGRES_USER=insar
POSTGRES_PASSWORD=insar
PMTILES_DIR=../data/tiles_v2
MLFLOW_TRACKING_URI=http://localhost:5001
MLFLOW_EXPERIMENT=insar_assignment
```

## Hinweise
- OSM wird standardmaessig via Overpass geladen und als GeoParquet gespeichert.
- MBTiles werden direkt aus GeoJSONL via Tippecanoe erzeugt.
- Filter und Layer-Toggles wirken ausschliesslich auf die InSAR-Punktlayer.
- Falls `localhost` unerwartete 404 liefert, nutze `127.0.0.1` in den Frontend-Env-Variablen.

## Troubleshooting

OS-Mismatch bei `npm install` (Rollup optional deps):
```bash
rm -rf frontend/node_modules frontend/package-lock.json
npm install
```

MultiPolygon-Fehler beim Laden von OSM/GBA:
```sql
ALTER TABLE osm_buildings ALTER COLUMN geom TYPE geometry(MultiPolygon,4326) USING ST_Multi(geom);
ALTER TABLE gba_buildings ALTER COLUMN geom TYPE geometry(MultiPolygon,4326) USING ST_Multi(geom);
TRUNCATE osm_buildings;
```
Dann OSM neu laden:
```bash
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar --skip-schema --only osm
```
