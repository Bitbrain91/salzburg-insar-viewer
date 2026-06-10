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

## a1_demote -> candidate_red
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 916 | 0.272 | 22 | 0 | 0.642 | None |
| moosstrasse | 988 | 0.216 | 50 | 0 | 0.4257 | None |
| osthang | 385 | 0.270 | 16 | 0 | 0.8476 | None |
| bg_flat_01_snt | 573 | 0.234 | 28 | 0 | 0.6956 | None |
| bg_slope_01_snt | 433 | 0.180 | 13 | 0 | 0.1709 | None |
| bg_flat_01_tsx | 4570 | 0.324 | 65 | 0 | 0.4575 | None |
| bg_slope_01_tsx | 3277 | 0.242 | 47 | 0 | 0.0882 | None |

Referenzfaelle: 15/17 ok; 5 via Abstufungs-Toleranz; 4 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_slope_noise_low_agreement', 'ok')]

## a2_dist5 -> candidate_red
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 999 | 0.321 | 25 | 2 | 0.6702 | None |
| moosstrasse | 1216 | 0.261 | 53 | 8 | 0.3913 | None |
| osthang | 477 | 0.216 | 22 | 2 | 0.8456 | None |
| bg_flat_01_snt | 702 | 0.286 | 33 | 11 | 0.6162 | None |
| bg_slope_01_snt | 516 | 0.262 | 16 | 3 | 0.1733 | None |
| bg_flat_01_tsx | 5067 | 0.334 | 67 | 6 | 0.4797 | None |
| bg_slope_01_tsx | 3615 | 0.250 | 48 | 1 | 0.0872 | None |

Referenzfaelle: 11/13 ok; 4 via Abstufungs-Toleranz; FAILS: [('osthang_low_agreement', 'ok'), ('bg_slope_noise_low_agreement', 'ok')]

## a3_height -> candidate_green

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1239 | 0.320 | 28 | 12 | 0.676 | None |
| moosstrasse | 1493 | 0.269 | 67 | 30 | 0.4383 | None |
| osthang | 515 | 0.248 | 25 | 10 | 0.8497 | None |
| bg_flat_01_snt | 972 | 0.271 | 42 | 28 | 0.6444 | None |
| bg_slope_01_snt | 626 | 0.310 | 17 | 10 | 0.1846 | None |
| bg_flat_01_tsx | 5674 | 0.364 | 71 | 18 | 0.4709 | None |
| bg_slope_01_tsx | 3812 | 0.279 | 49 | 6 | 0.0843 | None |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt

## a4_osm -> candidate_inconclusive

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

## smalln_strict -> candidate_green

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.353 | 28 | 17 | 0.6497 | None |
| moosstrasse | 1601 | 0.279 | 70 | 34 | 0.4407 | None |
| osthang | 583 | 0.240 | 27 | 13 | 0.8497 | None |
| bg_flat_01_snt | 1042 | 0.296 | 45 | 39 | 0.5928 | None |
| bg_slope_01_snt | 660 | 0.335 | 18 | 14 | 0.1871 | None |
| bg_flat_01_tsx | 5981 | 0.374 | 72 | 23 | 0.5267 | None |
| bg_slope_01_tsx | 3969 | 0.287 | 50 | 10 | 0.0856 | None |

Referenzfaelle: 14/14 ok

## no_reassign -> candidate_red
- mirabell: mehr nearest-dominierte Main-Cluster
- moosstrasse: mehr nearest-dominierte Main-Cluster
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.583 | 28 | 19 | 0.5721 | None |
| moosstrasse | 1601 | 0.364 | 71 | 35 | 0.4031 | None |
| osthang | 583 | 0.321 | 27 | 11 | 0.811 | None |
| bg_flat_01_snt | 1042 | 0.399 | 46 | 40 | 0.5619 | None |
| bg_slope_01_snt | 660 | 0.497 | 18 | 14 | 0.1866 | None |
| bg_flat_01_tsx | 5981 | 0.732 | 72 | 24 | 0.5046 | None |
| bg_slope_01_tsx | 3969 | 0.651 | 50 | 9 | 0.0852 | None |

Referenzfaelle: 13/14 ok; FAILS: [('bg_slope_ok_low_agreement', 'noise_dominated')]

