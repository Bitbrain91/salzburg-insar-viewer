# Supervisor Prompt fuer die Phase-4-Terrain-Aspect-Session

Der folgende Prompt ist fuer eine eigenstaendige Phase-4-Session gedacht. Er ist auf
`docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_plan.md`, den abgeschlossenen
`P3`-Stand und den aktuellen Code abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/phase4_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-4-Terrain-Aspect-Session von `anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P4` aus `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_plan.md` autonom um.

Diese Prompt-Datei ist die operative Freigabe fuer den Start von `P4` nach abgeschlossenem `P3`.
Wenn du diese Datei ausfuehrst, gilt das User-Gate nach `P3` als erfuellt.

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
- Starte keine `E0`-/MatchSAR-Arbeit und keine neue Phase ausserhalb von `P4`.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
- `docs/pipelines/anomaly_local_v1/neighbourhood_design.md`
- `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`
- `docs/pipelines/anomaly_local_v1/phase2_harness.md`
- `docs/pipelines/anomaly_local_v1/phase2_calibration.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/next_steps.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/deep_research_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md`
- `pipeline/prepare_terrain.py`
- `pipeline/load_terrain_context.py`
- `backend/sql/migrations/003_terrain_context.sql`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/routers/api.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/hooks/useApi.ts`

Verbindliche P4-Ziele:

1. Klaere zuerst die Terrainbasis fuer Salzburg/AT: DTM, DSM, nDSM, Aufloesung, Lizenz, Reproduzierbarkeit und Vertikaldatum.
2. Entscheide erst danach, ob Aspect in `anomaly_local_v1` nur Kontext bleibt oder als additive Diagnose-/Toleranzlogik eingeht.
3. Fuehre keine Terrain-/Aspect-Codeintegration vor einer dokumentierten Terrain- und Aspect-Entscheidung aus.
4. Nutze absolute Punkt-zu-Gelaende-Hoehendifferenzen nicht hart, solange Vertikaldatum und Hoehenbezug nicht geloest sind.
5. Veraendere die bestehende Terrain-/Relief-Karte nicht.
6. Veraendere `P3`-Nachbarschaftsdiagnosen nicht als Nebenwirkung von P4.
7. Nutze Mirabell, Moosstrasse und Osthang-Stressbereich als Pflicht-AOI-Basis, falls Code oder Scoring geaendert wird.

Verbindliche Supervisor-Regeln:

1. Lies zuerst den Status von `phase2_execution_plan.md` und `phase4_terrain_aspect_plan.md`.
2. Bestimme die naechste zulaessige Welle: fuer diese Session ist das `P4-W1`.
3. Setze `P4` beim Start auf `in_progress`, falls der Planstatus noch `planned` ist.
4. Starte mit `P4-W1-T1`.
5. Starte `P4-W2-T1` erst, wenn `P4-W1-T1` gruen integriert ist.
6. Starte `P4-W3-T1` nur, wenn `P4-W2-T1` explizit `diagnostic_only` oder `tolerance_logic` als jetzt zu implementierende Entscheidung freigibt.
7. Wenn `P4-W2-T1` `context_only` oder `defer` entscheidet, fuehre keine Codeintegration aus; dokumentiere die Phase als abgeschlossen oder blockiert gemaess Entscheidung.
8. Gib jedem Agent nur:
   - Ticket-ID
   - Ziel
   - Scope
   - DoD
   - Abhaengigkeiten
   - Write-Set
   - relevante Dateien
   - relevante Befunde aus `P3`
9. Verlange von jedem Agent am Ende:
   - Ticket-Status: `green`, `red` oder `inconclusive`
   - geaenderte Dateien
   - DoD-Evidenz
   - lokale Verifikation
   - offene Risiken
10. Pruefe Rueckgaben vor allem auf Datenquellenbelege, Vertikaldatum, Zirkularitaet, UI-Karten-Nichtziele und AOI-Plausibilitaet.
11. Wenn ein Ticket `red` oder `inconclusive` ist, stoppe die Welle und dokumentiere den Blocker.
12. Aktualisiere nach jeder gruenen Welle den Planstatus.
13. Stoppe nach Abschluss von `P4`; starte keine Folgephase ohne neues User-Gate.

Ticket-Reihenfolge:

1. `P4-W1-T1`: DEM-/Terrain-Entscheidung vorbereiten
2. `P4-W2-T1`: Aspect-Entscheidung und Regelentwurf
3. `P4-W3-T1`: optionale Aspect-/Terrain-Integration und Verifikation, nur falls freigegeben

Erwartete konkrete Umsetzung:

- Erstelle `docs/pipelines/anomaly_local_v1/terrain_decision.md` mit:
  - Status quo im Repo
  - Vergleich DTM/DSM/nDSM
  - Salzburg-/AT-Datenquellen mit Quelle, Lizenz und Reproduzierbarkeit
  - Vertikaldatum- und Hoehenbezug-Risiko
  - Entscheidung, ob der bestehende Terrain-Kontext fuer P4 reicht
  - Konsequenz fuer `anomaly_local_v1`
- Erstelle `docs/pipelines/anomaly_local_v1/aspect_decision.md` mit:
  - Entscheidung `context_only`, `diagnostic_only`, `tolerance_logic` oder `defer`
  - Begruendung
  - falls Integration: Datenvertrag, Regel/Formel, Schwellen, Verifikation
  - falls keine Integration: klare Begruendung und Folgeempfehlung
- Erstelle nur bei freigegebener Integration ein Code-Delta.
- Wenn Pipeline-Logik geaendert wird, dokumentiere die Abschlussverifikation in
  `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_verification.md`.

Recherche-Regel fuer Datenquellen:

- Wenn du aktuelle externe Terrain-/DEM-Quellen bewertest, pruefe aktuelle Primaerquellen.
- Priorisiere offizielle Quellen: Stadt/Land Salzburg, data.gv.at, BEV, Copernicus/ESA, NASA/USGS oder jeweilige Datenanbieter.
- Dokumentiere Links, Lizenzhinweise und Abrufdatum knapp in `terrain_decision.md`.

Verifikation:

- Fuehre mindestens aus, falls Code geaendert wurde:
  - `backend/.venv/bin/python -m compileall backend/app`
- Wenn Pipeline- oder Harness-Logik geaendert wurde:
  - `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness`
- Wenn Frontend-Dateien geaendert wurden:
  - `cd frontend && npm run build`
- Wenn Pipeline-Scoring oder Labels geaendert wurden, erzeuge neue Live-Runs fuer:
  - Mirabell
  - Moosstrasse
  - Osthang-Stressbereich
- Wenn nur Dokumente erstellt wurden, reicht ein Dokumentationsreview plus `git diff --check`.

Erwartete Abschlussartefakte:

- `docs/pipelines/anomaly_local_v1/terrain_decision.md`
- `docs/pipelines/anomaly_local_v1/aspect_decision.md`
- optional Code-Delta fuer Aspect-/Terrain-Integration
- optional aktualisierte API/UI/Harness-Anschluesse, falls ein neuer Datenvertrag sichtbar werden muss
- optional neue oder aktualisierte Harness-Artefakte
- optional `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_verification.md`
- aktualisierte `docs/pipelines/anomaly_local_v1/phase4_terrain_aspect_plan.md`
- aktualisierte `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- optional aktualisierte `docs/pipelines/anomaly_local_v1/iterations.md`

Abschlusskriterium:

Die Session endet erst, wenn `P4` abgeschlossen oder ein harter Blocker dokumentiert ist.
Bei erfolgreichem Abschluss steht `P4` auf `green`; bei vertagter Integration steht die
Entscheidung sauber dokumentiert und die naechste Folgearbeit ist benannt.
```

## Empfohlene Nutzung

1. Neue Session im Repo starten.
2. Nur dies eingeben:
   `Lies docs/pipelines/anomaly_local_v1/phase4_supervisor_prompt.md und fuehre es vollstaendig aus.`
3. Den Supervisor autonom `P4` abarbeiten lassen.

## Erwartung an den Supervisor

Der Supervisor soll:

- den Phase-4-Plan als Zustandsmaschine lesen,
- Terrainentscheidung vor Aspect-Integration erzwingen,
- Tickets sauber delegieren,
- nur `green` integrieren,
- Datenquellen und Vertikaldatum aktiv pruefen,
- bestehende Terrain-Karten unveraendert lassen,
- Harness und AOI-Basis als Gate verwenden, wenn Code geaendert wird,
- Planstatus fortschreiben,
- und vor Folgephasen stoppen.
