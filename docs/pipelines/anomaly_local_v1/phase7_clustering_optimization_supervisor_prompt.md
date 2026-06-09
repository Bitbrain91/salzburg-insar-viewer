# Supervisor Prompt fuer Phase 7 / Optimierungsphase 1

Dieses Dokument ist die alleinige Eintrittsstelle fuer eine neue Supervisor-Session.

Minimaler Startprompt:

`Lies docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer Phase 7 der Pipeline
`anomaly_local_v1`, auch "Optimierungsphase 1" genannt.

Ziel:
Setze den Plan
`docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_plan.md`
vollstaendig um.

Kernauftrag:

1. Verstehe die bestehende InSAR-Viewer-Anwendung und `anomaly_local_v1`.
2. Friere die aktuelle Clustering-Baseline reproduzierbar ein.
3. Recherchiere und dokumentiere die fachliche Basis fuer Clustering ohne Ground
   Truth, HDBSCAN/Alternativen, InSAR-Cross-Track-Evaluation und visuelle
   Luftbild-/Satellitenbild-Audits.
4. Baue einen Experiment-Harness und eine Scorecard, die nicht nur interne
   Clustering-Metriken misst, sondern auch Stabilitaet, Cross-Track-Support,
   Bad-Gastein/TSX-PAZ als High-Resolution-Pseudo-Referenz und visuelle
   Plausibilitaet.
5. Teste HDBSCAN-Parameter, Feature-Sets, Small-N-Logik, Borderline-Noise-
   Reassignment, Alternativalgorithmen und High-N-/TSX-PAZ-spezifische Strategien
   getrennt.
6. Nutze Bad Gastein zuerst auf flachen AOIs als Pseudo-Referenz-Test und erst
   danach Hang-AOIs als Blickrichtungs-/Topografie-Stress.
7. Fuehre in V1 einen KI-Agenten-gestuetzten optischen Audit ueber Playwright-
   Screenshots des Viewers durch.
8. Integriere produktiv nur dann, wenn genau ein Kandidat alle Guardrails klar
   schlaegt. Sonst dokumentiere `keep_current`, `defer` oder `inconclusive`.

Arbeitsmodell:

- Behandle den Plan als Scheduler-Eingabe:
  `Plan -> Phase -> Welle -> Ticket`.
- Nutze Subagents aktiv und strikt.
- Delegiere Ticket-Arbeiten an Subagents.
- Der Supervisor ist Scheduler, Gatekeeper, Integrator und Abschlussentscheider,
  nicht primaerer Ticket-Implementierer.
- Starte alle delegierten Agents mit `gpt-5.5` und reasoning effort `xhigh`.
- Keine Mini-, Nano- oder sonstigen kleineren Modelle.
- Falls `gpt-5.5` nicht verfuegbar ist, stoppe und melde den Modell-Blocker.
- Verlange von jedem Agent:
  - Ticket-Status `green`, `red` oder `inconclusive`,
  - geaenderte Dateien,
  - DoD-Evidenz,
  - verwendete Kommandos/SQL/API-Endpunkte,
  - lokale Verifikation,
  - wichtigste Metriken,
  - offene Risiken,
  - Empfehlung fuer das naechste Gate.
- Halte den Supervisor-Kontext klein und verlange kompakte Evidenz statt
  Rohdaten-Dumps.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_plan.md`
- `docs/workflows/ai_supervisor_workflow.md`
- `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`
- `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`
- `README.md`
- `docs/project/Projektziel_InSAR_Building_Intelligence.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/hdbscan_testgebiete_verification.md`
- `docs/pipelines/anomaly_local_v1/phase2_harness.md`
- `docs/pipelines/anomaly_local_v1/phase2_calibration.md`
- `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`
- `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
- `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
- `docs/bad_gastein_integration_verification.md`
- `pipeline/areas_manifest.json`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/ml/track_geometry.py`
- `backend/app/ml/cli.py`
- `backend/requirements.txt`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/PipelinePanel.tsx`

Pflichtquellen fuer aktualisierte Web-Recherche:

- HDBSCAN Parameter Selection:
  https://hdbscan.readthedocs.io/en/latest/parameter_selection.html
- scikit-learn Clustering Metrics:
  https://scikit-learn.org/stable/modules/clustering.html
- Liu, Yu, Blair 2022, Stability estimation for unsupervised clustering:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9787023/
- Tibshirani/Walther, Prediction Strength:
  https://statistics.stanford.edu/technical-reports/cluster-validation-prediction-strength
- Crosetto et al. 2016, Persistent Scatterer Interferometry review:
  https://www.sciencedirect.com/science/article/pii/S0924271615002415
- Copernicus EGMS Algorithm Theoretical Basis Document:
  https://land.copernicus.eu/en/technical-library/egms-algorithm-theoretical-basis-document/@@download/file
- ESA SNAP Horizontal/Vertical Motion operator:
  https://step.esa.int/main/wp-content/help/versions/9.0.0/snap-toolboxes/org.esa.s1tbx.s1tbx.op.insar.ui/operators/HorizontalVerticalMotionOp.html
- Segment Anything:
  https://arxiv.org/abs/2304.02643
- Segment anything, from space?:
  https://arxiv.org/abs/2304.13000

Handbook-Regeln, die fuer alle Tickets gelten:

- SqueeSAR-Messpunkte sind PS oder DS. PS sind punktweise Scatterer, DS sind
  homogene Flaechen/Patches. Nutze `eff_area` oder ein abgeleitetes
  `scatterer_type`, wenn diese Information verfuegbar ist.
- SNT und TSX/PAZ haben unterschiedliche Geokodierungsgenauigkeit. HR-Pseudo-
  Referenz darf keine exakte Punkt-zu-Punkt-Uebereinstimmung erzwingen.
- Aktuelle Datenlage vom 2026-06-09:
  - Salzburg/SNT und Bad-Gastein/SNT sind nach `eff_area` nur PS-like.
  - Bad-Gastein/TSX-PAZ enthaelt DS-like Punkte mit `eff_area > 0`.
  - AMP-Features sind aktuell nur fuer Salzburg/SNT geladen.
  - Bad-Gastein/SNT und TSX/PAZ duerfen in Phase 7 keine AMP-Features
    voraussetzen.
- Bewegungen sind relativ zu Referenzpunkt und erstem Akquisitionsdatum. Absolute
  Werte zwischen unabhaengigen Prozessierungen nur vergleichen, wenn
  Referenzpunkt, Zeitraum und Zeitnullpunkt kompatibel sind.
- `coherence` ist nicht direkt zwischen unabhaengigen SqueeSAR-Prozessierungen
  vergleichbar. Fuer Cross-Dataset-Fragen nur innerhalb-Dataset-/Track-
  Normalisierung verwenden.
- `h_stdev`, `v_stdev`, `a_stdev`, `s_amp_std`, `s_phs_std`, `eff_area` und
  `incidence_angle` sind zuerst auf Verfuegbarkeit in Rohdaten, Parquet und
  PostGIS zu auditieren, bevor ein Agent sie als Feature nutzt.
- Layover, Foreshortening, Shadowing, Datenluecken und Phase-Unwrapping-Risiko
  sind keine Randnotizen, sondern moegliche Gruende, Cross-Track- oder Visual-
  Audit-Befunde als unsicher zu markieren.

Aktueller technischer Startpunkt:

- Produktiver Clustering-Code:
  `backend/app/ml/pipelines/anomaly_local_v1.py`.
- Bad-Gastein/SNT Track 22 ist durch AUGMENTERRA bestaetigt und im Code als
  verifizierter Descending Track integriert:
  - Blickrichtung `280.2 deg`
  - Sensor-Bearing `100.2 deg`
  - Einfallswinkel `45.66 deg`
  - `direction_dependent_ml=True`
- Density-Clustering ab `>= 6` kept points pro `Gebaeude x Track`.
- Small-N-Fallback bei `3-5`.
- `< 3` ist `insufficient_support`.
- HDBSCAN-Parameter:
  - `allow_single_cluster=True`
  - `cluster_selection_method="eom"`
  - `min_cluster_size=max(2, min(8, ceil(0.2 * n)))`
  - `min_samples=max(1, floor(min_cluster_size / 2))`
  - `metric="euclidean"`
- Aktuelle Cluster-Matrix:
  - `along_look_offset_m` Gewicht `1.10`
  - `cross_look_offset_m` Gewicht `1.00`
  - `height_rank_in_building` Gewicht `0.75`
  - `velocity` Gewicht `1.30`
  - `acceleration` Gewicht `0.90`
  - `coherence_penalty` Gewicht `0.80`
  - `RobustScaler(quantile_range=(15, 85))`
- Borderline-Noise-Reassignment existiert.
- `P6` hat `keep_2d_vector` entschieden; Candidate-Area-Geometrie ist nicht
  primaeres Thema.

Verbindliche Nicht-Ziele:

- Kein DTM/DSM/nDSM-Upgrade als Voraussetzung.
- Kein Umbau der `P6`-Track-Geometrie.
- Kein MatchSAR-/AUGMENTERRA-Warten als Blocker.
- Kein breiter UI-Refactor.
- Keine globale Stadt-BBox als primaere Optimierungsbasis.
- Kein Rueckfall auf `anomaly_v1`.
- Keine produktive Algorithmusaenderung vor `P7-E-W1-T1`.
- Keine vollautomatische Luftbildsegmentierung als Produktfeature in dieser Phase.

Pflicht-AOIs Salzburg:

- Mirabell: `13.04027,47.80375,13.04387,47.80735`
- Moosstrasse: `13.02714,47.79189,13.03074,47.79549`
- Osthang-Stressbereich: `13.0492,47.8036,13.0528,47.8054`

Start-AOIs Bad Gastein:

- `bg_flat_01`: `13.132531,47.106449,13.135531,47.109449`
- `bg_flat_02`: `13.117531,47.091449,13.120531,47.094449`
- `bg_flat_03`: `13.138531,47.124449,13.141531,47.127449`
- `bg_flat_04`: `13.135531,47.127449,13.138531,47.130449`
- `bg_slope_01`: `13.138531,47.118449,13.141531,47.121449`
- `bg_slope_02`: `13.135531,47.115449,13.138531,47.118449`
- `bg_slope_03`: `13.141531,47.121449,13.144531,47.124449`

Die Bad-Gastein-AOIs sind initiale Kandidaten aus einer zellbasierten
PostGIS-Voranalyse. Verifiziere sie in `P7-A-W1-T3` mit exakter Pipeline- und
Building-Semantik, bevor sie als finaler AOI-Katalog verwendet werden.

CLI-Beispiele:

```bash
backend/.venv-wsl/bin/python -m backend.app.ml.cli \
  --pipeline anomaly_local_v1 \
  --area-id salzburg \
  --dataset-id salzburg_snt \
  --source gba \
  --bbox 13.04027,47.80375,13.04387,47.80735
```

```bash
backend/.venv-wsl/bin/python -m backend.app.ml.cli \
  --pipeline anomaly_local_v1 \
  --area-id bad_gastein \
  --dataset-id bad_gastein_snt \
  --source gba \
  --bbox 13.132531,47.106449,13.135531,47.109449
```

```bash
backend/.venv-wsl/bin/python -m backend.app.ml.cli \
  --pipeline anomaly_local_v1 \
  --area-id bad_gastein \
  --dataset-id bad_gastein_tsx_paz \
  --source gba \
  --bbox 13.132531,47.106449,13.135531,47.109449
```

Interpreterregel:

- Bevorzugt `backend/.venv-wsl/bin/python`.
- Falls nicht vorhanden, nutze `backend/.venv/bin/python` und dokumentiere es.
- Zu Beginn pruefen:

```bash
backend/.venv-wsl/bin/python - <<'PY'
import hdbscan
print("hdbscan", hdbscan.__version__)
PY
```

DB-/Service-Regel:

- Pruefe PostGIS und MLflow.
- Falls nicht laufend: `docker compose up -d`.
- Wenn DB danach nicht erreichbar ist, markiere Live-Run-Tickets `red` oder
  `inconclusive` mit konkreter Reproduktion.
- Arbeite nur an rein dokumentarischen oder code-lokalen Tickets weiter, wenn
  deren harte Abhaengigkeiten erfuellt sind.

Visual-Audit-Regel:

- Nutze Playwright-MCP fuer den Viewer, sobald ein Visual-Audit-Ticket freigeschaltet ist.
- Starte Backend/Frontend, wenn noetig.
- Screenshots muessen Satelliten-/Luftbildbasemap, GBA-Umriss, Cluster-Huellen,
  Punkte, Noise/Gate und Trackfilter sichtbar machen.
- Pro Audit-Fall strukturiert labeln:
  - `plausible_main_roof_cluster`
  - `possible_carport_merge`
  - `possible_outbuilding_as_main`
  - `track_part_mismatch`
  - `offset_expected_due_to_sar_geometry`
  - `ambiguous_visual`
  - `needs_human_review`
- Diese Labels sind qualitative Evidence, keine numerische Ground Truth.

Wellenfolge:

1. `P7-A`: Baseline, Research, AOI-Katalog, Referenzfaelle.
2. `P7-B`: Experiment-Harness, Scorecard, Stabilitaet, High-Resolution-
   Pseudo-Referenz, Visual-Audit-Workflow.
3. `P7-C`: HDBSCAN, Features, Small-N, Reassignment, Alternativen, High-N.
4. `P7-D`: Shortlist, volle Scorecard, Visual-Audit der Kandidaten.
5. `P7-E`: Entscheidung und bedingte Integration.
6. `P7-F`: Abschlussbericht und Folgeplanung.

Experimentregeln:

- Veraendere in `P7-A` bis `P7-D` keine produktiven Defaults.
- Experimentcode bevorzugt unter `backend/app/ml/evaluation/`.
- Artefakte unter `docs/pipelines/anomaly_local_v1/artifacts/phase7_*`.
- Jede Variante braucht eine explizite Experiment-ID.
- Jede Variante berichtet:
  - Parameter-/Feature-Delta,
  - AOI-Metriken,
  - Referenzfall-Metriken,
  - Stabilitaet,
  - HR-Pseudo-Referenz,
  - Visual-Audit-Belege, soweit freigeschaltet,
  - Guardrail-Flags,
  - Entscheidung `candidate_green`, `candidate_red`, `candidate_inconclusive`.
- Niedrigere Noise-Rate allein ist kein Erfolg.
- Multi-Cluster-/Differential-Motion-Faelle duerfen nicht weggeglattet werden.
- nearest-heavy Gebaeude duerfen nicht scheinbar gesundgerechnet werden.
- Cross-Track-Vergleich ist nur mit Support-/Coverage-Gates zu bewerten.
- Bad-Gastein-Flach-AOIs sind Kalibrierungs-Gates; Hang-AOIs sind Stress- und
  Diagnose-Gates.

Pflichtartefakte:

- `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_research_matrix.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_aoi_catalog.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_baseline_summary.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_reference_cases.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_experiment_matrix.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_cases.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`

Optionale Artefakte:

- `backend/app/ml/evaluation/phase7_clustering_experiments.py`
- `backend/app/ml/evaluation/phase7_visual_audit_export.py`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.md`
- Screenshots `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`

Mindestpruefungen:

- `git status --short --branch`
- Python-/`hdbscan`-Importcheck
- DB-/MLflow-Erreichbarkeit
- `backend/.venv-wsl/bin/python -m compileall backend/app`
- `git diff --check`

Bei produktiver Pipelineaenderung zusaetzlich:

- neue Runs fuer alle Salzburg-Pflicht-AOIs,
- neue Runs fuer mindestens `bg_flat_01`, `bg_flat_02`, `bg_slope_01`,
- Harness-/Scorecard-Rerun,
- Methodik/Runbook/Iterations aktualisiert,
- `MODEL_SET_VERSION` geprueft/aktualisiert.

Bei Frontend-Aenderung:

- `cd frontend && npm run build`
- Playwright-Screenshots fuer mindestens einen Salzburg- und einen Bad-Gastein-Fall.

Abschlusskriterium:

Die Session endet erst, wenn `P7` einen integrierten Abschlussbericht mit klarer
Entscheidung hat oder ein harter Blocker dokumentiert ist.

Erlaubte Abschlussentscheidungen:

- `keep_current`
- `integrate_candidate`
- `defer`
- `inconclusive`

Wenn die Entscheidung nicht `integrate_candidate` ist, duerfen keine produktiven
Algorithmusaenderungen zurueckbleiben.
```

## Erwartung an den Supervisor

Der Supervisor soll diese Phase als kontrollierte Forschungs- und
Integrationsschleife behandeln:

1. messen,
2. evaluieren,
3. Varianten isoliert testen,
4. visuell gegenpruefen,
5. entscheiden,
6. nur bei klarer Evidenz integrieren.

Die groesste Gefahr ist ein scheinbar besseres Clustering, das fachliche
Grenzfaelle nur wegmittelt. Genau das muessen Scorecard und Visual-Audit verhindern.
