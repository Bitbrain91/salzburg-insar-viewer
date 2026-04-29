# Supervisor Prompt fuer die Phase-2R-Retuning-Session

Der folgende Prompt ist fuer eine eigenstaendige Retuning-Session gedacht. Er ist auf `docs/pipelines/anomaly_local_v1/phase2_retuning_plan.md`, die `P2`-Kalibrationsnotiz und den aktuellen Code abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/phase2_retuning_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-2R-Retuning-Session von `anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P2R` aus `docs/pipelines/anomaly_local_v1/phase2_retuning_plan.md` autonom um.

Diese Prompt-Datei ist die operative Freigabe fuer das Retuning zwischen `P2` und `P3`.
Wenn du diese Datei ausfuehrst, gilt das User-Gate nach `P2` als erfuellt.

Behandle den Plan als Scheduler-Eingabe:

`Plan -> Phase -> Welle -> Ticket`

Arbeitsmodus:

- Nutze Subagents aktiv und strikt; halte den Supervisor-Kontext klein.
- Delegiere alle Ticket-Arbeiten an Subagents.
- Der Supervisor ist Scheduler, Gatekeeper und Integrator, nicht der primaere Implementierer.
- Starte alle delegierten Agents mit `gpt-5.5` und reasoning effort `xhigh`.
- Keine Mini-, Nano- oder sonstigen kleineren Modelle.
- Falls `gpt-5.5` nicht verfuegbar ist, stoppe und melde den Modell-Blocker; kein Fallback auf kleinere Modelle.
- Verlange von jedem delegierten Agent, dass er seine Ticket-DoD selbst prueft, bei Bedarf selbst nachbessert und dann mit einem klaren Ticket-Status zurueckmeldet.
- Integriere nur Tickets mit Status `green`.
- Loese `red`- oder `inconclusive`-Tickets nicht stillschweigend im Hauptthread selbst.
- Gehe in dieser Session nicht in `P3`.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase2_retuning_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_calibration.md`
- `docs/pipelines/anomaly_local_v1/phase2_harness.md`
- `docs/pipelines/anomaly_local_v1/phase2_verification.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/ml/rollups.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/hooks/useApi.ts`

Verbindliche Retuning-Ziele:

1. Duenn gestuetzte vorhandene `main_cluster` duerfen kein `high` Reliability-Band mehr erzeugen.
2. `track_agreement_score < 0.25` muss Reliability sichtbar senken oder mindestens als Diagnoseflag sichtbar werden.
3. `track_agreement_score < 0.10` muss besonders streng behandelt werden; pruefe einen Band-Cap auf `low`.
4. Neue Diagnoseursachen muessen maschinenlesbar in `building_rollup` landen.
5. Alte Diagnosemittelwerte duerfen nicht wieder primaere Building-Semantik werden.
6. `main_cluster`-Auswahl und `differential_motion_flag`-Schwelle bleiben unveraendert, ausser ein Ticket weist eine harte Regression nach.

Verbindliche Supervisor-Regeln:

1. Lies zuerst den Status von `phase2_execution_plan.md` und `phase2_retuning_plan.md`.
2. Bestimme die naechste zulaessige Welle: fuer diese Session ist das `P2R-W1`.
3. Setze `P2R` beim Start auf `in_progress`, falls der Planstatus noch `planned` ist.
4. Starte mit `P2R-W1-T1`.
5. Starte `P2R-W1-T2` erst, wenn `P2R-W1-T1` gruen integriert ist.
6. Starte `P2R-W2-T1` erst, wenn beide `P2R-W1`-Tickets gruen sind.
7. Gib jedem Agent nur:
   - Ticket-ID
   - Ziel
   - Scope
   - DoD
   - Abhaengigkeiten
   - Write-Set
   - relevante Dateien
   - relevante Kalibrationsbefunde aus `phase2_calibration.md`
8. Verlange von jedem Agent am Ende:
   - Ticket-Status: `green`, `red` oder `inconclusive`
   - geaenderte Dateien
   - DoD-Evidenz
   - lokale Verifikation
   - offene Risiken
9. Pruefe Rueckgaben vor allem auf Integrations-, Anschluss- und Plausibilitaetsebene.
10. Wenn ein Ticket `red` oder `inconclusive` ist, stoppe die Welle und dokumentiere den Blocker.
11. Aktualisiere nach jeder gruenen Welle den Planstatus.
12. Stoppe nach Abschluss von `P2R`; starte `P3` nicht ohne neues User-Gate.

Ticket-Reihenfolge:

1. `P2R-W1-T1`: Reliability-Retuning in der Pipeline
2. `P2R-W1-T2`: API/UI-Anschluss fuer Retuning-Diagnosen
3. `P2R-W2-T1`: Harness-Rerun und Kalibrationsabschluss

Erwartete konkrete Umsetzung:

- Implementiere `weak_secondary_track_flag` im kanonischen `building_rollup`.
- Implementiere `agreement_tension_flag` im kanonischen `building_rollup`.
- Implementiere eine nachvollziehbare `reliability_penalties`-Struktur oder ein gleichwertiges maschinenlesbares Diagnosefeld.
- Wende mindestens diese Retuning-Defaults an:
  - `-0.10`, wenn ein vorhandener Track-`main_cluster` weniger als `3` nicht ausgeschlossene Punkte traegt
  - `-0.10`, wenn `track_agreement_score < 0.25`
  - pruefe Band-Cap `low`, wenn `track_agreement_score < 0.10`
  - Band-Cap `medium`, wenn `weak_secondary_track_flag=true`
- Mache die neuen Felder in API/Harness sichtbar.
- Wenn Frontend-Dateien angepasst werden, zeige die Flags im Inspector knapp im Reliability-/Diagnosebereich.

Verifikation:

- Fuehre mindestens aus:
  - `backend/.venv/bin/python -m compileall backend/app`
  - `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness`
- Wenn Frontend-Dateien geaendert wurden:
  - `cd frontend && npm run build`
- Wenn Pipeline-Rollup-Logik geaendert wurde, erzeugt neue Live-Runs fuer:
  - Mirabell
  - Moosstrasse
  - Osthang-Stressbereich
- Dokumentiere in `phase2_retuning_verification.md` mindestens:
  - Vorher/Nachher fuer `548205`
  - Vorher/Nachher fuer `96637447`
  - Vorher/Nachher fuer `96637522`
  - Vorher/Nachher fuer `96637488`
  - Vorher/Nachher fuer `96959854`
  - Vorher/Nachher fuer `96637551`
  - Vorher/Nachher fuer `395674088`
  - Anzahl `ok`/`high`-Faelle mit duennem Track-Support
  - Anzahl `ok`-Faelle mit `track_agreement_score < 0.25`

Erwartete Abschlussartefakte:

- Code-Delta fuer Retuning
- aktualisierte API/UI/Harness-Anschluesse, falls noetig
- neue oder aktualisierte Harness-Artefakte
- `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`
- aktualisierte `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- aktualisierte `docs/pipelines/anomaly_local_v1/phase2_retuning_plan.md`
- optional aktualisierte `docs/pipelines/anomaly_local_v1/iterations.md`

Abschlusskriterium:

Die Session endet erst, wenn `P2R` abgeschlossen oder ein harter Blocker dokumentiert ist.
Bei erfolgreichem Abschluss steht `P2R` auf `green`, `P3` bleibt `planned`, und der Supervisor stoppt.
```

## Empfohlene Nutzung

1. Neue Session im Repo starten.
2. Nur dies eingeben:
   `Lies docs/pipelines/anomaly_local_v1/phase2_retuning_supervisor_prompt.md und fuehre es vollstaendig aus.`
3. Den Supervisor autonom `P2R` abarbeiten lassen.

## Erwartung an den Supervisor

Der Supervisor soll:

- den Retuning-Plan als Zustandsmaschine lesen,
- die Kalibrationsbefunde aus `P2` als verbindliche Problemdefinition behandeln,
- Tickets sauber delegieren,
- nur `green` integrieren,
- Harness und AOI-Basis als Gate verwenden,
- Planstatus fortschreiben,
- und vor `P3` stoppen.
