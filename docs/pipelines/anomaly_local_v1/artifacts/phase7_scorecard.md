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

## ms_equal -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.424 | 28 | 16 | 0.66 | None |
| moosstrasse | 1601 | 0.407 | 70 | 36 | 0.4672 | None |
| osthang | 583 | 0.401 | 27 | 16 | 0.8301 | None |
| bg_flat_01_snt | 1042 | 0.432 | 46 | 34 | 0.5123 | None |
| bg_slope_01_snt | 660 | 0.418 | 18 | 15 | 0.1856 | None |
| bg_flat_01_tsx | 5981 | 0.412 | 72 | 23 | 0.4812 | None |
| bg_slope_01_tsx | 3969 | 0.346 | 50 | 6 | 0.0859 | None |

Referenzfaelle: 12/14 ok; FAILS: ['mirabell_adjacent_standard', 'bg_tsx_high_n_noise']

## leaf -> candidate_red
- mirabell: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.111 | 34 | 16 | 0.5963 | None |
| moosstrasse | 1601 | 0.157 | 79 | 46 | 0.4293 | None |
| osthang | 583 | 0.192 | 31 | 13 | 0.8019 | None |
| bg_flat_01_snt | 1042 | 0.131 | 51 | 39 | 0.4716 | None |
| bg_slope_01_snt | 660 | 0.148 | 20 | 14 | 0.1821 | None |
| bg_flat_01_tsx | 5981 | 0.059 | 76 | 33 | 0.5072 | None |
| bg_slope_01_tsx | 3969 | 0.092 | 51 | 9 | 0.0848 | None |

Referenzfaelle: 10/14 ok; FAILS: ['osthang_low_agreement', 'bg_flat_small_n', 'bg_slope_noise_low_agreement', 'bg_tsx_high_n_noise']

## no_single -> candidate_red
- mirabell: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- moosstrasse: mehr nearest-dominierte Main-Cluster
- moosstrasse: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- osthang: mehr nearest-dominierte Main-Cluster
- osthang: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_flat_01_snt: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.110 | 34 | 16 | 0.5963 | None |
| moosstrasse | 1601 | 0.155 | 79 | 46 | 0.4064 | None |
| osthang | 583 | 0.190 | 31 | 14 | 0.8019 | None |
| bg_flat_01_snt | 1042 | 0.131 | 51 | 39 | 0.4716 | None |
| bg_slope_01_snt | 660 | 0.147 | 20 | 16 | 0.1805 | None |
| bg_flat_01_tsx | 5981 | 0.058 | 76 | 32 | 0.5045 | None |
| bg_slope_01_tsx | 3969 | 0.083 | 51 | 9 | 0.0875 | None |

Referenzfaelle: 10/14 ok; FAILS: ['osthang_low_agreement', 'bg_flat_small_n', 'bg_slope_noise_low_agreement', 'bg_tsx_high_n_noise']

## mcs_03 -> candidate_red
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.392 | 28 | 16 | 0.6459 | None |
| moosstrasse | 1601 | 0.325 | 70 | 31 | 0.4625 | None |
| osthang | 583 | 0.293 | 27 | 14 | 0.865 | None |
| bg_flat_01_snt | 1042 | 0.354 | 46 | 38 | 0.5535 | None |
| bg_slope_01_snt | 660 | 0.344 | 18 | 14 | 0.1859 | None |
| bg_flat_01_tsx | 5981 | 0.378 | 72 | 24 | 0.5758 | None |
| bg_slope_01_tsx | 3969 | 0.293 | 50 | 9 | 0.0856 | None |

Referenzfaelle: 11/14 ok; FAILS: ['mirabell_adjacent_standard', 'osthang_low_agreement', 'bg_slope_noise_low_agreement']

## mcs_floor3 -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.377 | 28 | 14 | 0.6347 | None |
| moosstrasse | 1601 | 0.323 | 70 | 35 | 0.4759 | None |
| osthang | 583 | 0.269 | 27 | 13 | 0.8255 | None |
| bg_flat_01_snt | 1042 | 0.353 | 46 | 39 | 0.5795 | None |
| bg_slope_01_snt | 660 | 0.336 | 18 | 15 | 0.1772 | None |
| bg_flat_01_tsx | 5981 | 0.378 | 72 | 23 | 0.5267 | None |
| bg_slope_01_tsx | 3969 | 0.291 | 50 | 9 | 0.0856 | None |

Referenzfaelle: 14/14 ok

## eps_05 -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_snt: mehr nearest-dominierte Main-Cluster
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.043 | 28 | 16 | 0.6477 | None |
| moosstrasse | 1601 | 0.082 | 71 | 44 | 0.4216 | None |
| osthang | 583 | 0.100 | 27 | 14 | 0.8597 | None |
| bg_flat_01_snt | 1042 | 0.067 | 46 | 41 | 0.5629 | None |
| bg_slope_01_snt | 660 | 0.089 | 18 | 16 | 0.1754 | None |
| bg_flat_01_tsx | 5981 | 0.057 | 72 | 30 | 0.5152 | None |
| bg_slope_01_tsx | 3969 | 0.104 | 50 | 9 | 0.0872 | None |

Referenzfaelle: 10/14 ok; FAILS: ['osthang_low_agreement', 'bg_flat_small_n', 'bg_slope_noise_low_agreement', 'bg_tsx_high_n_noise']

## feat_vel_lo -> candidate_red
- mirabell: mehr nearest-dominierte Main-Cluster
- osthang: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.311 | 28 | 18 | 0.6175 | None |
| moosstrasse | 1601 | 0.254 | 70 | 34 | 0.4414 | None |
| osthang | 583 | 0.256 | 27 | 14 | 0.8497 | None |
| bg_flat_01_snt | 1042 | 0.292 | 46 | 38 | 0.5203 | None |
| bg_slope_01_snt | 660 | 0.303 | 18 | 14 | 0.184 | None |
| bg_flat_01_tsx | 5981 | 0.316 | 73 | 25 | 0.5355 | None |
| bg_slope_01_tsx | 3969 | 0.242 | 50 | 10 | 0.0871 | None |

Referenzfaelle: 12/14 ok; FAILS: ['osthang_low_agreement', 'bg_tsx_high_n_noise']

## feat_no_accel -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.293 | 29 | 15 | 0.6002 | None |
| moosstrasse | 1601 | 0.238 | 71 | 36 | 0.4229 | None |
| osthang | 583 | 0.250 | 27 | 13 | 0.8349 | None |
| bg_flat_01_snt | 1042 | 0.272 | 46 | 39 | 0.5777 | None |
| bg_slope_01_snt | 660 | 0.326 | 18 | 14 | 0.171 | None |
| bg_flat_01_tsx | 5981 | 0.304 | 72 | 24 | 0.505 | None |
| bg_slope_01_tsx | 3969 | 0.242 | 50 | 8 | 0.0837 | None |

Referenzfaelle: 13/14 ok; FAILS: ['bg_tsx_high_n_noise']

## feat_spatial_hi -> candidate_red
- osthang: mehr nearest-dominierte Main-Cluster
- bg_slope_01_snt: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.340 | 28 | 16 | 0.6445 | None |
| moosstrasse | 1601 | 0.267 | 70 | 34 | 0.4614 | None |
| osthang | 583 | 0.247 | 27 | 16 | 0.8252 | None |
| bg_flat_01_snt | 1042 | 0.300 | 46 | 40 | 0.5619 | None |
| bg_slope_01_snt | 660 | 0.314 | 18 | 15 | 0.184 | None |
| bg_flat_01_tsx | 5981 | 0.387 | 73 | 24 | 0.5144 | None |
| bg_slope_01_tsx | 3969 | 0.287 | 50 | 9 | 0.0837 | None |

Referenzfaelle: 12/14 ok; FAILS: ['osthang_low_agreement', 'bg_tsx_high_n_noise']

## feat_ts -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.381 | 28 | 17 | 0.6527 | None |
| moosstrasse | 1601 | 0.309 | 70 | 36 | 0.3922 | None |
| osthang | 583 | 0.221 | 27 | 12 | 0.865 | None |
| bg_flat_01_snt | 1042 | 0.278 | 46 | 38 | 0.543 | None |
| bg_slope_01_snt | 660 | 0.330 | 18 | 13 | 0.1779 | None |
| bg_flat_01_tsx | 5981 | 0.393 | 72 | 23 | 0.5246 | None |
| bg_slope_01_tsx | 3969 | 0.293 | 50 | 8 | 0.0856 | None |

Referenzfaelle: 13/14 ok; FAILS: ['osthang_low_agreement']

## feat_hstd -> candidate_red
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.379 | 28 | 17 | 0.6479 | None |
| moosstrasse | 1601 | 0.294 | 71 | 37 | 0.4117 | None |
| osthang | 583 | 0.238 | 27 | 13 | 0.8349 | None |
| bg_flat_01_snt | 1042 | 0.284 | 46 | 36 | 0.5239 | None |
| bg_slope_01_snt | 660 | 0.332 | 18 | 12 | 0.1871 | None |
| bg_flat_01_tsx | 5981 | 0.400 | 72 | 27 | 0.4852 | None |
| bg_slope_01_tsx | 3969 | 0.304 | 50 | 8 | 0.0856 | None |

Referenzfaelle: 14/14 ok

## feat_no_coh -> candidate_red
- mirabell: mehr nearest-dominierte Main-Cluster
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.333 | 28 | 19 | 0.6479 | None |
| moosstrasse | 1601 | 0.243 | 71 | 39 | 0.4353 | None |
| osthang | 583 | 0.257 | 27 | 11 | 0.865 | None |
| bg_flat_01_snt | 1042 | 0.278 | 46 | 40 | 0.5252 | None |
| bg_slope_01_snt | 660 | 0.318 | 18 | 14 | 0.1871 | None |
| bg_flat_01_tsx | 5981 | 0.338 | 74 | 26 | 0.5177 | None |
| bg_slope_01_tsx | 3969 | 0.228 | 50 | 8 | 0.0859 | None |

Referenzfaelle: 12/14 ok; FAILS: ['bg_slope_noise_low_agreement', 'bg_tsx_high_n_noise']

