# Supervisor-Session-Strategie fuer `anomaly_local_v1`

## Ziel
Diese Strategie ist fuer einen autonomen Research- und Implementation-Run gedacht, bei dem ein Supervisor kleine Subtasks an Subagents delegiert, den Kontext klein haelt und Ergebnisse systematisch verifiziert.

Die Strategie ist auf den aktuellen Stand von `anomaly_local_v1` zugeschnitten:

- Core-Pipeline: `backend/app/ml/pipelines/anomaly_local_v1.py`
- Run/Tracking: `backend/app/ml/cli.py`, `backend/app/ml/runner.py`
- API/UI-Auswertung: `backend/app/routers/ml.py`, `frontend/src/components/InspectorPanel.tsx`, `frontend/src/components/PipelinePanel.tsx`
- Doku-Basis: `docs/pipelines/anomaly_local_v1/methodik.md`, `docs/pipelines/anomaly_local_v1/runbook.md`, `docs/pipelines/anomaly_local_v1/next_steps.md`
- Research-Basis: `docs/archive/legacy/deep_research_neu/Deep_Research_Claude.md`

## Empfohlene Reihenfolge

### Wave 0: Baseline und Entscheidungsgrundlage
Diese Wave sollte zuerst laufen, weil sie die spaeteren Umbauschritte fachlich und technisch absichert.

1. `T1 Baseline + Eval Harness`
2. `T2 Pipeline-vs-Research Gap Matrix`
3. `T6 Experten-Ground-Truth-Paket vorbereiten`
4. `T7 MatchSAR-Fragenpaket vorbereiten`
5. `T8 Terrain/DTM-Scoping`

Begruendung:

- Punkt `7` aus den Next Steps sollte fachlich vor groesseren Umbauten eingeholt werden.
- Punkt `6` und `4` brauchen externen Input und sollten frueh gestartet werden, obwohl sie nicht sofort im Code enden.
- Punkt `9` ist ein Scoping-Thema; dafuer reicht zunaechst Recherche plus Integrationsplan.

### Wave 1: Kernverbesserung der Pipeline
Diese Themen gehoeren zusammen und sollten in enger Folge umgesetzt werden.

6. `T3 Gebaeude-Scoring`
7. `T4 Multi-Cluster-Handling`
8. `T5 API/UI-Anpassungen fuer Gebaeude- und Cluster-Semantik`

Begruendung:

- Gebaeude-Scoring ohne Multi-Cluster-Logik waere fachlich zu grob.
- Multi-Cluster ohne API/UI-Sichtbarkeit waere kaum pruefbar.
- Diese drei Tasks teilen denselben Datenpfad und sollten als ein kontrollierter Block integriert werden.

### Wave 2: Kontextsignale erweitern
Diese Themen bauen auf einem stabilen Gebaeude-Level-Core auf.

9. `T9 Aspect/Hangexposition in Phase 2a`
10. `T10 Nachbargebaeude-Kontext in Phase 2b`

Begruendung:

- Aspect ist ein relativ lokaler Zusatz und kann frueher eingebaut werden.
- Nachbargebaeude-Kontext braucht eine stabile erste Gebaeude-/Cluster-Semantik und ist eher ein zweiter Pass.

### Wave 3: Vergleichs- und Research-Loops
Diese Wave dient der systematischen Nachpruefung und dem Feinschliff.

11. `T11 KI-Agenten-Benchmark`
12. `T12 Ground-Truth-Auswertung und Retuning`

Begruendung:

- Ein Agentenvergleich ist erst sinnvoll, wenn Baseline, Artefakte und Vergleichsschema stehen.
- Retuning gegen Expertenlabels sollte auf bereits sauber instrumentierte Outputs aufsetzen.

## Supervisor Workflow

1. Supervisor liest nur die minimalen Steuerdokumente: diese Datei, `docs/pipelines/anomaly_local_v1/methodik.md`, `docs/pipelines/anomaly_local_v1/runbook.md`, `docs/pipelines/anomaly_local_v1/next_steps.md`.
2. Supervisor legt einen Run-Backlog mit exakt einer aktiven Task an und delegiert dann nur kleine, klar abgegrenzte Subtasks.
3. Jeder Subagent bekommt nur die fuer seine Task noetigen Dateien, AOIs, Befehle und Abnahmekriterien.
4. Research-Tasks und Implementation-Tasks werden getrennt gehalten; erst Research-Artefakt, dann Code-Artefakt.
5. Nach jeder Task prueft der Supervisor Artefakte, liest Diffs, fordert bei Luecken eine Nachbesserungsrunde an und integriert erst dann.
6. Nach jeder integrierten Implementation laeuft eine feste Verifikationsschleife auf denselben AOIs.
7. Der Supervisor fuehrt ein kurzes Log in einer Markdown-Datei, damit spaetere Subagents keinen grossen historischen Kontext brauchen.
8. Externe Abhaengigkeiten wie AUGMENTERRA-Input werden als blockierende oder nicht-blockierende Entscheidungen markiert; der Supervisor haelt die Codearbeit trotzdem in Bewegung.

## Delegierbare Subtasks mit kleinem Kontext

| ID | Typ | Reihenfolge | Kleiner Kontext | Ziel | Artefakte |
|---|---|---:|---|---|---|
| `T1` | Eval | 1 | `anomaly_local_v1.py`, `cli.py`, `runner.py`, `runbook.md` | Reproduzierbare Baseline auf festen AOIs und Metrik-Extraktion | `docs/pipelines/anomaly_local_v1/baseline.md`, optional `backend/app/ml/eval/` Helfer, AOI-Metriktabelle |
| `T2` | Research | 2 | `anomaly_local_v1.py`, `methodik.md`, `Deep_Research_Claude.md` | Gap Matrix: aktuelles Verhalten vs. Literatur/Research vs. empfohlene Aenderung | `docs/pipelines/anomaly_local_v1/gap_matrix.md` |
| `T6` | External prep | 3 | `next_steps.md`, `methodik.md`, `runbook.md` | Paket fuer Experten-Ground-Truth definieren | `docs/pipelines/anomaly_local_v1/augmenterra_ground_truth_request.md`, CSV/JSON-Schema fuer Labels |
| `T7` | External prep | 4 | `next_steps.md`, `methodik.md`, `anomaly_local_v1.py` | Praezises Fragenpaket fuer MatchSAR-Abgleich | `docs/pipelines/anomaly_local_v1/augmenterra_matchsar_questions.md` |
| `T8` | Research | 5 | `pipeline/prepare_terrain.py`, `building_terrain_context` Nutzung in Code, lokale Doku | DTM/DSM/nDSM-Optionen, Datenquellen, Integrationsrisiko | `docs/pipelines/anomaly_local_v1/terrain_model_evaluation_plan.md` |
| `T3` | Impl | 6 | `anomaly_local_v1.py`, `ml.py`, `schemas.py` | Gebaeude-Level-Scoring mit Konfidenz und klaren Outputs | Code + `docs/pipelines/anomaly_local_v1/building_scoring.md` |
| `T4` | Impl | 7 | `anomaly_local_v1.py`, `ml.py`, `schemas.py` | Multi-Cluster-Semantik, Hauptcluster, `differential_motion_flag` | Code + `docs/pipelines/anomaly_local_v1/multicluster.md` |
| `T5` | Impl/UI | 8 | `ml.py`, `schemas.py`, `InspectorPanel.tsx`, `PipelinePanel.tsx`, ggf. `MapView.tsx` | Neue Gebaeude-/Cluster-Felder sichtbar und interpretierbar machen | Code + kurze UI-Abnahme-Notiz in `docs/pipelines/anomaly_local_v1/ui_notes.md` |
| `T9` | Impl/Research | 9 | `anomaly_local_v1.py`, Terrain-Kontext-Pfade, `prepare_terrain.py` | Aspect/Hangexposition zuerst als Feature und Toleranzsignal integrieren | Code + `docs/pipelines/anomaly_local_v1/aspect_plan.md` |
| `T10` | Impl | 10 | `anomaly_local_v1.py`, `ml.py`, ggf. SQL-Zugriffe fuer Nachbargebaeude | Zweiter Pass fuer Nachbargebaeude-Kontext und Fehlzuordnungsflags | Code + `docs/pipelines/anomaly_local_v1/neighbor_context.md` |
| `T11` | Eval/Research | 11 | Exportformat aus `T1/T3/T4`, ausgewaehlte Gebaeude | Strukturierter KI-Agenten-Vergleich fuer schwierige Faelle | `docs/pipelines/anomaly_local_v1/agent_benchmark.md`, standardisiertes Building-Case-Format |
| `T12` | Eval | 12 | Expertenlabels aus `T6`, Baseline/Harness aus `T1` | Quantitative Auswertung und gezieltes Retuning | `docs/pipelines/anomaly_local_v1/ground_truth_eval.md`, Retuning-Vorschlag |

## Empfohlene Task-Gruppierung

### Gemeinsam umsetzen
- `T3 + T4 + T5`
- `T1 + T2`

Warum:

- `T3`, `T4` und `T5` sind derselbe fachliche Umbau entlang Pipeline, API und UI.
- `T1` und `T2` bilden zusammen die kleinste tragfaehige Entscheidungsbasis fuer Phase 2.

### Parallel starten
- `T6 + T7 + T8`

Warum:

- Diese drei Tasks blockieren keinen direkten Codeumbau, koennen aber lange externe oder Recherche-Zyklen haben.

### Erst spaeter starten
- `T10`, `T11`, `T12`

Warum:

- Sie profitieren stark von stabilen Gebaeude-Level-Artefakten und einer sauberen Baseline.

## Task-Artefakte im Detail

### `T1 Baseline + Eval Harness`
- Feste AOIs aus dem Runbook: Mirabell, Moosstrasse und Osthang-Stressbereich.
- Standard-Run fuer `track=all`, optional Zusatzlauf `track=44` und `track=95`.
- Tabelle mit mindestens:
  - `assigned_points`
  - `kept_points`
  - `noise_points`
  - `buildings_with_clusters`
  - `multi_cluster_buildings`
  - `buildings_with_both_tracks_kept`
  - `median_cross_track_diff_before`
  - `median_cross_track_diff_after`
- Liste von 10 schwierigen Referenzgebaeuden fuer spaetere Regression.

### `T2 Gap Matrix`
- Drei-Spalten-Sicht:
  - `Current pipeline`
  - `Research recommendation`
  - `Decision for this repo`
- Muss explizit behandeln:
  - Clustering-Ansatz
  - Feature-Set
  - Hard Gates
  - Cross-Track-Validierung
  - Gebaeude-Scoring
  - Multi-Cluster-Semantik
  - Nachbar-Kontext

### `T3 Gebaeude-Scoring`
- Neue Gebaeude-Level-Felder im API-Output.
- Dokumentierte Scoring-Formel mit Konfidenzkomponenten.
- Persistente Metadaten, damit die UI und spaetere Evaluation nicht aus Punktdaten rekonstruieren muessen.

### `T4 Multi-Cluster-Handling`
- Cluster-Rollen wie `primary`, `secondary`, `ancillary`, `noise` nur wenn fachlich begruendet.
- Feld fuer `differential_motion_flag`.
- Klare Regel, welche Cluster ins Gebaeude-Scoring eingehen.

### `T5 API/UI`
- Inspector zeigt Gebaeude-Level-Ergebnis, Konfidenz, Clusteranzahl, Hauptcluster und differenzielle Bewegung.
- Legacy-Felder, die `anomaly_local_v1` nicht befuellt, werden entfernt oder korrekt ersetzt; kein dauerhafter Legacy-Pfad fuer lokale Semantik.

### `T6 Experten-Ground-Truth`
- Anfragevorlage.
- Gebaeude-Stichprobenlogik.
- Dateiformat fuer Rueckgabe.
- Bewertungsleitfaden, damit die Labels konsistent bleiben.

### `T7 MatchSAR-Abgleich`
- Praezise Fragen mit Codebezug.
- Tabelle `unsere Annahme` vs. `benoetigte Bestaetigung`.

### `T8 Terrain-Plan`
- Liste realistischer Datenquellen fuer Salzburg/Oesterreich.
- Bewertung von Aufloesung, Lizenz, Vertikaldatum, Integrationskosten.
- Entscheidung, ob zunaechst `aspect` aus vorhandenem Terrain reicht oder DTM-Einbindung vorgezogen werden sollte.

### `T9 Aspect/Hangexposition`
- Aspect als Feature oder Kontextmetrik im Pipeline-Meta.
- Dokumentierte Regel, wo Aspect nur informiert und wo es Scores/Toleranzen wirklich beeinflusst.

### `T10 Nachbargebaeude-Kontext`
- Zweiter Pass oder Postprocessing-Architektur.
- Fehlzuordnungsflag gegen Nachbarcluster.
- Nachbarschafts-Event-Flag fuer gemeinsame Spruenge.

### `T11 KI-Agenten-Benchmark`
- Standardisiertes Inputformat pro Gebaeude.
- Vergleichsschema Pipeline vs. Agent.
- Klare Trennung von Exploration und finaler Bewertung.

### `T12 Ground-Truth-Auswertung`
- Precision/Recall/F1 fuer Outlier-/Zuordnungsfragen, soweit die Labels das tragen.
- Fehlerkategorien mit konkreten Rueckschluessen fuer Parameter oder Regeln.

## Regeln fuer Verifikation und Nachbesserung

### Global
1. Keine Task gilt als fertig ohne Markdown-Artefakt im Repo.
2. Keine Implementation gilt als fertig ohne Baseline-Vergleich auf denselben AOIs.
3. Der Supervisor akzeptiert keine rein verbale Behauptung; jede Aussage braucht Diff, Run-Metrik, API-Output oder UI-Nachweis.
4. Jede Task muss explizit notieren, welche offenen Fragen bleiben.
5. Jede Task muss angeben, welche Folge-Tasks von ihrem Ergebnis beeinflusst werden.

### Fuer Implementation-Tasks
1. Vorher/Nachher-Vergleich fuer Mirabell und Moosstrasse ist Pflicht; fuer Assignment-, Cluster-, Building-Score- und Cross-Track-Logik zusaetzlich auch fuer den Osthang-Stressbereich.
2. Es muessen mindestens drei konkrete Gebaeude-Faelle beschrieben werden:
   - stabil
   - grenzwertig
   - klarer Problemfall
3. Neue Felder muessen konsistent durch Pipeline, API, Schema und UI laufen; lokale Legacy-Reste werden nicht als Dauerprovisorium mitgeschleppt.
4. Wenn eine Aenderung Metriken verbessert, aber die Interpretierbarkeit verschlechtert, ist eine Nachbesserung noetig.
5. Wenn die Aenderung mehr als einen Datenpfad betrifft, soll ein separater Verifier-Subagent nur pruefen, ob Outputs konsistent sind.

### Fuer Research-Tasks
1. Keine generischen Literaturzusammenfassungen; jede Empfehlung muss auf eine konkrete Stelle im Repo gemappt werden.
2. Forschungsergebnisse muessen in `now / next / later` klassifiziert werden.
3. Wenn Research und bestehende Pipeline auseinanderlaufen, muss der Task eine konkrete Handlungsoption vorschlagen, nicht nur den Widerspruch beschreiben.

### Fuer externe Aufgaben
1. Fragen an AUGMENTERRA muessen so formuliert sein, dass die Antwort direkt in Code-Entscheidungen umgesetzt werden kann.
2. Externe Abhaengigkeiten werden als `blocking`, `informing` oder `nice_to_have` markiert.

### Nachbesserungsschleife
1. Supervisor liest Artefakt und Diff.
2. Supervisor prueft gegen die Abnahmekriterien.
3. Wenn etwas fehlt, geht dieselbe Task einmal gezielt in Revision.
4. Erst danach wird die naechste abhaengige Task gestartet.

## Minimaler Session-Zustand fuer den Supervisor
Der Supervisor sollte dauerhaft nur diese kompakten Artefakte aktiv im Kontext halten:

- `docs/pipelines/anomaly_local_v1/supervisor_session_strategy.md`
- laufendes Fortschrittslog, z. B. `docs/pipelines/anomaly_local_v1/supervisor_log.md`
- die jeweils aktuelle Task-Definition
- die letzte Verifikationsnotiz

Alles andere soll bei Bedarf neu geladen werden.

## Kompakter Startprompt fuer die neue Session
Siehe separate Datei `docs/pipelines/anomaly_local_v1/supervisor_startprompt.md`.
