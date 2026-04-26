# `anomaly_local_v1` Phase-4 Terrain and Aspect Plan

Stand: 2026-04-25
Status: green

## Ziel

Phase 4 klaert, ob und wie Terrain- und Aspect-Informationen nach `P3` in
`anomaly_local_v1` eingehen.

Der erste Schritt ist bewusst eine fachliche Terrain-Entscheidung, keine sofortige
Scoring-Implementierung. Erst danach darf entschieden werden, ob Aspect nur als Kontext
dokumentiert bleibt oder als additive Regel-/Toleranzlogik in die Pipeline einzieht.

## Ausgangsbasis

Verbindliche Basis:

- `P0`, `P1`, `P2`, `P2R` und `P3` stehen auf `green`.
- `P3` ist additiv abgeschlossen; die neuen Pflicht-Runs sind:
  - Mirabell: `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7`
  - Moosstrasse: `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5`
  - Osthang-Stressbereich: `71770d85-ec8c-4354-840a-545fa0b7c757`
- Bestehender Terrain-Kontext:
  - Punkt-Level: `insar_point_terrain` mit `elevation_m`, `slope_deg`, `aspect_deg`
  - Building-Level: `building_terrain_context` mit `elevation_mean/min/max`,
    `slope_mean/max` und `relief_range_m`
  - Pipeline-Level: `anomaly_local_v1` nutzt aktuell `slope_mean_deg`,
    `slope_max_deg` und `relief_range_m`
- Bestehende UI-Raster fuer Hillshade und Slope bleiben unveraendert.

Bekannte Einschraenkungen:

- SRTM wird als grober DSM-Kontext behandelt; er ist nicht gebaeudescharf.
- Absolute Punkt-zu-Gelaende-Hoehendifferenzen sind ohne Vertikaldatum-Harmonisierung
  nicht belastbar.
- Building-Level-Aspect ist noch nicht aggregiert; bisher existiert Aspect nur im
  Punkt-Terrain-Kontext.

## Nicht-Ziele

Ausdruecklich nicht Teil von `P4-W1`:

- direkte Code-Aenderungen an Scoring, Gates oder Labels
- Regeneration von Terrain-Daten ohne dokumentierte Entscheidung
- Umbau der bestehenden Terrain-/Relief-Karte
- harte Nutzung absoluter Punkt-vs-Terrain-Hoehendifferenzen vor Klaerung des
  Vertikaldatums
- Rueckkopplung von Terrain-/Aspect-Feldern in `P1`/`P2R`/`P3` ohne neue
  Verifikation
- externe MatchSAR-/AUGMENTERRA-Abstimmung; das bleibt `E0`

## Entscheidungsfragen

### Terrainbasis

`P4-W1` muss mindestens diese Optionen fachlich vergleichen:

- Status quo: bestehender SRTM/DSM-Kontext
- hochaufloesendes DTM fuer Salzburg/Oesterreich
- DSM bzw. nDSM als Zusatzkontext fuer Gebaeudehoehen, Vegetation und
  Reflexionsinterpretation
- hybride Nutzung: SRTM/DSM fuer groben Kontext, DTM/nDSM nur fuer spaetere
  Hoehenlogik

Zu klaeren:

- Datenquelle, Lizenz und Reproduzierbarkeit
- Aufloesung und Gebaeudeschaerfe
- Vertikaldatum und moegliche Geoid-/Datumskorrektur
- Aufwand fuer Pipeline-Regeneration und Datenhaltung
- Konsequenz fuer `anomaly_local_v1` im aktuellen Repo

### Aspect

`P4-W2` darf erst nach `P4-W1` entscheiden, ob Aspect integriert wird.

Moegliche Entscheidungen:

- `context_only`: Aspect bleibt sichtbar/dokumentiert, aber beeinflusst keine Scores.
- `diagnostic_only`: Aspect erzeugt additive Diagnosefelder, aber keine Label- oder
  Reliability-Aenderung.
- `tolerance_logic`: Aspect beeinflusst nur klar begrenzte Toleranzen, z. B.
  Cross-Track-/Sichtbarkeitsinterpretation.
- `defer`: Integration wird wegen Terrainbasis, Aufloesung oder Datumsluecke vertagt.

Scoring- oder Gate-Aenderungen sind nur erlaubt, wenn `P4-W2` sie fachlich begruendet
und eine Verifikationsstrategie definiert.

## Wellen

### Welle P4-W1

#### Ticket P4-W1-T1: DEM-/Terrain-Entscheidung vorbereiten

- Ziel: DTM/DSM/nDSM und Vertikaldatum fuer Salzburg/AT fachlich klaeren.
- Artefakt:
  - `docs/pipelines/anomaly_local_v1/terrain_decision.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/terrain_decision.md`
  - optional Aktualisierung dieses Plans
- Abhaengigkeiten:
  - hard: `P3-W3-T2`
- DoD:
  - verfuegbare Terrainmodelle sind mit Quelle, Aufloesung, Lizenz und
    Reproduzierbarkeit verglichen.
  - Vertikaldatum und Hoehenbezug sind explizit benannt.
  - entschieden ist, ob der Status quo fuer P4 reicht oder ob ein Datenupgrade
    vor Aspect-Integration noetig ist.
  - Konsequenz fuer `anomaly_local_v1` ist beschrieben.
  - bestehende Terrain-/Relief-Karte bleibt unveraendert.
- Kritischer Pfad: ja
- Status: green

### Welle P4-W2

#### Ticket P4-W2-T1: Aspect-Entscheidung und Regelentwurf

- Ziel: auf Basis von `terrain_decision.md` entscheiden, ob und wie Aspect in die
  Pipeline eingeht.
- Artefakt:
  - `docs/pipelines/anomaly_local_v1/aspect_decision.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/aspect_decision.md`
  - optional Aktualisierung dieses Plans
- Abhaengigkeiten:
  - hard: `P4-W1-T1`
- DoD:
  - eine der Entscheidungen `context_only`, `diagnostic_only`, `tolerance_logic`
    oder `defer` ist explizit getroffen.
  - bei jeder Nicht-Integration ist die Begruendung dokumentiert.
  - bei jeder Integration sind Datenvertrag, Regel oder Formel, Schwellen und
    Verifikationsstrategie beschrieben.
  - keine Code-Aenderung ist ohne dokumentierte Integrationsentscheidung erfolgt.
  - keine Terrain-Map-Refactors.
- Kritischer Pfad: ja
- Status: green

### Welle P4-W3

#### Ticket P4-W3-T1: Optionale Aspect-/Terrain-Integration und Verifikation

- Ziel: nur falls `P4-W2-T1` `diagnostic_only` oder `tolerance_logic` freigibt,
  die dokumentierte Regel minimal implementieren und gegen die Pflicht-AOIs pruefen.
- Artefakt:
  - Backend-/Harness-Delta nach Bedarf
  - `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_verification.md`
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`, falls Pipeline-Logik geaendert wird
  - `backend/app/ml/evaluation/phase2_harness.py`, falls Harness-Felder ergaenzt werden
  - `backend/app/routers/ml.py`, `backend/app/schemas.py` und Frontend-Dateien nur bei
    sichtbarem neuen Datenvertrag
  - `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_verification.md`
  - aktualisierte Harness-Artefakte, falls noetig
- Abhaengigkeiten:
  - hard: `P4-W2-T1`
- DoD:
  - Implementierung bleibt additiv oder die begruendete Toleranzaenderung ist klar
    isoliert.
  - keine Aenderung an bestehenden Terrain-Karten-Layern.
  - `backend/.venv/bin/python -m compileall backend/app` ist gruen.
  - Harness-Rerun ist gruen, wenn Pipeline- oder Harness-Logik geaendert wurde.
  - Frontend-Build ist gruen, wenn Frontend-Dateien geaendert wurden.
  - neue Live-Runs fuer Mirabell, Moosstrasse und Osthang sind dokumentiert, wenn
    Pipeline-Scoring oder Labels beeinflusst werden.
  - P2R-/P3-Referenzfaelle bleiben erklaerbar.
- Kritischer Pfad: bedingt
- Status: skipped (`P4-W2-T1` entschied `defer`)

## P4-Abschluss

`P4` ist mit dokumentierter Terrain- und Aspect-Entscheidung abgeschlossen.

- `terrain_decision.md` entscheidet: Der bestehende `SRTM`-Kontext bleibt fuer Status quo,
  Harness-Toleranz und bestehende Terrain-/Relief-Karte unveraendert, reicht aber nicht fuer
  neue Aspect- oder hoehenbasierte Terrain-Logik.
- `aspect_decision.md` entscheidet: `Aspect = defer`; es entsteht kein neuer
  `anomaly_local_v1`-Aspect-Vertrag und keine Codeintegration.
- `P4-W3-T1` wurde nicht gestartet, weil weder `diagnostic_only` noch `tolerance_logic`
  freigegeben wurde.
- Folgearbeit vor einer spaeteren Aspect-Wiederaufnahme: `DTM 1 m`-Upgrade, bevorzugt
  `BEV ALS-DTM 1 m`, Hoehenbezugskonzept und zirkulare Building-Aspect-Semantik.

## Supervisor-Schnitt

Single-File-Entry fuer diese Supervisor-Session:

- `docs/pipelines/anomaly_local_v1/phase4_supervisor_prompt.md`

`P4` wurde ueber diesen Prompt ausgefuehrt und steht auf `green`.
