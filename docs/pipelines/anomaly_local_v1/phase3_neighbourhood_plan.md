# `anomaly_local_v1` Phase-3 Neighbourhood Context Plan

Stand: 2026-04-25
Status: green

## Ziel

Phase 3 fuegt einen zweiten Nachbarschafts-Pass nach den stabilen `P2R`-Rollups hinzu.
Der Pass soll zwei fachlich unterschiedliche Faelle maschinenlesbar trennen:

- moegliche Punkt-Fehlzuordnung zu einem Nachbargebaeude
- echte Nachbarschafts- oder Block-Events, bei denen ein Signal in mehreren nahen Gebaeuden konsistent auftritt

Das User-Gate fuer `P3-W1` ist erfuellt und `P3` ist abgeschlossen.
Diese Datei beschreibt den eingefrorenen Scope und den finalen Ticketstatus.

## Ausgangsbasis

Verbindliche Basis:

- `P0`, `P1`, `P2` und `P2R` stehen auf `green`.
- Die Gebaeude-/Cluster-Semantik aus `P2R` bleibt der erste Pass.
- `P3` nutzt die eingefrorenen `building_rollup`- und `cluster_rollup`-Ergebnisse als Input.
- `main_cluster`-Auswahl, `differential_motion_flag` und Reliability-Retuning werden in `P3`
  nicht stillschweigend neu kalibriert.

Aktuelle Pflicht-Runs fuer die Abschlussverifikation:

- Mirabell: `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7`
- Moosstrasse: `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5`
- Osthang-Stressbereich: `71770d85-ec8c-4354-840a-545fa0b7c757`

## Nicht-Ziele

Ausdruecklich nicht Teil von `P3`:

- `P4` Terrain-/Aspect-Logik
- globale Neugestaltung von Assignment, Buffering oder Clusterung
- direkte Punkt-Umbuchung auf Nachbargebaeude
- neue DB-Tabellen, solange die bestehenden Run-/Point-Ergebnisse reichen
- Rueckkopplung von Nachbarschaftsfeldern in `main_cluster`, `differential_motion_flag`
  oder `building_reliability_score`
- grossflaechiger Graph- oder ML-Modell-Umbau

## Design Defaults

Diese Defaults gelten, bis `P3-W1-T1` sie im Design-Dokument begruendet aendert:

- Nachbar-Kandidaten werden innerhalb desselben Runs und Tracks gesucht.
- Die primaere Kandidatensuche ist metrische Naehe zwischen Gebaeudegeometrien oder
  Gebaeudezentroiden.
- Default-Radius: `25 m`.
- Maximal beruecksichtigte Nachbarn pro Gebaeude: `8`.
- Der zweite Pass laeuft nach dem ersten vollstaendigen Building-/Cluster-Rollup.
- Eigene Cluster-Fits und Nachbar-Cluster-Fits werden diagnostisch verglichen, nicht als
  Reassignment ausgefuehrt.
- Event-Konsistenz wird getrennt von Fehlzuordnung bewertet.

## Feldvertrag

`P3` soll einen knappen, maschinenlesbaren Vertrag liefern. Die finale Feldplatzierung wird
in `P3-W1-T1` fixiert, bevorzugt aber bestehende JSON-/Meta-Strukturen statt neuer Tabellen.

### Punkt- oder Record-Level

Empfohlener Container: `neighbour_context`.

Mindestfelder:

- `candidate_neighbour_count`
- `best_neighbour_building_id`
- `best_neighbour_cluster_id`
- `own_cluster_fit_score`
- `neighbour_fit_score`
- `neighbour_fit_delta`
- `neighbour_misassignment_flag`
- `neighbour_event_score`
- `neighbour_event_flag`

### Building-Level

Empfohlene Felder im `building_rollup`:

- `neighbour_context_available`
- `neighbour_misassignment_point_count`
- `neighbour_event_flag`
- `neighbour_event_score`
- `neighbour_consistency_score`
- `supporting_neighbour_count`

### Optionales Cluster-Level

Falls die Implementierung es braucht, darf `cluster_rollup` um minimale raeumliche
Zusammenfassungen erweitert werden, zum Beispiel:

- `centroid_x`
- `centroid_y`
- `bbox`
- `track`
- `point_count`

## Bewertungsskizze

Fehlzuordnungsdiagnose:

- Vergleiche fuer einen Punkt den Fit zum eigenen Cluster mit dem besten Fit eines
  Nachbarclusters.
- Setze `neighbour_misassignment_flag=true`, wenn der Nachbar-Fit deutlich besser ist und
  der eigene Fit schwach bleibt.
- Dokumentiere den Delta-Schwellenwert in `neighbourhood_design.md`.

Event-Konsistenz:

- Vergleiche Bewegung, Track-Richtung, Clusterrolle und robuste Zeitreihen- oder Trendmerkmale
  naher Gebaeude.
- Setze `neighbour_event_flag=true`, wenn mehrere Nachbargebaeude dasselbe Signal plausibel
  stuetzen.
- Verwende `supporting_neighbour_count`, um Einzelzufall von lokalem Ereignis zu trennen.

Zirkularitaetsregel:

- `P3` darf `P2R`-Rollups lesen, aber nicht zur Berechnung derselben Rollups zurueckfliessen.
- Alle `P3`-Scores sind additive Diagnosefelder.

## Wellen

### Welle P3-W1

#### Ticket P3-W1-T1: Nachbarschafts-Design und Datenvertrag

- Ziel: zweiten Pass fachlich und technisch einfrieren.
- Artefakt:
  - `docs/pipelines/anomaly_local_v1/neighbourhood_design.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/neighbourhood_design.md`
  - optional Aktualisierung dieses Plans
- Abhaengigkeiten:
  - hard: `P2R-W2-T1`
- DoD:
  - Radius-/Nachbarschaftsdefinition ist festgelegt.
  - Fehlzuordnung und Neighbourhood-Event sind formal getrennt.
  - Feldvertrag fuer Punkt-, Cluster- und Building-Level steht.
  - Zirkularitaetsgrenzen sind explizit dokumentiert.
  - Verifikationsstrategie fuer Mirabell, Moosstrasse und Osthang ist konkret.
- Kritischer Pfad: ja
- Status: green

### Welle P3-W2

#### Ticket P3-W2-T1: Backend-Nachbarschafts-Pass

- Ziel: zweiten Pass in `anomaly_local_v1` implementieren.
- Artefakt:
  - Backend-Delta
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - optional `backend/app/ml/rollups.py`
  - optional `backend/app/ml/evaluation/phase2_harness.py`
- Abhaengigkeiten:
  - hard: `P3-W1-T1`
- DoD:
  - Nachbarschafts-Kandidaten werden nach dem ersten Rollup berechnet.
  - Fehlzuordnungsdiagnose ist implementiert.
  - Event-Konsistenzdiagnose ist implementiert.
  - neue Felder bleiben additive Diagnosen und veraendern keine `P2R`-Reliability-Semantik.
  - Backend ist syntaktisch validiert.
- Kritischer Pfad: ja
- Status: green

### Welle P3-W3

#### Ticket P3-W3-T1: API/UI-Anschluss

- Ziel: Nachbarschaftsdiagnosen in API und UI sichtbar machen.
- Artefakt:
  - API-/Schema-/Frontend-Delta
- Write-Set:
  - `backend/app/routers/ml.py`
  - `backend/app/schemas.py`
  - `frontend/src/components/InspectorPanel.tsx`
  - `frontend/src/components/MapView.tsx`
  - `frontend/src/hooks/useApi.ts`
  - weitere Frontend-Dateien nach Bedarf
- Abhaengigkeiten:
  - hard: `P3-W2-T1`
- DoD:
  - neue Felder gehen in Detail-API, Visualisierungskontext oder Tiles nicht verloren.
  - Inspector zeigt Nachbarschaftsdiagnosen knapp und interpretierbar.
  - UI unterscheidet Fehlzuordnung von Event-Konsistenz.
  - Frontend-Build ist geprueft, falls Frontend-Dateien geaendert wurden.
- Kritischer Pfad: ja
- Status: green

#### Ticket P3-W3-T2: Harness-Rerun und Abschlussverifikation

- Ziel: `P3` gegen die festen AOIs und Referenzfaelle verifizieren.
- Artefakt:
  - `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
  - aktualisierte Harness-Artefakte, falls noetig
- Write-Set:
  - `backend/app/ml/evaluation/phase2_harness.py`
  - `docs/pipelines/anomaly_local_v1/artifacts/*`
  - `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
  - `docs/pipelines/anomaly_local_v1/iterations.md`
  - `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- Abhaengigkeiten:
  - hard: `P3-W2-T1`
  - soft: `P3-W3-T1`
- DoD:
  - neue Live-Runs fuer Mirabell, Moosstrasse und Osthang sind dokumentiert, falls Pipeline-Logik geaendert wurde.
  - mindestens ein Fehlzuordnungsbeispiel ist dokumentiert oder die Abwesenheit solcher Faelle ist begruendet.
  - mindestens ein Event-Konsistenzbeispiel ist dokumentiert oder die Abwesenheit solcher Faelle ist begruendet.
  - P2R-Referenzfaelle behalten ihren erwarteten Status, ausser eine begruendete P3-Diagnose erklaert eine neue Zusatzmarkierung.
  - `P3`-Status ist fortgeschrieben.
- Kritischer Pfad: ja
- Status: green

## Supervisor-Schnitt

Single-File-Entry fuer die spaetere Supervisor-Session:

- `docs/pipelines/anomaly_local_v1/phase3_supervisor_prompt.md`

Die Supervisor-Session wurde abgearbeitet.
`P3` steht auf `green`, `P4` bleibt `planned`.
