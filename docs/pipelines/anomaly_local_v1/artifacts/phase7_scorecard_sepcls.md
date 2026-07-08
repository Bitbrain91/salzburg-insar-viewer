# Phase 7 - Scorecard (P7-B-W1-T2)

Stand: 2026-06-10. Baseline: `noop`.
Regel: Niedrigere Noise-Rate allein ist kein Erfolg; harte Gates muessen halten.

## noop -> baseline

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.308 | 24 | 1 | 0.6741 | None |
| moosstrasse | 1241 | 0.176 | 56 | 2 | 0.3882 | None |
| osthang | 484 | 0.194 | 19 | 1 | 0.8497 | None |
| bg_flat_01_snt | 718 | 0.216 | 29 | 2 | 0.6581 | None |
| bg_slope_01_snt | 533 | 0.197 | 14 | 0 | 0.1708 | None |
| bg_flat_01_tsx | 5652 | 0.292 | 67 | 8 | 0.5015 | None |
| bg_slope_01_tsx | 3912 | 0.235 | 48 | 3 | 0.0862 | None |
| moosstrasse_bev | 1236 | 0.172 | 47 | 2 | 0.3721 | None |
| bg_slope_01_snt_bev | 541 | 0.224 | 15 | 1 | 0.1679 | None |
| bg_slope_01_tsx_bev | 3853 | 0.228 | 55 | 2 | 0.0922 | None |

Referenzfaelle: 24/27 ok; 10 gepinnt; FAILS: [('moosstrasse_carport_merge_confirmed', 'annex'), ('moosstrasse_bev_foreign_separation', 'annex'), ('moosstrasse_bev_foreign_separation', 'annex')]

Label-Korpus (82 Punkte): roof_lost=1, foreign_caught=5, foreign_in_main=0, foreign_in_annex=15, annex_separated=2, annex_in_foreign=0, annex_demoted=0, annex_merged=2, unclear=30
  Auffaellig: O2HC2XV01:t44 foreign->foreign_in_annex, O37J5KI01:t44 foreign->foreign_in_annex, O384L6A01:t44 foreign->foreign_in_annex, O355F5A01:t44 foreign->foreign_in_annex, O36XPYO01:t44 foreign->foreign_in_annex, NSZL99801:t95 foreign->foreign_in_annex, NSZL99701:t95 foreign->foreign_in_annex, NT06OUX01:t95 foreign->foreign_in_annex, NTC3CYZ01:t95 annex->annex_merged, NTDA86J01:t95 annex->annex_merged, O37J5KI01:t44 foreign->foreign_in_annex, O384L6A01:t44 foreign->foreign_in_annex, O36XPYO01:t44 foreign->foreign_in_annex, NSZL99801:t95 foreign->foreign_in_annex, NSZL99701:t95 foreign->foreign_in_annex, NSVF80S01:t95 roof->roof_lost, O2G57QB01:t44 foreign->foreign_in_annex, O2GQNC301:t44 foreign->foreign_in_annex

## sepcls_foreign -> candidate_inconclusive
- moosstrasse_bev: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.311 | 24 | 1 | 0.6741 | None |
| moosstrasse | 1241 | 0.181 | 56 | 2 | 0.3882 | None |
| osthang | 484 | 0.194 | 19 | 1 | 0.8497 | None |
| bg_flat_01_snt | 718 | 0.216 | 29 | 2 | 0.6581 | None |
| bg_slope_01_snt | 533 | 0.197 | 14 | 0 | 0.1708 | None |
| bg_flat_01_tsx | 5652 | 0.292 | 67 | 8 | 0.5015 | None |
| bg_slope_01_tsx | 3912 | 0.236 | 48 | 3 | 0.0862 | None |
| moosstrasse_bev | 1236 | 0.176 | 47 | 2 | 0.3721 | None |
| bg_slope_01_snt_bev | 541 | 0.224 | 15 | 1 | 0.1679 | None |
| bg_slope_01_tsx_bev | 3853 | 0.229 | 55 | 2 | 0.0927 | None |

Referenzfaelle: 27/27 ok; 10 gepinnt

Label-Korpus (82 Punkte): roof_lost=1, foreign_caught=20, foreign_in_main=0, foreign_in_annex=0, annex_separated=2, annex_in_foreign=0, annex_demoted=0, annex_merged=2, unclear=30
  Auffaellig: NTC3CYZ01:t95 annex->annex_merged, NTDA86J01:t95 annex->annex_merged, NSVF80S01:t95 roof->roof_lost

## sepcls_strict -> candidate_red
- bg_flat_01_tsx: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- bg_flat_01_tsx: mehr nearest-dominierte Main-Cluster
- moosstrasse_bev: 1 Status-Aufwertung(en) (audit-pflichtig, kein Auto-Fail)
- Referenzfall-Erwartung verletzt
- Label-Korpus: foreign_in_annex=3, annex_in_foreign=1 (rotes Gate)

| AOI | kept | noise | multi | nearest-main | xtrack_med | bands |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mirabell | 1141 | 0.311 | 24 | 1 | 0.6741 | None |
| moosstrasse | 1241 | 0.182 | 56 | 2 | 0.4063 | None |
| osthang | 484 | 0.196 | 19 | 1 | 0.8497 | None |
| bg_flat_01_snt | 718 | 0.219 | 29 | 2 | 0.6581 | None |
| bg_slope_01_snt | 533 | 0.197 | 14 | 0 | 0.1708 | None |
| bg_flat_01_tsx | 5652 | 0.293 | 68 | 9 | 0.503 | None |
| bg_slope_01_tsx | 3912 | 0.236 | 48 | 3 | 0.0862 | None |
| moosstrasse_bev | 1236 | 0.176 | 47 | 2 | 0.3721 | None |
| bg_slope_01_snt_bev | 541 | 0.224 | 15 | 1 | 0.1679 | None |
| bg_slope_01_tsx_bev | 3853 | 0.229 | 55 | 2 | 0.0927 | None |

Referenzfaelle: 25/27 ok; 10 gepinnt; FAILS: [('moosstrasse_carport_merge_confirmed', 'foreign_separated'), ('moosstrasse_carport_merge_confirmed', 'main_core')]

Label-Korpus (82 Punkte): roof_lost=1, foreign_caught=17, foreign_in_main=0, foreign_in_annex=3, annex_separated=0, annex_in_foreign=1, annex_demoted=0, annex_merged=3, unclear=30
  Auffaellig: NTC3CYZ01:t95 annex->annex_in_foreign, NTDA86J01:t95 annex->annex_merged, O37J5KI01:t44 foreign->foreign_in_annex, O384L6A01:t44 foreign->foreign_in_annex, NTC3CYZ01:t95 annex->annex_merged, NTDA86J01:t95 annex->annex_merged, O37J5KI01:t44 foreign->foreign_in_annex, NSVF80S01:t95 roof->roof_lost

