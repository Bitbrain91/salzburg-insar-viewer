# Phase 7 - Baseline-Summary (P7-A-W1-T1)

Stand: 2026-06-10. Code: Branch `phase7-optimization` nach `P7-A-W1-T5`
(OPTICS-Fallback entfernt), `MODEL_SET_VERSION=local_hdbscan_rulegate_v1`,
`FEATURE_SET_VERSION=anomaly_local_v1_phase1`, hdbscan 0.8.42, Python 3.12.
Alle Runs via `backend/.venv-wsl/bin/python -m backend.app.ml.cli`, source=gba, Default-Parameter.

## Eingefrorene Baseline-Runs

| Label | Dataset | BBox | run_id |
| --- | --- | --- | --- |
| mirabell_snt | salzburg_snt | `13.04027,47.80375,13.04387,47.80735` | `c23cd637-3251-45bb-a95e-e2aa88abe6de` |
| moosstrasse_snt | salzburg_snt | `13.02714,47.79189,13.03074,47.79549` | `15cee7d1-1f0c-44b2-a6e2-ecb633841db0` |
| osthang_snt | salzburg_snt | `13.0492,47.8036,13.0528,47.8054` | `74c1481e-f2c7-4938-a4ac-8022e1fe2799` |
| bg_flat_01_snt | bad_gastein_snt | `13.132531,47.106449,13.135531,47.109449` | `ff2217a1-098d-4126-a89a-c3c9b9c148e5` |
| bg_slope_01_snt | bad_gastein_snt | `13.138531,47.118449,13.141531,47.121449` | `633325ef-409f-4a9e-a160-c9bc8394e574` |
| bg_flat_01_tsx | bad_gastein_tsx_paz | `13.132531,47.106449,13.135531,47.109449` | `97672f6e-f06e-43d8-b279-1dddecc21300` |
| bg_slope_01_tsx | bad_gastein_tsx_paz | `13.138531,47.118449,13.141531,47.121449` | `60a3899f-118a-4856-b40a-379939449e8a` |

## mirabell_snt (`c23cd637`)

Kennzahlen: total=1481, assigned=1353, kept=1310, gate_excluded=171, noise=463, buildings=58, multi_cluster=28

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 44 | 700 | 632 | 613 | 87 | 225 | 210 |
| 95 | 781 | 721 | 697 | 84 | 238 | 207 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 44 | no_building_assignment | 68 |
| 44 | low_coherence | 30 |
| 95 | no_building_assignment | 60 |
| 95 | low_coherence | 34 |

n-Regime (kept pro Gebaeude x Track, 104 Gruppen): <3: 23 (22%) / 3-5: 19 (18%) / 6-12: 35 (34%) / 13-50: 23 (22%) / >50: 4 (4%)

Gebaeudestatus: insufficient_support: 14, noise_dominated: 7, ok: 23, single_track_only: 7, small_n: 7
Cross-Track: full_support_buildings=28, agreement_median=0.65, Quelle: pipeline_rollup(44/95)

## moosstrasse_snt (`15cee7d1`)

Kennzahlen: total=1692, assigned=1685, kept=1601, gate_excluded=91, noise=447, buildings=147, multi_cluster=71

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 44 | 754 | 750 | 713 | 41 | 198 | 315 |
| 95 | 938 | 935 | 888 | 50 | 249 | 344 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 44 | low_coherence | 38 |
| 44 | no_building_assignment | 4 |
| 95 | low_coherence | 47 |
| 95 | no_building_assignment | 3 |

n-Regime (kept pro Gebaeude x Track, 267 Gruppen): <3: 79 (30%) / 3-5: 70 (26%) / 6-12: 92 (34%) / 13-50: 26 (10%) / >50: 0 (0%)

Gebaeudestatus: insufficient_support: 41, noise_dominated: 9, ok: 65, single_track_only: 11, small_n: 21
Cross-Track: full_support_buildings=70, agreement_median=0.439, Quelle: pipeline_rollup(44/95)

## osthang_snt (`74c1481e`)

Kennzahlen: total=616, assigned=613, kept=583, gate_excluded=33, noise=140, buildings=47, multi_cluster=27

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 44 | 289 | 288 | 274 | 15 | 65 | 105 |
| 95 | 327 | 325 | 309 | 18 | 75 | 104 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 44 | low_coherence | 15 |
| 44 | no_building_assignment | 1 |
| 95 | low_coherence | 16 |
| 95 | no_building_assignment | 2 |

n-Regime (kept pro Gebaeude x Track, 88 Gruppen): <3: 16 (18%) / 3-5: 30 (34%) / 6-12: 35 (40%) / 13-50: 7 (8%) / >50: 0 (0%)

Gebaeudestatus: insufficient_support: 6, noise_dominated: 1, ok: 26, single_track_only: 8, small_n: 6
Cross-Track: full_support_buildings=27, agreement_median=0.85, Quelle: pipeline_rollup(44/95)

## bg_flat_01_snt (`ff2217a1`)

Kennzahlen: total=1195, assigned=1084, kept=1042, gate_excluded=153, noise=309, buildings=82, multi_cluster=46

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 44 | 561 | 507 | 486 | 75 | 126 | 217 |
| 95 | 634 | 577 | 556 | 78 | 183 | 277 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 44 | no_building_assignment | 54 |
| 44 | low_coherence | 25 |
| 95 | no_building_assignment | 57 |
| 95 | low_coherence | 29 |

n-Regime (kept pro Gebaeude x Track, 149 Gruppen): <3: 36 (24%) / 3-5: 37 (25%) / 6-12: 54 (36%) / 13-50: 22 (15%) / >50: 0 (0%)

Gebaeudestatus: insufficient_support: 21, noise_dominated: 6, ok: 42, single_track_only: 6, small_n: 7
Cross-Track: full_support_buildings=46, agreement_median=0.562, Quelle: pipeline_rollup(44/95)

## bg_slope_01_snt (`633325ef`)

Kennzahlen: total=717, assigned=692, kept=660, gate_excluded=57, noise=221, buildings=60, multi_cluster=18

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 44 | 312 | 300 | 286 | 26 | 92 | 107 |
| 95 | 405 | 392 | 374 | 31 | 129 | 135 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 44 | low_coherence | 15 |
| 44 | no_building_assignment | 12 |
| 95 | low_coherence | 19 |
| 95 | no_building_assignment | 13 |

n-Regime (kept pro Gebaeude x Track, 101 Gruppen): <3: 32 (32%) / 3-5: 34 (34%) / 6-12: 20 (20%) / 13-50: 15 (15%) / >50: 0 (0%)

Gebaeudestatus: insufficient_support: 15, noise_dominated: 5, ok: 16, single_track_only: 4, small_n: 20
Cross-Track: full_support_buildings=18, agreement_median=0.187, Quelle: pipeline_rollup(44/95)

## bg_flat_01_tsx (`97672f6e`)

Kennzahlen: total=6750, assigned=6205, kept=5981, gate_excluded=769, noise=2239, buildings=82, multi_cluster=72

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 70 | 3152 | 2883 | 2776 | 376 | 1011 | 531 |
| 93 | 3598 | 3322 | 3205 | 393 | 1228 | 957 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 70 | no_building_assignment | 269 |
| 70 | low_coherence | 113 |
| 93 | no_building_assignment | 276 |
| 93 | low_coherence | 132 |

n-Regime (kept pro Gebaeude x Track, 160 Gruppen): <3: 9 (6%) / 3-5: 8 (5%) / 6-12: 23 (14%) / 13-50: 71 (44%) / >50: 49 (31%)

Gebaeudestatus: insufficient_support: 3, noise_dominated: 12, ok: 59, single_track_only: 4, small_n: 4
Cross-Track: full_support_buildings=0, agreement_median=None, Quelle: NOT_COMPUTED (44/95-Hardcode, Tracks 70/93)

## bg_slope_01_tsx (`60a3899f`)

Kennzahlen: total=4209, assigned=4143, kept=3969, gate_excluded=240, noise=1138, buildings=63, multi_cluster=50

| Track | total | assigned | kept | gate_excl | noise | nearest |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 70 | 1806 | 1780 | 1713 | 93 | 460 | 163 |
| 93 | 2403 | 2363 | 2256 | 147 | 678 | 575 |

Gate-Gruende (Punkte koennen mehrere haben):

| Track | Grund | n |
| ---: | --- | ---: |
| 70 | low_coherence | 67 |
| 70 | no_building_assignment | 26 |
| 93 | low_coherence | 108 |
| 93 | no_building_assignment | 40 |

n-Regime (kept pro Gebaeude x Track, 117 Gruppen): <3: 8 (7%) / 3-5: 17 (15%) / 6-12: 27 (23%) / 13-50: 39 (33%) / >50: 26 (22%)

Gebaeudestatus: insufficient_support: 5, noise_dominated: 7, ok: 44, single_track_only: 3, small_n: 4
Cross-Track: full_support_buildings=0, agreement_median=None, Quelle: NOT_COMPUTED (44/95-Hardcode, Tracks 70/93)

## Interpretation und Abweichungen von den Plan-Erwartungen

1. Determinismus: `mirabell_snt` (`c23cd637`) reproduziert exakt die
   Kennzahlen des April-Verifikationsruns `2c4cec7b` und der
   T5-Belegruns - die Baseline ist drift-frei.
2. Kohaerenz-Gate MILDER als datasetweit erwartet: Der Plan nennt 17-24 %
   `<0.45`-Anteil fuer Bad-Gastein/SNT GESAMT. In den urbanen AOIs schneidet
   das Gate aber nur ~4-6 % (bg_flat_01: 25/561 bzw. 29/634), weil
   Gebaeudepunkte deutlich bessere Kohaerenz haben als die Haenge.
   Beide Zahlen sind korrekt; Scorecard-Erwartungen muessen auf AOI-Ebene
   kalibriert werden, nicht auf Dataset-Ebene.
3. n-Regime in den urbanen BG-AOIs gesuender als im Smoke-Run: bg_flat_01
   SNT hat 36 % im 6-12-Regime (Smoke-BBox datasetweit: 76 % unter 6).
   Der HDBSCAN-Sweep ist damit auch fuer BG-flach relevant; die
   Small-N-Dominanz gilt v. a. fuer bg_slope (66 % unter 6) und sparse
   Gebiete.
4. TSX/PAZ bestaetigt den Cross-Track-Befund: `full_support=0`,
   `agreement=None` in beiden TSX-Runs (44/95-Hardcode). Alle
   Cross-Track-Aussagen fuer TSX kommen ab Schritt 2 aus dem Harness.
5. `bg_slope_01_snt` zeigt mit Agreement-Median `0.187` massiven
   ASC/DSC-Stress (vgl. Osthang `0.85`, Mirabell `0.65`) - genau die
   erwartete Hang-Diagnostik (Horizontalanteil/Kohaerenzregime).
6. nearest-Quoten sind ueberall hoch (Mirabell ~33 %, Moosstrasse ~44 %,
   bg_flat_01 ~45 % der zugeordneten Punkte) - Assignment-Hygiene
   (`P7-C-W1-T5`) bleibt zentral.

## Re-Baseline 2026-07-06: BG-Amplituden-Datenstand (P7-N6)

Ausloeser: `insar_amplitude_timeseries` fuer bad_gastein_snt t44/t95 wurde
2026-06-12 geladen; die v2_k2x-Baselines der BG-SNT-AOIs entstanden OHNE
Amplituden-Input (amp_ts-Gates/amp_quality wirken jetzt). Precheck
(`phase7_noop_precheck_2026-07.json`): mirabell/moosstrasse/osthang und
beide bg_*_tsx punktidentisch (`noop_identical=True`), nur bg_flat_01_snt
und bg_slope_01_snt divergieren — exakt der erwartete Datenstands-Effekt,
keine unerklaerte Drift. Modellstand unveraendert
`local_hdbscan_rulegate_v2_k2x`; Quelle weiterhin `gba` (BEV-Umstellung ist
P8-A-W2-T1; Referenzfaelle sind gba-gekeyt).

Baseline-Kette (nur die zwei divergierenden AOIs):

| AOI | neu (baseline_run) | vorher (jetzt legacy) | v1-Alt (Doku) |
| --- | --- | --- | --- |
| bg_flat_01_snt | `f2c4a59e-a4b1-46e1-ae8c-bf699e6f84ef` | `619dc244-48c1-4a1f-8b22-af79cd7b403e` | `ff2217a1-098d-4126-a89a-c3c9b9c148e5` |
| bg_slope_01_snt | `2c734086-23bd-4708-8e7c-75e8a876e523` | `78ce5c6b-1539-49a3-bb32-76218d10db8b` | `633325ef-409f-4a9e-a160-c9bc8394e574` |

Alle Runs bleiben unangetastet in ml_runs (Viewer-inspizierbar). Der alte
Noop-Snapshot ist als `phase7_experiment_noop_baseline_pre_bg_amp.json`
gesichert; der neue wurde mit `--verify-noop --cross-track --confidence`
regeneriert (alle 7 AOIs `noop_identical=True`, siehe Snapshot).
Randnotiz Datenhygiene: 141 invalide OSM-Polygone (Salzburg) wurden per
`ST_MakeValid` saniert; Load-Pfad repariert Geometrien jetzt beim Import
(Commit "Harness: Gebaeudequelle aus AOI-Spec pinnen ...").

## Re-Baseline 2026-07-07: MODEL_SET_VERSION v3_k2xh_diffv2 (Phase 8 W4)

Ausloeser: Produktions-Integration des Bauteil-Trenners (a6/a7/a8 +
Separation, Commit 85fe1ce) und Differential-Motion v2 (Commit f5122df).
Alle 7 Pflicht-AOIs frisch gebaselined (source gba, Default-Params, CLI);
zusaetzlich erstmals drei bev-AOI-Varianten (P8-A-W2-T1, BEV-Standard-
Vollzug). Verify: alle 10 AOIs `noop_identical=True` (Snapshot
`phase7_experiment_noop_baseline.json`; Vorstand als `_pre_v3` gesichert).

| AOI | neu (v3) | vorher (jetzt legacy, v2_k2x) |
| --- | --- | --- |
| mirabell | `13fb52ef` | `5e56381a` |
| moosstrasse | `79dd1468` (W4-Abnahmelauf) | `9ef01ded` |
| osthang | `9ff3a6dc` | `42b0d3df` |
| bg_flat_01_snt | `76eb4779` | `f2c4a59e` (2026-07-06, Amplituden) |
| bg_slope_01_snt | `430c3aa2` | `2c734086` (2026-07-06, Amplituden) |
| bg_flat_01_tsx | `f0bcde44` | `69f13507` |
| bg_slope_01_tsx | `6edd064a` | `49a4b1fa` |
| moosstrasse_bev (NEU) | `85953608` | - |
| bg_slope_01_snt_bev (NEU) | `935a3a0a` | - |
| bg_slope_01_tsx_bev (NEU) | `649cf539` | - |

Alle Alt-Runs bleiben in ml_runs (Viewer-inspizierbar). Cross-Track-Mediane
nach v3: mirabell 0.674, moosstrasse 0.388, osthang 0.850, bg_flat_snt
0.658, bg_slope_snt 0.171, bg_flat_tsx 0.502, bg_slope_tsx 0.086 -
Hang-Stress bleibt als ehrliche Diagnose sichtbar.
