# Supervisor Prompt fuer die Phase-5-Data-Correctness-Session

Der folgende Prompt ist fuer eine eigenstaendige Phase-5-Session gedacht. Er ist auf
`docs/pipelines/anomaly_local_v1/phase5_data_correctness_plan.md`, den abgeschlossenen
`P4`-Stand und den aktuellen Code abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/phase5_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-5-Data-Correctness-Session von
`anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P5` aus
`docs/pipelines/anomaly_local_v1/phase5_data_correctness_plan.md` autonom um.

Diese Session ist ein Audit. Es geht um sorgfaeltige Pruefung, nicht um stille Reparatur.
Wenn harte Fehler gefunden werden, dokumentiere sie reproduzierbar und stoppe vor
Code-/Datenmutation, ausser der User gibt danach explizit ein neues Fix-Gate frei.

Behandle den Plan als Scheduler-Eingabe:

`Plan -> Phase -> Welle -> Ticket`

Arbeitsmodus:

- Nutze Subagents aktiv und strikt; halte den Supervisor-Kontext klein.
- Delegiere alle Ticket-Arbeiten an Subagents.
- Der Supervisor ist Scheduler, Gatekeeper und Integrator, nicht der primaere Implementierer.
- Starte alle delegierten Agents mit `gpt-5.4` und reasoning effort `xhigh`.
- Keine Mini-, Nano- oder sonstigen kleineren Modelle.
- Verlange von jedem delegierten Agent, dass er seine Ticket-DoD selbst prueft,
  bei Bedarf selbst nachbessert und dann mit klarem Ticket-Status zurueckmeldet.
- Integriere nur Tickets mit Status `green`.
- Bei `red` oder `inconclusive` dokumentiere den Blocker und entscheide gemaess Plan,
  ob parallele Audit-Arbeit weiterlaufen darf.
- Starte keine `E0`-/MatchSAR-Arbeit, keine Terrain-/Aspect-Integration und keine
  Scoring-/UI-Featurephase ausserhalb von `P5`.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase5_data_correctness_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
- `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_plan.md`
- `docs/pipelines/anomaly_local_v1/terrain_decision.md`
- `docs/pipelines/anomaly_local_v1/aspect_decision.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/neighbourhood_design.md`
- `pipeline/prepare_insar.py`
- `pipeline/prepare_buildings.py`
- `pipeline/link_points_buildings.py`
- `pipeline/load_postgis.py`
- `pipeline/export_geojsonl.py`
- `pipeline/build_tiles.sh`
- `pipeline/prepare_terrain.py`
- `pipeline/load_terrain_context.py`
- `backend/sql/schema.sql`
- `backend/sql/migrations/003_terrain_context.sql`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/routers/api.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/LayerPanel.tsx`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/PipelinePanel.tsx`
- `frontend/src/hooks/useApi.ts`
- `frontend/src/lib/cameraModes.ts`
- `frontend/src/lib/pointStyling.ts`
- `frontend/src/lib/store.ts`

Verbindliche P5-Ziele:

1. Pruefe Koordinaten und Layer-Ausrichtung fuer InSAR-Punkte, GBA, OSM, Terrain,
   Tiles, API und ML-Visualisierungen.
2. Pruefe Track `44`/`95`, `LOS`, Satelliten-Blickrichtung und UI-Kameramodi.
3. Pruefe, ob die laufende DB korrekt mit den Parquet-Artefakten uebereinstimmt.
4. Pruefe adaptive Gebaeude-Kandidatenflaechen fachlich und technisch:
   Formel, Track-Richtung, API-Geometrie, UI-Filter.
5. Pruefe UI-End-to-End mit echten Services und Screenshots.
6. Nutze Mirabell, Moosstrasse und Osthang-Stressbereich als Pflicht-AOI-Basis.
7. Dokumentiere jeden Befund als `green`, `red` oder `inconclusive`; rate nicht.

Verbindliche Nicht-Ziele:

- Keine Datenregeneration.
- Kein DB-Reload.
- Keine Code-, Schema-, UI- oder Scoring-Fixes.
- Keine P4-Aspect-Wiederaufnahme.
- Keine Terrain-Upgrade-Arbeit.

Umgebungshinweise:

- Docker-Services koennen mit `docker compose ps` geprueft werden.
- Lokales `psql` war im Vorcheck nicht verfuegbar; nutze fuer SQL:
  `docker compose exec -T db psql -U insar -d insar -c "<SQL>"`.
- Fuer GeoPandas/Parquet-Pruefungen nutze bevorzugt:
  `backend/.venv-wsl/bin/python`.
- `backend/.venv/bin/python` hatte beim Vorcheck kein `geopandas`.

Bekannte Vorbefunde, die verifiziert werden muessen:

- Parquet:
  - `insar_points_t44.parquet`: `247388`, `track=44`, `los=A`, CRS `EPSG:4326`
  - `insar_points_t95.parquet`: `303376`, `track=95`, `los=D`, CRS `EPSG:4326`
  - `gba_buildings.parquet`: `57489`, CRS `EPSG:4326`
  - `osm_buildings.parquet`: `49240`, CRS `EPSG:4326`
  - `insar_to_gba.parquet`: `483015`
  - `insar_to_osm.parquet`: `481423`
  - `insar_point_terrain.parquet`: `550764`, `terrain_source=srtm`
  - `building_terrain_context.parquet`: `106729`, `terrain_source=srtm`
- Laufende DB:
  - `insar_points`: `550764`
  - `gba_buildings`: `57489`
  - `osm_buildings`: `49240`
  - `insar_point_terrain`: `550764`
  - `building_terrain_context`: `106729`
  - `insar_to_gba`: `0`
  - `insar_to_osm`: `0`
- Der Link-Tabellen-Unterschied ist ein Pflicht-Befund. Klaere, ob das fuer aktuelle
  UI/API/Pipeline relevant ist oder nur Legacy-Linktabellen betrifft.

Ticket-Reihenfolge:

1. `P5-W1-T1`: Datenlinie, CRS-Vertrag und Artefakt-Baseline
2. `P5-W1-T2`: Live-DB-Integritaet und Parquet-vs-PostGIS-Abgleich
3. `P5-W2-T1`: Raeumliche Layer-Ausrichtung in AOIs
4. `P5-W2-T2`: Track-/LOS- und Satelliten-Blickrichtungs-Audit
5. `P5-W3-T1`: Adaptive Gebaeude-Buffer und Candidate-Areas
6. `P5-W3-T2`: UI-End-to-End-Anzeige
7. `P5-W4-T1`: Abschlussbericht, Befund-Gates und Folgeplan

Wellenregeln:

- `P5-W1-T1` und `P5-W1-T2` duerfen parallel laufen.
- `P5-W2-*` startet erst, wenn beide W1-Tickets gruen oder bewusst als
  `inconclusive` mit dokumentierter Annahme integriert sind.
- `P5-W3-*` startet erst nach W2.
- `P5-W4-T1` startet erst nach W3.
- Wenn ein Ticket einen harten Datenfehler findet, darf der Supervisor andere
  unabhaengige Audit-Tickets weiterlaufen lassen, aber der Abschlussstatus darf nicht
  `green` sein, solange der Fehler nicht eingeordnet ist.

Rueckgabeformat fuer jeden Agent:

- Ticket-Status: `green`, `red` oder `inconclusive`
- Geaenderte Dateien
- DoD-Evidenz
- verwendete Kommandos/SQL/API-Endpunkte
- lokale Verifikation
- offene Risiken
- klare Bewertung: Daten korrekt / Fehler / nicht entscheidbar

Erwartete konkrete Umsetzung:

- Erstelle `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`.
- Optional erstelle kleine Audit-Artefakte unter
  `docs/pipelines/anomaly_local_v1/artifacts/phase5_*`, z. B. Screenshots oder
  kleine GeoJSON-Auszuege.
- Aktualisiere `docs/pipelines/anomaly_local_v1/phase5_data_correctness_plan.md`
  am Ende mit Status und Ticket-Ergebnis.
- Aktualisiere `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md` nur, wenn
  P5 als neue Planphase sichtbar fortgeschrieben werden soll.
- Fuehre keine Code- oder Datenmutation aus.

Mindestpruefungen:

- `git status --short --branch`
- `docker compose ps`
- Parquet-Zaehler/CRS/Bounds mit `backend/.venv-wsl/bin/python`
- DB-Zaehler/SRID/Bounds mit `docker compose exec -T db psql ...`
- API-Proben fuer Point Detail, Building Detail, ML Point, ML Building,
  ML Building Context und ML Tiles
- falls UI geprueft wird:
  - Backend starten, falls nicht aktiv
  - Frontend starten
  - Playwright-Screenshots fuer Mirabell, Moosstrasse und Osthang
  - Layer-/Kamera-/Trackfilter-Zustaende dokumentieren
- `git diff --check`

Abschlusskriterium:

Die Session endet erst, wenn `P5` einen integrierten Auditbericht hat oder ein harter
Blocker dokumentiert ist. Bei erfolgreicher Audit-Durchfuehrung steht nicht automatisch
"alles korrekt", sondern ein differenzierter Status je Pruefachse.
```

## Erwartung an den Supervisor

Der Supervisor soll:

- den Phase-5-Plan als Zustandsmaschine lesen,
- parallele Audit-Tickets sauber delegieren,
- keine Daten oder Code stillschweigend veraendern,
- die laufende DB gegen Parquet und UI gegen API/DB pruefen lassen,
- Track-/LOS-Blickrichtung nicht raten,
- adaptive Buffer in Backend, API und UI gegen dieselbe Formel pruefen,
- Pflicht-AOIs als Gate verwenden,
- alle Befunde in einem klaren Bericht integrieren,
- und vor Fix- oder Folgephasen stoppen.
