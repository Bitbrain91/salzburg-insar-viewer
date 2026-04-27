# P5-W1-T2 Audit: Live-DB-Integritaet und Parquet-vs-PostGIS-Abgleich

- Ticket-Status: `red`
- Bewertung: `Fehler`
- Geaenderte Dateien: `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W1-T2.md`

## Scope

Read-only Audit fuer die laufende PostGIS-DB gegen die vorhandenen Parquet-Artefakte.
Keine Code-, Schema- oder Datenmutation. Kein DB-Reload. Keine Regeneration.

## Kurzfazit

Die Live-DB stimmt fuer Punkte, Gebaeude, Terrain und Timeseries weitgehend exakt mit
dem aktuellen Parquet-Stand ueberein. Der klare harte Fehler liegt bei den Link-Tabellen:

- `insar_to_gba.parquet`: `483015` Zeilen, DB `insar_to_gba`: `0`
- `insar_to_osm.parquet`: `481423` Zeilen, DB `insar_to_osm`: `0`

Das ist nicht nur ein Legacy-Artefakt. Die generische API verwendet diese Tabellen
weiterhin direkt in [backend/app/routers/api.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/routers/api.py:88)
und [backend/app/routers/api.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/routers/api.py:293).
Die `anomaly_local_v1`-ML-Pipeline nutzt dagegen Live-Spatial-Queries gegen
`gba_buildings` und ist davon nicht primaer blockiert
([backend/app/ml/pipelines/anomaly_local_v1.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/ml/pipelines/anomaly_local_v1.py:193)).

Zusatzbefunde:

- `osm_buildings` hat `114` invalide Geometrien; derselbe Befund liegt bereits im
  Parquet vor, also kein reiner DB-Load-Fehler.
- `building_terrain_context` fuer `gba` hat `2320` Zeilen mit `NULL` in
  `terrain_elevation_mean_m` und `slope_mean_deg`; derselbe Befund liegt bereits im
  Parquet vor.

## DoD-Evidenz

### 1. Tabellenzaehler: Parquet vs DB

| Datensatz | Parquet | Live-DB | Bewertung |
| --- | ---: | ---: | --- |
| `insar_points_t44` | `247388` | `247388` (`track=44`, `los=A`) | ok |
| `insar_points_t95` | `303376` | `303376` (`track=95`, `los=D`) | ok |
| `insar_timeseries_t44` | `22264920` | `22264920` | ok |
| `insar_timeseries_t95` | `26697088` | `26697088` | ok |
| `insar_amplitude_timeseries_t44` | `30485520` | `30485520` | ok |
| `insar_amplitude_timeseries_t95` | `29611736` | `29611736` | ok |
| `gba_buildings` | `57489` | `57489` | ok |
| `osm_buildings` | `49240` | `49240` | ok |
| `insar_point_terrain` | `550764` | `550764` | ok |
| `building_terrain_context` | `106729` | `106729` | ok |
| `insar_to_gba` | `483015` | `0` | **Fehler** |
| `insar_to_osm` | `481423` | `0` | **Fehler** |

ML-Tabellen:

- `ml_runs`: `13`
- `ml_point_results`: `17502`
- `ml_run_metrics`: `221`
- `ml_building_colors`: `1071`
- alle `13` Runs: `pipeline=anomaly_local_v1`, `status=succeeded`, `source=gba`

### 2. SRID- und Bounds-Pruefung

DB-Geometrietabellen:

- `insar_points`: `SRID 4326`
- `gba_buildings`: `SRID 4326`
- `osm_buildings`: `SRID 4326`

Die Bounds stimmen fuer die geprueften GeoParquet-Dateien exakt mit der laufenden DB
ueberein:

- `insar_points_t44`: `[12.985767, 47.751343, 13.123573, 47.853511]`
- `insar_points_t95`: `[12.985729, 47.751379, 13.119458, 47.853543]`
- `gba_buildings`: `[12.950006, 47.750000, 13.149997, 47.869998]`
- `osm_buildings`: `[12.948391, 47.749585, 13.150468, 47.850321]`

### 3. Nulls, Duplikate, offensichtliche Integritaetsprobleme

Saubere Kernschluessel / Geometrien:

- `insar_points`: keine `NULL` in `code`, `track`, `los`, `geom`; keine PK-Duplikate;
  keine invaliden Geometrien
- `gba_buildings`: keine `NULL` in `gba_id`, `geom`; keine PK-Duplikate; keine
  invaliden Geometrien
- `osm_buildings`: keine `NULL` in `osm_id`, `geom`; keine PK-Duplikate; aber
  `114` invalide Geometrien
- `insar_point_terrain`: keine PK-Duplikate; keine `NULL` in
  `terrain_elevation_m`, `slope_deg`, `aspect_deg`
- `building_terrain_context`: keine PK-Duplikate

Parquet-konsistente, aber fachlich relevante Auffaelligkeiten:

- `osm_buildings`: `114` invalide Geometrien sowohl im Parquet als auch in der DB.
  Beispielgruende aus PostGIS: `Nested shells`, vereinzelt `Self-intersection`.
- `building_terrain_context` (`gba`): `2320` Zeilen mit `NULL` in
  `terrain_elevation_mean_m` und `slope_mean_deg`, im Parquet identisch.

### 4. Timeseries- und Terrain-Befunde

DB-Timeseries nach Track:

- `insar_timeseries`, `track=44`: `22264920`, Datum `2022-04-05` bis `2025-03-20`
- `insar_timeseries`, `track=95`: `26697088`, Datum `2022-04-09` bis `2025-03-24`
- `insar_amplitude_timeseries`, `track=44`: `30485520`, Datum `2022-04-05` bis `2025-03-20`
- `insar_amplitude_timeseries`, `track=95`: `29611736`, Datum `2022-04-09` bis `2025-03-24`

Terrain:

- `insar_point_terrain`: `550764`, `terrain_source=srtm`
- `building_terrain_context`: `57489` `gba:srtm` + `49240` `osm:srtm`

### 5. Bewertung `insar_to_gba` / `insar_to_osm`

Befund: **aktueller Load/API-Fehler, nicht nur Legacy-only**.

Begruendung:

1. Die Parquet-Artefakte sind befuellt:
   - `insar_to_gba.parquet`: `483015`
   - `insar_to_osm.parquet`: `481423`
2. Der Loader kann diese Tabellen explizit laden
   ([pipeline/load_postgis.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/pipeline/load_postgis.py:165)).
3. Das Schema droppt die Tabellen bei Schema-Neuaufbau
   ([backend/sql/schema.sql](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/sql/schema.sql:3)).
4. Die generische API liest diese Tabellen weiter direkt:
   - Point Detail: [backend/app/routers/api.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/routers/api.py:113)
   - Building Points: [backend/app/routers/api.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/routers/api.py:299)
5. Die `anomaly_local_v1`-ML-Pipeline nutzt stattdessen Live-GBA-Spatial-Queries
   und ist daher von diesem konkreten Defekt nicht primaer abhaengig
   ([backend/app/ml/pipelines/anomaly_local_v1.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/ml/pipelines/anomaly_local_v1.py:193)).

Konkrete Laufzeit-Evidenz:

- `GET /api/points/MX6399F01?track=95` liefert `gba_id=null`, `osm_id=null`
- dieselbe Punkt-ID hat laut Parquet je `1` Link:
  - `insar_to_gba.parquet`: `gba_id=156569722`, `distance_m=4.753286080945574`,
    `match_method=nearest`
  - `insar_to_osm.parquet`: `osm_id=156569722`, `distance_m=4.753286080945574`,
    `match_method=nearest`
- `GET /api/buildings/gba/552204886` liefert ein gueltiges Gebaeude
- `GET /api/buildings/gba/552204886/points` liefert `count=0`
- dasselbe Gebaeude ist im Parquet stark belegt:
  `insar_to_gba.parquet` enthaelt `1478` Links fuer `gba_id=552204886`

Damit ist die leere DB-Linklage nicht als harmless/legacy-only vertretbar. Sie ist
eine aktuelle Abweichung zwischen Live-DB und Artefaktstand mit sichtbarer API-Wirkung.

## Verwendete Kommandos / SQL / API

Relevante Shell-Kommandos:

```bash
git status --short --branch
docker compose ps
```

Relevante DB-Checks (read-only):

```bash
docker compose exec -T db psql -U insar -d insar -c "<row counts>"
docker compose exec -T db psql -U insar -d insar -c "<SRID / geometry_columns / bounds>"
docker compose exec -T db psql -U insar -d insar -c "<null / duplicate / validity checks>"
docker compose exec -T db psql -U insar -d insar -c "<ML table counts and orphan checks>"
docker compose exec -T db psql -U insar -d insar -c "<points_without_gba_link / points_without_osm_link>"
```

Parquet-Checks:

```bash
backend/.venv-wsl/bin/python - <<'PY'
# GeoParquet bounds/CRS, Parquet row counts, link distributions,
# invalid geometry counts, terrain null counts, sample link lookups
PY
```

Runtime-API-Proben:

```bash
curl http://127.0.0.1:8000/api/health
curl "http://127.0.0.1:8000/api/points/MX6399F01?track=95"
curl http://127.0.0.1:8000/api/buildings/gba/552204886
curl http://127.0.0.1:8000/api/buildings/gba/552204886/points
```

## Lokale Verifikation

- `docker compose ps`: `db` und `mlflow` liefen
- temporaerer lokaler Backend-Start fuer API-Proben: erfolgreich
- `GET /api/health`: `{"status":"ok"}`
- `git status --short --branch` vor dem Schreiben:
  - vorhandene Fremdaenderungen respektiert
  - kein Ruecksetzen / Ueberschreiben
- ein frueher schwerer SQL-Probeversuch auf sehr grosse Timeseries-Joins lief in
  Shared-Memory-Grenzen (`No space left on device`); die Audit-Bewertung stuetzt sich
  daher auf die erfolgreich gelaufenen Ersatzabfragen mit denselben Kernsignalen
- Abschlusspruefung per `git diff --check`: keine Whitespace-Fehler im Owned-Delta;
  vorhandene CRLF-Warnung zu `phase2_execution_plan.md` ist fremdbestehend und
  ausserhalb des Ticket-Write-Sets

## Offene Risiken

- Die genaue operative Ursache fuer die leeren Link-Tabellen ist per Read-only-Audit
  nicht final beweisbar. Plausibel sind:
  - Schema-Neuaufbau mit anschliessend unvollstaendigem Reload
  - gezielter Reload ohne `--only links`
- Die `114` invaliden `osm_buildings`-Geometrien koennen spaetere Spatial-Operationen
  oder UI-Randfaelle beeinflussen, auch wenn sie hier kein reiner DB-Load-Fehler sind.
- Die `2320` `gba`-Terrain-NULLs sind Parquet-konsistent, aber fachlich unvollstaendig
  und sollten in einer Folgepruefung eingeordnet werden.

## Endbewertung

`Fehler`

Praezise Einordnung:

- `Daten korrekt` fuer Punkte, Gebaeudezaehler, Terrainzaehler, Timeserieszaehler,
  SRID/BBox-Paritaet und ML-Tabellenkonsistenz
- `Fehler` fuer die Live-DB-Linktabellen `insar_to_gba` / `insar_to_osm`, weil sie leer
  sind, obwohl die Parquet-Artefakte befuellt sind und die aktuelle generische API sie
  weiter benutzt
- `nicht entscheidbar` nur fuer die exakte historische Ursache der leeren Linktabellen,
  nicht fuer deren aktuellen Defektstatus
