# `anomaly_local_v1` Phase 7 / Optimierungsphase 1

Stand: 2026-06-08
Status: proposed for user review, not executed

Kurzname: `phase7_clustering_optimization`

Dieser Plan ist der Umsetzungsplan fuer die erste Optimierungsphase der bestehenden
ML-Pipeline. Im Forschungsprojekt ist es die "Phase-1-Optimierung" der bereits
implementierten Pipeline `anomaly_local_v1`; in der Repo-Historie wird sie als
`P7` weitergefuehrt, weil `P1` bis `P6` der Pipeline schon existieren.

## Projekt- und Anwendungskontext

Der Viewer ist eine Forschungs- und Analyseanwendung fuer InSAR-basierte
Gebaeudebewegungen:

- Frontend: React, Vite, MapLibre, Layer- und Inspector-UI.
- Backend: FastAPI, PostGIS, MBTiles, ML-Run-API und MLflow-Tracking.
- Daten: Salzburg/SNT und Bad Gastein/SNT plus Bad Gastein/TSX-PAZ,
  GBA-Gebaeudepolygone, OSM, Terrain-Kontext, Displacement- und optionale
  Amplituden-Zeitreihen.
- Bad-Gastein/SNT Track 22 ist durch AUGMENTERRA bestaetigt und im Viewer als
  verifizierter Descending Track integriert: Blickrichtung `280.2 deg`,
  Sensor-Bearing `100.2 deg`, Einfallswinkel `45.66 deg`.
- Aktuelle Pipeline: `anomaly_local_v1`, lokal pro `Gebaeude x Track`.

Die Pipeline beantwortet aktuell:

1. Welche InSAR-Punkte werden einem Gebaeude zugeordnet?
2. Welche Punkte bleiben nach Gate-Regeln fuer die Auswertung?
3. Welche lokalen Cluster entstehen pro `Gebaeude x Track`?
4. Welcher Cluster ist der `main_cluster`?
5. Ist das Gebaeude trackuebergreifend plausibel?
6. Welche Punkte/Cluster/Gebaeude sind auffaellig oder nur schwach gestuetzt?

Die neue Forschungsfrage liegt nicht mehr bei "lokal statt global", sondern bei
der Qualitaet der lokalen Clusterentscheidung und ihrer Evaluation ohne echte
Ground-Truth-Daten.

## Aktueller technischer Startpunkt

Produktiver Code:

- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/ml/track_geometry.py`
- `backend/app/ml/rollups.py`

Aktuelle Clustering-Semantik:

- `< 3` behaltene Punkte pro `Gebaeude x Track`: `insufficient_support`.
- `3-5` behaltene Punkte: Small-N-Fallback mit Ein-Cluster-Hypothese.
- `>= 6` behaltene Punkte: HDBSCAN, OPTICS nur als Runtime-Fallback.
- HDBSCAN-Default:
  - `allow_single_cluster=True`
  - `cluster_selection_method="eom"`
  - `min_cluster_size=max(2, min(8, ceil(0.2 * n)))`
  - `min_samples=max(1, floor(min_cluster_size / 2))`
  - `metric="euclidean"`
- Cluster-Matrix:
  - `along_look_offset_m` Gewicht `1.10`
  - `cross_look_offset_m` Gewicht `1.00`
  - `height_rank_in_building` Gewicht `0.75`
  - `velocity` Gewicht `1.30`
  - `acceleration` Gewicht `0.90`
  - `coherence_penalty` Gewicht `0.80`
  - `RobustScaler(quantile_range=(15, 85))`
- Nach HDBSCAN/OPTICS existiert ein Borderline-Noise-Reassignment.
- `P6` hat `keep_2d_vector` entschieden. Candidate-Area- und Track-Geometrie
  sind nicht primaeres Thema dieser Optimierungsphase.

Bekannte Schwachstellen:

- Small-N-Fragilitaet, insbesondere weak secondary track.
- Cross-Track-Vergleich kann irrefuehren, wenn ein Track zu wenige Punkte,
  andere Gebaeudeteile oder nur Nebengebaeude/Anbauten sieht.
- `nearest`-lastige Gebaeude koennen scheinbar gute Cluster zeigen, obwohl die
  Gebaeudezuordnung unsicher ist.
- Multi-Cluster-Faelle duerfen nicht weggeglattet werden, weil sie echte
  Dach-/Anbau-/differenzielle Bewegungsstruktur enthalten koennen.
- Hangausrichtung und Blickrichtung koennen in Bad Gastein starke
  trackabhaengige Unterschiede erzeugen.
- Es gibt keine vollwertige Ground Truth.

## Research-Synthese

### Clustering ohne Ground Truth

Es gibt keine einzelne Metrik, die uns ohne Labels sagt, welches Clustering
"richtig" ist. Die externe Literatur stuetzt deshalb einen mehrschichtigen
Evaluationsansatz:

- Interne Metriken wie Silhouette, Calinski-Harabasz oder Davies-Bouldin messen
  Geometrie, aber nicht fachliche Wahrheit. Scikit-learn dokumentiert diese als
  nutzbar, wenn Ground Truth fehlt, weist aber auch auf Strukturannahmen hin.
- ARI/NMI/AMI brauchen normalerweise Ground Truth. Sie sind fuer uns trotzdem
  nuetzlich, wenn wir zwei Partitionen derselben oder vergleichbarer Objekte
  vergleichen: Bootstrap-Stabilitaet, Cross-Track-Konsistenz oder
  High-Resolution-vs-Low-Resolution-Pseudo-Referenz.
- Stabilitaet unter Resampling ist ein etablierter Ersatz fuer fehlende Labels:
  Cluster werden als glaubwuerdiger betrachtet, wenn sie bei leichten
  Perturbationen, Subsampling und Feature-Rauschen erhalten bleiben.
- HDBSCAN ist fuer variable Dichten und Noise passend, aber seine Parameter
  sind nicht frei interpretierbar: `min_cluster_size` definiert die kleinste
  fachlich akzeptierte Gruppe, `min_samples` macht die Clusterung konservativer
  und erzeugt mehr Noise.

Konsequenz:

Die Phase optimiert nicht auf eine einzige Zahl. Sie baut eine Scorecard aus:

- Domain-Guardrails,
- Stabilitaet,
- Cross-Track-Konsistenz mit Support-Gates,
- High-Resolution-Pseudo-Referenz,
- visueller Clusterqualitaet,
- internen Metriken als Nebenindikator.

### InSAR-spezifische Evaluation

InSAR misst LOS-Bewegung, nicht direkt vertikale Bewegung. Ascending und
Descending koennen daher nicht blind direkt verglichen werden. Das EGMS ATBD
formuliert explizit, dass Sentinel-1 ASC/DSC-Messungen nicht direkt vergleichbar
sind und eine vertikale Reprojektion nur bei vernachlaessigbarer horizontaler
Bewegung echte Vertikalbewegung liefert.

Konsequenz:

- Cross-Track ist ein starker Plausibilitaetsindikator, aber kein Ground Truth.
- Cross-Track darf nur gewertet werden, wenn beide Tracks ausreichend Support,
  vergleichbare Gebaeudeteile und hinreichende Assignment-Qualitaet haben.
- In Hanglagen muss Cross-Track als Stresssignal statt als harte Wahrheit
  behandelt werden.
- Bad-Gastein/TSX-PAZ kann als hochaufloesende Pseudo-Referenz dienen, aber
  wegen anderer Sensor-/Blickgeometrie nicht als absolute Wahrheit.

### Handbook-abgeleitete Pflichtregeln

Die beiden lokalen Handbooks
`docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf` und
`docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf` verschaerfen
einige Planregeln:

- Ein SqueeSAR-Messpunkt ist nicht immer ein punktfoermiger Reflektor. PS sind
  punktweise Scatterer, DS stehen fuer statistisch homogene Flaechen/Patches.
  `eff_area = 0` deutet PS an, `eff_area > 0` DS. Cluster- und Visual-Audit-
  Logik muss DS als Flaecheninformation behandeln.
- SNT und TSX/PAZ haben unterschiedliche typische Geokodierungsgenauigkeit.
  Aus den Handbooks: Sentinel/C-Band SNT liegt grob im Meterbereich bis etwa
  `8 m` je UTM-/Hoehenkomponente, TSX deutlich feiner. HR-Pseudo-Referenz darf
  deshalb keine exakten Punktuebereinstimmungen erzwingen.
- Alle Bewegungen sind relativ zu Referenzpunkt und erstem Akquisitionsdatum.
  Absolute Bewegungswerte zwischen unabhaengigen Prozessierungen duerfen nur
  verglichen werden, wenn Referenzpunkt, Zeitraum und zeitliche Abtastung
  kompatibel sind oder die Unsicherheit explizit modelliert ist.
- `coherence` ist temporal/model-fit-bezogen und nicht direkt zwischen
  unabhaengigen SqueeSAR-Prozessierungen vergleichbar. Fuer Cross-Dataset-
  Experimente sind innerhalb-Dataset-Perzentile oder Z-Scores zu bevorzugen.
- `h_stdev`, `v_stdev`, `a_stdev`, `s_amp_std`, `s_phs_std`, `eff_area` und
  `incidence_angle` sind fachlich relevante Qualitaets-/Geometriefelder. Die
  Phase muss pruefen, ob diese Felder in Rohdaten, Parquet und PostGIS voll
  verfuegbar sind, bevor sie als Features genutzt werden.
- Layover, Foreshortening und Shadowing sind in steiler Topografie echte
  Interpretationsgrenzen. Hangstress-AOIs brauchen ein Sichtbarkeits- oder
  Look-vs-Slope-Signal, sofern der vorhandene Terrain-Kontext das traegt.
- Phase-Unwrapping, Datenluecken und stark nichtlineare Bewegung koennen Werte
  unzuverlaessig machen. Zeitreihenabdeckung, Gap-Struktur und Step-/Roughness-
  Features sind deshalb nicht nur Modellfeatures, sondern Qualitaetsgates.

### Aktuelle Datenlage zu PS/DS und Amplituden

PostGIS-Audit vom 2026-06-09:

- `eff_area` ist in `insar_points` vorhanden.
- Salzburg/SNT Track 44/95: alle Punkte `eff_area = 0`, also PS-like.
- Bad-Gastein/SNT Track 22/44/95: alle Punkte `eff_area = 0`, also PS-like.
- Bad-Gastein/TSX-PAZ:
  - Track 70: `62,162` Punkte mit `eff_area > 0` von `288,146`.
  - Track 93: `107,861` Punkte mit `eff_area > 0` von `512,017`.
  - Diese Punkte sind DS-like und muessen als Patch-/Flaecheninformation
    bewertet werden.
- `amp_mean`/`amp_std` sind aktuell nur fuer Salzburg/SNT gefuellt
  (`246,865` T44-Punkte und `242,836` T95-Punkte).
- Bad-Gastein/SNT und Bad-Gastein/TSX-PAZ haben aktuell keine geladenen
  Amplitudenfeatures und keine Amplituden-Zeitreihen-Parquets. Fuer TSX/PAZ
  duerfen Experimente daher keine AMP-Features voraussetzen.

### Optische Luftbild-/Satellitenbildanalyse

Visuelle Analyse kann typische Fehler erkennen:

- Hauptdach und Carport werden als ein Cluster gemischt.
- Wintergarten/Vorhaus/Nebengebaeude wird faelschlich Hauptcluster.
- Cluster-Huellen liegen sichtbar auf einem Nachbarobjekt.
- Track A und Track B sehen unterschiedliche Gebaeudeteile.

Diese visuelle Bewertung ist in V1 kein automatisches Labelsystem, sondern ein
KI-Agenten-Audit ueber Playwright-Screenshots des Viewers mit Satelliten-/Luftbild,
Gebaeudeumriss, Candidate-Areas, Cluster-Huellen, Punkten und Track-Filter. Sie
wird als qualitative Guardrail und Failure-Taxonomie verwendet.

Automatische Segmentierung, z. B. mit Segment Anything oder Remote-Sensing-SAM-
Varianten, ist ein sinnvoller Folgeschritt. Fuer diese Phase bleibt sie ein
Research-Spike, nicht der kritische Pfad.

## Externe Quellenbasis

Diese Quellen sind Startpunkte fuer die Supervisor-Session; sie muessen bei der
Ausfuehrung aktualisiert und bei Bedarf erweitert werden:

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
- Kirillov et al. 2023, Segment Anything:
  https://arxiv.org/abs/2304.02643
- Ren et al. 2023, Segment anything, from space?:
  https://arxiv.org/abs/2304.13000

## Lokale Bad-Gastein-AOI-Kandidaten

Aus PostGIS wurde am 2026-06-08 eine zellbasierte Voranalyse gerechnet. Zellgroesse:
`0.003 deg x 0.003 deg`. Punktzaehlung ist eine Dichte-/AOI-Vorauswahl, keine
exakte Pipeline-Gebaeudezuordnung.

Flache Kandidaten fuer High-Resolution-Pseudo-Referenz:

| ID | BBox | Gebaeude | avg slope | avg relief | SNT total | TSX/PAZ total | Zweck |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `bg_flat_01` | `13.132531,47.106449,13.135531,47.109449` | 72 | 2.85 | 0.31 | 1195 | 6750 | primaerer flacher HR-Vergleich |
| `bg_flat_02` | `13.117531,47.091449,13.120531,47.094449` | 113 | 2.74 | 0.12 | 581 | 3877 | dichte flache Kontrollzelle |
| `bg_flat_03` | `13.138531,47.124449,13.141531,47.127449` | 106 | 3.76 | 0.25 | 1125 | 4657 | flache Kontrollzelle mit vielen Gebaeuden |
| `bg_flat_04` | `13.135531,47.127449,13.138531,47.130449` | 37 | 2.20 | 0.46 | 548 | 2193 | sehr flache Zusatzkontrolle |

Hang-/Stress-Kandidaten erst nach flacher Kalibrierung:

| ID | BBox | Gebaeude | avg slope | avg relief | SNT total | TSX/PAZ total | Zweck |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `bg_slope_01` | `13.138531,47.118449,13.141531,47.121449` | 55 | 20.34 | 3.66 | 717 | 4209 | primaerer Blickrichtungs-/Hangstress |
| `bg_slope_02` | `13.135531,47.115449,13.138531,47.118449` | 30 | 23.21 | 3.73 | 323 | 2015 | steiler HR-Vergleich |
| `bg_slope_03` | `13.141531,47.121449,13.144531,47.124449` | 32 | 21.83 | 5.53 | 385 | 1961 | steiler Zusatzstress |

Diese BBoxen sind initiale Gate-AOIs. `P7-A-W1-T3` muss sie mit exakter
Gebaeude-/Pipeline-Semantik verifizieren und darf sie ersetzen, wenn ein besserer
flacher oder steiler Kandidat datenbasiert belegt wird.

## Zielbild

Phase 7 liefert eine belastbare, reproduzierbare Entscheidung:

- Welche Clustering-Strategie ist fuer welchen Punktzahlbereich sinnvoll?
- Welche Parameter und Features verbessern die Pipeline wirklich?
- Wann ist Cross-Track-Konsistenz valide, und wann muss sie als unsicher
  markiert werden?
- Wie gut stimmen Salzburg/SNT und Bad-Gastein/SNT gegen
  Bad-Gastein/TSX-PAZ als hochaufloesende Pseudo-Referenz?
- Welche Fehler werden in der optischen KI-Analyse sichtbar?
- Wird ein Kandidat produktiv integriert, oder bleibt der aktuelle Stand?

Erlaubte Abschlussentscheidungen:

- `keep_current`: kein Kandidat schlaegt Baseline und Guardrails klar.
- `integrate_candidate`: genau ein Kandidat ist klar besser und wird integriert.
- `defer`: wichtige Daten, Expertenlabels oder Runtime-Voraussetzungen fehlen.
- `inconclusive`: sauber experimentiert, aber keine belastbare Entscheidung.

## Scope

In Scope:

- Clustering-Logik und Feature-Matrix von `anomaly_local_v1`.
- n-regime-spezifische Strategie: `<3`, `3-5`, `6-12`, `13-50`, `>50`.
- HDBSCAN-Parameter, `eom` vs. `leaf`, `min_cluster_size`, `min_samples`,
  `allow_single_cluster`, optional `cluster_selection_epsilon`.
- OPTICS als echter Vergleich, nicht nur Fallback.
- Small-N-Alternativen.
- Feature-Ablation und Feature-Erweiterung.
- Borderline-Noise-Reassignment.
- Cross-Track-Evaluation mit Support-/Coverage-Gates.
- Bad-Gastein/TSX-PAZ als hochaufloesende Pseudo-Referenz.
- Bad-Gastein flach zuerst, Hanglage danach.
- KI-Agenten-gestuetzte optische Analyse ueber Playwright-Screenshots.
- Reproduzierbarer Experiment-Harness und Scorecard.
- Kleine API/UI-Diagnose nur, wenn neue Evaluierungsfelder fuer Review noetig
  sind.

Nicht in Scope:

- Vollautomatische Luftbildsegmentierung als Produktfeature.
- Neues DTM/DSM/nDSM-Datenprodukt als Voraussetzung.
- Umbau der Candidate-Area-Track-Geometrie aus `P6`.
- MatchSAR-/AUGMENTERRA-Backend als Blocker.
- Breiter Frontend-Refactor.
- Training eines supervised Modells ohne Labelset.
- Globale Stadt-BBox als primaere Optimierungsbasis.
- Produktive Algorithmusaenderung ohne Scorecard-Gate.

## Feature-Hypothesen

Die Phase bewertet Features nicht nur nach Modellscore, sondern nach fachlichem
Nutzen und Robustheit.

### Bestehende Cluster-Features

- `along_look_offset_m`
- `cross_look_offset_m`
- `height_rank_in_building`
- `velocity`
- `acceleration`
- `coherence_penalty`

### Kandidaten fuer Cluster-Matrix

- `ts_slope`
- `ts_residual_std`
- `ts_primary_step_abs`
- `ts_roughness`
- `season_amp`
- `local_density`
- `assignment_method` als penalty/weight statt nur Rollup
- `distance_m` oder normalisierter Footprint-Abstand
- `amp_ts_cv` und `amp_ts_spike_rate`, sofern trackweise verfuegbar
- `h_stdev`, falls in den geladenen Quelldaten verfuegbar
- `v_stdev`, `a_stdev`, `s_amp_std`, `s_phs_std`, falls verfuegbar
- `eff_area` und daraus abgeleitet `scatterer_type` (`ps_like`, `ds_like`)
- coherence-Perzentil innerhalb desselben `area_id/dataset_id/track`
- look-vs-slope/aspect Feature, falls vorhandener Terrain-Kontext reicht

### Kandidaten nur fuer Scoring/Guardrails

- `track_point_count`
- `main_cluster_support`
- `kept_support_ratio`
- `nearest_share`
- `assignment_quality`
- `cluster_hull_overlap_with_building`
- `cluster_centroid_distance_to_building`
- `track_coverage_similarity`
- `high_res_support_score`
- `visual_audit_label`
- `sensor_geocode_tolerance_m`
- `reference_period_compatibility`
- `raw_coherence_cross_dataset_forbidden`
- `ds_patch_share`
- `layover_shadow_risk`
- `phase_unwrap_or_gap_risk`

## Algorithmus-Hypothesen nach Punktzahl

Diese Matrix ist Startpunkt fuer Experimente, keine Vorentscheidung:

| n kept pro `Gebaeude x Track` | Baseline | Kandidaten | Akzeptanzidee |
| ---: | --- | --- | --- |
| `<3` | `insufficient_support` | keine echte Clusterung | Status muss konservativ bleiben |
| `3-5` | Small-N Ein-Cluster + lokale Outlier | MAD/medoid, leave-one-out, pairwise-consistency, weak-support status | keine kuenstliche Sicherheit |
| `6-12` | HDBSCAN | HDBSCAN konservativ/locker, OPTICS, robust single-cluster with outlier option | stabile Main-Cluster und weniger Fragilitaet |
| `13-50` | HDBSCAN | HDBSCAN Sweep, `leaf`, Feature-Ablation, GMM/PAM-Spike | Multi-Cluster erhalten, Noise plausibel |
| `>50` | HDBSCAN | hierarchisch: spatial-first/motion-second, `leaf`, `cluster_selection_epsilon`, TSX-HR calibration | grosse Dach-/Nebengebaeude-Strukturen trennen |

## Evaluationsstrategie

### 1. Baseline und Regression

Pflicht-AOIs Salzburg:

- Mirabell: `13.04027,47.80375,13.04387,47.80735`
- Moosstrasse: `13.02714,47.79189,13.03074,47.79549`
- Osthang-Stressbereich: `13.0492,47.8036,13.0528,47.8054`

Pflicht-AOIs Bad Gastein:

- `bg_flat_01`
- `bg_flat_02`
- `bg_flat_03`
- `bg_slope_01`
- optional `bg_slope_02`, `bg_slope_03`

### 2. Interne Metriken

Nur Nebenindikatoren:

- Noise/kept
- Cluster count
- Core size distribution
- Silhouette oder DBCV, wenn sinnvoll fuer Noise/Density-Cluster
- Cluster separation in der tatsaechlichen Cluster-Matrix
- HDBSCAN probabilities/outlier scores

### 3. Stabilitaet

Pflicht:

- Bootstrap/subsampling pro `Gebaeude x Track`, sofern `n` reicht.
- Feature-Noise-Perturbation fuer numerische Features.
- Cluster-survival/Jaccard pro Cluster.
- ARI/AMI zwischen Original- und Perturbationsclustering auf gemeinsamen Punkten.
- Main-cluster motion confidence interval.
- Stability-Band fuer `main_cluster` und Building-Rollup.

### 4. Cross-Track-Evaluation

Cross-Track wird nur gewertet, wenn:

- beide Tracks mindestens `main_cluster_support >= 2`, fuer "strong" >= 3,
- beide Tracks nicht nur weak-secondary-track sind,
- `nearest_share` nicht ueber einer definierten Warnschwelle liegt,
- Cluster-Huellen oder Track-Coverage nicht offensichtlich verschiedene
  Gebaeudeteile abdecken,
- Hang-/Aspekt-Stress explizit markiert ist.
- beide Track-Resultate im selben Sensor-/Prozessierungsvertrag vergleichbar
  sind, oder der Vergleich als qualitative Diagnose statt Score markiert ist.
- rohe `coherence`-Werte nicht ueber unabhaengige Prozessierungen hinweg
  verglichen werden.

Neue Diagnoseideen:

- `track_support_class`: `none`, `weak`, `usable`, `strong`
- `coverage_overlap_score`
- `track_part_mismatch_flag`
- `cross_track_evaluation_weight`
- `cross_track_not_applicable_reason`
- `reference_period_compatibility`
- `coherence_normalization_scope`
- `sensor_geocode_tolerance_m`
- `scatterer_type_mix`

### 5. High-Resolution-Pseudo-Referenz

Bad-Gastein/TSX-PAZ dient als Pseudo-Referenz gegen Bad-Gastein/SNT:

- SNT 22/44/95 und TSX/PAZ 70/93 getrennt auswerten.
- SNT Track 22 ist kein Sonderfall mehr wegen fehlender Geometrie, sondern ein
  zusaetzlicher verifizierter Descending Track aus einer lokalen Trackueberlappung.
- Vergleich nicht als Punkt-zu-Punkt-Ground-Truth, sondern als
  Gebaeude-/Cluster-Level-Konsistenz:
  - Hauptcluster liegt auf derselben Gebaeudeteilregion,
  - SNT-main-cluster wird durch mehrere TSX/PAZ-Punkte gestuetzt,
  - SNT-Noise oder SNT-Nebengebaeude-Cluster wird in TSX/PAZ sichtbar,
  - Bewegungsrichtung/-ordnung ist kompatibel, falls Geometrie das erlaubt.
- Der Vergleich nutzt sensorabhaengige Lage-Toleranzen. Eine SNT/TSX-Abweichung
  im Meterbereich ist nicht automatisch ein Fehler.
- Absolute Geschwindigkeiten werden nur verglichen, wenn Referenzpunkt,
  Beobachtungszeitraum und Zeitnullpunkt kompatibel sind; sonst nur relative
  Muster, Rangfolge, Vorzeichen unter LOS-Vorbehalt und Clustergeometrie.
- DS-dominierte Cluster werden als Flaechen-/Patch-Information bewertet, nicht
  als exakte Dachpunkt-Labels.
- Flache AOIs sind harte Gate-AOIs. Hang-AOIs sind Stress- und Diagnose-AOIs.

### 6. Optische KI-Auditierung

V1-Pflichtbestandteil:

- Playwright-MCP bedient den Viewer.
- Pro ausgewaehltem Fall werden Screenshots erzeugt:
  - Satelliten-/Luftbildbasemap,
  - GBA-Umriss,
  - Candidate-Areas,
  - Cluster-Huellen,
  - Punkte nach Cluster/Noise/Gate,
  - Trackfilter `all`, `ASC`, `DSC` bzw. dataset-spezifische Tracks.
- KI-Agent analysiert Bild und schreibt strukturierte Audit-Labels:
  - `plausible_main_roof_cluster`
  - `possible_carport_merge`
  - `possible_outbuilding_as_main`
  - `track_part_mismatch`
  - `offset_expected_due_to_sar_geometry`
  - `offset_within_sensor_tolerance`
  - `ds_patch_ambiguous`
  - `layover_shadow_possible`
  - `ambiguous_visual`
  - `needs_human_review`

Diese Labels sind qualitative Evidence, keine automatische Wahrheit.

## Scorecard und Guardrails

Ein Kandidat ist nur integrationsfaehig, wenn er alle harten Gates erfuellt und
mindestens einen fachlichen Gewinn zeigt.

Harte Gates:

- Keine produktive Default-Aenderung vor Kandidatenentscheidung.
- Salzburg-Pflichtreferenzen bleiben plausibel oder Abweichung ist
  fallbezogen belegt.
- Differential-/Multi-Cluster-Faelle werden nicht weggeglattet.
- Small-N und weak-secondary-track werden nicht als hohe Sicherheit ausgegeben.
- `nearest`-lastige Faelle werden nicht gesundgerechnet, ohne Assignment-
  Unsicherheit sichtbar zu halten.
- Bad-Gastein flach muss mindestens baseline-kompatibel bleiben, bevor Hangstress
  als Optimierungserfolg gewertet wird.
- Optischer Audit darf keine offensichtliche Verschlechterung bei
  Pflichtfaellen zeigen.

Weiche Ziele:

- bessere Stabilitaet der Main-Cluster,
- bessere High-Resolution-Uebereinstimmung in flachen Bad-Gastein-AOIs,
- weniger Fehl-Noise bei plausiblen Hauptdachpunkten,
- weniger Nebengebaeude-/Carport-Merge,
- klarere Diagnose bei nicht auswertbaren Cross-Track-Faellen.

## Pflichtartefakte

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
- Screenshots unter `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`

## Abhaengigkeiten

Harte Abhaengigkeiten:

- lokale PostGIS-Daten fuer Salzburg und Bad Gastein,
- `backend/.venv-wsl/bin/python` oder dokumentierter Ersatz,
- `hdbscan` importierbar fuer HDBSCAN-Experimente,
- MLflow/PostGIS fuer Live-Runs,
- Supervisor-Workflow mit Subagents,
- `gpt-5.5` mit reasoning effort `xhigh`.

Weiche Abhaengigkeiten:

- Playwright-MCP fuer optischen Audit; wenn nicht verfuegbar, muss der
  Visual-Audit-Pfad `red` oder `inconclusive` dokumentiert werden.
- Frontend/Backend lokal erreichbar.
- Internet fuer aktualisierte Quellenpruefung.
- Spaetere menschliche Expertenlabels.

## Plan -> Phase -> Welle -> Ticket

### Phase P7-A: Baseline, Research und AOI-Vertrag

Phasen-DoD:

- Ausgangslage, Quellenbasis, AOIs und Referenzfaelle sind eingefroren.
- Bad-Gastein-Flach-/Hang-AOIs sind mit exakter Pipeline-Semantik verifiziert.
- Der Supervisor kann danach Experimente gegen feste Gates laufen lassen.

#### Welle P7-A-W1: Parallele Grundlagen

##### Ticket P7-A-W1-T1: Baseline einfrieren

- Ziel: aktuellen produktiven Stand und alle Pflicht-AOIs reproduzierbar messen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_baseline_summary.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- DoD:
  - Runtime, Python, `hdbscan`, DB/MLflow-Status dokumentiert.
  - Salzburg-Pflicht-AOIs neu oder ueber vorhandene gueltige Runs belegt.
  - Bad-Gastein-SNT und TSX/PAZ fuer mindestens `bg_flat_01` und `bg_slope_01`
    baseline-metrisch belegt oder konkreter Blocker dokumentiert.
  - Aktuelle Parameter/Features aus Code extrahiert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T2: Externe Research-Matrix

- Ziel: Clustering-/Evaluation-/InSAR-Literatur in umsetzbare Regeln uebersetzen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_research_matrix.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- DoD:
  - Quellen zu HDBSCAN/OPTICS, internen Metriken, Stabilitaet, Cross-Track-InSAR
    und optischer/Segmentierungsbewertung sind geprueft.
  - Die beiden lokalen AUGMENTERRA-/TRE-Handbooks sind mit Seitenreferenzen fuer
    PS/DS, LOS, Geokodierung, Referenzpunkt, Kohaerenz, 2D-Dekomposition,
    Zeitreihenfelder und Layover/Shadowing ausgewertet.
  - Jede Quelle fuehrt zu einer klaren Planregel oder wird als nicht relevant
    verworfen.
  - Unsicherheiten sind explizit benannt.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T3: AOI-Katalog Bad Gastein und Salzburg

- Ziel: feste AOIs fuer flach, gemischt und Hangstress definieren.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_aoi_catalog.json`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Startkandidaten:
  - Salzburg: Mirabell, Moosstrasse, Osthang.
  - Bad Gastein: `bg_flat_01`, `bg_flat_02`, `bg_flat_03`, `bg_slope_01`.
- DoD:
  - jedes AOI hat area_id, dataset_id(s), bbox, terrain stats, point counts,
    building counts und Zweck.
  - jedes AOI enthaelt Sensor-/Dataset-Metadaten fuer erwartete Lage-Toleranz,
    Beobachtungszeitraum und Cross-Dataset-Vergleichbarkeit.
  - flache AOIs haben belegte niedrige Hangneigung und ausreichende SNT/TSX-Dichte.
  - Hang-AOIs sind als Stress, nicht als Kalibrierungsanker markiert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T4: Referenz- und Failure-Faelle erweitern

- Ziel: Experimente gegen konkrete Gebaeude-/Cluster-Falltypen fuehren.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_reference_cases.json`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Startliste:
  - Salzburg: `548205`, `548204`, `96637447`, `96637522`, `96637488`,
    `96959854`, `96637551`, `395674088`, `54773363`, `150506168`.
  - Bad Gastein: aus `P7-A-W1-T3` building-level zu bestimmen.
- DoD:
  - Faelle decken Standard, Multi-Cluster, Small-N, weak-secondary-track,
    nearest-heavy, noise-dominated, Cross-Track-Mismatch, flach-HR und Hang-HR ab.
  - Jede Erwartung ist semantisch formuliert, nicht nur als Metrik.
- Kritischer Pfad: ja
- Status: planned

### Phase P7-B: Evaluation-Harness und Scorecard

Phasen-DoD:

- Varianten koennen reproduzierbar gegen alle AOIs, Referenzfaelle, Stabilitaet,
  High-Resolution-Pseudo-Referenz und visuelle Audits bewertet werden.

#### Welle P7-B-W1: Harness-Grundlage

##### Ticket P7-B-W1-T1: Clustering-Experiment-Harness

- Ziel: Varianten ausfuehren, ohne produktive Defaults zu aendern.
- Write-Set:
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_experiment_matrix.json`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-A-W1-T1`
  - hard: `P7-A-W1-T3`
  - hard: `P7-A-W1-T4`
- DoD:
  - Baseline und No-op-Variante laufen deterministisch.
  - Varianten sind per Experiment-ID konfigurierbar.
  - Outputs enthalten Run-IDs, Parameter, Feature-Set und Scorecard-Inputs.
  - Produktiver Default bleibt unveraendert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-B-W1-T2: Scorecard und Acceptance-Gates

- Ziel: maschinenlesbar definieren, wann ein Kandidat besser ist.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.json`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-A-W1-T1`
  - hard: `P7-A-W1-T4`
- DoD:
  - Scorecard hat Aggregate, Referenzfaelle, Stabilitaet, HR-Pseudo-Referenz,
    optische Audit-Felder und Guardrail-Flags.
  - Bewertet werden `candidate_green`, `candidate_red`, `candidate_inconclusive`.
  - Niedrige Noise-Rate allein kann keinen Kandidaten gruen machen.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-B-W1-T3: Stabilitaetsmodul

- Ziel: Bootstrap-/Perturbationsmetriken fuer Cluster und Main-Cluster.
- Write-Set:
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
- DoD:
  - Subsampling/Bootstrap fuer geeignete Gruppen implementiert.
  - Cluster-survival, ARI/AMI/Jaccard und Main-Motion-CI werden ausgegeben.
  - Small-N-Faelle werden konservativ behandelt.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-B-W1-T4: High-Resolution-Pseudo-Reference-Modul

- Ziel: SNT-Ergebnisse gegen TSX/PAZ in Bad Gastein auswerten.
- Write-Set:
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-A-W1-T3`
- DoD:
  - SNT/TSX-Runs je AOI koennen gekoppelt ausgewertet werden.
  - Bad-Gastein/SNT Track 22 ist in der SNT-Auswertung enthalten oder seine
    Auslassung ist explizit fachlich begruendet.
  - Metriken sind cluster-/building-level, nicht Punkt-Ground-Truth.
  - sensorabhaengige Geokodierungs-Toleranz und DS-Patch-Semantik sind im
    Matching beruecksichtigt.
  - absolute Bewegungsvergleiche werden nur bei kompatiblem Referenzpunkt/
    Zeitraum zugelassen; sonst ist der Bewegungsvergleich qualitativ markiert.
  - flach vs. Hang wird getrennt reported.
- Kritischer Pfad: ja
- Status: planned

#### Welle P7-B-W2: Visueller Audit

##### Ticket P7-B-W2-T1: Playwright-gestuetzter Visual-Audit-Workflow

- Ziel: Viewer-Screenshots fuer qualitative Clusterpruefung reproduzierbar machen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_cases.json`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`
  - optional `backend/app/ml/evaluation/phase7_visual_audit_export.py`
  - optional Screenshots `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`
- Abhaengigkeiten:
  - hard: `P7-A-W1-T4`
  - soft: `P7-B-W1-T1`
- DoD:
  - Backend/Frontend Startanleitung oder laufende Services dokumentiert.
  - mindestens ein Salzburg-Fall und ein Bad-Gastein-Flachfall sind als
    Screenshot-Audit belegt.
  - Labelschema fuer visuelle Fehler ist JSON-kompatibel.
  - Visual-Audit unterscheidet echte visuelle Fehlzuordnung von tolerierbarem
    sensorbedingtem Offset und DS-Patch-Ambiguitaet.
  - Wenn Playwright/Frontend blockiert: konkreter `red`/`inconclusive` Blocker.
- Kritischer Pfad: ja, weil User V1-optische Analyse gefordert hat
- Status: planned

### Phase P7-C: Isolierte Algorithmus- und Feature-Experimente

Phasen-DoD:

- Die wichtigen Veraenderungsachsen sind getrennt getestet.
- Kein Kandidat gewinnt nur durch Vermischung mehrerer Effekte.

#### Welle P7-C-W1: Primaere Varianten

##### Ticket P7-C-W1-T1: HDBSCAN-Parameter-Sweep

- Ziel: HDBSCAN-Heuristik kontrolliert bewerten.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_hdbscan_*`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- Testachsen:
  - `min_cluster_size` fraction/cap,
  - `min_samples` ratio,
  - `eom` vs. `leaf`,
  - `allow_single_cluster`,
  - optional `cluster_selection_epsilon`.
- DoD:
  - alle Varianten mit identischer Scorecard.
  - Effekte auf Small-N-nahe Gruppen, Multi-Cluster und HR-Pseudo-Referenz
    separat ausgewiesen.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T2: Feature-Ablation und Feature-Erweiterung

- Ziel: klaeren, welche Inputs die Clusterqualitaet verbessern.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_features_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- Testachsen:
  - Velocity-Dominanz reduzieren,
  - Acceleration entfernen/reduzieren,
  - Spatial-Features staerken,
  - Time-series Features zuschalten,
  - Assignment-/distance penalty,
  - optional `amp_ts_*`, aber aktuell nur fuer Salzburg/SNT nutzbar; keine
    TSX/PAZ- oder Bad-Gastein-SNT-Variante darf AMP-Features voraussetzen,
  - optional `eff_area`/`scatterer_type`, `h_stdev`, `v_stdev`, `a_stdev`,
    `s_amp_std`, `s_phs_std`,
  - coherence nur dataset-/track-normalisiert fuer Cross-Dataset-Fragen,
  - optional terrain/look feature fuer Hangdiagnose.
- DoD:
  - Feature-Gewinne sind pro n-Regime und AOI-Typ berichtet.
  - Features, die nur Hang-AOIs verbessern aber flache HR-AOIs verschlechtern,
    werden nicht integriert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T3: Small-N-Alternativen

- Ziel: `3-5` kept points fachlich robuster behandeln.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_small_n_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- Testachsen:
  - MAD/medoid score,
  - leave-one-out consistency,
  - pairwise motion/spatial support,
  - stronger weak-secondary-track marking,
  - separate `weak_support` statt scheinbarer Core-Cluster.
- DoD:
  - Small-N wird nicht zu hoher Sicherheit hochgestuft.
  - `548205` und Bad-Gastein-Small-N-Faelle sind explizit bewertet.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T4: Borderline-Noise-Reassignment auditieren

- Ziel: pruefen, ob Reassignment plausible Punkte rettet oder Unsicherheit verdeckt.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_reassign_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- DoD:
  - Reassignment-Zaehler je AOI, n-Regime, assignment method und Falltyp.
  - nearest-heavy Gebaeude werden separat bewertet.
  - Visual-Audit-Faelle pruefen mindestens einen reassignment-sensitiven Fall.
- Kritischer Pfad: ja
- Status: planned

#### Welle P7-C-W2: Alternative Clusterer und High-N

##### Ticket P7-C-W2-T1: Alternativalgorithmus-Spike

- Ziel: pruefen, ob OPTICS/GMM/PAM/robust clustering klaren Mehrwert hat.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_alt_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - soft: `P7-A-W1-T2`
- DoD:
  - Spike ist bewusst klein.
  - keine neue schwere Dependency ohne starken Gewinn.
  - Ergebnis darf `no_alt_gain` oder `inconclusive` sein.
- Kritischer Pfad: nein
- Status: planned

##### Ticket P7-C-W2-T2: High-N-/TSX-PAZ-spezifische Strategie

- Ziel: pruefen, ob sehr dichte Gebaeude eine andere Clusterlogik brauchen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_high_n_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T4`
- Testachsen:
  - HDBSCAN `leaf` fuer feinere Dach-/Anbau-Struktur,
  - spatial-first/motion-second,
  - main-roof cluster selection gegen HR-Pseudo-Referenz.
- DoD:
  - nur Bad-Gastein-HR-Verbesserung reicht nicht fuer SNT-Default.
  - Ergebnis kann als separate HR-Diagnose oder Folgephase enden.
- Kritischer Pfad: nein
- Status: planned

### Phase P7-D: Kombinierte Kandidaten und visuelle Gate-Pruefung

Phasen-DoD:

- Maximal drei kombinierte Kandidaten werden voll gegen Scorecard, HR-Pseudo-
  Referenz und Visual-Audit getestet.

#### Welle P7-D-W1: Kandidatenbildung

##### Ticket P7-D-W1-T1: Kombinierte Kandidaten definieren

- Ziel: aus isolierten Experimenten kleine Kandidatenliste erstellen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_shortlist.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: alle kritischen `P7-C-W1` Tickets
  - soft: `P7-C-W2-T1`
  - soft: `P7-C-W2-T2`
- DoD:
  - maximal drei Kandidaten plus Baseline.
  - jedes Delta ist klein genug fuer Integration.
  - keine unerklaerte Vermischung mehrerer Effekte.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-D-W1-T2: Kandidaten gegen volle Scorecard laufen lassen

- Ziel: Shortlist vollstaendig bewerten.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.json`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-D-W1-T1`
- DoD:
  - alle Salzburg- und Bad-Gastein-Pflicht-AOIs.
  - Stabilitaet und HR-Pseudo-Referenz enthalten.
  - flach und Hang getrennt bewertet.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-D-W1-T3: Visual-Audit der Shortlist

- Ziel: KI-Agent prueft Clusterbilder fuer Baseline und Kandidaten.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`
  - Screenshots `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W2-T1`
  - hard: `P7-D-W1-T2`
- DoD:
  - mindestens 12 visuelle Faelle:
    - 3 Salzburg,
    - 3 Bad-Gastein flach SNT/TSX,
    - 3 Bad-Gastein Hang,
    - 3 Failure-/nearest-/Small-N-Faelle.
  - jedes Bild hat strukturiertes Audit-Label und kurze Begruendung.
  - Offensichtliche Carport-/Nebengebaeude-Fehler sind als Gate-Signal erfasst.
- Kritischer Pfad: ja
- Status: planned

### Phase P7-E: Entscheidung und bedingte Integration

Phasen-DoD:

- Entscheidung ist eindeutig.
- Bei Integration sind Code, Methodik, Runbook und Verifikation aktualisiert.
- Ohne Integration bleiben keine produktiven Algorithmus-Aenderungen zurueck.

#### Welle P7-E-W1: Entscheidung

##### Ticket P7-E-W1-T1: Kandidatenentscheidung

- Ziel: Baseline und Kandidaten nach Scorecard zusammenfuehren.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-D-W1-T2`
  - hard: `P7-D-W1-T3`
- DoD:
  - Entscheidung ist `keep_current`, `integrate_candidate`, `defer` oder
    `inconclusive`.
  - Bei `integrate_candidate` ist genau ein Kandidat benannt.
  - Bei Nicht-Integration ist begruendet, warum kein produktiver Change erfolgt.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-E-W1-T2: Produktive Integration, nur bei `integrate_candidate`

- Ziel: kleinste produktive Codeaenderung umsetzen.
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - optional `backend/app/ml/evaluation/phase2_harness.py`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/methodik.md`
  - `docs/pipelines/anomaly_local_v1/runbook.md`
  - `docs/pipelines/anomaly_local_v1/iterations.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-E-W1-T1` mit `integrate_candidate`
- DoD:
  - `MODEL_SET_VERSION` aktualisiert, wenn Verhalten produktiv anders ist.
  - Backend kompiliert.
  - alle Pflicht-AOIs laufen neu.
  - Scorecard zeigt Guardrails gruen oder begruendete Abweichungen.
  - Methodik und Runbook beschreiben neue Semantik.
- Kritischer Pfad: bedingt
- Status: planned

##### Ticket P7-E-W1-T3: API/UI-Diagnose, nur falls noetig

- Ziel: neue Diagnosefelder sichtbar machen, falls sie fuer Review noetig sind.
- Write-Set:
  - optional `backend/app/routers/ml.py`
  - optional `frontend/src/hooks/useApi.ts`
  - optional `frontend/src/components/InspectorPanel.tsx`
  - optional `frontend/src/components/PipelinePanel.tsx`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-E-W1-T2`, falls Integration neue Felder erzeugt
- DoD:
  - kein breiter UI-Refactor.
  - Frontend-Build bei Frontend-Aenderung.
  - Visual-Diagnose im Viewer bleibt bedienbar.
- Kritischer Pfad: nein
- Status: planned

### Phase P7-F: Abschlussbericht und Folgeplanung

#### Welle P7-F-W1

##### Ticket P7-F-W1-T1: Abschlussbericht

- Ziel: Ergebnis fuer Forschung und naechste Supervisor-Session abschliessen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
  - optional `docs/pipelines/anomaly_local_v1/next_steps.md`
- Abhaengigkeiten:
  - hard: `P7-E-W1-T1`
  - hard: `P7-E-W1-T2`, falls integriert
- DoD:
  - Entscheidung, Run-IDs, Artefakte und Restrisiken sind verlinkt.
  - Offene Forschungsfragen sind als konkrete Follow-up-Tickets formuliert.
  - Es gibt keine stillen Experimentaenderungen im produktiven Code.
- Kritischer Pfad: ja
- Status: planned

## Supervisor-Regeln

- Ticket-Arbeit wird an Subagents delegiert.
- Supervisor bleibt Scheduler, Gatekeeper, Integrator und Statusfuehrer.
- Alle Agents: `gpt-5.5`, reasoning effort `xhigh`.
- Kein Modell-Downgrade. Wenn `gpt-5.5` nicht verfuegbar ist: Stop und Blocker.
- Research-Tickets duerfen `green`, `red` oder `inconclusive` enden.
- `inconclusive` darf weitergefuehrt werden, wenn es nicht auf dem kritischen Pfad
  blockiert oder der Supervisor eine dokumentierte Annahme setzt.
- Produktive Defaults bleiben bis `P7-E-W1-T1` unveraendert.

## Mindestpruefungen

Immer:

- `git status --short --branch`
- Python-/`hdbscan`-Importcheck
- DB-/MLflow-Erreichbarkeit
- `backend/.venv-wsl/bin/python -m compileall backend/app`
- `git diff --check`

Bei produktiver Pipeline-Aenderung:

- neue Runs fuer alle Salzburg-Pflicht-AOIs,
- neue Runs fuer mindestens `bg_flat_01`, `bg_flat_02`, `bg_slope_01`,
- Harness-/Scorecard-Rerun,
- Methodik/Runbook/Iterations aktualisiert,
- `MODEL_SET_VERSION` geprueft/aktualisiert.

Bei Frontend-Aenderung:

- `cd frontend && npm run build`
- Playwright-Screenshots fuer mindestens einen Salzburg- und einen
  Bad-Gastein-Fall.

## Empfohlener Session-Schnitt

Eine frische Supervisor-Session soll nur diesen Einzeiler brauchen:

`Lies docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_supervisor_prompt.md und fuehre es vollstaendig aus.`
