# Phase 7 - Scorecard (P7-B-W1-T2)

Stand: 2026-06-10. Baseline: `noop`.
Regel: Niedrigere Noise-Rate allein ist kein Erfolg; harte Gates muessen halten.

## noop -> baseline

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.353 | 28 | 17 | 0.6497 | {'unstable': 25, 'stable': 41, 'monitor': 27} |
| moosstrasse | 1601 | 0.279 | 71 | 34 | 0.4395 | {'monitor': 43, 'unstable': 55, 'stable': 69} |
| osthang | 583 | 0.240 | 27 | 13 | 0.8497 | {'unstable': 22, 'stable': 44, 'monitor': 15} |
| bg_flat_01_snt | 1042 | 0.296 | 46 | 40 | 0.5619 | {'unstable': 48, 'monitor': 35, 'stable': 47} |
| bg_slope_01_snt | 660 | 0.335 | 18 | 14 | 0.1871 | {'stable': 38, 'unstable': 23, 'monitor': 21} |
| bg_flat_01_tsx | 5981 | 0.374 | 72 | 23 | 0.5267 | {'stable': 36, 'monitor': 81, 'unstable': 42} |
| bg_slope_01_tsx | 3969 | 0.287 | 50 | 10 | 0.0856 | {'stable': 41, 'unstable': 27, 'monitor': 44} |

Referenzfaelle: 14/14 ok

## k1 -> candidate_green

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1310 | 0.353 | 28 | 17 | 0.6497 | {'unstable': 22, 'stable': 41, 'monitor': 30} |
| moosstrasse | 1601 | 0.279 | 70 | 34 | 0.4407 | {'unstable': 59, 'monitor': 41, 'stable': 67} |
| osthang | 583 | 0.240 | 27 | 13 | 0.8497 | {'monitor': 22, 'stable': 38, 'unstable': 21} |
| bg_flat_01_snt | 1042 | 0.296 | 45 | 39 | 0.5928 | {'unstable': 43, 'monitor': 37, 'stable': 50} |
| bg_slope_01_snt | 660 | 0.335 | 18 | 14 | 0.1871 | {'stable': 38, 'unstable': 25, 'monitor': 19} |
| bg_flat_01_tsx | 5981 | 0.374 | 72 | 23 | 0.5267 | {'stable': 34, 'monitor': 77, 'unstable': 48} |
| bg_slope_01_tsx | 3969 | 0.287 | 50 | 10 | 0.0856 | {'unstable': 23, 'monitor': 51, 'stable': 38} |

Referenzfaelle: 14/14 ok

## k2x -> candidate_green
- mirabell: 3 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- moosstrasse: 4 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_snt: 2 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_tsx: 5 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_slope_01_tsx: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.358 | 25 | 5 | 0.6499 | {'stable': 39, 'monitor': 19, 'unstable': 20} |
| moosstrasse | 1241 | 0.242 | 61 | 11 | 0.4383 | {'unstable': 51, 'monitor': 30, 'stable': 96} |
| osthang | 484 | 0.246 | 21 | 3 | 0.8179 | {'monitor': 23, 'stable': 30, 'unstable': 21} |
| bg_flat_01_snt | 718 | 0.292 | 32 | 9 | 0.6646 | {'unstable': 33, 'monitor': 25, 'stable': 49} |
| bg_slope_01_snt | 533 | 0.272 | 14 | 4 | 0.1646 | {'stable': 34, 'monitor': 18, 'unstable': 19} |
| bg_flat_01_tsx | 5652 | 0.366 | 68 | 12 | 0.5091 | {'stable': 23, 'monitor': 77, 'unstable': 46} |
| bg_slope_01_tsx | 3912 | 0.287 | 49 | 5 | 0.0858 | {'unstable': 23, 'monitor': 47, 'stable': 40} |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt

## k3 -> candidate_green
- mirabell: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- moosstrasse: 3 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_snt: 3 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_tsx: 3 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_slope_01_tsx: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1239 | 0.320 | 28 | 12 | 0.676 | {'unstable': 25, 'stable': 34, 'monitor': 30} |
| moosstrasse | 1493 | 0.269 | 67 | 30 | 0.4383 | {'unstable': 51, 'monitor': 43, 'stable': 73} |
| osthang | 515 | 0.248 | 25 | 10 | 0.8497 | {'monitor': 19, 'stable': 42, 'unstable': 16} |
| bg_flat_01_snt | 972 | 0.271 | 42 | 28 | 0.6444 | {'unstable': 46, 'stable': 50, 'monitor': 32} |
| bg_slope_01_snt | 626 | 0.310 | 17 | 10 | 0.1846 | {'stable': 37, 'unstable': 24, 'monitor': 20} |
| bg_flat_01_tsx | 5674 | 0.364 | 71 | 18 | 0.4709 | {'stable': 34, 'monitor': 80, 'unstable': 45} |
| bg_slope_01_tsx | 3812 | 0.279 | 49 | 6 | 0.0843 | {'stable': 43, 'unstable': 23, 'monitor': 46} |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 1 gepinnt

