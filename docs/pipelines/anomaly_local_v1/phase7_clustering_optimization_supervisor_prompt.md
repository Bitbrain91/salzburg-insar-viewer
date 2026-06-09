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
4. Baue einen Experiment-Harness und eine Scorecard. Primaere
   Evaluationspfeiler (User-Entscheidung 2026-06-10): Cross-Track-Support
   mit Gates, Bad-Gastein/TSX-PAZ als High-Resolution-Pseudo-Referenz und
   Experten-/Visual-Validierung. Sensitivitaet/Konfidenz
   (Messrauschen-Perturbation via `velocity_std`, Leave-one-out ab n>=4,
   Bootstrap nur ab n>=8) ist Nebensignal; interne Metriken sind
   Nebenindikator. Kein Size-Penalty gegen legitime 2-Punkt-Cluster.
5. Teste HDBSCAN-Parameter, Feature-Sets, Small-N-Logik, Borderline-Noise-
   Reassignment, Assignment-Hygiene und High-N-/TSX-PAZ-spezifische
   Strategien getrennt. Algorithmus-Sequenz (User-Entscheidung 2026-06-10):
   ZUERST HDBSCAN-Sweep auswerten, DANN OPTICS als explizit waehlbare
   Variante vergleichen (`P7-C-W2-T1`), und erst danach weitere
   Clustering-Algorithmen als groesseren eigenen Part (`P7-C-W2-T3`,
   darf `defer` enden). Vorab entfernt `P7-A-W1-T5` den stillen
   OPTICS-Runtime-Fallback: `hdbscan` wird harte Dependency, fehlender
   Import ist harter Fehler, OPTICS niemals stiller Ersatz.
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
- Aktuelle Datenlage vom 2026-06-09 (verifiziert in Parquet UND PostGIS):
  - Salzburg/SNT und Bad-Gastein/SNT sind nach `eff_area` nur PS-like.
  - Bad-Gastein/TSX-PAZ enthaelt DS-like Punkte mit `eff_area > 0`
    (T70: 62,162/288,146; T93: 107,861/512,017; `eff_area` bis ~740 m²);
    in urbanen AOI-Zellen sinkt der DS-Anteil auf ~5-8 %.
  - AMP-Features sind aktuell nur fuer Salzburg/SNT geladen.
  - Bad-Gastein/SNT und TSX/PAZ duerfen in Phase 7 keine AMP-Features
    voraussetzen.
  - Beobachtungszeitraeume: Salzburg/SNT 2022-04..2025-03,
    Bad-Gastein/SNT 2022-10..2025-09 (T22/T44/T95 kompatibel),
    Bad-Gastein/TSX-PAZ 2021-05..2023-05. SNT vs. TSX/PAZ ueberlappen nur
    ~7.5 Monate: Bewegungsvergleiche SNT vs. TSX/PAZ sind nur qualitativ
    zulaessig; die HR-Pseudo-Referenz ist primaer raeumlich-strukturell.
  - Kohaerenzregime: Salzburg/SNT Median ~0.73 (Floor 0.45 schneidet ~3 %),
    Bad-Gastein/SNT Median ~0.49 (Floor schneidet 17-24 % aller Punkte!),
    TSX/PAZ Median ~0.62-0.65. Gate-Exklusionsraten je Dataset/Track in der
    Baseline ausweisen; Scorecard-Schwellen je Dataset kalibrieren.
  - Gemessene n-Regime-Verteilung (kept pro Gebaeude x Track):
    Salzburg/Mirabell 22/18/34/22/4 % fuer `<3/3-5/6-12/13-50/>50`;
    Bad-Gastein/SNT-Smoke 39/37/21/3/0 % (3/4 unter 6 Punkten!);
    TSX/PAZ-Smoke 13/13/24/42/8 %.
  - Track-22-Abdeckung: nur Ostteil (lon 13.168..13.276); in ALLEN sieben
    Bad-Gastein-AOI-Kandidaten 0 Track-22-Punkte. SNT in den AOIs ist
    faktisch T44+T95.
  - Felder `height_std`, `acceleration_std`, `s_amp_std`, `s_phs_std`,
    `season_phs` (Handbook: h_stdev/a_stdev/...) sind in Parquet und
    PostGIS fuer alle Datasets voll befuellt, werden von der
    Pipeline-Query aber nicht selektiert; per-Punkt `slope_deg`/`aspect_deg`
    existieren in `insar_point_terrain`.
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
- KRITISCH (Code-Audit 2026-06-09): `_build_building_rollup` berechnet
  `track_agreement_score`/`full_support` hartkodiert nur fuer das Paar
  `44/95`. Fuer Bad-Gastein/TSX-PAZ (70/93) ist Agreement immer `NULL` und
  `full_support` immer `false`; Track 22 wird im Agreement ignoriert,
  zaehlt aber fuer `building_status`/`building_motion_mm_a`. Alle
  Cross-Track-Diagnosen fuer Bad Gastein muessen deshalb in `P7-B`
  harness-seitig dataset-agnostisch berechnet werden (Felder
  `cross_track_pair_type`, `cross_track_source`, `temporal_overlap_days`).
  Pipeline-Rollup-Werte fuer TSX/PAZ und Track 22 niemals als
  "Cross-Track ok" interpretieren. Eine produktive Generalisierung ist nur
  als P7-E-Kandidat zulaessig.
- Cross-Track-Paartypen: `opposite_geometry` (ASC-DSC: 44/95, 93/70;
  Disagreement kann Horizontalbewegung sein) vs. `same_geometry`
  (DSC-DSC: 22/95, nur Ost-Overlap-Zone; horizontal-insensitive
  Redundanzpruefung).

Projektrahmen (User-Klarstellung 2026-06-09):

- Produktziel ist das Clustering auf den flaechig verfuegbaren
  Track-44/95-Daten. TSX/PAZ, Track 22 und Visual-Audit sind reine
  VALIDIERUNGSINSTRUMENTE; keine Datenfusion, kein gemeinsames Clustering
  ueber Sensoren.
- Kernfrage der Phase ist Validierung: Wie gut ist das Clustering, wie
  verlaesslich ist der Motion-Score - bisher haengt das fast allein an der
  ASC/DSC-Kreuzpruefung.
- Generik vor Feintuning: Ziel ist ein Algorithmus, der sich
  verteilungsbasiert selbst an neue Gebiete anpasst. Gebietsspezifisch
  handgesetzte Schwellen (heutiger AUGMENTERRA-Workflow) sind ein Anti-Ziel;
  ein Kandidat, der nur damit gewinnt, ist nicht integrationsfaehig.
- Der Plan enthaelt unter "Fachliches Zielbild: Was ist ein gutes Cluster?"
  die verbindliche fachliche Qualitaetsdefinition (physische Traegerschaft,
  kinematische Homogenitaet, Trennschaerfe statt Glaettung,
  Anbau-/Nebenobjekt-Hygiene, Stabilitaet, ehrliche Konfidenz) inklusive
  des realen Carport-Failure-Falls und der Pruefachse
  Main-Cluster-Wahlkriterien. Alle Experimente und Audits bewerten gegen
  diese Definition.
- Evaluationsgewichtung (User-Entscheidung 2026-06-10): primaer
  Cross-Track-Validierung, HR-Pseudo-Referenz und Experten-/
  Visual-Validierung; Bootstrap-Stabilitaet ist wegen der Small-N-Realitaet
  (76 % der Bad-Gastein-SNT-Gruppen unter 6 Punkten, legitime
  2-Punkt-Cluster) nur ein Nebensignal in Form des
  Sensitivitaets-/Konfidenzmoduls.
- Asymmetrie-Prinzip (User-Entscheidung 2026-06-10): Falsche Aufnahme eines
  Fremdpunkts (Carport/Schuppen, im GBA nicht kartiert) ist teurer als
  falscher Ausschluss eines echten Punkts. `nearest`-Punkte ohne
  geometrische Begruendung duerfen den Gebaeude-Motion-Score nicht praegen;
  `P7-C-W1-T5` testet Demotion, Distanz-Verschaerfung,
  Hoehenplausibilitaet (`height_above_ground_m`) und OSM-Fremdobjekt-Veto.
- GBA-Hoehen sind systematisch unterschaetzt (verifiziert 2026-06-10:
  Median-Ratio GBA/OSM = 0.735 ueber 673 Gebaeude; Dom 78 m -> 27.4 m;
  Salzburg-Median nur 4.5 m; Schaetzvarianz `var` ungenutzt). Folge: zu
  kurze Candidate-Areas, kuenstlich erhoehte nearest-Quote. `P7-A-W1-T6`
  entscheidet die Hoehenstrategie (InSAR-selbstkalibriert, OSM-Anreicherung,
  Kalibrierfaktor+var, konservativer Mindestoffset) als Input fuer
  `P7-C-W1-T5`.
- Run-Transparenz in der UI ist PFLICHT (User-Auftrag 2026-06-10,
  `P7-E-W1-T3`, `P7-F-W1-T1` haengt hart daran): pro Run muessen Parameter,
  Feature-Set, Algorithmus/Versionen, Experiment-ID, Dataset/Track/BBox und
  Kennzahlen uebersichtlich im Viewer sichtbar sein; Experiment-Runs
  schreiben dafuer ihre vollstaendige Konfiguration nach `ml_runs.params`.

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
PostGIS-Voranalyse. Die Punktsummen wurden am 2026-06-09 in PostGIS exakt
bestaetigt; sie bestehen SNT-seitig ausschliesslich aus T44+T95, Track 22
hat in keiner Kandidatenzelle Punkte. Verifiziere die AOIs in `P7-A-W1-T3`
mit exakter Pipeline- und Building-Semantik und weise pro AOI verfuegbare
Tracks, Punktzahlen je Track, DS-Anteile, Beobachtungsfenster je Dataset
und `temporal_overlap_days` aus, bevor sie als finaler AOI-Katalog
verwendet werden.

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
import importlib.metadata
print("hdbscan", importlib.metadata.version("hdbscan"))
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
- UI-Randbedingungen (Audit 2026-06-09): Cluster-Huellen/Candidate-Areas
  existieren nur in der Focus-View eines selektierten Gebaeudes; der
  Track-Filter wirkt nur dort. Setze ZUERST `P7-B-W2-T0` um
  (URL-Deep-Links `area/run/building/mlview/track/hulls/basemap` plus
  Candidate-Farben fuer Tracks 22/70/93; Implementierungsvorgabe steht im
  Plan) und baue alle Audit-Faelle auf reproduzierbaren Deep-Links auf.
- Kamera-Standard: Alle Audit-Screenshots in Nadir-Ansicht (`pitch=0`,
  Nord oben, feste Zoomstufe, Gebaeude zentriert); Baseline und Kandidat
  desselben Falls mit IDENTISCHER Kamera. Schraegansicht (`pitch~55-60`)
  nur als optionale Zweitansicht fuer Hoehen-/Anbaufragen und nur mit
  aktiver 3D-GBA-Extrusion - ein gekipptes Orthofoto allein liefert keine
  Hoeheninformation, sondern nur Verzerrung.
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

1. `P7-A`: OPTICS-Fallback-Entfernung (`P7-A-W1-T5`, vor Baseline-Freeze),
   Baseline, Research, AOI-Katalog, Referenzfaelle.
2. `P7-B`: Experiment-Harness, Scorecard, Sensitivitaet/Konfidenz,
   High-Resolution-Pseudo-Referenz, Visual-Audit-Workflow inkl. Deep-Links.
3. `P7-C`: HDBSCAN, Features, Small-N, Reassignment, Assignment-Hygiene
   (`nearest`-Politik, `P7-C-W1-T5`), High-N; danach OPTICS-Vergleich
   (`P7-C-W2-T1`), weitere Algorithmen strikt zuletzt (`P7-C-W2-T3`).
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
  - Cross-Track-Diagnostik (harness-seitig, mit Paartyp),
  - Sensitivitaet/Konfidenz als Nebensignal,
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
