 ## Finaler vollständiger Implementierungsplan: Modulare InSAR-Anomaly-Plattform (Phase 1–3)

  ### Summary

  Ziel ist eine vollständig KI-agentisch umsetzbare, modulare und erweiterbare Anomaly-Detection-
  Plattform im bestehenden Salzburg-InSAR-Stack (FastAPI + PostGIS + MLflow + React/MapLibre).
  Die Lösung wird als neue Pipeline anomaly_v1 integriert, ohne bestehende Pipelines zu brechen.
  Alle drei Phasen sind vollständig enthalten:

  1. robuste tabellarische Baseline,
  2. self-supervised Zeitreihenkanal + Gebäudeaggregation,
  3. SSL/Graph-Kontext mit Governance und Fallback.

  ———

  ## 1. Zielarchitektur (stabil über alle Phasen)

  ### 1.1 Schichten

  1. Feature Layer

  - versionierte FeatureProvider mit einheitlichem Contract
  - austauschbar über Registry + Konfiguration

  2. Model Layer

  - plug-in Detectors + Ensemble-Combiner
  - einzelne Modelle aktivier-/deaktivierbar über Run-Params

  3. Scoring Layer

  - score calibration
  - fusion anomaly/quality
  - label assignment

  4. Evaluation Layer

  - Asc/Desc-Validierung
  - Synthetic Injection
  - Stabilitäts- und Drift-Checks

  5. Serving Layer

  - Persistenz in ml_point_results
  - Ausgabe über bestehende /api/ml/* + MVT-Tiles

  ### 1.2 Verbindliche Contracts

  - FeatureProvider: compute(pool, config, keys) -> FeatureMatrix
  - Detector: fit(X, y=None), predict_score(X), optional explain(X)
  - Ensemble: combine(score_dict, config) -> anomaly_score
  - Evaluator: evaluate(run_context) -> dict[str, float|int]
  - FeatureMatrix (v1): numpy-basiert (dict[str, np.ndarray] + code, track), backend-core ohne
    pandas-Pflicht

  ———

  ## 2. Public Interfaces: API, Schema, Typen

  ### 2.1 API-Erweiterungen (ohne neuen Namespace)

  Bestehender Endpoint bleibt führend:

  - POST /api/ml/runs
      - neue pipeline: anomaly_v1
      - params unterstützt verschachtelte Konfig:
          - feature_providers
          - detectors
          - ensemble
          - calibration
          - label_thresholds
          - consistency
          - evaluation
          - runtime_limits

  Bestehende Tile-Endpoints werden erweitert:

  - /api/ml/runs/{run_id}/tiles/{z}/{x}/{y}.pbf
  - /api/ml/runs/{run_id}/buildings/{z}/{x}/{y}.pbf
    Zusätzliche Properties (bei anomaly-Runs):
  - anomaly_score
  - quality_score
  - cross_track_consistency
  - label

  ### 2.2 Datenbankänderungen

  ml_point_results bekommt:

  - anomaly_score DOUBLE PRECISION
  - quality_score DOUBLE PRECISION
  - cross_track_consistency DOUBLE PRECISION
  - label TEXT
  - feature_set_version TEXT
  - model_set_version TEXT

  meta JSONB standardisieren:

  - meta.detector_scores
  - meta.explain_top_features
  - meta.feature_flags
  - meta.run_flags

  ### 2.3 Indizes

  - (run_id, label)
  - (run_id, quality_score)
  - (run_id, anomaly_score)

  ———

  ## 3. Migration und Kompatibilität

  ### 3.1 Migrationsstruktur

  - backend/sql/migrations/002_anomaly_detection.sql
  - optional backend/sql/migrations/003_phase2_phase3_extensions.sql

  ### 3.2 Migrationsregeln

  - idempotent (ADD COLUMN IF NOT EXISTS)
  - additive Änderungen only (keine Breaking Drops)
  - bestehende Pipelines müssen nach Migration unverändert laufen

  ### 3.3 Rückwärtskompatibilität

  - bestehendes Feld score in ml_point_results bleibt bestehen
  - anomaly-spezifische Felder optional befüllt, je nach Pipeline-Typ

  ———

  ## 4. Modul- und Dateistruktur

  ### 4.1 Feature Layer

  - backend/app/ml/features/base.py
  - backend/app/ml/features/registry.py
  - backend/app/ml/features/providers/point_static.py
  - backend/app/ml/features/providers/timeseries.py
  - backend/app/ml/features/providers/amplitude.py
  - backend/app/ml/features/providers/spatial_context.py
  - backend/app/ml/features/providers/cross_track.py
  - später:
      - sequence_windows.py (Phase 2)
      - graph_context.py (Phase 3)

  ### 4.2 Model Layer

  - backend/app/ml/models/base.py
  - backend/app/ml/models/registry.py
  - backend/app/ml/models/detectors/isolation_forest.py
  - backend/app/ml/models/detectors/lof.py
  - backend/app/ml/models/detectors/rule_gate.py
  - backend/app/ml/models/ensembles/weighted_ensemble.py
  - später:
      - lstm_autoencoder.py (Phase 2)
      - ts2vec_adapter.py (Phase 3)
      - graph_autoencoder.py / GNN-Adapter (Phase 3)

  ### 4.3 Scoring und Evaluation

  - backend/app/ml/scoring/calibration.py
  - backend/app/ml/scoring/fusion.py
  - backend/app/ml/scoring/labeling.py
  - backend/app/ml/evaluation/asc_desc.py
  - backend/app/ml/evaluation/synthetic_injection.py
  - backend/app/ml/evaluation/stability.py

  ### 4.4 Pipeline Integration

  - backend/app/ml/pipelines/anomaly_v1.py (Orchestrator)
  - backend/app/ml/registry.py (Eintrag anomaly_v1)

  ———

  ## 5. Async/Sync Boundary (verbindliches Laufmodell)

  In anomaly_v1.run:

  1. Async IO-Phase

  - DB reads
  - FeatureProvider-SQL
  - Pairing/Join-Logik

  2. Sync Compute-Phase (Thread)

  - await asyncio.to_thread(run_models_and_scoring, ...)
  - detector fit/predict
  - calibration/fusion/labeling
  - optional explain

  3. Async Persistenz-Phase

  - batch upsert in ml_point_results
  - Metriken in ml_run_metrics
  - MLflow logging (params, metrics, artifacts, tags)

  Fehlerverhalten:

  - optionale Komponenten: degrade + meta.run_flags
  - Kernkomponenten: hard fail mit sauberem Run-Error

  ———

  ## 6. Phase 1: Fundament (robuste produktionsfähige Basis)

  ### 6.1 FeatureProvider v1 (Pflicht)

  1. point_static

  - velocity, velocity_std, coherence, acceleration, season_amp, incidence_angle, eff_area,
    amp_mean, amp_std, height

  2. timeseries

  - ts_slope
  - ts_residual_std
  - ts_max_abs_delta
  - ts_roughness
  - ts_missing_rate

  3. amplitude

  - amp_ts_mean
  - amp_ts_std
  - amp_ts_cv
  - amp_ts_spike_rate

  4. spatial_context

  - local_density
  - local_vel_median
  - local_vel_mad
  - local_vel_robust_z
  - local_coh_median

  5. cross_track (punkt-level Feature)

  - counterpart_found
  - cross_track_vel_diff_norm
  - cross_track_consistency_score

  ### 6.2 Detectors v1

  1. isolation_forest (core)
  2. rule_gate (deterministischer score channel)
  3. optional lof (config toggle)

  ### 6.3 Rule-Gate Default-Regeln

  - coherence < 0.30
  - velocity_std > p95(track)
  - ts_max_abs_delta > p99(track)
  - amp_ts_cv > p95(track)
  - counterpart_found && cross_track_vel_diff_norm > threshold

  Keine harten Ausschlüsse; regelbasierter Score geht gewichtet in Ensemble ein.

  ### 6.4 Scoring v1

  1. Detector-Rohscores -> robuste Quantilskalierung [0,1]
  2. Ensemble-Fusion (gewichtete Summe)
  3. quality_score = f(anomaly_score, cross_track_consistency, signal_quality)
  4. Labels:

  - normal
  - suspect
  - outlier
    (Schwellen in Config)

  ### 6.5 Serving v1

  - routers/ml.py Tile-SQL um neue Felder erweitern
  - Frontend mlView um anomaly, quality, label, cross_track

  ### 6.6 Evaluation v1

  - asc_desc.py run-level metrics
  - synthetic_injection.py basic: step/noise/trend break
  - stability.py: bbox/parameter robustness

  ### 6.7 Phase-1-Abschlusskriterien

  1. ml_point_results vollständig mit neuen Feldern befüllt
  2. MVT enthält neue Properties
  3. Injection detection signifikant über random baseline
  4. Asc/Desc-Metriken reproduzierbar + MLflow-geloggt

  ———

  ## 7. Phase 2: SOTA-Ausbau (self-supervised TS + bessere Fusion + Building Risk)

  ### 7.1 Ziel

  Nichtlineare und zeitliche Muster erfassen, die tabellarische Features allein nicht robust
  abdecken.

  ### 7.2 Implementierungsumfang

  1. Neuer Detector:

  - models/detectors/lstm_autoencoder.py
  - Loss default MSE; optional Soft-DTW via config flag

  2. Sequence Bridge:

  - features/providers/sequence_windows.py
  - normierte fixed-length Sequenzen für AE

  3. Ensemble v2:

  - erweitert um AE reconstruction score
  - dynamische Gewichte nach Feature-Verfügbarkeit:
      - kein cross-track pair -> lower weight
      - fehlende TS -> fallback tabular channel

  4. Weak/Pseudo-Supervision Hooks:

  - optionales Feedback-Flagging
  - meta enthält Unsicherheits-/Konfliktindikatoren

  5. Building-Level Aggregation:

  - Metriken:
      - n_points
      - outlier_ratio
      - median_quality
      - max_abs_vel
      - intra_building_variance
  - Risikoklassen A–E (configurable thresholds)
  - optional dedizierte Tabelle, sonst on-the-fly im Endpoint/Tile-Path

  ### 7.3 Evaluation Phase 2

  1. Erweiterte Injection-Familien
  2. Vergleich phase1-only vs phase1+AE
  3. Asc/Desc Verbesserung im High-Quality-Subset
  4. Fehleranalyse nach Track/Gebäudetyp/Abdeckung

  ### 7.4 Phase-2-Abschlusskriterien

  1. AE stabil integriert (keine Pipeline-Instabilität)
  2. mind. eine Kernmetrik robust verbessert
  3. Gebäude-Risikoprofil reproduzierbar und fachlich plausibel

  ———

  ## 8. Phase 3: Advanced (SSL-Embeddings + Graph-Kontext + Governance)

  ### 8.1 Ziel

  Kontextvalidierung als first-class modeling mit direkt gelernten Repräsentationen und räumlichen
  Beziehungen.

  ### 8.2 Implementierungsumfang

  1. SSL-Embeddings:

  - models/detectors/ts2vec_adapter.py (oder äquivalenter SSL-Adapter)
  - Embedding + leichter Outlier-Head (IF/OCSVM/GBDT)

  2. Graph-Experimentpfad:

  - features/providers/graph_context.py (kNN/building edges)
  - models/detectors/graph_autoencoder.py oder GNN-Adapter
  - explizit als optionaler Experimentpfad, nicht sofort Default

  3. Multi-Model Governance:

  - A/B Vergleich pro Run-Konfiguration
  - standardisierte Benchmark-Slots in ml_run_metrics
  - klare Promotion-/Fallback-Regeln

  4. Explainability v3:

  - einheitliches Explain-Format für heterogene Modelle
  - fallback für Blackbox-Modelle über surrogate/local diagnostics

  ### 8.3 Evaluation Phase 3

  1. Vergleich gegen Phase-2-Baseline auf identischen Slices
  2. Drift-Robustheit (Subgebiete, Parameter, Zeitfenster)
  3. Laufzeit-/Ressourcenbewertung (CPU/GPU optional)
  4. Promotion nur bei stabilem Mehrwert

  ### 8.4 Phase-3-Abschlusskriterien

  1. nachweisbarer Mehrwert gegenüber Phase 2
  2. keine unvertretbare Betriebs-/Komplexitätsverschlechterung
  3. jederzeitiger Fallback auf Phase-2-Modelset

  ———

  ## 9. Performance, Monitoring, Fehlerbehandlung (alle Phasen)

  ### 9.1 Performance

  1. chunked read/compute/write
  2. detector parallelization (concurrent.futures) bei unabhängigen Kanälen
  3. optional feature-cache (hash-basiert)
  4. runtime guardrails:

  - max rows/chunk
  - memory hints
  - adaptive chunk fallback

  ### 9.2 Monitoring

  - step duration
  - input sizes
  - success/error status
  - detector/provider health
  - degrade flags
  - metrics in MLflow + ml_run_metrics

  ### 9.3 Fehlerstrategie

  1. Provider:

  - optional -> skip + warning
  - required -> fail run

  2. Detector:

  - optional -> drop + degraded run
  - core -> fail run

  3. Persistenz:

  - transaction rollback
  - run status failed + error detail

  ———

  ## 10. Frontend-Strategie (pragmatisch und erweiterbar)

  1. Preset-first:

  - balanced
  - conservative
  - sensitive

  2. Advanced JSON Override als Expert Mode
  3. Backend-seitige Param-Validierung + klare Fehlerrückgabe ans UI
  4. Visualisierungen:

  - quality_score
  - anomaly_score
  - cross_track_consistency
  - label

  5. Inspector:

  - score breakdown + meta.explain_top_features

  ———

  ## 11. Implementierungsreihenfolge (entscheidungsvoll, ohne Zeitschätzung)

  1. Migrationen (002/optional 003) erstellen und anwenden
  2. Base interfaces + registries (features/models/ensemble/evaluator)
  3. anomaly_v1 pipeline skeleton + registry integration
  4. FeatureProvider v1: point_static, timeseries, amplitude
  5. isolation_forest + calibration + labeling
  6. persistenz + tile sql + frontend basisansichten
  7. spatial_context + cross_track
  8. rule_gate + optional lof
  9. Evaluation v1 (asc_desc, synthetic_injection, stability)
  10. Phase-2 Module: sequence_windows, lstm_autoencoder, fusion v2, building risk
  11. Phase-2 evaluation suite + baseline-vergleich
  12. Phase-3 Module: SSL + graph experiment track + governance
  13. Phase-3 benchmark + promotion/fallback policies
  14. End-to-end hardening + doku update


  ### 12.1 Unit

  - provider contract tests
  - detector contract tests
  - ensemble combine tests
  - calibration/labeling deterministic behavior
  - rule-gate rule validation

  ### 12.2 Contract

  - registry resolution
  - config schema validation
  - incompatible config fails fast with actionable error

  ### 12.3 Integration

  - full anomaly run on small bbox fixture
  - db persistence fields complete
  - tile endpoints expose anomaly fields

  ### 12.4 Evaluation

  - injection detection > random baseline
  - asc/desc metrics computed every run
  - phase-to-phase comparison reproducible

  ### 12.5 Regression

  - fixed seed / fixed fixture distribution tolerance checks

  ———

  ## 13. Annahmen und Defaults

  1. Backend-core bleibt initial pandas-frei.
  2. anomaly_v1 ist unabhängig von assignment; building context via feature providers.
  3. Cross-track pairing kann partiell sein; fehlende Pairs werden neutral (geringere Evidenz)
     behandelt.
  4. Explainability startet pragmatisch; SHAP optional je nach Modellset.
  5. Phase 3 ist vollständig geplant, aber als optionaler Promotion-Pfad mit striktem
     Mehrwertnachweis.
