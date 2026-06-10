# Phase 7 - Scorecard (P7-B-W1-T2)

Stand: 2026-06-10. Baseline: `noop`.
Regel: Niedrigere Noise-Rate allein ist kein Erfolg; harte Gates muessen halten.

## noop -> baseline

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.353 | 28 | 17 | 0.6497 | None |
| moosstrasse | 1601 | 0.279 | 71 | 34 | 0.4395 | None |
| osthang | 583 | 0.240 | 27 | 13 | 0.8497 | None |
| bg_flat_01_snt | 1042 | 0.296 | 46 | 40 | 0.5619 | None |
| bg_slope_01_snt | 660 | 0.335 | 18 | 14 | 0.1871 | None |
| bg_flat_01_tsx | 5981 | 0.374 | 72 | 23 | 0.5267 | None |
| bg_slope_01_tsx | 3969 | 0.287 | 50 | 10 | 0.0856 | None |

Referenzfaelle: 14/14 ok

## k2x -> candidate_green

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.358 | 25 | 5 | 0.6499 | None |
| moosstrasse | 1241 | 0.242 | 61 | 11 | 0.4383 | None |
| osthang | 484 | 0.246 | 21 | 3 | 0.8179 | None |
| bg_flat_01_snt | 718 | 0.292 | 32 | 9 | 0.6646 | None |
| bg_slope_01_snt | 533 | 0.272 | 14 | 4 | 0.1646 | None |
| bg_flat_01_tsx | 5652 | 0.366 | 68 | 12 | 0.5091 | None |
| bg_slope_01_tsx | 3912 | 0.287 | 49 | 5 | 0.0858 | None |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt

## optics_xi03 -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.271 | 34 | 14 | 0.6979 | None |
| moosstrasse | 1601 | 0.222 | 79 | 39 | 0.427 | None |
| osthang | 583 | 0.233 | 31 | 13 | 0.7771 | None |
| bg_flat_01_snt | 1042 | 0.252 | 51 | 39 | 0.4554 | None |
| bg_slope_01_snt | 660 | 0.261 | 20 | 14 | 0.1829 | None |
| bg_flat_01_tsx | 5981 | 0.315 | 75 | 26 | 0.5036 | None |
| bg_slope_01_tsx | 3969 | 0.275 | 51 | 8 | 0.0845 | None |

Referenzfaelle: 11/14 ok; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## optics_xi05 -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.270 | 34 | 14 | 0.6979 | None |
| moosstrasse | 1601 | 0.231 | 79 | 41 | 0.427 | None |
| osthang | 583 | 0.247 | 31 | 13 | 0.7986 | None |
| bg_flat_01_snt | 1042 | 0.274 | 50 | 38 | 0.4839 | None |
| bg_slope_01_snt | 660 | 0.265 | 20 | 14 | 0.1787 | None |
| bg_flat_01_tsx | 5981 | 0.318 | 75 | 25 | 0.5048 | None |
| bg_slope_01_tsx | 3969 | 0.295 | 51 | 7 | 0.0867 | None |

Referenzfaelle: 11/14 ok; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## optics_xi10 -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.262 | 32 | 14 | 0.742 | None |
| moosstrasse | 1601 | 0.246 | 78 | 43 | 0.4276 | None |
| osthang | 583 | 0.288 | 29 | 14 | 0.7986 | None |
| bg_flat_01_snt | 1042 | 0.277 | 50 | 39 | 0.4901 | None |
| bg_slope_01_snt | 660 | 0.264 | 20 | 12 | 0.1787 | None |
| bg_flat_01_tsx | 5981 | 0.246 | 75 | 28 | 0.4934 | None |
| bg_slope_01_tsx | 3969 | 0.300 | 51 | 7 | 0.0852 | None |

Referenzfaelle: 11/14 ok; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## optics_ms_equal -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster
- bg_slope_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.228 | 34 | 14 | 0.6564 | None |
| moosstrasse | 1601 | 0.184 | 79 | 43 | 0.4306 | None |
| osthang | 583 | 0.225 | 31 | 14 | 0.7986 | None |
| bg_flat_01_snt | 1042 | 0.177 | 50 | 41 | 0.4922 | None |
| bg_slope_01_snt | 660 | 0.189 | 20 | 15 | 0.1594 | None |
| bg_flat_01_tsx | 5981 | 0.204 | 74 | 30 | 0.5152 | None |
| bg_slope_01_tsx | 3969 | 0.279 | 51 | 8 | 0.0825 | None |

Referenzfaelle: 11/14 ok; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## optics_dbscan05 -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- bg_slope_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.376 | 28 | 16 | 0.6749 | None |
| moosstrasse | 1601 | 0.219 | 71 | 46 | 0.4194 | None |
| osthang | 583 | 0.292 | 27 | 18 | 0.8597 | None |
| bg_flat_01_snt | 1042 | 0.211 | 46 | 39 | 0.5394 | None |
| bg_slope_01_snt | 660 | 0.253 | 18 | 16 | 0.1767 | None |
| bg_flat_01_tsx | 5981 | 0.347 | 72 | 25 | 0.502 | None |
| bg_slope_01_tsx | 3969 | 0.311 | 50 | 11 | 0.0852 | None |

Referenzfaelle: 9/14 ok; FAILS: [('mirabell_adjacent_standard', 'noise_dominated'), ('moosstrasse_differential_anchor', 'noise_dominated'), ('osthang_low_agreement', 'ok'), ('bg_flat_small_n', 'single_track_only'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_optics_xi03 -> candidate_red
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.266 | 30 | 6 | 0.7234 | None |
| moosstrasse | 1241 | 0.183 | 64 | 13 | 0.3717 | None |
| osthang | 484 | 0.234 | 26 | 3 | 0.808 | None |
| bg_flat_01_snt | 718 | 0.198 | 37 | 9 | 0.5803 | None |
| bg_slope_01_snt | 533 | 0.234 | 16 | 3 | 0.1821 | None |
| bg_flat_01_tsx | 5652 | 0.298 | 70 | 12 | 0.4946 | None |
| bg_slope_01_tsx | 3912 | 0.280 | 51 | 4 | 0.0833 | None |

Referenzfaelle: 12/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_optics_xi05 -> candidate_red
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.283 | 30 | 6 | 0.7434 | None |
| moosstrasse | 1241 | 0.191 | 64 | 13 | 0.3393 | None |
| osthang | 484 | 0.262 | 25 | 3 | 0.827 | None |
| bg_flat_01_snt | 718 | 0.196 | 36 | 8 | 0.5981 | None |
| bg_slope_01_snt | 533 | 0.248 | 16 | 3 | 0.1844 | None |
| bg_flat_01_tsx | 5652 | 0.298 | 70 | 11 | 0.495 | None |
| bg_slope_01_tsx | 3912 | 0.307 | 51 | 4 | 0.0858 | None |

Referenzfaelle: 12/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_optics_xi10 -> candidate_red
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.269 | 28 | 5 | 0.7585 | None |
| moosstrasse | 1241 | 0.218 | 64 | 16 | 0.3505 | None |
| osthang | 484 | 0.283 | 23 | 4 | 0.8378 | None |
| bg_flat_01_snt | 718 | 0.235 | 36 | 10 | 0.5072 | None |
| bg_slope_01_snt | 533 | 0.242 | 16 | 3 | 0.1837 | None |
| bg_flat_01_tsx | 5652 | 0.218 | 69 | 10 | 0.4703 | None |
| bg_slope_01_tsx | 3912 | 0.322 | 50 | 4 | 0.084 | None |

Referenzfaelle: 12/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_optics_ms_equal -> candidate_red
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_slope_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.237 | 30 | 6 | 0.6397 | None |
| moosstrasse | 1241 | 0.184 | 64 | 14 | 0.3393 | None |
| osthang | 484 | 0.196 | 24 | 4 | 0.8378 | None |
| bg_flat_01_snt | 718 | 0.175 | 36 | 7 | 0.5556 | None |
| bg_slope_01_snt | 533 | 0.190 | 16 | 3 | 0.1621 | None |
| bg_flat_01_tsx | 5652 | 0.182 | 69 | 13 | 0.5124 | None |
| bg_slope_01_tsx | 3912 | 0.266 | 49 | 4 | 0.0837 | None |

Referenzfaelle: 12/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_optics_dbscan05 -> candidate_red
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.341 | 25 | 5 | 0.6183 | None |
| moosstrasse | 1241 | 0.177 | 61 | 14 | 0.4343 | None |
| osthang | 484 | 0.258 | 20 | 6 | 0.8251 | None |
| bg_flat_01_snt | 718 | 0.228 | 32 | 9 | 0.6654 | None |
| bg_slope_01_snt | 533 | 0.229 | 14 | 4 | 0.1731 | None |
| bg_flat_01_tsx | 5652 | 0.334 | 68 | 12 | 0.4637 | None |
| bg_slope_01_tsx | 3912 | 0.317 | 48 | 7 | 0.087 | None |

Referenzfaelle: 12/15 ok; 5 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_flat_small_n', 'single_track_only'), ('bg_tsx_high_n_noise', 'ok')]

