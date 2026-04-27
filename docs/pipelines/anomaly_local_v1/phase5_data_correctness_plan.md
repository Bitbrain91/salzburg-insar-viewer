# `anomaly_local_v1` Phase-5 Data Correctness and UI Alignment Audit

Stand: 2026-04-26
Status: audit-completed with red/inconclusive findings; not data-correct green

## Ziel

Phase 5 prueft end-to-end, ob Daten, Geometrien, Track-Semantik, adaptive
Gebaeude-Kandidatenflaechen und UI-Anzeige wirklich zusammenpassen.

Diese Phase ist bewusst zuerst ein Audit, keine Feature- oder Scoring-Iteration.
Sie soll belastbar beantworten:

- Liegen InSAR-Punkte, GBA-Gebaeude, OSM-Gebaeude, Terrain-Kontext, Tiles und
  ML-Visualisierungen im selben raeumlichen Bezug?
- Sind Track `44`/`95`, `LOS`, Satelliten-Blickrichtung und UI-Kameramodi fachlich
  konsistent?
- Stimmen Parquet-Artefakte, PostGIS-Tabellen, API-Antworten und UI-Anzeige ueberein?
- Werden die adaptiven Gebaeude-Kandidatenflaechen nach derselben Formel berechnet
  und korrekt angezeigt?

## Ausgangsbasis

Verbindliche Basis:

- `P0`, `P1`, `P2`, `P2R`, `P3` und `P4` stehen auf `green`.
- `P4` hat `Aspect = defer` entschieden; keine neue Aspect-Logik ist aktiv.
- Pflicht-AOIs bleiben:
  - Mirabell: `[13.04027, 47.80375, 13.04387, 47.80735]`
  - Moosstrasse: `[13.02714, 47.79189, 13.03074, 47.79549]`
  - Osthang-Stressbereich: `[13.0492, 47.8036, 13.0528, 47.8054]`
- Aktuelle P3-Referenz-Runs:
  - Mirabell: `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7`
  - Moosstrasse: `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5`
  - Osthang-Stressbereich: `71770d85-ec8c-4354-840a-545fa0b7c757`

Initiale lokale Vorbefunde vom 2026-04-26:

- Docker-Services `db` und `mlflow` laufen.
- `psql` ist lokal nicht im Shell-Pfad; DB-Pruefungen sollen ueber
  `docker compose exec -T db psql ...` oder Python/SQLAlchemy laufen.
- `backend/.venv-wsl/bin/python` hat die GeoPandas-Umgebung; `backend/.venv/bin/python`
  hatte beim Vorcheck kein `geopandas`.
- Parquet-Baseline:
  - `insar_points_t44.parquet`: `247388` Punkte, CRS `EPSG:4326`, `track=44`, `los=A`
  - `insar_points_t95.parquet`: `303376` Punkte, CRS `EPSG:4326`, `track=95`, `los=D`
  - `gba_buildings.parquet`: `57489` Gebaeude, CRS `EPSG:4326`
  - `osm_buildings.parquet`: `49240` Gebaeude, CRS `EPSG:4326`
  - `insar_to_gba.parquet`: `483015` Links (`182847 within`, `300168 nearest`)
  - `insar_to_osm.parquet`: `481423` Links (`181973 within`, `299450 nearest`)
  - `insar_point_terrain.parquet`: `550764` Zeilen, `terrain_source=srtm`
  - `building_terrain_context.parquet`: `106729` Zeilen, `terrain_source=srtm`
- Laufende DB-Baseline:
  - `insar_points`: `550764`
  - `gba_buildings`: `57489`
  - `osm_buildings`: `49240`
  - `insar_point_terrain`: `550764`
  - `building_terrain_context`: `106729`
  - `insar_to_gba`: `0`
  - `insar_to_osm`: `0`
- DB-Geometrien fuer `insar_points`, `gba_buildings`, `osm_buildings` sind laut
  `geometry_columns` in `SRID 4326`.

Der Link-Tabellen-Unterschied ist ein Pflicht-Pruefpunkt, aber noch keine finale
Fehlerbewertung: `anomaly_local_v1` berechnet seine Zuordnung derzeit per Live-Query
gegen `gba_buildings`, waehrend die alten Link-Tabellen moeglicherweise nur fuer
Legacy-/Detail-Endpunkte relevant sind.

## Nicht-Ziele

- Keine neue Terrain- oder Aspect-Integration.
- Keine Scoring-, Label- oder Reliability-Aenderung.
- Keine Datenregeneration und kein Reload in PostGIS ohne separates User-Gate.
- Keine stillschweigende Reparatur von DB-Inhalten.
- Keine UI-Refactors; hoechstens Befunde und reproduzierbare Screenshots.
- Keine externe MatchSAR-/AUGMENTERRA-Arbeit.

## Phasen-DoD

Phase 5 ist `green`, wenn:

- ein Audit-Bericht `phase5_data_correctness_report.md` existiert,
- alle fuenf Pruefachsen mit Evidenz bewertet sind,
- kritische Abweichungen als `green`, `red` oder `inconclusive` eingeordnet sind,
- alle Pflicht-AOIs mindestens einmal in der Audit-Evidenz vorkommen,
- UI-Screenshots oder klar dokumentierte UI-Beobachtungen vorliegen,
- keine Daten- oder Codeaenderung ohne dokumentiertes Follow-up-Gate erfolgt ist.

Wenn ein harter Fehler gefunden wird, ist `P5` nicht automatisch fehlgeschlagen:
Die Phase ist dann erfolgreich als Audit, aber der Befundstatus lautet `red`.

## Wellen

### Welle P5-W1

#### Ticket P5-W1-T1: Datenlinie, CRS-Vertrag und Artefakt-Baseline

- Ziel: Den raeumlichen Datenvertrag von Raw/Parquet bis Tiles und API exakt
  dokumentieren.
- Artefakt:
  - Abschnitt in `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- Abhaengigkeiten: keine
- DoD:
  - CRS fuer InSAR, GBA, OSM, Terrain-Raster, MBTiles und PostGIS ist dokumentiert.
  - Parquet-Zaehler, Bounds, Track-/LOS-Verteilung und Link-Zaehler sind geprueft.
  - Transformationspunkte `EPSG:4326`, `EPSG:32633`, `EPSG:25833`, `EPSG:3857`
    sind anhand der Dateien benannt.
  - bekannte offene Baseline-Fragen sind notiert.
- Kritischer Pfad: ja
- Status: green

#### Ticket P5-W1-T2: Live-DB-Integritaet und Parquet-vs-PostGIS-Abgleich

- Ziel: Pruefen, ob die laufende DB dem erwarteten Artefaktstand entspricht.
- Artefakt:
  - Abschnitt in `phase5_data_correctness_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- Abhaengigkeiten: keine
- DoD:
  - Tabellenzaehler fuer Punkte, Gebaeude, Terrain, Timeseries, Links und ML-Tabellen sind erfasst.
  - SRIDs, Bounds und offensichtliche Null-/Duplikatprobleme sind geprueft.
  - `insar_to_gba`/`insar_to_osm` sind explizit bewertet: leer, absichtlich leer,
    veraltet oder echter Load-Fehler.
  - DB-Checks sind read-only.
- Kritischer Pfad: ja
- Status: red

### Welle P5-W2

#### Ticket P5-W2-T1: Raeumliche Layer-Ausrichtung in AOIs

- Ziel: InSAR, GBA, OSM, Terrain und ML-Tiles in den Pflicht-AOIs raeumlich
  gegeneinander pruefen.
- Artefakt:
  - Abschnitt in `phase5_data_correctness_report.md`
  - optional kleine Audit-GeoJSON/Screenshot-Artefakte unter
    `docs/pipelines/anomaly_local_v1/artifacts/`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
  - optional `docs/pipelines/anomaly_local_v1/artifacts/phase5_*`
- Abhaengigkeiten:
  - hard: `P5-W1-T1`
  - hard: `P5-W1-T2`
- DoD:
  - Mirabell, Moosstrasse und Osthang sind geprueft.
  - Distanz- und Overlay-Checks zeigen, ob Punkte plausibel auf/nahe Gebaeuden liegen.
  - GBA-vs-OSM-Versatz ist quantifiziert oder als visuell unauffaellig belegt.
  - MVT/API-Geometrien stimmen mit DB-Geometrien ueberein.
- Kritischer Pfad: ja
- Status: green

#### Ticket P5-W2-T2: Track-/LOS- und Satelliten-Blickrichtungs-Audit

- Ziel: Track `44` und `95`, `LOS`, Kameramodi und richtungsabhaengige
  Geometrie fachlich pruefen.
- Artefakt:
  - Abschnitt in `phase5_data_correctness_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- Abhaengigkeiten:
  - hard: `P5-W1-T1`
  - hard: `P5-W1-T2`
- DoD:
  - Track-/LOS-Verteilung ist aus Parquet und DB belegt.
  - UI-Labels `Track 44 (Ascending)` und `Track 95 (Descending)` sind gegen die
    Daten geprueft.
  - Kamerapresets und Overlaytexte `Blick nach Osten/Westen` sind gegen Code und
    Datenquelle bewertet.
  - Falls keine autoritative Quelle fuer echte Satelliten-Blickrichtung im Repo
    vorhanden ist, wird der Befund `inconclusive` statt geraten.
- Kritischer Pfad: ja
- Status: inconclusive

### Welle P5-W3

#### Ticket P5-W3-T1: Adaptive Gebaeude-Buffer und Candidate-Areas

- Ziel: Pruefen, ob Backend-Formel, API-Kontext und UI-Kandidatenflaechen
  fachlich und technisch konsistent sind.
- Artefakt:
  - Abschnitt in `phase5_data_correctness_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
  - optional `docs/pipelines/anomaly_local_v1/artifacts/phase5_*`
- Abhaengigkeiten:
  - hard: `P5-W2-T1`
  - hard: `P5-W2-T2`
- DoD:
  - Formel `range_offset = clamp(height * tan(incidence_angle) * multiplier,
    min_buffer_m, max_buffer_m)` ist gegen Code, API und Beispielgebaeude geprueft.
  - Track-Signatur fuer Candidate-Verschiebung ist geprueft:
    Pipeline: `track 44`/`LOS A` nach negativem UTM-X, sonst positiv;
    Kontext-API: `track 44` negativ, `track 95` positiv.
  - Track-Filter `ASC + DSC`, `ASC only`, `DSC only` zeigt die passenden
    Kandidatenflaechen.
  - Mindestens je ein Gebaeude in Mirabell, Moosstrasse und Osthang ist geprueft.
- Kritischer Pfad: ja
- Status: green

#### Ticket P5-W3-T2: UI-End-to-End-Anzeige

- Ziel: Die Browser-UI mit echten Services pruefen.
- Artefakt:
  - Abschnitt in `phase5_data_correctness_report.md`
  - Screenshots unter `docs/pipelines/anomaly_local_v1/artifacts/phase5_*`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_*`
- Abhaengigkeiten:
  - hard: `P5-W2-T1`
  - hard: `P5-W2-T2`
- DoD:
  - Frontend und Backend laufen lokal.
  - Layer-Toggles fuer InSAR 44/95, GBA, OSM, Relief und ML werden geprueft.
  - Point- und Building-Inspector zeigen dieselben IDs/Tracks/Werte wie API/DB.
  - Satelliten-Kameramodi sind visuell geprueft.
  - Building Cluster View zeigt Kandidatenflaechen, Cluster-Huellen und Punktrollen
    korrekt oder dokumentiert Abweichungen.
- Kritischer Pfad: ja
- Status: red

### Welle P5-W4

#### Ticket P5-W4-T1: Abschlussbericht, Befund-Gates und Folgeplan

- Ziel: Alle Rueckgaben integrieren und einen klaren Auditstatus liefern.
- Artefakt:
  - finalisiertes `phase5_data_correctness_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
  - optional Aktualisierung dieses Plans
- Abhaengigkeiten:
  - hard: `P5-W3-T1`
  - hard: `P5-W3-T2`
- DoD:
  - Jede Pruefachse hat Status `green`, `red` oder `inconclusive`.
  - Kritische Bugs sind mit Reproduktion, betroffenen Dateien/Tabellen und
    empfohlenem Fix-Ticket dokumentiert.
  - Wenn alles passt, ist explizit dokumentiert, welche Evidenz das stuetzt.
  - Falls Fixes noetig sind, wird eine neue Folgephase vorgeschlagen; keine
    stillschweigende Reparatur in P5.
- Kritischer Pfad: ja
- Status: green

## Supervisor-Schnitt

Single-File-Entry fuer die naechste Supervisor-Session:

- `docs/pipelines/anomaly_local_v1/phase5_supervisor_prompt.md`

`P5` ist audit-completed. Ergebnis: nicht data-correct green; integrierte
Ticketstaende `W1-T1 green`, `W1-T2 red`, `W2-T1 green`, `W2-T2 inconclusive`,
`W3-T1 green`, `W3-T2 red`, `W4-T1 green`. Weitere Arbeit gehoert in separate
Fix-/Folgephasen, nicht mehr in dieses Audit.

Nachgelagerte Bereinigung:

- Der statische Linktabellenpfad `insar_to_gba` / `insar_to_osm` wurde nicht
  reaktiviert, sondern aus produktiver API, UI, Schema, Loader und lokalen
  Link-Parquet-Artefakten entfernt.
- Punkt-Gebaeude-Zuordnung bleibt fachlich Aufgabe der dynamischen ML-Pipeline.
