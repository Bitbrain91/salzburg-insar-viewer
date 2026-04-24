# anomaly_local_v1 Phase-2 Execution Plan

Stand: 2026-04-24
Status: active plan
Basis: `docs/pipelines/anomaly_local_v1/next_steps.md`, `docs/pipelines/anomaly_local_v1/methodik.md`, `docs/pipelines/anomaly_local_v1/deep_research_report.md`, aktueller Code in `backend/app/ml/pipelines/anomaly_local_v1.py`

## Ziel

Dieser Plan steuert die Weiterentwicklung von `anomaly_local_v1` als `Plan -> Phase -> Welle -> Ticket`.

Die Hauptabsicht ist:

- zuerst ein belastbares Gebaeude-Level-Ergebnis einzufuehren,
- Multi-Cluster fachlich korrekt zu behandeln,
- API und UI auf diese neue Semantik umzustellen,
- Evaluation und spaetere Kontext-/Terrain-Themen erst auf dieser stabilen Basis aufzubauen.

## Scope

In Scope fuer diesen Plan:

- Deep-Research-Abgleich gegen die laufende Implementierung
- Gebaeude-Level-Scoring mit Konfidenz / Reliability
- `main_cluster`-Logik
- `differential_motion_flag`
- API-/Schema-/Tile-Erweiterungen fuer Building- und Cluster-Level
- UI-Integration fuer die neue lokale Gebaeude-Semantik
- Evaluations-Harness, KI-Vergleich und Expertenpakete
- Nachbargebaeude-Kontext als spaeterer zweiter Pass
- Terrain-/Aspect-Entscheidungen auf bestehender Terrainbasis

## Nicht in Scope

Ausdruecklich nicht in Scope fuer die naechste Hauptiteration:

- Umbau oder Neugestaltung der bereits implementierten Gelaendekarte
- isolierte Aspect-Integration ohne vorherige Terrain-/DEM-Entscheidung
- Nachbargebaeude-Kontext vor stabiler Gebaeude-/Cluster-Semantik
- Warten auf AUGMENTERRA-Input, bevor interne Kernarbeit startet
- Rueckfall auf `anomaly_v1`-Semantik als Zielzustand

## Entscheidungen

Bereits entschieden:

- `anomaly_local_v1` bleibt fuer diese Ausbaustufe auf `source='gba'`.
- Die bestehende Gelaendekarte bleibt unveraendert.
- Der erste Produkthebel ist Gebaeude-Level vor Nachbarschaft und Terrain-Upgrade.
- Multi-Cluster wird als fachlich relevanter Befund behandelt, nicht als Randfall.
- Der Supervisor-Workflow laeuft mit `gpt-5.4` und reasoning effort `xhigh`.
- Die feste AOI-Basis fuer Entwicklung und Verifikation ist `Mirabell`, `Moosstrasse` und der `Osthang-Stressbereich` gemaess `docs/pipelines/anomaly_local_v1/runbook.md`.
- `P0` ist eine eigene Supervisor-Session vor jeder Implementierung.
- Zwischen `P0` und `P1` liegt ein bewusstes User-Review-Gate.

Noch in Phase 0 zu entscheiden:

- ob Building- und Cluster-Level in neuen Tabellen persistiert oder zuerst aus `ml_point_results` abgeleitet werden
- wie `main_cluster` formal priorisiert wird
- welcher minimale Gebaeude-Level-Score in V1 geliefert wird
- wann `differential_motion_flag` gesetzt wird

## Phasenueberblick

- Phase 0: Foundation und Design-Freeze
- Phase 1: Building Reliability
- Phase 2: Calibration
- Phase 2R: Reliability Retuning
- Phase 3: Neighbourhood Context
- Phase 4: Terrain and Aspect
- Parallelspur E0: MatchSAR / AUGMENTERRA

## Status

Aktueller Startpunkt:

- naechste zulaessige Welle: `P2R-W2-T1` nach Wiederherstellung der lokalen PostGIS-Erreichbarkeit
- `P1` ist abgeschlossen; Verifikation und Restrisiken stehen in `docs/pipelines/anomaly_local_v1/phase2_verification.md`
- `P2` ist abgeschlossen; Harness, Referenzpaket, KI-Protokoll und Kalibrationsnotiz stehen in den Phase-2-Artefakten
- `P2R` laeuft; `P2R-W2-T1` ist aktuell durch fehlende DB-Erreichbarkeit aus dieser WSL-Session blockiert, siehe `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`

Phasenstatus:

- `P0`: green
- `P1`: green
- `P2`: green
- `P2R`: in_progress
- `P3`: planned
- `P4`: planned
- `E0`: open

## Empfohlener Session-Schnitt

- `S0`: nur `P0`
  - Zweck: Research, aktueller Code und `Next Steps` werden gespiegelt und in reviewbare Entscheidungen uebersetzt.
  - Erwartetes Ergebnis: `phase2_research_matrix.md`, optional `phase2_decision_log.md`, klarer Vorschlag fuer `P1`.
  - Ausdruecklich kein Ziel: Implementierung in Pipeline, API oder UI.
  - Exit-Gate: User schaut die Vorschlaege an und gibt `P1` explizit frei.
- `S1`: `P1`
  - Zweck: Umsetzung der in `P0` freigegebenen Semantik in Pipeline, API, UI und AOI-Verifikation.
  - Single-File-Entry: `docs/pipelines/anomaly_local_v1/phase1_supervisor_prompt.md`
- `S2`: `P2`
  - Zweck: Harness, Expertenpaket, KI-Vergleich, Kalibrationsnotiz.
- `S2R`: `P2R`
  - Zweck: kleines Reliability-Retuning auf Basis der `P2`-Kalibration.
  - Single-File-Entry: `docs/pipelines/anomaly_local_v1/phase2_retuning_supervisor_prompt.md`
- `S3`: `P3`
  - Zweck: Nachbarschafts-Kontext.
- `S4`: `P4`
  - Zweck: Terrain-/Aspect-Entscheidungen auf bestehender Terrainbasis.
- Parallelspur:
  - `E0-W1` darf schon in `S0` oder `S1` vorbereitet werden, weil es die interne Umsetzung nicht blockiert.
  - `E0-W2` erst, wenn externe Rueckmeldung vorliegt.

## Phase 0: Foundation und Design-Freeze

Phase 0 ist bewusst eine Analyse- und Design-Session, keine Implementierungsphase.
Sie soll die vorhandene Methodik, den Deep-Research-Bericht, die `Next Steps` und den aktuellen Code sauber gegeneinander halten und daraus konkrete, reviewbare Vorschlaege fuer `P1` ableiten.

### Phasen-DoD

Phase 0 ist gruen, wenn:

- die Build-/Cluster-Zielsemantik als Repo-Artefakt festgehalten ist
- die Ticket-DoDs fuer Phase 1 feststehen
- bekannte `anomaly_v1`-Restannahmen fuer `anomaly_local_v1` als konkrete Removal-Liste fuer `P1` festgezogen sind
- der Supervisor-Prompt auf Phasen/Wellen/Tickets und die Phase-1-Startwelle ausgerichtet ist
- ein User-Review-Gate fuer den Start von `P1` vorbereitet ist

### Welle P0-W1

#### Ticket P0-W1-T1: Research-Matrix und Designentscheidungen

- Ziel: `Next Steps`, Deep Research und aktuellen Code exakt gegeneinander spiegeln und die minimalen Entscheidungen fuer Phase 1 vorbereiten.
- Artefakt: `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md`
- Write-Set: `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md`
- Abhaengigkeiten: keine
- DoD:
  - Matrix existiert.
  - Sie enthaelt mindestens: aktueller Code, Research-Empfehlung, Abweichung, Empfehlung.
  - Sie trifft konkrete Empfehlungen fuer `main_cluster`, `differential_motion_flag`, Building-Score, Reliability und Persistenzrichtung.
  - Offene Restunsicherheiten sind explizit als solche markiert.
- Kritischer Pfad: ja
- Status: green

### Welle P0-W2

#### Ticket P0-W2-T1: Datenvertrag fuer Building- und Cluster-Level

- Ziel: den Zielvertrag fuer Phase 1 festziehen, damit Pipeline, API und UI gegen dasselbe Datenmodell arbeiten.
- Artefakt: Erweiterung von `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md` oder neues `docs/pipelines/anomaly_local_v1/phase2_decision_log.md`
- Write-Set: `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md`, optional `docs/pipelines/anomaly_local_v1/phase2_decision_log.md`
- Abhaengigkeiten:
  - hard: `P0-W1-T1`
- DoD:
  - die V1-Felder fuer Building-Level sind festgelegt
  - die V1-Felder fuer Cluster-Level sind festgelegt
  - Persistenzentscheidung ist getroffen oder es gibt eine dokumentierte Default-Entscheidung fuer V1
  - `hard` und `soft` Dependencies fuer Phase 1 sind dokumentiert
- Kritischer Pfad: ja
- Status: green

#### Ticket P0-W2-T2: Legacy-Restannahmen fuer lokale UI/API identifizieren und Removal-Schnitt festziehen

- Ziel: exakt festziehen, welche verbliebenen Legacy-Annahmen in `P1` entfernt oder direkt ersetzt werden muessen.
- Artefakt: Abschnitt im Decision-Log oder klare Removal-Liste
- Write-Set: `docs/pipelines/anomaly_local_v1/phase2_decision_log.md` oder `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md`
- Abhaengigkeiten:
  - hard: `P0-W1-T1`
- DoD:
  - aktuelle Legacy-Annahmen in Inspector/API/Tiles sind benannt
  - fuer jede Restannahme ist entschieden: entfernen oder direkt durch neue `anomaly_local_v1`-Semantik ersetzen
  - bekannte Felder aus `anomaly_v1`, die nicht mehr Zielzustand sind, bleiben nicht als offene Dauer-Altlast stehen
- Kritischer Pfad: ja
- Status: green

## Phase 1: Building Reliability

### Phasen-DoD

Phase 1 ist gruen, wenn:

- `anomaly_local_v1` ein Gebaeude-Level-Ergebnis liefert
- `main_cluster` und `differential_motion_flag` produktiv in der Pipeline verankert sind
- API und UI diese neue Semantik sichtbar machen
- verbleibende Legacy-Annahmen aus `anomaly_v1` in lokalen Feldern entfernt oder durch die neue Semantik ersetzt sind
- Mirabell, Moosstrasse und der Osthang-Stressbereich als AOI-Smoketests dokumentiert sind
- fuer alle drei festen AOIs mindestens ein gezielter Spot-Check auf Gebaeudeebene vorliegt

### Welle P1-W1

#### Ticket P1-W1-T1: Core-Semantik in der Pipeline

- Ziel: die Kernlogik fuer `main_cluster`, Cluster-Priorisierung, differenzielle Bewegung und Building-Level-Aggregation implementieren.
- Artefakt: Code-Delta in der Pipeline, optional neue Persistenzstruktur
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - optional `backend/sql/migrations/*`
  - optional weitere ML-Persistenzdateien im Backend
- Abhaengigkeiten:
  - hard: `P0-W2-T1`
- DoD:
  - Pipeline-Code enthaelt V1-Logik fuer `main_cluster_id`
  - Pipeline-Code enthaelt V1-Logik fuer `differential_motion_flag`
  - Building-Level-Semantik ist aus Code heraus ableitbar oder persistiert
- neue Felder stimmen mit dem Phase-0-Datenvertrag ueberein
- Backend-Code ist mindestens syntaktisch validiert
- Kritischer Pfad: ja
- Status: green

### Welle P1-W2

#### Ticket P1-W2-T1: API, Schemas und Tiles fuer Building-/Cluster-Level

- Ziel: die neue Phase-1-Semantik ueber Backend-Schemas, Router und Tiles anschlussfaehig machen.
- Artefakt: API-/Schema-/Tile-Delta
- Write-Set:
  - `backend/app/routers/ml.py`
  - `backend/app/schemas.py`
  - optionale SQL-/Store-Dateien
- Abhaengigkeiten:
  - hard: `P1-W1-T1`
  - hard: `P0-W2-T2`
- DoD:
  - API liefert die neuen Building-/Cluster-Felder
  - Tile-/Context-Endpunkte transportieren die benoetigten Felder
  - Felder fuer `anomaly_local_v1` sind nicht mehr implizit von `anomaly_v1`-Altsemantik abhaengig
- lokal nicht mehr gebrauchte Legacy-Felder sind entfernt oder an der API-Grenze bewusst ersetzt
- Backend-Code ist mindestens syntaktisch validiert
- Kritischer Pfad: ja
- Status: green

#### Ticket P1-W2-T2: Frontend-Integration fuer lokale Gebaeude-Semantik

- Ziel: Inspector, Map und Pipeline-Panel auf die neue lokale Gebaeude-Semantik umstellen.
- Artefakt: Frontend-Delta
- Write-Set:
  - `frontend/src/components/InspectorPanel.tsx`
  - `frontend/src/components/MapView.tsx`
  - `frontend/src/components/PipelinePanel.tsx`
  - `frontend/src/hooks/useApi.ts`
  - optional `frontend/src/lib/store.ts`
- Abhaengigkeiten:
  - hard: `P0-W2-T1`
  - soft: `P1-W2-T1`
- DoD:
- lokale Gebaeude-Semantik ist in der UI sichtbar
- `anomaly_v1`-Restannahmen fuer lokale Felder sind entfernt oder direkt ersetzt
- Frontend baut erfolgreich oder die Zielkomponenten sind anderweitig mechanisch validiert
- Kritischer Pfad: ja
- Status: green

### Welle P1-W3

#### Ticket P1-W3-T1: AOI-Verifikation fuer Phase 1

- Ziel: Phase 1 gegen reale AOIs und repraesentative Gebaeude absichern.
- Artefakt: Verifikationsnotiz
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/iterations.md`
  - optional `docs/pipelines/anomaly_local_v1/runbook.md`
  - optional neues `docs/pipelines/anomaly_local_v1/phase2_verification.md`
- Abhaengigkeiten:
  - hard: `P1-W2-T1`
  - hard: `P1-W2-T2`
- DoD:
  - Mirabell, Moosstrasse und der Osthang-Stressbereich sind explizit geprueft
  - mindestens ein Multi-Cluster-Fall und ein Small-n-Fall sind dokumentiert
  - sichtbare Vorher/Nachher- oder Erwartungs-/Ist-Beobachtungen sind notiert
- offene Risiken fuer Phase 2 sind benannt
- die AOI-Pruefung folgt der Reihenfolge `Mirabell -> Moosstrasse -> Osthang-Stressbereich -> Spot-Checks`
- Kritischer Pfad: ja
- Status: green

## Phase 2: Calibration

### Phasen-DoD

Phase 2 ist gruen, wenn:

- ein wiederverwendbarer Evaluations-Harness existiert
- KI-Vergleich und Expertenpaket auf derselben Semantik basieren
- die wichtigsten Diskrepanzen in einer Kalibrationsnotiz zusammengezogen sind

### Welle P2-W1

#### Ticket P2-W1-T1: Evaluations-Harness und Stability-Signale

- Ziel: eine reproduzierbare Vergleichs- und Stability-Basis fuer Phase 1 schaffen.
- Artefakt: Evaluations-Harness + Doku
- Write-Set:
  - neue Backend-/Script-Dateien nach Bedarf
  - `docs/*` fuer Nutzungsnotiz
- Abhaengigkeiten:
  - hard: `P1-W3-T1`
- DoD:
  - fester Satz aus AOIs/Testgebaeuden ist kodiert oder dokumentiert
  - Vergleichsmetriken fuer Punkt/Cluster/Gebaeude sind definiert
  - Bootstrap- oder Stability-Signal fuer kleine `n` ist implementiert oder reproduzierbar beschrieben
  - Mirabell, Moosstrasse und der Osthang-Stressbereich bleiben Pflichtbasis und werden nicht durch spaetere Zusatz-AOIs ersetzt
- Kritischer Pfad: ja
- Status: green

#### Ticket P2-W1-T2: Experten-Referenzpaket vorbereiten

- Ziel: ein exportierbares Paket fuer AUGMENTERRA-Labels vorbereiten.
- Artefakt: Export-/Anfragepaket
- Write-Set:
  - `docs/*`
  - optionale Export-Skripte
- Abhaengigkeiten:
  - hard: `P1-W3-T1`
- DoD:
  - Stichprobe ist definiert
  - benoetigte Felder und Bewertungsrubrik sind dokumentiert
  - Exportweg oder Datenpaket ist beschrieben
- Kritischer Pfad: nein
- Status: green

#### Ticket P2-W1-T3: KI-Agent-Vergleichsprotokoll

- Ziel: den autonomen Zweitmeinungs-Vergleich maschinenlesbar und reproduzierbar machen.
- Artefakt: Vergleichsprotokoll + I/O-Schema
- Write-Set:
  - `docs/*`
  - optionale Hilfsskripte
- Abhaengigkeiten:
  - hard: `P1-W3-T1`
- DoD:
  - Input- und Output-Schema fuer den Vergleich ist festgelegt
  - Vergleichsmetriken sind dokumentiert
  - die auszuwaehlenden Gebaeude/Faelle sind benannt
- Kritischer Pfad: ja
- Status: green

### Welle P2-W2

#### Ticket P2-W2-T1: Kalibrationsnotiz aus Harness und KI-Vergleich

- Ziel: die wichtigsten Diskrepanzen systematisch in die naechste Iteration rueckfuehren.
- Artefakt: Kalibrationsnotiz
- Write-Set:
  - neues `docs/pipelines/anomaly_local_v1/phase2_calibration.md`
- Abhaengigkeiten:
  - hard: `P2-W1-T1`
  - hard: `P2-W1-T3`
  - soft: `P2-W1-T2`
- DoD:
  - auffaellige Abweichungen sind nach Ursache gruppiert
  - konkrete Nachsteuerungen fuer spaetere Tickets sind benannt
  - Small-n-, Multi-Cluster- und Grenzfaelle sind explizit behandelt
- Kritischer Pfad: ja
- Status: green

## Phase 2R: Reliability Retuning

### Phasen-DoD

Phase 2R ist gruen, wenn:

- die aus `P2` belegten Reliability-Luecken gezielt retuned sind
- `weak_secondary_track_flag` und `agreement_tension_flag` oder gleichwertige Diagnosefelder im Building-Rollup verfuegbar sind
- API/UI/Harness die Retuning-Ursachen nicht verlieren
- Mirabell, Moosstrasse und Osthang-Stressbereich erneut gegen den Harness geprueft sind
- `P3` weiterhin ungestartet bleibt

### Steuerdokument

Die Ticketdetails fuer `P2R` stehen in:

- `docs/pipelines/anomaly_local_v1/phase2_retuning_plan.md`

Single-File-Entry fuer die naechste Supervisor-Session:

- `docs/pipelines/anomaly_local_v1/phase2_retuning_supervisor_prompt.md`

### Wellenueberblick

- `P2R-W1-T1`: Reliability-Retuning in der Pipeline
- `P2R-W1-T2`: API/UI-Anschluss fuer Retuning-Diagnosen
- `P2R-W2-T1`: Harness-Rerun und Kalibrationsabschluss

Status:

- `P2R-W1-T1`: green
- `P2R-W1-T2`: green
- `P2R-W2-T1`: inconclusive

## Phase 3: Neighbourhood Context

`P3` startet erst nach `P2R` oder nach expliziter User-Entscheidung, das Retuning zu ueberspringen.

### Phasen-DoD

Phase 3 ist gruen, wenn:

- ein sauberer Nachbarschafts-Pass existiert
- Fehlzuordnungen und Nachbarschafts-Events explizit unterschieden werden
- die neue Semantik in API/UI anschlussfaehig ist

### Welle P3-W1

#### Ticket P3-W1-T1: Nachbarschafts-Design und Abhaengigkeiten

- Ziel: den zweiten Pass fachlich und technisch sauber definieren.
- Artefakt: Design-Notiz
- Write-Set:
  - neues `docs/pipelines/anomaly_local_v1/neighbourhood_design.md`
- Abhaengigkeiten:
  - hard: `P2R-W2-T1`
- DoD:
  - Radius-/Nachbarschaftsdefinition ist festgelegt
  - Fehlzuordnung vs. Neighbourhood-Event ist klar abgegrenzt
  - notwendige Inputs aus Phase 1/2 sind explizit genannt
- Kritischer Pfad: ja
- Status: planned

### Welle P3-W2

#### Ticket P3-W2-T1: Nachbarschafts-Pass implementieren

- Ziel: den zweiten Pass im Backend produktiv einbauen.
- Artefakt: Backend-Delta
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - weitere Backend-Dateien nach Bedarf
- Abhaengigkeiten:
  - hard: `P3-W1-T1`
- DoD:
  - Nachbarschafts-Score oder Event-Flag ist implementiert
  - Fehlzuordnungsflag gegen Nachbarcluster ist implementiert oder sauber begrenzt
  - Backend-Code ist mindestens syntaktisch validiert
- Kritischer Pfad: ja
- Status: planned

### Welle P3-W3

#### Ticket P3-W3-T1: Nachbarschaft sichtbar machen und verifizieren

- Ziel: Nachbarschafts-Semantik in API/UI und Doku anschlussfaehig machen.
- Artefakt: API/UI/Doku-Delta
- Write-Set:
  - Backend-API-Dateien nach Bedarf
  - Frontend-Dateien nach Bedarf
  - `docs/*`
- Abhaengigkeiten:
  - hard: `P3-W2-T1`
- DoD:
  - neue Felder sind sichtbar
  - mindestens ein Beispiel fuer Fehlzuordnung und ein Beispiel fuer Event-Konsistenz ist dokumentiert
- Kritischer Pfad: ja
- Status: planned

## Phase 4: Terrain and Aspect

### Phasen-DoD

Phase 4 ist gruen, wenn:

- die Terrainbasis fachlich entschieden ist
- klar ist, ob und wie Aspect in `anomaly_local_v1` eingeht
- die bestehende Gelaendekarte unveraendert bleibt

### Welle P4-W1

#### Ticket P4-W1-T1: DEM-/Terrain-Entscheidung vorbereiten

- Ziel: DTM/DSM/nDSM und Vertikaldatum fuer Salzburg/AT fachlich klaeren.
- Artefakt: Terrain-Entscheidungsnotiz
- Write-Set:
  - neues `docs/pipelines/anomaly_local_v1/terrain_decision.md`
- Abhaengigkeiten:
  - hard: `P2-W2-T1`
- DoD:
  - verfuegbare Modelle sind verglichen
  - Vertikaldatum-Thema ist benannt
  - Konsequenz fuer `anomaly_local_v1` ist beschrieben
  - keine Forderung nach Umbau der bestehenden Gelaendekarte
- Kritischer Pfad: ja
- Status: planned

### Welle P4-W2

#### Ticket P4-W2-T1: Aspect-Entscheidung und ggf. Integration

- Ziel: erst nach Terrain-Entscheidung festlegen, ob Aspect in Regeln/Scoring eingeht.
- Artefakt: Decision-Log plus optional Code-Delta
- Write-Set:
  - Backend-Dateien nach Bedarf
  - `docs/*`
- Abhaengigkeiten:
  - hard: `P4-W1-T1`
- DoD:
  - es ist explizit entschieden, ob Aspect integriert wird
  - falls ja, ist die Regel oder Toleranzlogik dokumentiert und implementiert
  - falls nein, ist die Begruendung dokumentiert
  - keine Terrain-Map-Refactors
- Kritischer Pfad: ja
- Status: planned

## Parallelspur E0: MatchSAR / AUGMENTERRA

Diese Spur blockiert die internen Phasen nicht.

### Welle E0-W1

#### Ticket E0-W1-T1: MatchSAR-Anfragepaket

- Ziel: praezise Fragen an AUGMENTERRA vorbereiten.
- Artefakt: Anfragepaket
- Write-Set:
  - neues `docs/pipelines/anomaly_local_v1/matchsar_request.md`
- Abhaengigkeiten: keine
- DoD:
  - Buffer-Strategie, Konfliktlogik, Hoehen-/DEM-Rolle und Datenquellen sind als Fragen formuliert
  - die Frage ist so praezise, dass eine spaetere Spiegelung gegen den Code moeglich ist
- Kritischer Pfad: nein
- Status: planned

### Welle E0-W2

#### Ticket E0-W2-T1: AUGMENTERRA-Antwort gegen Pipeline spiegeln

- Ziel: spaetere externe Rueckmeldung strukturiert gegen die Implementierung halten.
- Artefakt: Abgleichsnotiz
- Write-Set:
  - `docs/*`
- Abhaengigkeiten:
  - hard: `E0-W1-T1`
  - soft: externe Antwort vorhanden
- DoD:
  - Unterschiede zwischen MatchSAR und lokaler Pipeline sind explizit notiert
  - betroffene spaetere Tickets oder Folgephasen sind benannt
- Kritischer Pfad: nein
- Status: planned

## Fail-Regeln

Allgemein:

- `green`: Ticket-DoD ist erfuellt; Ticket kann integriert und als erledigt markiert werden.
- `red`: Ticket ist fehlgeschlagen; Supervisor wendet Fail-Regel an.
- `inconclusive`: Ticket ist sauber bearbeitet, reicht aber fuer die urspruengliche Entscheidung nicht; Supervisor erzeugt Follow-up oder dokumentierte Annahme.

Spezifisch fuer diesen Plan:

- `P0-W1-T1`, `P0-W2-T1` und `P1-W1-T1` liegen auf dem kritischen Pfad.
  Bei `red` oder nicht aufloesbarem `inconclusive` stoppt der Supervisor die naechste Welle.

- `P0-W2-T2` ist zwar wichtig, aber kein eigenstaendiger Produktblock.
  Bei `red` kann ein Ersatz-Ticket erzeugt werden; Phase 0 ist aber erst gruen, wenn die Luecken sauber zugeordnet sind.

- `P1-W2-T2` darf nicht stillschweigend ausgelassen werden.
  Backend-only gruene Tickets reichen nicht fuer Phase 1; die Phase bleibt offen, bis die lokale Gebaeude-Semantik sichtbar ist.

- `P2-W1-T2` und `E0-*` sind keine Blocker fuer interne Kernlogik.
  Sie duerfen offen bleiben, muessen aber sauber im Status stehen.

- `P2R-W1-T1` und `P2R-W2-T1` liegen vor `P3` auf dem kritischen Pfad.
  Bei `red` oder nicht aufloesbarem `inconclusive` startet `P3` nicht automatisch.

## Warum diese Reihenfolge

- Building-Level-Scoring ist der groesste fachliche Hebel.
- Multi-Cluster gehoert logisch in dieselbe Kerniteration.
- Evaluation braucht stabile Outputs.
- Reliability-Retuning sollte vor Nachbarschafts-Kontext passieren, weil `P3` auf Building-Reliability aufbaut.
- Nachbargebaeude-Kontext braucht stabile Cluster-/Gebaeudesemantik.
- Terrain/Aspect sollte nicht vor der Terrainentscheidung in die Logik eingehakt werden.

## Kurzfazit

Die naechste echte Startwelle ist:

- `P2R-W1`

Die naechste Produktarbeit ist:

- `P2R-W1` -> `P2R-W2`

Das entspricht fachlich:

`Reliability-Cap -> Agreement-Penalty -> Diagnoseflags -> Harness-Rerun -> Retuning-Verifikation`
