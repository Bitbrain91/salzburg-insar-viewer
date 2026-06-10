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

## a5_crosslook -> candidate_green

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.358 | 25 | 5 | 0.6499 | None |
| moosstrasse | 1241 | 0.245 | 63 | 11 | 0.4383 | None |
| osthang | 484 | 0.246 | 21 | 3 | 0.8179 | None |
| bg_flat_01_snt | 718 | 0.298 | 33 | 9 | 0.6848 | None |
| bg_slope_01_snt | 533 | 0.272 | 14 | 4 | 0.1646 | None |
| bg_flat_01_tsx | 5652 | 0.366 | 68 | 12 | 0.5091 | None |
| bg_slope_01_tsx | 3912 | 0.287 | 49 | 5 | 0.0858 | None |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt

## k1 -> candidate_green

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

## k2 -> candidate_red
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 916 | 0.272 | 22 | 0 | 0.642 | None |
| moosstrasse | 988 | 0.213 | 48 | 0 | 0.4257 | None |
| osthang | 385 | 0.268 | 15 | 0 | 0.8297 | None |
| bg_flat_01_snt | 573 | 0.227 | 28 | 0 | 0.6956 | None |
| bg_slope_01_snt | 433 | 0.180 | 13 | 0 | 0.1709 | None |
| bg_flat_01_tsx | 4570 | 0.324 | 65 | 0 | 0.4575 | None |
| bg_slope_01_tsx | 3277 | 0.242 | 47 | 0 | 0.0882 | None |

Referenzfaelle: 15/17 ok; 5 via Abstufungs-Toleranz; 4 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_slope_noise_low_agreement', 'ok')]

## k3 -> candidate_green

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

