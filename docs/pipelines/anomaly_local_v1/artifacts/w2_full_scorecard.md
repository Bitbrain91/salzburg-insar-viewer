# Phase 7 - Scorecard (P7-B-W1-T2)

Stand: 2026-06-10. Baseline: `noop`.
Regel: Niedrigere Noise-Rate allein ist kein Erfolg; harte Gates muessen halten.

## noop -> baseline

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.358 | 25 | 5 | None | None |
| moosstrasse | 1241 | 0.242 | 61 | 11 | None | None |
| osthang | 484 | 0.246 | 21 | 3 | None | None |
| bg_flat_01_snt | 718 | 0.292 | 32 | 9 | None | None |
| bg_slope_01_snt | 533 | 0.272 | 14 | 4 | None | None |
| bg_flat_01_tsx | 5652 | 0.366 | 68 | 12 | None | None |
| bg_slope_01_tsx | 3912 | 0.287 | 49 | 5 | None | None |

Referenzfaelle: 10/14 ok; FAILS: [('moosstrasse_differential_low_agreement', 'noise_dominated'), ('moosstrasse_single_track_only', 'insufficient_support'), ('moosstrasse_noise_dominated', 'insufficient_support'), ('bg_flat_small_n', 'noise_dominated')]

Label-Korpus (44 Punkte): roof_lost=0, foreign_caught=4, foreign_in_main=1, annex_separated=0, annex_demoted=0, annex_merged=2, unclear=15
  Auffaellig: NTC3CYZ01:t95 annex->annex_merged, NTDA86J01:t95 annex->annex_merged, O36XPYO01:t44 foreign->foreign_in_main

## k2xh -> candidate_inconclusive
- mirabell: 2 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- moosstrasse: 2 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- osthang: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_snt: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_slope_01_snt: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_tsx: 5 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_slope_01_tsx: 2 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.316 | 25 | 1 | None | None |
| moosstrasse | 1241 | 0.179 | 56 | 4 | None | None |
| osthang | 484 | 0.192 | 20 | 1 | None | None |
| bg_flat_01_snt | 718 | 0.216 | 29 | 2 | None | None |
| bg_slope_01_snt | 533 | 0.204 | 14 | 0 | None | None |
| bg_flat_01_tsx | 5652 | 0.294 | 66 | 8 | None | None |
| bg_slope_01_tsx | 3912 | 0.235 | 49 | 4 | None | None |

Referenzfaelle: 15/15 ok; 4 via Abstufungs-Toleranz; 3 gepinnt

Label-Korpus (44 Punkte): roof_lost=0, foreign_caught=8, foreign_in_main=0, annex_separated=2, annex_demoted=0, annex_merged=0, unclear=15

## k2xh_demote -> candidate_red
- mirabell: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- moosstrasse: 2 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- osthang: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_snt: 3 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_tsx: 5 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_slope_01_tsx: 3 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- Referenzfall-Erwartung verletzt

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1034 | 0.311 | 24 | 2 | None | None |
| moosstrasse | 1036 | 0.221 | 50 | 4 | None | None |
| osthang | 413 | 0.228 | 18 | 1 | None | None |
| bg_flat_01_snt | 590 | 0.225 | 28 | 2 | None | None |
| bg_slope_01_snt | 459 | 0.259 | 13 | 0 | None | None |
| bg_flat_01_tsx | 5049 | 0.349 | 64 | 8 | None | None |
| bg_slope_01_tsx | 3495 | 0.256 | 48 | 4 | None | None |

Referenzfaelle: 12/15 ok; 5 via Abstufungs-Toleranz; 1 gepinnt; FAILS: [('osthang_low_agreement', 'ok'), ('bg_flat_small_n', 'single_track_only'), ('moosstrasse_carport_merge_confirmed', 'noise_dominated')]

Label-Korpus (44 Punkte): roof_lost=2, foreign_caught=8, foreign_in_main=0, annex_separated=0, annex_demoted=2, annex_merged=0, unclear=15
  Auffaellig: NTF2IZV01:t95 roof->roof_lost, NSVF80S01:t95 roof->roof_lost

