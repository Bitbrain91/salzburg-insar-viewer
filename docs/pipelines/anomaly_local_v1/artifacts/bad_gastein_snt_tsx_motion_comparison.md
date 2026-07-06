# Bad Gastein SNT-vs-TSX/PAZ Bewegungsvergleich

Stand: 2026-06-18T01:00:43.946030+00:00

## Datenstand und Methode

- Overlap-Zeitfenster: `2022-10-06` bis `2023-05-26`.
- Gekoppelt wird ausschliesslich ueber gleiche GBA-`building_id`.
- Rollup-Vergleich nutzt `meta.building_rollup.building_motion_mm_a` und `track_motion_mm_a`.
- Overlap-Vergleich fitet neue lineare Punkt-Slopes im gemeinsamen Zeitraum; primaer LOS in `mm/a`, sekundaer `vertical_proxy = slope / max(cos(incidence_angle), 0.30)`.
- Sign-Klassen: `stable` bei `abs(value) <= 0.5 mm/a`, sonst `negative` oder `positive`.

## Verwendete Runs

| Label | Run-ID | Status | Created | Finished | Dataset | Punkte | Model | BBox |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bg_flat_01_snt | 327d5b6b-d53f-4047-8e79-5ab183e780e5 | succeeded | 2026-06-18T00:55:07.575494+00:00 | 2026-06-18T00:55:38.549390+00:00 | bad_gastein_snt | 1195 | local_hdbscan_rulegate_v2_k2x (1195) | 13.132531,47.106449,13.135531,47.109449 |
| bg_flat_01_tsx_paz | 5b4d4427-cbac-4833-8c26-d449218b656a | succeeded | 2026-06-18T00:55:47.435786+00:00 | 2026-06-18T00:57:25.505590+00:00 | bad_gastein_tsx_paz | 6750 | local_hdbscan_rulegate_v2_k2x (6750) | 13.132531,47.106449,13.135531,47.109449 |
| bg_slope_01_snt | 4770e6c5-1fba-40d3-89ed-20c89cdc9cda | succeeded | 2026-06-18T00:57:35.070858+00:00 | 2026-06-18T00:57:46.867512+00:00 | bad_gastein_snt | 717 | local_hdbscan_rulegate_v2_k2x (717) | 13.138531,47.118449,13.141531,47.121449 |
| bg_slope_01_tsx_paz | e6539cfe-b136-4179-a500-c24136cae673 | succeeded | 2026-06-18T00:57:53.501578+00:00 | 2026-06-18T00:58:48.465734+00:00 | bad_gastein_tsx_paz | 4209 | local_hdbscan_rulegate_v2_k2x (4209) | 13.138531,47.118449,13.141531,47.121449 |

## Datenfenster

| Label | Track | Min | Max | TS-Zeilen |
| --- | --- | --- | --- | --- |
| bg_flat_01_snt | 44 | 2022-10-02 | 2025-09-28 | 51612 |
| bg_flat_01_snt | 95 | 2022-10-06 | 2025-09-20 | 57060 |
| bg_flat_01_tsx_paz | 70 | 2021-05-15 | 2023-05-26 | 179664 |
| bg_flat_01_tsx_paz | 93 | 2021-05-20 | 2023-05-27 | 233870 |
| bg_slope_01_snt | 44 | 2022-10-02 | 2025-09-28 | 28704 |
| bg_slope_01_snt | 95 | 2022-10-06 | 2025-09-20 | 36450 |
| bg_slope_01_tsx_paz | 70 | 2021-05-15 | 2023-05-26 | 102942 |
| bg_slope_01_tsx_paz | 93 | 2021-05-20 | 2023-05-27 | 156195 |

## bg_flat_01

- SNT-Gebaeude: 82
- TSX/PAZ-Gebaeude: 82
- gekoppelte GBA-Gebaeude: 81

### Auswertbare Gebaeude je Filtergruppe

| Filtergruppe | Gebaeude in Gruppe | mit beiden Werten |
| --- | --- | --- |
| all_coupled | 81 | 54 |
| status_ok_or_single_both | 28 | 28 |
| ok_ok | 22 | 22 |
| reliability_medium_high_both | 37 | 37 |
| main_support_ge2_each | 54 | 54 |

### Rollup-Vergleich `building_motion_mm_a`

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 54 | 1.099 | 1.021 | 1.241 | 1.566 | 1.073 | -0.148 | 0.133 | 22.2% | 13.0% | 46.3% | 87.0% |
| status_ok_or_single_both | 28 | 0.989 | 1.021 | 1.065 | 1.190 | 1.021 | 0.367 | 0.269 | 28.6% | 14.3% | 50.0% | 92.9% |
| ok_ok | 22 | 1.000 | 1.021 | 1.021 | 1.123 | 1.021 | 0.540 | 0.308 | 27.3% | 13.6% | 50.0% | 100.0% |
| reliability_medium_high_both | 37 | 0.960 | 0.929 | 1.027 | 1.154 | 0.929 | 0.379 | 0.306 | 24.3% | 16.2% | 54.1% | 94.6% |
| main_support_ge2_each | 54 | 1.099 | 1.021 | 1.241 | 1.566 | 1.073 | -0.148 | 0.133 | 22.2% | 13.0% | 46.3% | 87.0% |

### ASC-vs-ASC Rollup-Track 44 vs 93

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 41 | 0.920 | 0.807 | 1.053 | 1.390 | 0.850 | 0.033 | 0.217 | 26.8% | 24.4% | 61.0% | 95.1% |
| status_ok_or_single_both | 25 | 0.911 | 0.850 | 0.965 | 1.187 | 0.850 | 0.164 | 0.182 | 36.0% | 28.0% | 60.0% | 96.0% |
| ok_ok | 22 | 0.894 | 0.828 | 0.952 | 1.171 | 0.828 | 0.147 | 0.221 | 31.8% | 27.3% | 63.6% | 95.5% |
| reliability_medium_high_both | 33 | 0.840 | 0.806 | 0.925 | 1.126 | 0.806 | 0.357 | 0.384 | 30.3% | 27.3% | 66.7% | 97.0% |
| main_support_ge2_each | 41 | 0.920 | 0.807 | 1.053 | 1.390 | 0.850 | 0.033 | 0.217 | 26.8% | 24.4% | 61.0% | 95.1% |

### DSC-vs-DSC Rollup-Track 95 vs 70

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 43 | 1.230 | 1.138 | 1.395 | 1.593 | 1.165 | 0.356 | 0.069 | 9.3% | 7.0% | 32.6% | 83.7% |
| status_ok_or_single_both | 25 | 1.030 | 1.138 | 1.220 | 1.387 | 1.165 | 0.524 | -0.012 | 12.0% | 12.0% | 36.0% | 92.0% |
| ok_ok | 22 | 1.105 | 1.151 | 1.232 | 1.415 | 1.201 | 0.609 | -0.018 | 13.6% | 13.6% | 31.8% | 90.9% |
| reliability_medium_high_both | 34 | 1.082 | 1.107 | 1.222 | 1.371 | 1.129 | 0.498 | 0.010 | 11.8% | 8.8% | 38.2% | 91.2% |
| main_support_ge2_each | 43 | 1.230 | 1.138 | 1.395 | 1.593 | 1.165 | 0.356 | 0.069 | 9.3% | 7.0% | 32.6% | 83.7% |

### Overlap-LOS ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 41 | 2.113 | 2.084 | 3.179 | 4.079 | 2.967 | 0.002 | 0.083 | 31.7% | 17.1% | 22.0% | 36.6% |
| status_ok_or_single_both | 25 | 2.843 | 2.967 | 3.563 | 4.653 | 3.442 | -0.011 | 0.101 | 36.0% | 20.0% | 24.0% | 36.0% |
| ok_ok | 22 | 2.497 | 2.149 | 3.315 | 4.515 | 2.764 | 0.028 | 0.181 | 40.9% | 22.7% | 27.3% | 40.9% |
| reliability_medium_high_both | 33 | 2.680 | 2.377 | 3.271 | 4.252 | 2.561 | 0.082 | 0.197 | 33.3% | 15.2% | 21.2% | 36.4% |
| main_support_ge2_each | 41 | 2.113 | 2.084 | 3.179 | 4.079 | 2.967 | 0.002 | 0.083 | 31.7% | 17.1% | 22.0% | 36.6% |

### Overlap-Vertical-Proxy ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 41 | 2.940 | 2.558 | 4.228 | 5.454 | 3.843 | 0.002 | 0.083 | 31.7% | 12.2% | 17.1% | 31.7% |
| status_ok_or_single_both | 25 | 3.940 | 3.594 | 4.736 | 6.232 | 4.276 | -0.011 | 0.101 | 32.0% | 16.0% | 20.0% | 32.0% |
| ok_ok | 22 | 3.470 | 3.293 | 4.374 | 6.019 | 3.566 | 0.028 | 0.181 | 36.4% | 18.2% | 22.7% | 36.4% |
| reliability_medium_high_both | 33 | 3.712 | 3.537 | 4.331 | 5.693 | 3.594 | 0.082 | 0.197 | 30.3% | 15.2% | 18.2% | 30.3% |
| main_support_ge2_each | 41 | 2.940 | 2.558 | 4.228 | 5.454 | 3.843 | 0.002 | 0.083 | 31.7% | 12.2% | 17.1% | 31.7% |

### Overlap-LOS DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 43 | 6.640 | 6.457 | 6.742 | 7.116 | 6.457 | 0.054 | 0.046 | 7.0% | 0.0% | 0.0% | 0.0% |
| status_ok_or_single_both | 25 | 6.505 | 6.340 | 6.505 | 6.852 | 6.340 | 0.050 | -0.005 | 8.0% | 0.0% | 0.0% | 0.0% |
| ok_ok | 22 | 6.665 | 6.465 | 6.665 | 6.992 | 6.465 | 0.026 | -0.037 | 9.1% | 0.0% | 0.0% | 0.0% |
| reliability_medium_high_both | 34 | 6.554 | 6.399 | 6.554 | 6.862 | 6.399 | 0.094 | 0.055 | 5.9% | 0.0% | 0.0% | 0.0% |
| main_support_ge2_each | 43 | 6.640 | 6.457 | 6.742 | 7.116 | 6.457 | 0.054 | 0.046 | 7.0% | 0.0% | 0.0% | 0.0% |

### Overlap-Vertical-Proxy DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 43 | 8.632 | 8.266 | 8.746 | 9.248 | 8.266 | 0.054 | 0.046 | 7.0% | 0.0% | 0.0% | 0.0% |
| status_ok_or_single_both | 25 | 8.461 | 8.068 | 8.461 | 8.940 | 8.068 | 0.050 | -0.005 | 8.0% | 0.0% | 0.0% | 0.0% |
| ok_ok | 22 | 8.652 | 8.167 | 8.652 | 9.114 | 8.167 | 0.026 | -0.037 | 9.1% | 0.0% | 0.0% | 0.0% |
| reliability_medium_high_both | 34 | 8.524 | 8.167 | 8.524 | 8.939 | 8.167 | 0.094 | 0.055 | 5.9% | 0.0% | 0.0% | 0.0% |
| main_support_ge2_each | 43 | 8.632 | 8.266 | 8.746 | 9.248 | 8.266 | 0.054 | 0.046 | 7.0% | 0.0% | 0.0% | 0.0% |

### Top-10 groesste Rollup-Abweichungen

| Building-ID | Status | Reliability | SNT | TSX/PAZ | Delta | Abs Delta | Relation | Moeglicher Grund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 227901757 | small_n-ok | low-high | -4.078 | 2.529 | 6.607 | 6.607 | widerspruechlich | status small_n-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |
| 238100051 | noise_dominated-ok | low-high | -1.982 | 0.751 | 2.733 | 2.733 | widerspruechlich | status noise_dominated-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |
| 238088268 | noise_dominated-noise_dominated | low-medium | -2.134 | 0.444 | 2.577 | 2.577 | einseitig stabil | status noise_dominated-noise_dominated; reliability low-medium; Vorzeichen/Klasse unterschiedlich |
| 367694478 | small_n-ok | low-high | -1.465 | 0.768 | 2.234 | 2.234 | widerspruechlich | status small_n-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |
| 656292755 | single_track_only-ok | medium-high | -1.147 | 1.065 | 2.212 | 2.212 | widerspruechlich | status single_track_only-ok; Vorzeichen/Klasse unterschiedlich |
| 238100070 | noise_dominated-ok | low-high | -1.569 | 0.569 | 2.138 | 2.138 | widerspruechlich | status noise_dominated-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |
| 656473446 | single_track_only-ok | medium-high | -1.911 | 0.106 | 2.017 | 2.017 | einseitig stabil | status single_track_only-ok; Vorzeichen/Klasse unterschiedlich |
| 238100041 | ok-ok | high-high | -1.640 | 0.314 | 1.954 | 1.954 | einseitig stabil | Vorzeichen/Klasse unterschiedlich |
| 238100032 | ok-ok | high-medium | -0.821 | 1.103 | 1.925 | 1.925 | widerspruechlich | Vorzeichen/Klasse unterschiedlich |
| 238088267 | small_n-ok | low-high | -1.338 | 0.556 | 1.894 | 1.894 | widerspruechlich | status small_n-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |

## bg_slope_01

- SNT-Gebaeude: 60
- TSX/PAZ-Gebaeude: 63
- gekoppelte GBA-Gebaeude: 60

### Auswertbare Gebaeude je Filtergruppe

| Filtergruppe | Gebaeude in Gruppe | mit beiden Werten |
| --- | --- | --- |
| all_coupled | 60 | 34 |
| status_ok_or_single_both | 16 | 16 |
| ok_ok | 12 | 12 |
| reliability_medium_high_both | 16 | 16 |
| main_support_ge2_each | 34 | 34 |

### Rollup-Vergleich `building_motion_mm_a`

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 34 | 2.972 | 1.738 | 3.644 | 4.865 | 2.774 | -0.312 | 0.038 | 55.9% | 0.0% | 8.8% | 47.1% |
| status_ok_or_single_both | 16 | 2.045 | 1.452 | 2.242 | 2.865 | 1.538 | 0.507 | 0.468 | 62.5% | 0.0% | 6.2% | 75.0% |
| ok_ok | 12 | 1.416 | 1.287 | 1.416 | 1.510 | 1.287 | 0.679 | 0.455 | 66.7% | 0.0% | 8.3% | 91.7% |
| reliability_medium_high_both | 16 | 1.833 | 1.538 | 2.030 | 2.445 | 1.562 | 0.503 | 0.271 | 62.5% | 0.0% | 6.2% | 75.0% |
| main_support_ge2_each | 34 | 2.972 | 1.738 | 3.644 | 4.865 | 2.774 | -0.312 | 0.038 | 55.9% | 0.0% | 8.8% | 47.1% |

### ASC-vs-ASC Rollup-Track 44 vs 93

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 19 | 2.525 | 2.799 | 2.525 | 2.711 | 2.799 | 0.208 | -0.193 | 89.5% | 5.3% | 5.3% | 31.6% |
| status_ok_or_single_both | 13 | 2.430 | 2.799 | 2.430 | 2.623 | 2.799 | -0.021 | -0.180 | 100.0% | 7.7% | 7.7% | 30.8% |
| ok_ok | 12 | 2.379 | 2.544 | 2.379 | 2.586 | 2.544 | -0.022 | -0.152 | 100.0% | 8.3% | 8.3% | 33.3% |
| reliability_medium_high_both | 13 | 2.652 | 2.799 | 2.652 | 2.787 | 2.799 | -0.129 | -0.361 | 92.3% | 0.0% | 0.0% | 30.8% |
| main_support_ge2_each | 19 | 2.525 | 2.799 | 2.525 | 2.711 | 2.799 | 0.208 | -0.193 | 89.5% | 5.3% | 5.3% | 31.6% |

### DSC-vs-DSC Rollup-Track 95 vs 70

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 27 | 0.052 | 0.110 | 0.913 | 1.060 | 0.858 | 0.685 | 0.530 | 100.0% | 22.2% | 63.0% | 92.6% |
| status_ok_or_single_both | 15 | 0.470 | 0.736 | 0.801 | 0.899 | 0.781 | 0.811 | 0.601 | 100.0% | 20.0% | 66.7% | 100.0% |
| ok_ok | 12 | 0.452 | 0.714 | 0.729 | 0.839 | 0.744 | 0.821 | 0.474 | 100.0% | 25.0% | 75.0% | 100.0% |
| reliability_medium_high_both | 15 | 0.136 | 0.020 | 0.845 | 0.994 | 0.751 | 0.437 | 0.202 | 100.0% | 26.7% | 66.7% | 93.3% |
| main_support_ge2_each | 27 | 0.052 | 0.110 | 0.913 | 1.060 | 0.858 | 0.685 | 0.530 | 100.0% | 22.2% | 63.0% | 92.6% |

### Overlap-LOS ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 19 | 2.357 | 2.330 | 2.939 | 3.431 | 2.680 | 0.149 | -0.023 | 42.1% | 5.3% | 10.5% | 36.8% |
| status_ok_or_single_both | 13 | 2.507 | 2.680 | 3.156 | 3.486 | 2.961 | -0.387 | -0.264 | 30.8% | 0.0% | 0.0% | 30.8% |
| ok_ok | 12 | 2.470 | 2.391 | 3.172 | 3.527 | 2.877 | -0.435 | -0.350 | 33.3% | 0.0% | 0.0% | 33.3% |
| reliability_medium_high_both | 13 | 2.463 | 2.680 | 3.112 | 3.479 | 2.961 | -0.314 | -0.253 | 46.2% | 0.0% | 7.7% | 23.1% |
| main_support_ge2_each | 19 | 2.357 | 2.330 | 2.939 | 3.431 | 2.680 | 0.149 | -0.023 | 42.1% | 5.3% | 10.5% | 36.8% |

### Overlap-Vertical-Proxy ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 19 | 4.070 | 4.227 | 4.502 | 5.225 | 4.227 | 0.149 | -0.023 | 42.1% | 0.0% | 15.8% | 21.1% |
| status_ok_or_single_both | 13 | 4.158 | 4.227 | 4.788 | 5.313 | 4.227 | -0.387 | -0.264 | 30.8% | 0.0% | 7.7% | 7.7% |
| ok_ok | 12 | 4.078 | 4.091 | 4.761 | 5.328 | 4.091 | -0.435 | -0.350 | 33.3% | 0.0% | 8.3% | 8.3% |
| reliability_medium_high_both | 13 | 4.183 | 4.482 | 4.813 | 5.353 | 4.482 | -0.314 | -0.253 | 46.2% | 0.0% | 7.7% | 15.4% |
| main_support_ge2_each | 19 | 4.070 | 4.227 | 4.502 | 5.225 | 4.227 | 0.149 | -0.023 | 42.1% | 0.0% | 15.8% | 21.1% |

### Overlap-LOS DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 27 | 4.499 | 4.748 | 4.796 | 5.211 | 4.748 | 0.450 | 0.487 | 100.0% | 0.0% | 3.7% | 7.4% |
| status_ok_or_single_both | 15 | 5.029 | 5.014 | 5.029 | 5.291 | 5.014 | 0.824 | 0.829 | 100.0% | 0.0% | 0.0% | 0.0% |
| ok_ok | 12 | 4.910 | 4.881 | 4.910 | 5.179 | 4.881 | 0.659 | 0.734 | 100.0% | 0.0% | 0.0% | 0.0% |
| reliability_medium_high_both | 15 | 4.611 | 4.080 | 4.611 | 4.967 | 4.080 | 0.541 | 0.611 | 100.0% | 0.0% | 0.0% | 6.7% |
| main_support_ge2_each | 27 | 4.499 | 4.748 | 4.796 | 5.211 | 4.748 | 0.450 | 0.487 | 100.0% | 0.0% | 3.7% | 7.4% |

### Overlap-Vertical-Proxy DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Bias mean | Bias median | MAE | RMSE | Median abs diff | Pearson | Spearman | Sign agreement | <=0.5 | <=1.0 | <=2.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 27 | 4.243 | 4.931 | 4.936 | 5.406 | 5.003 | 0.450 | 0.487 | 100.0% | 0.0% | 3.7% | 7.4% |
| status_ok_or_single_both | 15 | 4.928 | 4.931 | 4.928 | 5.275 | 4.931 | 0.824 | 0.829 | 100.0% | 0.0% | 0.0% | 6.7% |
| ok_ok | 12 | 4.856 | 4.790 | 4.856 | 5.247 | 4.790 | 0.659 | 0.734 | 100.0% | 0.0% | 0.0% | 8.3% |
| reliability_medium_high_both | 15 | 4.419 | 3.917 | 4.496 | 5.009 | 3.917 | 0.541 | 0.611 | 100.0% | 0.0% | 6.7% | 13.3% |
| main_support_ge2_each | 27 | 4.243 | 4.931 | 4.936 | 5.406 | 5.003 | 0.450 | 0.487 | 100.0% | 0.0% | 3.7% | 7.4% |

### Top-10 groesste Rollup-Abweichungen

| Building-ID | Status | Reliability | SNT | TSX/PAZ | Delta | Abs Delta | Relation | Moeglicher Grund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 114978584 | small_n-small_n | low-low | -8.908 | 6.449 | 15.358 | 15.358 | widerspruechlich | status small_n-small_n; reliability low-low; Vorzeichen/Klasse unterschiedlich |
| 120878941 | small_n-single_track_only | low-medium | -8.657 | 4.243 | 12.900 | 12.900 | widerspruechlich | status small_n-single_track_only; reliability low-medium; Vorzeichen/Klasse unterschiedlich |
| 114978579 | single_track_only-ok | low-medium | -8.155 | -1.471 | 6.684 | 6.684 | beide negativ/sinkend-proxy | status single_track_only-ok; reliability low-medium |
| 114978556 | small_n-ok | low-high | -7.653 | -1.180 | 6.473 | 6.473 | beide negativ/sinkend-proxy | status small_n-ok; reliability low-high |
| 120878946 | small_n-noise_dominated | low-medium | -7.528 | -1.647 | 5.880 | 5.880 | beide negativ/sinkend-proxy | status small_n-noise_dominated; reliability low-medium |
| 114978535 | single_track_only-ok | medium-high | -8.156 | -2.409 | 5.747 | 5.747 | beide negativ/sinkend-proxy | status single_track_only-ok |
| 591630211 | noise_dominated-noise_dominated | low-medium | -6.148 | -0.652 | 5.496 | 5.496 | beide negativ/sinkend-proxy | status noise_dominated-noise_dominated; reliability low-medium |
| 216707205 | small_n-ok | low-high | -5.396 | -0.013 | 5.382 | 5.382 | einseitig stabil | status small_n-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |
| 238063649 | small_n-ok | low-medium | -6.399 | -1.253 | 5.147 | 5.147 | beide negativ/sinkend-proxy | status small_n-ok; reliability low-medium |
| 113309836 | single_track_only-ok | medium-high | -5.145 | -0.268 | 4.877 | 4.877 | einseitig stabil | status single_track_only-ok; Vorzeichen/Klasse unterschiedlich |

## Interpretation

- Flach-AOI: Rollup-Vergleich MAE=1.241 mm/a, Sign-Agreement=22.2%; 87.0% liegen innerhalb <=2 mm/a. Overlap-LOS mittlerer Paar-MAE=4.961 mm/a.
- Hang-AOI: Rollup-Vergleich MAE=3.644 mm/a, Sign-Agreement=55.9%; 47.1% liegen innerhalb <=2 mm/a. Overlap-LOS mittlerer Paar-MAE=3.867 mm/a.
- Im Rollup verschlechtert sich die quantitative Uebereinstimmung im Hanggebiet deutlich; die Overlap-LOS-Fehler bleiben in beiden AOIs gross.
- Groesste Abweichungen sind primaer durch `status small_n-ok` erklaert, soweit die heuristische Klassifikation das abbildet.
- Die zentrale Bewegungsfrage ist damit nur eingeschraenkt positiv: Rollup-Groessenordnungen passen in Teilen, aber Sign-Agreement und Overlap-Slopes zeigen keine robuste quantitative Uebereinstimmung ueber beide Geometrien.
- TSX/PAZ sollte fuer Bad Gastein derzeit als Plausibilitaets- und Strukturreferenz genutzt werden, nicht als quantitative Ground-Truth-Referenz fuer Gebaeudeabsenkung; belastbare quantitative Aussagen brauchen mindestens filter- und geometriegetrennte Betrachtung.
