# Bad Gastein SNT-vs-TSX/PAZ Bewegungsvergleich

Stand: 2026-07-15T10:57:52.192245+00:00

**Meeting-Rahmung "Variante 1":** Dieses Fenster (232 Tage, ein Winter) validiert die Konsistenz der Sensoren untereinander; es validiert keine absoluten Jahresraten.

## Datenstand und Methode

- Gebaeudequelle: `bev`.
- Overlap-Zeitfenster (effektiv): `2022-10-06` bis `2023-05-26` (232 Tage).
- Overlap-Gates (effektiv): mindestens 8 Epochen und 150 Tage Spanne je Punkt.
- Gekoppelt wird ausschliesslich ueber identische BEV-GUIDs (`bev_id`); beide Runs teilen dieselben BEV-Footprints.
- Rollup-Vergleich nutzt `meta.building_rollup.building_motion_mm_a` und `track_motion_mm_a`.
- Overlap-Vergleich fitet neue lineare Punkt-Slopes im gemeinsamen Zeitraum; primaer LOS in `mm/a`, sekundaer `vertical_proxy = slope / max(cos(incidence_angle), 0.30)`.
- Sign-Klassen: `stable` bei `abs(value) <= 0.5 mm/a`, sonst `negative` oder `positive`.
- Terrain-Klasse aus `building_terrain_context.slope_mean_deg` (flach <5deg, uebergang <15deg, sonst hang).
- Leitmetriken zuerst: n, Sign-Agreement, Spearman, <=1.0 und <=0.5 mm/a; danach Bias/MAE/RMSE/Pearson.
- Dieses Fenster (232 Tage, ein Winter) validiert die Konsistenz der Sensoren untereinander; es validiert keine absoluten Jahresraten.

## Verwendete Runs

| Label | Run-ID | Status | Created | Finished | Dataset | Punkte | Model | BBox |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bg_flat_ext_01_snt | f3d22d72-8fa8-4551-96c5-273d84bc8d7a | succeeded | 2026-07-15T07:35:15.853258+00:00 | 2026-07-15T07:51:21.278075+00:00 | bad_gastein_snt | 9109 | local_hdbscan_rulegate_v4_k2xhf_diffv2 (9109) | 13.125000,47.095000,13.145000,47.115000 |
| bg_flat_ext_01_tsx_paz | 533f3ec1-1c4c-4be5-9cf7-7050c06de0bc | succeeded | 2026-07-15T07:35:17.227096+00:00 | 2026-07-15T08:54:21.499231+00:00 | bad_gastein_tsx_paz | 52264 | local_hdbscan_rulegate_v4_k2xhf_diffv2 (52264) | 13.125000,47.095000,13.145000,47.115000 |
| bg_slope_ext_01_snt | 929e79d9-149b-414d-91aa-6db4e4d3f36f | succeeded | 2026-07-15T07:51:24.968514+00:00 | 2026-07-15T08:08:04.417572+00:00 | bad_gastein_snt | 8514 | local_hdbscan_rulegate_v4_k2xhf_diffv2 (8514) | 13.130000,47.112000,13.150000,47.128000 |
| bg_slope_ext_01_tsx_paz | 3315f80a-1262-4eab-80f7-4d5f0542c14e | succeeded | 2026-07-15T08:54:26.093410+00:00 | 2026-07-15T10:08:31.222487+00:00 | bad_gastein_tsx_paz | 46107 | local_hdbscan_rulegate_v4_k2xhf_diffv2 (46107) | 13.130000,47.112000,13.150000,47.128000 |

## Datenfenster

| Label | Track | Min | Max | TS-Zeilen |
| --- | --- | --- | --- | --- |
| bg_flat_ext_01_snt | 44 | 2022-10-02 | 2025-09-28 | 422740 |
| bg_flat_ext_01_snt | 95 | 2022-10-06 | 2025-09-20 | 406260 |
| bg_flat_ext_01_tsx_paz | 70 | 2021-05-15 | 2023-05-26 | 1380312 |
| bg_flat_ext_01_tsx_paz | 93 | 2021-05-20 | 2023-05-27 | 1823120 |
| bg_slope_ext_01_snt | 44 | 2022-10-02 | 2025-09-28 | 369012 |
| bg_slope_ext_01_snt | 95 | 2022-10-06 | 2025-09-20 | 405270 |
| bg_slope_ext_01_tsx_paz | 70 | 2021-05-15 | 2023-05-26 | 1198938 |
| bg_slope_ext_01_tsx_paz | 93 | 2021-05-20 | 2023-05-27 | 1629745 |

## bg_flat_ext_01

- SNT-Gebaeude: 616
- TSX/PAZ-Gebaeude: 664
- gekoppelte Gebaeude: 604

### Auswertbare Gebaeude je Filtergruppe

| Filtergruppe | Gebaeude in Gruppe | mit beiden Werten |
| --- | --- | --- |
| all_coupled | 604 | 367 |
| status_ok_or_single_both | 227 | 227 |
| ok_ok | 167 | 167 |
| reliability_medium_high_both | 240 | 240 |
| main_support_ge2_each | 367 | 367 |

### Rollup-Vergleich `building_motion_mm_a`

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 367 | 36.5% | -0.003 | 53.4% | 29.4% | 0.374 | 0.496 | 1.205 | 1.688 | 0.434 | 0.925 |
| status_ok_or_single_both | 227 | 31.7% | -0.108 | 51.1% | 26.4% | 0.282 | 0.544 | 1.159 | 1.458 | -0.060 | 0.977 |
| ok_ok | 167 | 32.3% | -0.122 | 54.5% | 26.3% | 0.244 | 0.544 | 1.086 | 1.361 | -0.046 | 0.912 |
| reliability_medium_high_both | 240 | 32.9% | -0.137 | 52.1% | 27.5% | 0.303 | 0.554 | 1.142 | 1.440 | -0.124 | 0.963 |
| main_support_ge2_each | 367 | 36.5% | -0.003 | 53.4% | 29.4% | 0.374 | 0.496 | 1.205 | 1.688 | 0.434 | 0.925 |

### ASC-vs-ASC Rollup-Track 44 vs 93

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 270 | 35.9% | 0.191 | 54.1% | 30.4% | 0.425 | 0.467 | 1.114 | 1.463 | 0.446 | 0.902 |
| status_ok_or_single_both | 200 | 35.5% | 0.154 | 51.0% | 28.0% | 0.448 | 0.468 | 1.177 | 1.539 | 0.459 | 0.975 |
| ok_ok | 167 | 37.7% | 0.129 | 52.1% | 29.3% | 0.438 | 0.467 | 1.167 | 1.531 | 0.492 | 0.935 |
| reliability_medium_high_both | 211 | 35.5% | 0.141 | 52.6% | 28.0% | 0.427 | 0.489 | 1.106 | 1.397 | 0.254 | 0.934 |
| main_support_ge2_each | 270 | 35.9% | 0.191 | 54.1% | 30.4% | 0.425 | 0.467 | 1.114 | 1.463 | 0.446 | 0.902 |

### DSC-vs-DSC Rollup-Track 95 vs 70

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 266 | 33.1% | 0.037 | 41.7% | 20.7% | 0.023 | 0.462 | 1.499 | 1.974 | 0.784 | 1.241 |
| status_ok_or_single_both | 191 | 30.4% | 0.000 | 45.0% | 21.5% | 0.079 | 0.555 | 1.445 | 1.951 | 0.562 | 1.120 |
| ok_ok | 167 | 29.3% | -0.034 | 43.7% | 21.6% | 0.049 | 0.555 | 1.483 | 2.012 | 0.580 | 1.183 |
| reliability_medium_high_both | 199 | 28.6% | -0.066 | 43.7% | 21.1% | 0.113 | 0.555 | 1.422 | 1.852 | 0.040 | 1.183 |
| main_support_ge2_each | 266 | 33.1% | 0.037 | 41.7% | 20.7% | 0.023 | 0.462 | 1.499 | 1.974 | 0.784 | 1.241 |

### Overlap-LOS ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 270 | 35.6% | 0.151 | 21.1% | 11.1% | 1.451 | 1.469 | 3.083 | 3.960 | 0.145 | 2.502 |
| status_ok_or_single_both | 200 | 38.0% | 0.194 | 24.5% | 14.5% | 1.397 | 1.188 | 2.891 | 3.778 | 0.196 | 2.152 |
| ok_ok | 167 | 38.9% | 0.187 | 26.3% | 15.0% | 1.379 | 1.209 | 2.879 | 3.770 | 0.212 | 2.258 |
| reliability_medium_high_both | 211 | 36.0% | 0.147 | 23.7% | 13.3% | 1.509 | 1.435 | 2.914 | 3.776 | 0.117 | 2.192 |
| main_support_ge2_each | 270 | 35.6% | 0.151 | 21.1% | 11.1% | 1.451 | 1.469 | 3.083 | 3.960 | 0.145 | 2.502 |

### Overlap-Vertical-Proxy ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 270 | 38.5% | 0.151 | 17.8% | 7.4% | 2.057 | 1.984 | 4.112 | 5.266 | 0.145 | 3.283 |
| status_ok_or_single_both | 200 | 42.5% | 0.194 | 21.5% | 9.0% | 1.963 | 1.695 | 3.836 | 5.002 | 0.196 | 2.991 |
| ok_ok | 167 | 40.7% | 0.187 | 22.2% | 10.2% | 1.932 | 1.671 | 3.829 | 4.980 | 0.212 | 3.167 |
| reliability_medium_high_both | 211 | 39.3% | 0.147 | 20.9% | 8.5% | 2.102 | 1.801 | 3.869 | 5.015 | 0.117 | 3.000 |
| main_support_ge2_each | 270 | 38.5% | 0.151 | 17.8% | 7.4% | 2.057 | 1.984 | 4.112 | 5.266 | 0.145 | 3.283 |

### Overlap-LOS DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 266 | 33.1% | 0.163 | 7.5% | 4.1% | 5.627 | 5.628 | 5.789 | 6.615 | 0.355 | 5.658 |
| status_ok_or_single_both | 191 | 27.7% | 0.166 | 4.2% | 1.0% | 5.917 | 5.864 | 6.070 | 6.792 | 0.220 | 5.864 |
| ok_ok | 167 | 28.1% | 0.160 | 4.2% | 0.6% | 5.902 | 5.851 | 6.053 | 6.773 | 0.221 | 5.851 |
| reliability_medium_high_both | 199 | 28.6% | 0.140 | 5.0% | 2.5% | 5.844 | 5.864 | 5.995 | 6.738 | 0.088 | 5.864 |
| main_support_ge2_each | 266 | 33.1% | 0.163 | 7.5% | 4.1% | 5.627 | 5.628 | 5.789 | 6.615 | 0.355 | 5.658 |

### Overlap-Vertical-Proxy DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 266 | 37.6% | 0.163 | 6.0% | 2.6% | 6.971 | 7.012 | 7.253 | 8.327 | 0.355 | 7.081 |
| status_ok_or_single_both | 191 | 32.5% | 0.166 | 3.7% | 2.1% | 7.410 | 7.440 | 7.622 | 8.573 | 0.220 | 7.469 |
| ok_ok | 167 | 31.1% | 0.160 | 3.6% | 1.8% | 7.377 | 7.440 | 7.592 | 8.543 | 0.221 | 7.469 |
| reliability_medium_high_both | 199 | 32.7% | 0.140 | 4.5% | 2.5% | 7.340 | 7.440 | 7.551 | 8.521 | 0.088 | 7.469 |
| main_support_ge2_each | 266 | 37.6% | 0.163 | 6.0% | 2.6% | 6.971 | 7.012 | 7.253 | 8.327 | 0.355 | 7.081 |

### Top-10 groesste Rollup-Abweichungen

| Building-ID | Terrain-Klasse | Status | Reliability | SNT | TSX/PAZ | Delta | Abs Delta | Relation | Moeglicher Grund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| {E358BD5B-2E25-4EC6-BC6E-3F5F01E1A087} | uebergang | small_n-ok | low-medium | -15.868 | -6.717 | 9.151 | 9.151 | beide negativ/sinkend-proxy | status small_n-ok; reliability low-medium |
| {06EF4F43-8304-4275-94D8-3DEFDA652F6F} | uebergang | small_n-ok | low-high | -15.680 | -6.798 | 8.882 | 8.882 | beide negativ/sinkend-proxy | status small_n-ok; reliability low-high |
| {C0095EB0-B3BE-4B5D-9790-7BEAE880966F} | uebergang | noise_dominated-ok | low-high | -15.430 | -6.779 | 8.651 | 8.651 | beide negativ/sinkend-proxy | status noise_dominated-ok; reliability low-high |
| {C5572DE5-4ED3-4BF5-86D9-37FE869AED28} | hang | small_n-ok | low-high | -10.225 | -3.296 | 6.928 | 6.928 | beide negativ/sinkend-proxy | status small_n-ok; reliability low-high |
| {E0E35527-87E0-4C80-A637-B7CF484D89A3} | flach | small_n-ok | low-high | 2.483 | -2.979 | -5.463 | 5.463 | widerspruechlich | status small_n-ok; reliability low-high; Vorzeichen/Klasse unterschiedlich |
| {1C0CAA8D-D122-400B-9AD0-6ACBB215127A} | uebergang | ok-ok | medium-high | 2.220 | -2.444 | -4.664 | 4.664 | widerspruechlich | Vorzeichen/Klasse unterschiedlich |
| {570B66E1-7192-4428-A5F1-744563726D8D} | flach | single_track_only-ok | medium-high | -4.268 | 0.153 | 4.421 | 4.421 | einseitig stabil | status single_track_only-ok; Vorzeichen/Klasse unterschiedlich |
| {882195C3-03CA-4BFE-9842-3D5E2FD340AC} | uebergang | single_track_only-ok | medium-high | 2.037 | -2.288 | -4.325 | 4.325 | widerspruechlich | status single_track_only-ok; Vorzeichen/Klasse unterschiedlich |
| {229CE927-28D7-4C97-B1F5-B33852761AE2} | flach | ok-ok | high-high | 1.042 | -3.281 | -4.323 | 4.323 | widerspruechlich | Vorzeichen/Klasse unterschiedlich |
| {08697CA6-FF25-4352-A0EB-CC3B53FF4CFA} | flach | ok-ok | medium-high | 1.112 | -2.867 | -3.979 | 3.979 | widerspruechlich | Vorzeichen/Klasse unterschiedlich |

### Terrain-Stratifikation

Leitmetriken je Terrain-Klasse (Hangklasse aus `building_terrain_context.slope_mean_deg`).

#### Rollup-Vergleich nach Terrain-Klasse

**Gruppe status_ok_or_single_both**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 107 | 22.4% | -0.201 | 43.9% | 22.4% | 0.295 | 0.577 | 1.264 | 1.556 | -0.235 | 1.151 |
| uebergang | 65 | 35.4% | -0.081 | 61.5% | 32.3% | 0.096 | 0.396 | 1.061 | 1.423 | -0.237 | 0.807 |
| hang | 55 | 45.5% | -0.047 | 52.7% | 27.3% | 0.477 | 0.574 | 1.069 | 1.296 | 0.268 | 0.977 |

**Gruppe ok_ok**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 84 | 21.4% | -0.261 | 44.0% | 19.0% | 0.152 | 0.576 | 1.245 | 1.519 | -0.302 | 1.110 |
| uebergang | 49 | 34.7% | -0.041 | 65.3% | 32.7% | 0.248 | 0.496 | 0.945 | 1.251 | -0.189 | 0.797 |
| hang | 34 | 55.9% | 0.067 | 64.7% | 35.3% | 0.464 | 0.507 | 0.895 | 1.067 | 0.533 | 0.867 |

#### Overlap-Vertikalproxy ASC-vs-ASC nach Terrain-Klasse

**Gruppe status_ok_or_single_both**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 96 | 43.8% | 0.221 | 25.0% | 10.4% | 2.625 | 2.051 | 3.965 | 5.285 | 0.144 | 2.940 |
| uebergang | 58 | 43.1% | 0.237 | 20.7% | 8.6% | 0.951 | 0.476 | 3.778 | 4.924 | 0.239 | 2.709 |
| hang | 46 | 39.1% | 0.193 | 15.2% | 6.5% | 1.856 | 2.482 | 3.639 | 4.465 | 0.316 | 3.170 |

**Gruppe ok_ok**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 84 | 44.0% | 0.217 | 25.0% | 10.7% | 2.537 | 1.788 | 3.987 | 5.294 | 0.147 | 3.000 |
| uebergang | 49 | 40.8% | 0.239 | 24.5% | 10.2% | 1.115 | 0.514 | 3.560 | 4.729 | 0.269 | 2.487 |
| hang | 34 | 32.4% | 0.077 | 11.8% | 8.8% | 1.618 | 2.814 | 3.828 | 4.510 | 0.327 | 3.246 |

#### Overlap-Vertikalproxy DSC-vs-DSC nach Terrain-Klasse

**Gruppe status_ok_or_single_both**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 94 | 28.7% | 0.088 | 2.1% | 1.1% | 7.758 | 7.767 | 7.817 | 8.644 | 0.102 | 7.767 |
| uebergang | 56 | 37.5% | 0.222 | 5.4% | 1.8% | 7.889 | 7.310 | 7.894 | 8.959 | 0.122 | 7.310 |
| hang | 41 | 34.1% | 0.221 | 4.9% | 4.9% | 5.960 | 6.930 | 6.803 | 7.839 | 0.396 | 6.952 |

**Gruppe ok_ok**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 84 | 26.2% | 0.023 | 2.4% | 1.2% | 7.664 | 7.767 | 7.731 | 8.573 | 0.042 | 7.767 |
| uebergang | 49 | 36.7% | 0.292 | 6.1% | 2.0% | 7.894 | 7.221 | 7.900 | 9.005 | 0.152 | 7.221 |
| hang | 34 | 35.3% | 0.270 | 2.9% | 2.9% | 5.923 | 6.941 | 6.802 | 7.750 | 0.436 | 6.992 |


## bg_slope_ext_01

- SNT-Gebaeude: 664
- TSX/PAZ-Gebaeude: 722
- gekoppelte Gebaeude: 641

### Auswertbare Gebaeude je Filtergruppe

| Filtergruppe | Gebaeude in Gruppe | mit beiden Werten |
| --- | --- | --- |
| all_coupled | 641 | 359 |
| status_ok_or_single_both | 238 | 238 |
| ok_ok | 147 | 147 |
| reliability_medium_high_both | 229 | 229 |
| main_support_ge2_each | 359 | 359 |

### Rollup-Vergleich `building_motion_mm_a`

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 359 | 42.3% | 0.290 | 44.0% | 22.3% | 1.318 | 0.888 | 2.033 | 3.700 | 0.031 | 1.125 |
| status_ok_or_single_both | 238 | 43.7% | 0.367 | 48.7% | 23.9% | 1.002 | 0.832 | 1.504 | 2.532 | 0.194 | 1.027 |
| ok_ok | 147 | 52.4% | 0.573 | 61.9% | 30.6% | 0.751 | 0.785 | 0.961 | 1.202 | 0.704 | 0.832 |
| reliability_medium_high_both | 229 | 40.6% | 0.268 | 48.0% | 24.9% | 1.112 | 0.862 | 1.608 | 2.702 | 0.129 | 1.039 |
| main_support_ge2_each | 359 | 42.3% | 0.290 | 44.0% | 22.3% | 1.318 | 0.888 | 2.033 | 3.700 | 0.031 | 1.125 |

### ASC-vs-ASC Rollup-Track 44 vs 93

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 236 | 55.5% | 0.610 | 47.0% | 26.7% | 0.751 | 0.468 | 1.497 | 2.023 | 0.782 | 1.073 |
| status_ok_or_single_both | 181 | 58.0% | 0.665 | 47.0% | 26.0% | 0.806 | 0.468 | 1.499 | 2.010 | 0.844 | 1.063 |
| ok_ok | 147 | 55.8% | 0.626 | 44.9% | 24.5% | 0.790 | 0.425 | 1.553 | 2.056 | 0.833 | 1.104 |
| reliability_medium_high_both | 168 | 53.6% | 0.530 | 52.4% | 29.8% | 0.466 | 0.223 | 1.237 | 1.631 | 0.667 | 0.923 |
| main_support_ge2_each | 236 | 55.5% | 0.610 | 47.0% | 26.7% | 0.751 | 0.468 | 1.497 | 2.023 | 0.782 | 1.073 |

### DSC-vs-DSC Rollup-Track 95 vs 70

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 257 | 47.5% | 0.594 | 36.2% | 16.7% | 0.899 | 1.003 | 1.767 | 2.308 | 0.920 | 1.380 |
| status_ok_or_single_both | 200 | 44.5% | 0.560 | 36.5% | 18.0% | 0.893 | 1.021 | 1.784 | 2.342 | 0.916 | 1.389 |
| ok_ok | 147 | 46.3% | 0.568 | 38.8% | 18.4% | 0.712 | 0.898 | 1.717 | 2.279 | 0.929 | 1.346 |
| reliability_medium_high_both | 190 | 40.5% | 0.445 | 38.9% | 20.0% | 1.231 | 1.210 | 1.634 | 2.142 | 0.865 | 1.330 |
| main_support_ge2_each | 257 | 47.5% | 0.594 | 36.2% | 16.7% | 0.899 | 1.003 | 1.767 | 2.308 | 0.920 | 1.380 |

### Overlap-LOS ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 236 | 34.7% | 0.242 | 15.7% | 8.1% | 1.660 | 1.848 | 2.995 | 3.719 | 0.282 | 2.559 |
| status_ok_or_single_both | 181 | 37.0% | 0.258 | 17.1% | 9.9% | 1.485 | 1.658 | 2.754 | 3.365 | 0.336 | 2.465 |
| ok_ok | 147 | 37.4% | 0.236 | 19.0% | 10.9% | 1.554 | 1.646 | 2.757 | 3.413 | 0.342 | 2.475 |
| reliability_medium_high_both | 168 | 33.3% | 0.186 | 17.9% | 8.9% | 1.408 | 1.593 | 2.655 | 3.268 | 0.218 | 2.377 |
| main_support_ge2_each | 236 | 34.7% | 0.242 | 15.7% | 8.1% | 1.660 | 1.848 | 2.995 | 3.719 | 0.282 | 2.559 |

### Overlap-Vertical-Proxy ASC-vs-ASC 44 vs 93

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 236 | 35.6% | 0.241 | 11.0% | 4.7% | 2.563 | 2.706 | 4.203 | 5.207 | 0.282 | 3.571 |
| status_ok_or_single_both | 181 | 37.6% | 0.258 | 12.2% | 5.5% | 2.307 | 2.429 | 3.906 | 4.787 | 0.336 | 3.402 |
| ok_ok | 147 | 37.4% | 0.235 | 13.6% | 6.8% | 2.372 | 2.380 | 3.921 | 4.848 | 0.342 | 3.374 |
| reliability_medium_high_both | 168 | 33.9% | 0.186 | 12.5% | 6.0% | 2.063 | 2.143 | 3.694 | 4.535 | 0.218 | 3.224 |
| main_support_ge2_each | 236 | 35.6% | 0.241 | 11.0% | 4.7% | 2.563 | 2.706 | 4.203 | 5.207 | 0.282 | 3.571 |

### Overlap-LOS DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 257 | 47.9% | 0.548 | 10.5% | 5.1% | 3.587 | 3.941 | 4.370 | 5.211 | 0.557 | 4.286 |
| status_ok_or_single_both | 200 | 46.5% | 0.557 | 12.5% | 6.0% | 3.586 | 3.982 | 4.258 | 5.105 | 0.582 | 4.199 |
| ok_ok | 147 | 47.6% | 0.586 | 11.6% | 6.1% | 3.890 | 4.398 | 4.371 | 5.199 | 0.599 | 4.460 |
| reliability_medium_high_both | 190 | 42.1% | 0.467 | 11.6% | 5.3% | 3.753 | 4.300 | 4.424 | 5.271 | 0.480 | 4.375 |
| main_support_ge2_each | 257 | 47.9% | 0.548 | 10.5% | 5.1% | 3.587 | 3.941 | 4.370 | 5.211 | 0.557 | 4.286 |

### Overlap-Vertical-Proxy DSC-vs-DSC 95 vs 70

| Filtergruppe | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all_coupled | 257 | 50.6% | 0.548 | 10.5% | 6.2% | 4.118 | 4.494 | 5.320 | 6.489 | 0.557 | 5.144 |
| status_ok_or_single_both | 200 | 49.0% | 0.557 | 10.5% | 6.5% | 4.144 | 4.526 | 5.176 | 6.325 | 0.582 | 4.911 |
| ok_ok | 147 | 48.3% | 0.586 | 10.2% | 7.5% | 4.497 | 4.914 | 5.316 | 6.447 | 0.599 | 5.144 |
| reliability_medium_high_both | 190 | 44.2% | 0.467 | 10.0% | 5.8% | 4.557 | 4.973 | 5.458 | 6.585 | 0.480 | 5.324 |
| main_support_ge2_each | 257 | 50.6% | 0.548 | 10.5% | 6.2% | 4.118 | 4.494 | 5.320 | 6.489 | 0.557 | 5.144 |

### Top-10 groesste Rollup-Abweichungen

| Building-ID | Terrain-Klasse | Status | Reliability | SNT | TSX/PAZ | Delta | Abs Delta | Relation | Moeglicher Grund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| {BEFC966D-CD62-45F6-AE17-62A43AD8AAAE} | hang | small_n-single_track_only | low-medium | -15.434 | 16.209 | 31.643 | 31.643 | widerspruechlich | status small_n-single_track_only; reliability low-medium; Vorzeichen/Klasse unterschiedlich |
| {C5C0C262-B783-4730-BB8F-1F8EA3ADD705} | hang | single_track_only-single_track_only | medium-medium | -11.357 | 11.371 | 22.728 | 22.728 | widerspruechlich | status single_track_only-single_track_only; Vorzeichen/Klasse unterschiedlich |
| {958BEE46-7B8A-4A2B-ABBE-DBA4B853AF80} | hang | small_n-single_track_only | low-medium | -10.164 | 11.032 | 21.196 | 21.196 | widerspruechlich | status small_n-single_track_only; reliability low-medium; Vorzeichen/Klasse unterschiedlich |
| {443E9809-6B62-423C-B734-5A6A62D14DB4} | hang | small_n-single_track_only | low-medium | -13.296 | 0.933 | 14.230 | 14.230 | widerspruechlich | status small_n-single_track_only; reliability low-medium; Vorzeichen/Klasse unterschiedlich |
| {90B0F776-69C4-46BC-92A3-308E9F199708} | uebergang | small_n-small_n | low-low | 2.167 | -11.934 | -14.102 | 14.102 | widerspruechlich | status small_n-small_n; reliability low-low; Vorzeichen/Klasse unterschiedlich |
| {8E39D60E-0699-4CAC-B544-6B1BEC1C5B37} | hang | small_n-small_n | low-low | -8.280 | 4.073 | 12.353 | 12.353 | widerspruechlich | status small_n-small_n; reliability low-low; Vorzeichen/Klasse unterschiedlich |
| {8A7CA4E4-09D6-4114-B035-D8138D9F5F61} | hang | small_n-single_track_only | low-medium | -4.266 | 7.043 | 11.310 | 11.310 | widerspruechlich | status small_n-single_track_only; reliability low-medium; Vorzeichen/Klasse unterschiedlich |
| {0435AC3F-060D-44DF-B27F-2615D58910FA} | uebergang | noise_dominated-ok | low-high | -11.545 | -0.558 | 10.988 | 10.988 | beide negativ/sinkend-proxy | status noise_dominated-ok; reliability low-high |
| {EA707EF4-7B0D-4606-B808-CF80C6F38362} | hang | single_track_only-ok | medium-high | -12.047 | -1.903 | 10.144 | 10.144 | beide negativ/sinkend-proxy | status single_track_only-ok |
| {87B8BA4E-0F2B-4B81-B58D-499B09FF6B57} | hang | small_n-ok | low-high | -13.051 | -3.545 | 9.506 | 9.506 | beide negativ/sinkend-proxy | status small_n-ok; reliability low-high |

### Terrain-Stratifikation

Leitmetriken je Terrain-Klasse (Hangklasse aus `building_terrain_context.slope_mean_deg`).

#### Rollup-Vergleich nach Terrain-Klasse

**Gruppe status_ok_or_single_both**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 47 | 36.2% | -0.082 | 59.6% | 36.2% | 1.041 | 0.773 | 1.106 | 1.443 | -0.044 | 0.782 |
| uebergang | 73 | 37.0% | 0.362 | 53.4% | 27.4% | 0.697 | 0.832 | 1.237 | 1.908 | 0.127 | 0.954 |
| hang | 118 | 50.8% | 0.433 | 41.5% | 16.9% | 1.175 | 0.875 | 1.828 | 3.139 | 0.182 | 1.194 |

**Gruppe ok_ok**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 28 | 32.1% | -0.446 | 57.1% | 32.1% | 1.019 | 0.938 | 1.104 | 1.429 | -0.317 | 0.938 |
| uebergang | 52 | 48.1% | 0.635 | 69.2% | 36.5% | 0.731 | 0.785 | 0.781 | 0.924 | 0.870 | 0.785 |
| hang | 67 | 64.2% | 0.693 | 58.2% | 25.4% | 0.655 | 0.744 | 1.042 | 1.285 | 0.694 | 0.901 |

#### Overlap-Vertikalproxy ASC-vs-ASC nach Terrain-Klasse

**Gruppe status_ok_or_single_both**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 33 | 42.4% | 0.177 | 12.1% | 9.1% | 0.299 | 1.060 | 3.544 | 4.197 | 0.271 | 3.359 |
| uebergang | 62 | 41.9% | 0.453 | 16.1% | 3.2% | 1.812 | 1.746 | 3.382 | 4.331 | 0.502 | 2.480 |
| hang | 86 | 32.6% | 0.117 | 9.3% | 5.8% | 3.434 | 3.527 | 4.422 | 5.286 | 0.278 | 4.064 |

**Gruppe ok_ok**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 28 | 50.0% | 0.218 | 14.3% | 10.7% | 0.658 | 1.079 | 3.288 | 3.960 | 0.309 | 3.065 |
| uebergang | 52 | 38.5% | 0.327 | 19.2% | 3.8% | 1.800 | 1.746 | 3.504 | 4.530 | 0.426 | 2.545 |
| hang | 67 | 31.3% | 0.149 | 9.0% | 7.5% | 3.532 | 3.769 | 4.509 | 5.393 | 0.323 | 4.093 |

#### Overlap-Vertikalproxy DSC-vs-DSC nach Terrain-Klasse

**Gruppe status_ok_or_single_both**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 42 | 35.7% | 0.176 | 16.7% | 11.9% | 3.412 | 3.533 | 4.720 | 6.244 | 0.060 | 4.353 |
| uebergang | 63 | 34.9% | 0.413 | 7.9% | 4.8% | 4.791 | 5.896 | 5.677 | 6.957 | 0.411 | 5.896 |
| hang | 95 | 64.2% | 0.623 | 9.5% | 5.3% | 4.040 | 4.193 | 5.046 | 5.908 | 0.656 | 4.628 |

**Gruppe ok_ok**

| Terrain-Klasse | n | Sign agreement | Spearman | <=1.0 | <=0.5 | Bias mean | Bias median | MAE | RMSE | Pearson | Median abs diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flach | 28 | 39.3% | 0.369 | 21.4% | 17.9% | 4.191 | 4.437 | 4.493 | 6.059 | 0.081 | 4.437 |
| uebergang | 52 | 32.7% | 0.461 | 5.8% | 1.9% | 5.056 | 6.085 | 5.856 | 7.143 | 0.424 | 6.085 |
| hang | 67 | 64.2% | 0.645 | 9.0% | 7.5% | 4.191 | 4.474 | 5.242 | 6.019 | 0.665 | 4.772 |


## Audit: Top-divergente Gebaeude (GE-3D manuell pruefen)

Top-15 nach absolutem Vertikalproxy-Unterschied im Overlap-Fenster (Union beider Track-Paare, je Gebaeude die staerkste Divergenz).

| Building-ID | Terrain-Klasse | Paar | SNT | TSX/PAZ | Delta | Status | Reliability | lon | lat | Deep-Links | GE-3D-Befund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| {0726CA74-6A0B-48F4-89B2-84EF50B84709} | uebergang | DSC-vs-DSC | -22.379 | 0.207 | 22.586 | ok-ok | medium-high | 13.135649 | 47.113051 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{0726CA74-6A0B-48F4-89B2-84EF50B84709}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{0726CA74-6A0B-48F4-89B2-84EF50B84709}&mlview=cross-track&mlbuildings=1) |   |
| {BC20F1C5-9A0F-4269-A124-FF0CAFC52044} | uebergang | DSC-vs-DSC | -18.757 | 1.228 | 19.985 | small_n-ok | low-high | 13.135796 | 47.112779 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{BC20F1C5-9A0F-4269-A124-FF0CAFC52044}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{BC20F1C5-9A0F-4269-A124-FF0CAFC52044}&mlview=cross-track&mlbuildings=1) |   |
| {80448F0F-98BF-47AE-9CB5-01BAE30FD9F2} | flach | DSC-vs-DSC | -11.770 | 7.856 | 19.626 | ok-ok | high-high | 13.138657 | 47.125278 | [SNT](http://localhost:3000/?area=bad_gastein&run=929e79d9-149b-414d-91aa-6db4e4d3f36f&building=bev:{80448F0F-98BF-47AE-9CB5-01BAE30FD9F2}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=3315f80a-1262-4eab-80f7-4d5f0542c14e&building=bev:{80448F0F-98BF-47AE-9CB5-01BAE30FD9F2}&mlview=cross-track&mlbuildings=1) |   |
| {03B445AF-A1C9-42D9-9111-D5FF7F0BE076} | uebergang | DSC-vs-DSC | -16.809 | 0.537 | 17.345 | ok-ok | high-high | 13.133525 | 47.110965 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{03B445AF-A1C9-42D9-9111-D5FF7F0BE076}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{03B445AF-A1C9-42D9-9111-D5FF7F0BE076}&mlview=cross-track&mlbuildings=1) |   |
| {F2FE48DC-2E7C-4EAA-97EB-F4834AC9C49F} | flach | DSC-vs-DSC | -16.631 | 0.627 | 17.258 | ok-ok | low-high | 13.132425 | 47.106088 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{F2FE48DC-2E7C-4EAA-97EB-F4834AC9C49F}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{F2FE48DC-2E7C-4EAA-97EB-F4834AC9C49F}&mlview=cross-track&mlbuildings=1) |   |
| {364207A5-59D2-4822-9381-BE747EBC22EB} | hang | ASC-vs-ASC | -13.480 | 3.594 | 17.074 | small_n-ok | low-medium | 13.133821 | 47.118870 | [SNT](http://localhost:3000/?area=bad_gastein&run=929e79d9-149b-414d-91aa-6db4e4d3f36f&building=bev:{364207A5-59D2-4822-9381-BE747EBC22EB}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=3315f80a-1262-4eab-80f7-4d5f0542c14e&building=bev:{364207A5-59D2-4822-9381-BE747EBC22EB}&mlview=cross-track&mlbuildings=1) |   |
| {9B31B315-C7FD-4E11-AFAB-CEE81FF42513} | flach | DSC-vs-DSC | -15.287 | 1.714 | 17.001 | ok-ok | high-high | 13.132459 | 47.107685 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{9B31B315-C7FD-4E11-AFAB-CEE81FF42513}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{9B31B315-C7FD-4E11-AFAB-CEE81FF42513}&mlview=cross-track&mlbuildings=1) |   |
| {9AAE8F67-7CDD-44C7-927A-E94A41AF7F67} | flach | DSC-vs-DSC | -17.369 | -0.695 | 16.674 | single_track_only-ok | medium-high | 13.132473 | 47.113201 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{9AAE8F67-7CDD-44C7-927A-E94A41AF7F67}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{9AAE8F67-7CDD-44C7-927A-E94A41AF7F67}&mlview=cross-track&mlbuildings=1) |   |
| {B71895DB-F403-4C9C-BF3E-4A5A8A2DE7F1} | flach | ASC-vs-ASC | -14.391 | 2.262 | 16.652 | ok-ok | high-high | 13.134371 | 47.109142 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{B71895DB-F403-4C9C-BF3E-4A5A8A2DE7F1}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{B71895DB-F403-4C9C-BF3E-4A5A8A2DE7F1}&mlview=cross-track&mlbuildings=1) |   |
| {395B9336-FB1E-43CE-9F0A-FFC7D778B785} | uebergang | DSC-vs-DSC | -16.659 | -0.160 | 16.499 | ok-ok | high-high | 13.135300 | 47.107467 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{395B9336-FB1E-43CE-9F0A-FFC7D778B785}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{395B9336-FB1E-43CE-9F0A-FFC7D778B785}&mlview=cross-track&mlbuildings=1) |   |
| {B76DA1A4-A615-4FA6-B47F-4F2C368037D2} | flach | ASC-vs-ASC | 17.609 | 1.793 | -15.816 | small_n-noise_dominated | low-medium | 13.134238 | 47.110063 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{B76DA1A4-A615-4FA6-B47F-4F2C368037D2}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{B76DA1A4-A615-4FA6-B47F-4F2C368037D2}&mlview=cross-track&mlbuildings=1) |   |
| {26049B72-C689-4F66-AF3B-E2E59A877BF5} | flach | DSC-vs-DSC | -9.515 | 6.026 | 15.542 | small_n-ok | low-medium | 13.133486 | 47.106970 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{26049B72-C689-4F66-AF3B-E2E59A877BF5}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{26049B72-C689-4F66-AF3B-E2E59A877BF5}&mlview=cross-track&mlbuildings=1) |   |
| {0A14977B-99BE-48D0-8705-EE99EE101A4D} | flach | ASC-vs-ASC | -12.172 | 3.312 | 15.484 | small_n-ok | low-medium | 13.134522 | 47.109129 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{0A14977B-99BE-48D0-8705-EE99EE101A4D}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{0A14977B-99BE-48D0-8705-EE99EE101A4D}&mlview=cross-track&mlbuildings=1) |   |
| {F6B0F17F-708F-4A81-B3FD-DF350ACFAC26} | hang | DSC-vs-DSC | -13.792 | 1.656 | 15.448 | single_track_only-ok | medium-high | 13.134579 | 47.112967 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{F6B0F17F-708F-4A81-B3FD-DF350ACFAC26}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{F6B0F17F-708F-4A81-B3FD-DF350ACFAC26}&mlview=cross-track&mlbuildings=1) |   |
| {2CEB7231-27B0-45EC-A1F3-55F29B970A0E} | hang | DSC-vs-DSC | -14.944 | 0.444 | 15.389 | ok-ok | high-high | 13.133635 | 47.111231 | [SNT](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{2CEB7231-27B0-45EC-A1F3-55F29B970A0E}&mlview=cross-track&mlbuildings=1) / [TSX](http://localhost:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{2CEB7231-27B0-45EC-A1F3-55F29B970A0E}&mlview=cross-track&mlbuildings=1) |   |

## Interpretation

- **Variante 1:** Dieses Fenster (232 Tage, ein Winter) validiert die Konsistenz der Sensoren untereinander; es validiert keine absoluten Jahresraten.
- Flach-AOI: Rollup-Vergleich MAE=1.205 mm/a, Sign-Agreement=36.5%; 85.0% liegen innerhalb <=2 mm/a. Overlap-LOS mittlerer Paar-MAE=4.436 mm/a.
- Hang-AOI: Rollup-Vergleich MAE=2.033 mm/a, Sign-Agreement=42.3%; 72.7% liegen innerhalb <=2 mm/a. Overlap-LOS mittlerer Paar-MAE=3.682 mm/a.
- Im Rollup verschlechtert sich die quantitative Uebereinstimmung im Hanggebiet deutlich; die Overlap-LOS-Fehler bleiben in beiden AOIs gross.
- Groesste Abweichungen sind primaer durch `status small_n-single_track_only` erklaert, soweit die heuristische Klassifikation das abbildet.
- Die zentrale Bewegungsfrage ist damit nur eingeschraenkt positiv: Rollup-Groessenordnungen passen in Teilen, aber Sign-Agreement und Overlap-Slopes zeigen keine robuste quantitative Uebereinstimmung ueber beide Geometrien.
- TSX/PAZ sollte fuer Bad Gastein derzeit als Plausibilitaets- und Strukturreferenz genutzt werden, nicht als quantitative Ground-Truth-Referenz fuer Gebaeudeabsenkung; belastbare quantitative Aussagen brauchen mindestens filter- und geometriegetrennte Betrachtung.
