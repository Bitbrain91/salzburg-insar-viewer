# Phase 7 - Scorecard (P7-B-W1-T2)

Stand: 2026-06-10. Baseline: `k2x`.
Regel: Niedrigere Noise-Rate allein ist kein Erfolg; harte Gates muessen halten.

## k2x -> baseline

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

## k2x_ms_equal -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.417 | 25 | 5 | 0.5955 | None |
| moosstrasse | 1241 | 0.380 | 61 | 13 | 0.4152 | None |
| osthang | 484 | 0.372 | 20 | 5 | 0.8114 | None |
| bg_flat_01_snt | 718 | 0.404 | 32 | 9 | 0.5696 | None |
| bg_slope_01_snt | 533 | 0.364 | 14 | 4 | 0.1691 | None |
| bg_flat_01_tsx | 5652 | 0.394 | 67 | 12 | 0.4771 | None |
| bg_slope_01_tsx | 3912 | 0.347 | 48 | 4 | 0.0879 | None |

Referenzfaelle: 14/15 ok; 5 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_tsx_high_n_noise', 'ok')]

## k2x_leaf -> candidate_red
- mirabell: mehr nearest-dominierte Main-Cluster
- moosstrasse: mehr nearest-dominierte Main-Cluster
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- bg_slope_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.103 | 30 | 7 | 0.6815 | None |
| moosstrasse | 1241 | 0.148 | 64 | 14 | 0.3717 | None |
| osthang | 484 | 0.172 | 27 | 3 | 0.8455 | None |
| bg_flat_01_snt | 718 | 0.155 | 37 | 6 | 0.63 | None |
| bg_slope_01_snt | 533 | 0.122 | 16 | 4 | 0.1821 | None |
| bg_flat_01_tsx | 5652 | 0.045 | 71 | 15 | 0.5021 | None |
| bg_slope_01_tsx | 3912 | 0.098 | 50 | 6 | 0.0848 | None |

Referenzfaelle: 11/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_no_single -> candidate_red
- mirabell: mehr nearest-dominierte Main-Cluster
- moosstrasse: mehr nearest-dominierte Main-Cluster
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.102 | 30 | 7 | 0.6815 | None |
| moosstrasse | 1241 | 0.146 | 64 | 12 | 0.3699 | None |
| osthang | 484 | 0.169 | 27 | 4 | 0.8455 | None |
| bg_flat_01_snt | 718 | 0.153 | 37 | 7 | 0.618 | None |
| bg_slope_01_snt | 533 | 0.122 | 16 | 4 | 0.1821 | None |
| bg_flat_01_tsx | 5652 | 0.045 | 71 | 15 | 0.4939 | None |
| bg_slope_01_tsx | 3912 | 0.089 | 50 | 5 | 0.0875 | None |

Referenzfaelle: 11/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_mcs03 -> candidate_red
- osthang: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.386 | 25 | 5 | 0.5902 | None |
| moosstrasse | 1241 | 0.288 | 61 | 10 | 0.4666 | None |
| osthang | 484 | 0.306 | 21 | 4 | 0.8368 | None |
| bg_flat_01_snt | 718 | 0.341 | 32 | 9 | 0.6341 | None |
| bg_slope_01_snt | 533 | 0.306 | 14 | 4 | 0.1646 | None |
| bg_flat_01_tsx | 5652 | 0.375 | 67 | 11 | 0.5213 | None |
| bg_slope_01_tsx | 3912 | 0.294 | 48 | 5 | 0.0849 | None |

Referenzfaelle: 13/15 ok; 5 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_slope_noise_low_agreement', 'ok')]

## k2x_floor3 -> candidate_inconclusive

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.374 | 25 | 5 | 0.6499 | None |
| moosstrasse | 1241 | 0.278 | 61 | 11 | 0.4383 | None |
| osthang | 484 | 0.302 | 20 | 3 | 0.8296 | None |
| bg_flat_01_snt | 718 | 0.326 | 32 | 9 | 0.6514 | None |
| bg_slope_01_snt | 533 | 0.283 | 14 | 4 | 0.1646 | None |
| bg_flat_01_tsx | 5652 | 0.370 | 67 | 12 | 0.5091 | None |
| bg_slope_01_tsx | 3912 | 0.289 | 48 | 5 | 0.0866 | None |

Referenzfaelle: 15/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt

## k2x_eps05 -> candidate_red
- mirabell: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.053 | 25 | 5 | 0.6196 | None |
| moosstrasse | 1241 | 0.089 | 61 | 12 | 0.4538 | None |
| osthang | 484 | 0.103 | 21 | 4 | 0.8308 | None |
| bg_flat_01_snt | 718 | 0.130 | 32 | 8 | 0.6851 | None |
| bg_slope_01_snt | 533 | 0.060 | 14 | 4 | 0.1619 | None |
| bg_flat_01_tsx | 5652 | 0.048 | 68 | 13 | 0.5046 | None |
| bg_slope_01_tsx | 3912 | 0.106 | 49 | 5 | 0.0872 | None |

Referenzfaelle: 11/15 ok; 3 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_flat_small_n', 'single_track_only'), ('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_feat_vel_lo -> candidate_red
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.304 | 25 | 5 | 0.656 | None |
| moosstrasse | 1241 | 0.220 | 61 | 11 | 0.4188 | None |
| osthang | 484 | 0.254 | 21 | 3 | 0.8135 | None |
| bg_flat_01_snt | 718 | 0.245 | 32 | 8 | 0.6685 | None |
| bg_slope_01_snt | 533 | 0.255 | 14 | 4 | 0.1607 | None |
| bg_flat_01_tsx | 5652 | 0.304 | 67 | 13 | 0.5285 | None |
| bg_slope_01_tsx | 3912 | 0.242 | 49 | 5 | 0.0887 | None |

Referenzfaelle: 13/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_feat_no_accel -> candidate_red
- osthang: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.293 | 25 | 5 | 0.573 | None |
| moosstrasse | 1241 | 0.219 | 62 | 10 | 0.4257 | None |
| osthang | 484 | 0.258 | 21 | 4 | 0.8415 | None |
| bg_flat_01_snt | 718 | 0.255 | 32 | 9 | 0.6809 | None |
| bg_slope_01_snt | 533 | 0.263 | 14 | 4 | 0.1595 | None |
| bg_flat_01_tsx | 5652 | 0.303 | 68 | 12 | 0.4833 | None |
| bg_slope_01_tsx | 3912 | 0.254 | 49 | 4 | 0.0859 | None |

Referenzfaelle: 14/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_tsx_high_n_noise', 'ok')]

## k2x_feat_spatial_hi -> candidate_red
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.354 | 25 | 5 | 0.6702 | None |
| moosstrasse | 1241 | 0.247 | 61 | 10 | 0.5084 | None |
| osthang | 484 | 0.260 | 21 | 5 | 0.8135 | None |
| bg_flat_01_snt | 718 | 0.272 | 32 | 10 | 0.6682 | None |
| bg_slope_01_snt | 533 | 0.257 | 14 | 4 | 0.1646 | None |
| bg_flat_01_tsx | 5652 | 0.365 | 67 | 14 | 0.4778 | None |
| bg_slope_01_tsx | 3912 | 0.287 | 49 | 5 | 0.0867 | None |

Referenzfaelle: 13/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

## k2x_feat_ts -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.389 | 25 | 5 | 0.6196 | None |
| moosstrasse | 1241 | 0.280 | 61 | 12 | 0.4099 | None |
| osthang | 484 | 0.223 | 21 | 4 | 0.8179 | None |
| bg_flat_01_snt | 718 | 0.276 | 32 | 8 | 0.5964 | None |
| bg_slope_01_snt | 533 | 0.310 | 14 | 4 | 0.1646 | None |
| bg_flat_01_tsx | 5652 | 0.405 | 68 | 12 | 0.4887 | None |
| bg_slope_01_tsx | 3912 | 0.289 | 49 | 4 | 0.0859 | None |

Referenzfaelle: 14/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok')]

## k2x_feat_hstd -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.382 | 25 | 5 | 0.661 | None |
| moosstrasse | 1241 | 0.257 | 61 | 12 | 0.3913 | None |
| osthang | 484 | 0.250 | 21 | 3 | 0.821 | None |
| bg_flat_01_snt | 718 | 0.270 | 32 | 8 | 0.5966 | None |
| bg_slope_01_snt | 533 | 0.281 | 14 | 4 | 0.1592 | None |
| bg_flat_01_tsx | 5652 | 0.393 | 67 | 13 | 0.4568 | None |
| bg_slope_01_tsx | 3912 | 0.301 | 49 | 5 | 0.0878 | None |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt

## k2x_feat_no_coh -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.337 | 25 | 5 | 0.656 | None |
| moosstrasse | 1241 | 0.225 | 61 | 12 | 0.3925 | None |
| osthang | 484 | 0.260 | 21 | 4 | 0.8479 | None |
| bg_flat_01_snt | 718 | 0.280 | 32 | 10 | 0.6287 | None |
| bg_slope_01_snt | 533 | 0.259 | 14 | 4 | 0.1676 | None |
| bg_flat_01_tsx | 5652 | 0.327 | 68 | 12 | 0.474 | None |
| bg_slope_01_tsx | 3912 | 0.233 | 49 | 5 | 0.085 | None |

Referenzfaelle: 13/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('bg_slope_noise_low_agreement', 'ok'), ('bg_tsx_high_n_noise', 'ok')]

