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
- `data/Daten/ASC_T44_AMP.gpkg` (Amplitude-Statistiken Track 44)
- `data/Daten/ASC_T95_AMP.gpkg` (Amplitude-Statistiken Track 95)

Aufbereitung:
- `pipeline/prepare_insar.py` liest die GPKG-Layer, standardisiert Spalten,
  berechnet `amp_mean`/`amp_std` und schreibt:
  - `data/parquet/insar_points_t44.parquet`
  - `data/parquet/insar_points_t95.parquet`
  - `data/parquet/insar_timeseries_t44.parquet`
  - `data/parquet/insar_timeseries_t95.parquet`

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
  - Tabellen: `insar_points`, `insar_timeseries`, `gba_buildings`, `osm_buildings`,
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
- Python 3.10+
- Node.js 18+ (Windows-Nutzung empfohlen, um OS-Mismatch zu vermeiden)
- Docker Desktop

### 1) PostGIS starten
```bash
cd insar_viewer_app
docker compose up -d
```

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

## Environment-Variablen
Frontend (`frontend/.env`):
```
VITE_API_URL=http://localhost:8000
VITE_TILES_URL=http://localhost:8000
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
```

## Hinweise
- OSM wird standardmaessig via Overpass geladen und als GeoParquet gespeichert.
- MBTiles werden direkt aus GeoJSONL via Tippecanoe erzeugt.
- Filter und Layer-Toggles wirken ausschliesslich auf die InSAR-Punktlayer.

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
