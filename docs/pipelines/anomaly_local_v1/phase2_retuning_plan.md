# `anomaly_local_v1` Phase-2R Retuning Plan

Stand: 2026-04-24
Status: in_progress (blocked on local PostGIS reachability)

## Zweck

`P2R` ist eine bewusst kleine Zwischenphase zwischen `P2` und `P3`.

Ziel ist nicht, neue Produktsemantik zu erfinden. Ziel ist, die in `P2` belegten Reliability-Luecken kontrolliert zu korrigieren, bevor Nachbarschafts-Kontext in `P3` auf diesen Building-Werten aufbaut.

## Ausgangspunkt

Verbindliche Inputs:

- `docs/pipelines/anomaly_local_v1/phase2_calibration.md`
- `docs/pipelines/anomaly_local_v1/phase2_harness.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_results.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`

Wesentliche `P2`-Befunde:

- `19/78` Gebaeude mit `building_status=ok` und `building_reliability_score >= 0.75` haben auf mindestens einem Track einen `main_cluster` mit weniger als `3` nicht ausgeschlossenen Punkten.
- `20` Gebaeude sind `ok`, obwohl `track_agreement_score < 0.25` ist.
- `5` Gebaeude im Moosstrasse-Run liegen sogar unter `track_agreement_score < 0.10`.

## Zielzustand

Nach `P2R` soll gelten:

- duenn gestuetzte vorhandene `main_cluster` koennen kein `high` Reliability-Band mehr erzeugen
- sehr niedriges Cross-Track-Agreement wirkt sichtbar auf Reliability
- die Ursache ist ueber Diagnosefelder nachvollziehbar
- der Harness beweist, dass die festen Referenzfaelle nicht regressieren
- `P3` bleibt unangetastet und startet erst nach neuem User-Gate

## Nicht-Ziele

Nicht in Scope:

- Nachbarschafts-Kontext
- Terrain-/Aspect-Arbeit
- neue Ergebnis-Tabellen
- komplette UI-Neugestaltung
- Veraenderung der `main_cluster`-Auswahlregel
- Veraenderung der `differential_motion_flag`-Schwelle, ausser ein direkter Retuning-Test zeigt eine zwingende Regression

## Welle P2R-W1

### Ticket P2R-W1-T1: Reliability-Retuning in der Pipeline

- Ziel: Reliability-Cap und Agreement-Penalty in der kanonischen Building-Rollup-Logik implementieren.
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - optional `backend/app/schemas.py`
  - optional `backend/app/routers/ml.py`
  - optional `frontend/src/*`, falls neue Diagnosefelder direkt sichtbar gemacht werden
- Abhaengigkeiten:
  - hard: `P2-W2-T1`
- Verbindliche Regeln:
  - Wenn ein vorhandener `main_cluster` auf Track 44 oder Track 95 weniger als `3` nicht ausgeschlossene Punkte traegt, darf `building_reliability_band` hoechstens `medium` sein.
  - In diesem Fall soll `building_reliability_score` zusaetzlich um einen kleinen festen Betrag gesenkt werden; Startwert aus `P2`: `-0.10`.
  - Wenn `track_agreement_score < 0.25`, soll eine zusaetzliche Penalty angewendet werden; Startwert aus `P2`: `-0.10`.
  - Wenn `track_agreement_score < 0.10`, soll ein Band-Cap auf `low` geprueft und nur dann verworfen werden, wenn der Harness dadurch eine klare fachliche Regression zeigt.
  - Diagnosefelder sollen mindestens intern im `building_rollup` verfuegbar sein:
    - `weak_secondary_track_flag`
    - `agreement_tension_flag`
    - optional `reliability_penalties`
- DoD:
  - Pipeline-Rollups enthalten die neue Retuning-Logik
  - neue Diagnosefelder sind in `ml_point_results.meta.building_rollup` persistiert
  - bestehende P1-Felder bleiben kompatibel
  - Backend-Code ist syntaktisch validiert
- Kritischer Pfad: ja
- Status: green

### Ticket P2R-W1-T2: API/UI-Anschluss fuer Retuning-Diagnosen

- Ziel: Retuning-Ursachen fuer Inspector/API/Harness nachvollziehbar machen.
- Write-Set:
  - `backend/app/schemas.py`
  - `backend/app/routers/ml.py`
  - `backend/app/ml/rollups.py`
  - `frontend/src/components/InspectorPanel.tsx`
  - `frontend/src/components/MapView.tsx`
  - `frontend/src/hooks/useApi.ts`
- Abhaengigkeiten:
  - hard: `P2R-W1-T1`
- DoD:
  - Building-Detail liefert `weak_secondary_track_flag` und `agreement_tension_flag`
  - Building-Tiles transportieren die Diagnosefelder, wenn dort bereits Building-Rollups genutzt werden
  - Inspector zeigt die Flags knapp im Diagnose-/Reliability-Kontext
  - keine alten Diagnosemittelwerte werden wieder zur primaeren Building-Semantik
- Kritischer Pfad: ja
- Status: green

## Welle P2R-W2

### Ticket P2R-W2-T1: Harness-Rerun und Kalibrationsabschluss

- Ziel: Retuning auf den festen AOIs und Referenzfaellen verifizieren und dokumentieren.
- Write-Set:
  - `backend/app/ml/evaluation/phase2_harness.py`
  - `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`
  - `docs/pipelines/anomaly_local_v1/artifacts/*`
  - `docs/pipelines/anomaly_local_v1/iterations.md`
  - `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- Abhaengigkeiten:
  - hard: `P2R-W1-T1`
  - hard: `P2R-W1-T2`
- DoD:
  - Harness laeuft erfolgreich gegen Mirabell, Moosstrasse und Osthang-Stressbereich
  - `548205`, `96637447`, `96637522`, `96637488`, `96959854`, `96637551`, `395674088` sind explizit geprueft
  - die Anzahl der `ok`/`high`-Faelle mit duennem Track-Support sinkt oder ist fachlich begruendet
  - die Anzahl der `ok`-Faelle mit `track_agreement_score < 0.25` bleibt sichtbar und wird durch niedrigere Reliability oder Flag markiert
  - `P2R` wird im Plan auf `green` gesetzt
  - `P3` bleibt `planned`
- Kritischer Pfad: ja
- Status: inconclusive

## Verifikation

Mindestens auszufuehren:

```bash
backend/.venv/bin/python -m compileall backend/app
backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness
```

Falls Frontend-Dateien geaendert werden:

```bash
cd frontend
npm run build
```

Bei Pipeline-Logik-Aenderungen muessen neue Live-Runs fuer die drei Pflicht-AOIs erzeugt werden, weil alte `ml_point_results.meta` die Retuning-Felder nicht enthalten.

Pflicht-AOIs:

- Mirabell
- Moosstrasse
- Osthang-Stressbereich

Aktueller Blockerstand fuer `P2R-W2-T1` (2026-04-24):

- `backend/.venv/bin/python -m compileall backend/app`: green
- `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness`: red, `ConnectionRefusedError` gegen `127.0.0.1:5432`
- erster Pflicht-Live-Run fuer Mirabell: red, derselbe DB-Blocker vor Run-Erzeugung
- `cd frontend && npm run build`: green

Solange PostGIS aus dieser WSL-Session nicht erreichbar ist, bleiben neue P2R-Run-IDs, aktualisierte Harness-Artefakte und die Abschlussbewertung `inconclusive`.

## Abschlusskriterium

`P2R` ist abgeschlossen, wenn:

- die Retuning-Regeln implementiert sind
- API/UI die neuen Diagnoseflags nicht verlieren
- der Harness mit neuen Runs oder dokumentiertem aktualisiertem Datenstand erfolgreich laeuft
- `phase2_retuning_verification.md` die Vorher/Nachher-Wirkung dokumentiert
- der Planstatus `P2R: green` ist
- die Session vor `P3` stoppt
