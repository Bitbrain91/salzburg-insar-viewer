# Supervisor Prompt fuer die Phase-3-Neighbourhood-Session

Der folgende Prompt ist fuer eine eigenstaendige Phase-3-Session gedacht. Er ist auf
`docs/pipelines/anomaly_local_v1/phase3_neighbourhood_plan.md`, den abgeschlossenen
`P2R`-Stand und den aktuellen Code abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/phase3_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-3-Neighbourhood-Session von `anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P3` aus `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_plan.md` autonom um.

Diese Prompt-Datei ist die operative Freigabe fuer den Start von `P3` nach abgeschlossenem `P2R`.
Wenn du diese Datei ausfuehrst, gilt das User-Gate nach `P2R` als erfuellt.

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
- Gehe in dieser Session nicht in `P4`.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`
- `docs/pipelines/anomaly_local_v1/phase2_harness.md`
- `docs/pipelines/anomaly_local_v1/phase2_calibration.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/next_steps.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/deep_research_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/ml/rollups.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/hooks/useApi.ts`

Verbindliche P3-Ziele:

1. Implementiere einen zweiten Nachbarschafts-Pass nach den eingefrorenen `P2R`-Rollups.
2. Unterscheide moegliche Fehlzuordnung von echter Nachbarschafts-/Block-Event-Konsistenz.
3. Fuehre keine direkte Punkt-Umbuchung auf Nachbargebaeude aus.
4. Schreibe neue Ergebnisse als additive, maschinenlesbare Diagnosefelder.
5. Veraendere `main_cluster`, `differential_motion_flag` und `building_reliability_score` nicht durch Rueckkopplung aus `P3`.
6. Halte `P4` Terrain-/Aspect-Logik komplett ausserhalb dieser Session.
7. Nutze Mirabell, Moosstrasse und Osthang-Stressbereich als Pflicht-AOI-Basis.

Verbindliche Supervisor-Regeln:

1. Lies zuerst den Status von `phase2_execution_plan.md` und `phase3_neighbourhood_plan.md`.
2. Bestimme die naechste zulaessige Welle: fuer diese Session ist das `P3-W1`.
3. Setze `P3` beim Start auf `in_progress`, falls der Planstatus noch `planned` ist.
4. Starte mit `P3-W1-T1`.
5. Starte `P3-W2-T1` erst, wenn `P3-W1-T1` gruen integriert ist.
6. Starte `P3-W3-T1` und `P3-W3-T2` erst, wenn `P3-W2-T1` gruen integriert ist.
7. Gib jedem Agent nur:
   - Ticket-ID
   - Ziel
   - Scope
   - DoD
   - Abhaengigkeiten
   - Write-Set
   - relevante Dateien
   - relevante Befunde aus `P2R`
8. Verlange von jedem Agent am Ende:
   - Ticket-Status: `green`, `red` oder `inconclusive`
   - geaenderte Dateien
   - DoD-Evidenz
   - lokale Verifikation
   - offene Risiken
9. Pruefe Rueckgaben vor allem auf Zirkularitaet, Datenvertrag, UI/API-Anschluss und AOI-Plausibilitaet.
10. Wenn ein Ticket `red` oder `inconclusive` ist, stoppe die Welle und dokumentiere den Blocker.
11. Aktualisiere nach jeder gruenen Welle den Planstatus.
12. Stoppe nach Abschluss von `P3`; starte `P4` nicht ohne neues User-Gate.

Ticket-Reihenfolge:

1. `P3-W1-T1`: Nachbarschafts-Design und Datenvertrag
2. `P3-W2-T1`: Backend-Nachbarschafts-Pass
3. `P3-W3-T1`: API/UI-Anschluss
4. `P3-W3-T2`: Harness-Rerun und Abschlussverifikation

Erwartete konkrete Umsetzung:

- Erstelle `docs/pipelines/anomaly_local_v1/neighbourhood_design.md` mit:
  - Nachbarschaftsdefinition
  - Radius-/Kandidatenlimit
  - Feldvertrag
  - Fehlzuordnungslogik
  - Event-Konsistenzlogik
  - Zirkularitaetsgrenzen
  - AOI-Verifikation
- Implementiere bevorzugt einen `neighbour_context`-Container auf Point-/Record-Level.
- Ergaenze `building_rollup` mindestens um:
  - `neighbour_context_available`
  - `neighbour_misassignment_point_count`
  - `neighbour_event_flag`
  - `neighbour_event_score`
  - `neighbour_consistency_score`
  - `supporting_neighbour_count`
- Falls noetig, ergaenze `cluster_rollup` um minimale raeumliche Summaries wie Cluster-Zentroid oder BBox.
- Mache die neuen Felder in API/Harness sichtbar.
- Wenn Frontend-Dateien angepasst werden, zeige die Diagnosen im Inspector knapp im Building-/Cluster-Kontext.

Verifikation:

- Fuehre mindestens aus:
  - `backend/.venv/bin/python -m compileall backend/app`
  - `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness`
- Wenn Frontend-Dateien geaendert wurden:
  - `cd frontend && npm run build`
- Wenn Pipeline-Rollup- oder Nachbarschaftslogik geaendert wurde, erzeugt neue Live-Runs fuer:
  - Mirabell
  - Moosstrasse
  - Osthang-Stressbereich
- Dokumentiere in `phase3_neighbourhood_verification.md` mindestens:
  - neue Run-IDs oder begruendete Wiederverwendung der `P2R`-Runs
  - Anzahl Gebaeude mit verfuegbarem Nachbarschaftskontext
  - Anzahl Punkte/Gebaeude mit `neighbour_misassignment_flag`
  - Anzahl Gebaeude mit `neighbour_event_flag`
  - mindestens ein konkretes Fehlzuordnungsbeispiel oder eine begruendete Null-Fall-Analyse
  - mindestens ein konkretes Event-Konsistenzbeispiel oder eine begruendete Null-Fall-Analyse
  - Status der P2R-Referenzfaelle nach `P3`

Erwartete Abschlussartefakte:

- `docs/pipelines/anomaly_local_v1/neighbourhood_design.md`
- Code-Delta fuer den Nachbarschafts-Pass
- aktualisierte API/UI/Harness-Anschluesse, falls noetig
- neue oder aktualisierte Harness-Artefakte
- `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
- aktualisierte `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- aktualisierte `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_plan.md`
- optional aktualisierte `docs/pipelines/anomaly_local_v1/iterations.md`

Abschlusskriterium:

Die Session endet erst, wenn `P3` abgeschlossen oder ein harter Blocker dokumentiert ist.
Bei erfolgreichem Abschluss steht `P3` auf `green`, `P4` bleibt `planned`, und der Supervisor stoppt.
```

## Empfohlene Nutzung

1. Neue Session im Repo starten.
2. Nur dies eingeben:
   `Lies docs/pipelines/anomaly_local_v1/phase3_supervisor_prompt.md und fuehre es vollstaendig aus.`
3. Den Supervisor autonom `P3` abarbeiten lassen.

## Erwartung an den Supervisor

Der Supervisor soll:

- den Phase-3-Plan als Zustandsmaschine lesen,
- den `P2R`-Stand als eingefrorene fachliche Basis behandeln,
- Tickets sauber delegieren,
- nur `green` integrieren,
- Zirkularitaetsgrenzen aktiv pruefen,
- Harness und AOI-Basis als Gate verwenden,
- Planstatus fortschreiben,
- und vor `P4` stoppen.
