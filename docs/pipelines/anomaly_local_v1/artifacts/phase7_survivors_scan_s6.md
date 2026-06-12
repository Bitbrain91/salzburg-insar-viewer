# Survivors-Scan (Stand: 2026-06-12)

Vorsortierung pro ueberlebendem Punkt (core/weak_support/noise, nicht
gate-ausgeschlossen). `suspicious` = ausserhalb Footprint UND mind. ein
harter Flag (anti_layover / implied_height_excess / height_outlier).
Das fachliche Urteil (gedeckt/verdaechtig/fremd) faellt am Luftbild.

## Uebersicht

| Fall | Gebaeude | Survivors | off-Footprint | suspicious | davon score-relevant |
| --- | --- | --- | --- | --- | --- |
| audit_s6_96959851_k2x | 96959851 | 9 | 5 | 4 | 3 |
| audit_s6_96856632_k2x | 96856632 | 5 | 5 | 3 | 2 |
| audit_s6_203343478_k2x | 203343478 | 0 | 0 | 0 | 0 |
| audit_s6_96637488_k2x | 96637488 | 0 | 0 | 0 | 0 |
| audit_s6_96637447_k2x | 96637447 | 29 | 17 | 9 | 6 |
| audit_s6_548205_k2x | 548205 | 13 | 4 | 3 | 1 |
| audit_s6_54773363_k2x | 54773363 | 23 | 14 | 6 | 2 |
| audit_s6_105022686_k2x | 105022686 | 43 | 24 | 17 | 7 |
| audit_s6_238100070_k2x | 238100070 | 6 | 4 | 2 | 0 |
| audit_s6_238057563_k2x | 238057563 | 61 | 22 | 4 | 0 |
| audit_s6_113309843_k2x | 113309843 | 8 | 4 | 3 | 3 |
| audit_s6_227901743_k2x | 227901743 | 92 | 35 | 6 | 2 |
| audit_s6_227901749_k2x | 227901749 | 173 | 60 | 2 | 0 |
| audit_s6_113309836_k2x | 113309836 | 58 | 29 | 4 | 3 |

## audit_s6_96959851_k2x (gba:96959851, run 4a58de67)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NTC3CYZ01 | t95 | core | nearest | -0.9 | 8.1 m | 0.68 | 10.2 m | 7.9 m | -1.4 m | implied_height_excess | suspicious |
| NTDA86J01 | t95 | core | directional_buffer | -1.7 | 4.0 m | 0.64 | 5.0 m | 7.9 m | -3.6 m | height_outlier | suspicious |
| O2HC2XV01 | t44 | noise | nearest | 1.2 | 2.9 m | -0.95 | 3.6 m | 7.9 m | -6.5 m | anti_layover | suspicious |
| NTG9E7F01 | t95 | core | directional_buffer | 0.4 | 0.7 m | -0.64 | 0.9 m | 7.9 m | -4.8 m | height_outlier | suspicious |
| NTEH3E401 | t95 | noise | directional_buffer | 1.4 | 1.0 m | 0.64 | 1.2 m | 7.9 m | -0.2 m | - | covered_geometry |

## audit_s6_96856632_k2x (gba:96856632, run 4a58de67)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O36XPYJ01 | t44 | core | nearest | -1.0 | 13.3 m | 0.94 | 16.6 m | 10.6 m | - m | implied_height_excess, no_height_anchor | suspicious |
| O355F5701 | t44 | core | nearest | 1.0 | 10.1 m | 0.89 | 12.5 m | 10.6 m | - m | implied_height_excess, no_height_anchor | suspicious |
| O36CACR01 | t44 | noise | nearest | 0.3 | 9.5 m | 0.88 | 11.8 m | 10.6 m | - m | implied_height_excess, no_height_anchor | suspicious |
| O35QUQZ01 | t44 | core | nearest | -0.4 | 5.9 m | 0.64 | 7.3 m | 10.6 m | - m | no_height_anchor | covered_geometry |
| O35QUR001 | t44 | noise | directional_buffer | 0.9 | 4.5 m | 0.61 | 5.6 m | 10.6 m | - m | no_height_anchor | covered_geometry |

## audit_s6_96637447_k2x (gba:96637447, run 4a58de67)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O33D4C101 | t44 | core | nearest | 3.0 | 12.8 m | 0.85 | 16.0 m | 10.4 m | -3.2 m | implied_height_excess | suspicious |
| O32ROQ901 | t44 | core | nearest | 2.7 | 11.8 m | 0.85 | 14.8 m | 10.4 m | 0.7 m | implied_height_excess | suspicious |
| NSZL99801 | t95 | noise | nearest | -0.3 | 10.2 m | -0.69 | 12.8 m | 10.4 m | 5.3 m | anti_layover, implied_height_excess | suspicious |
| O37J5KI01 | t44 | core | nearest | 1.7 | 7.3 m | -0.26 | 9.1 m | 10.4 m | -4.6 m | anti_layover, height_outlier | suspicious |
| O384L6A01 | t44 | core | nearest | 1.4 | 7.3 m | -0.26 | 9.1 m | 10.4 m | -7.5 m | anti_layover, height_outlier | suspicious |
| O355F5A01 | t44 | core | nearest | 1.7 | 6.6 m | -0.45 | 8.2 m | 10.4 m | -0.2 m | anti_layover | suspicious |
| NSZL99701 | t95 | noise | nearest | -0.5 | 3.6 m | -0.98 | 4.5 m | 10.4 m | 2.3 m | anti_layover | suspicious |
| O36XPYO01 | t44 | core | nearest | 0.3 | 3.4 m | -0.84 | 4.2 m | 10.4 m | -0.2 m | anti_layover | suspicious |
| NT06OUX01 | t95 | noise | nearest | -0.4 | 2.2 m | -0.97 | 2.7 m | 10.4 m | -5.1 m | anti_layover | suspicious |
| O34JZJI01 | t44 | core | nearest | 2.1 | 6.4 m | 0.35 | 8.0 m | 10.4 m | -1.4 m | - | covered_geometry |
| O36XPYQ01 | t44 | core | nearest | 0.8 | 6.4 m | -0.1 | 7.9 m | 10.4 m | -4.0 m | - | covered_geometry |
| NSVF80S01 | t95 | core | directional_buffer | 0.1 | 4.6 m | 0.58 | 5.8 m | 10.4 m | 7.8 m | - | covered_geometry |
| NSYEE1O01 | t95 | noise | nearest | -1.2 | 3.1 m | -0.15 | 3.9 m | 10.4 m | 0.3 m | - | covered_geometry |
| NSXSYFW01 | t95 | core | nearest | -0.3 | 2.7 m | -0.15 | 3.4 m | 10.4 m | 2.7 m | - | covered_geometry |
| NSW0NMI01 | t95 | noise | directional_buffer | -1.4 | 2.6 m | 0.98 | 3.3 m | 10.4 m | 4.5 m | - | covered_geometry |
| NSX7IU401 | t95 | noise | nearest | 1.5 | 2.0 m | 0.9 | 2.5 m | 10.4 m | 1.0 m | - | covered_geometry |
| NSZL99501 | t95 | core | directional_buffer | 0.4 | 0.6 m | -0.97 | 0.7 m | 10.4 m | -3.3 m | - | covered_geometry |

## audit_s6_548205_k2x (gba:548205, run 386e83fd)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NPWUMNF01 | t95 | noise | nearest | -1.2 | 11.0 m | -0.42 | 13.8 m | 25.6 m | 14.1 m | anti_layover, height_outlier | suspicious |
| O8G9KEG01 | t44 | core | directional_buffer | 1.0 | 1.1 m | 0.04 | 1.4 m | 25.6 m | -10.3 m | height_outlier | suspicious |
| NPTVGMK01 | t95 | noise | directional_buffer | -0.2 | 0.7 m | -0.38 | 0.9 m | 25.6 m | 12.7 m | height_outlier | suspicious |
| O8DAEDJ01 | t44 | core | directional_buffer | -0.1 | 0.7 m | 0.82 | 0.9 m | 25.6 m | 0.7 m | - | covered_geometry |

## audit_s6_54773363_k2x (gba:54773363, run 99adb38e)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NN3MXTD01 | t95 | noise | nearest | 1.4 | 9.6 m | 1.0 | 12.1 m | 11.8 m | 5.6 m | implied_height_excess | suspicious |
| OATZZHW01 | t44 | noise | nearest | 0.7 | 6.0 m | -0.75 | 7.5 m | 11.8 m | 4.7 m | anti_layover, height_outlier | suspicious |
| OAS7OOJ01 | t44 | core | nearest | -0.5 | 4.1 m | -0.09 | 5.1 m | 11.8 m | 6.6 m | height_outlier | suspicious |
| OARM92R01 | t44 | core | directional_buffer | -1.1 | 1.9 m | -0.09 | 2.4 m | 11.8 m | 3.9 m | height_outlier | suspicious |
| OAPTY9G01 | t44 | noise | directional_buffer | 1.2 | 1.2 m | 0.09 | 1.4 m | 11.8 m | 9.7 m | height_outlier | suspicious |
| OAQFDV701 | t44 | noise | directional_buffer | 0.8 | 1.2 m | -0.09 | 1.4 m | 11.8 m | 7.9 m | height_outlier | suspicious |
| NN60O8I01 | t95 | noise | nearest | 0.0 | 6.4 m | 0.43 | 8.1 m | 11.8 m | 6.6 m | - | covered_geometry |
| NN4TT0X01 | t95 | noise | directional_buffer | -1.1 | 4.9 m | 0.99 | 6.2 m | 11.8 m | 3.4 m | - | covered_geometry |
| NN77JG201 | t95 | noise | directional_buffer | 0.2 | 4.7 m | 0.42 | 5.9 m | 11.8 m | 2.9 m | - | covered_geometry |
| NN8ZU9E01 | t95 | core | directional_buffer | 0.7 | 4.1 m | 0.42 | 5.1 m | 11.8 m | -5.2 m | - | covered_geometry |
| OAST4AB01 | t44 | core | nearest | 0.1 | 3.6 m | -0.09 | 4.5 m | 11.8 m | 2.2 m | - | covered_geometry |
| NNBDKOI01 | t95 | noise | directional_buffer | 0.0 | 3.2 m | 0.42 | 4.0 m | 11.8 m | -16.0 m | - | covered_geometry |
| NN8EENM01 | t95 | core | directional_buffer | 1.5 | 2.3 m | 0.42 | 2.9 m | 11.8 m | 0.0 m | - | covered_geometry |
| NN9L9V501 | t95 | noise | directional_buffer | 0.5 | 1.5 m | -0.43 | 1.9 m | 11.8 m | -0.5 m | - | covered_geometry |

## audit_s6_105022686_k2x (gba:105022686, run 19a2e0ba)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NCILJ3C01 | t44 | core | nearest | -0.7 | 11.5 m | 0.5 | 14.6 m | 9.2 m | -3.3 m | implied_height_excess, height_outlier | suspicious |
| L4BMMNG01 | t95 | noise | nearest | -0.2 | 10.4 m | 0.2 | 13.7 m | 9.2 m | -2.3 m | implied_height_excess | suspicious |
| NCJ6YP401 | t44 | core | nearest | -0.7 | 9.8 m | 0.5 | 12.4 m | 9.2 m | -4.0 m | implied_height_excess, height_outlier | suspicious |
| NCLKP4A01 | t44 | noise | nearest | -0.4 | 9.8 m | 0.13 | 12.4 m | 9.2 m | -1.6 m | implied_height_excess, height_outlier | suspicious |
| NCKZ9II01 | t44 | noise | nearest | 1.6 | 9.4 m | 0.13 | 11.9 m | 9.2 m | -0.1 m | implied_height_excess | suspicious |
| NCM64Q201 | t44 | noise | nearest | 0.2 | 9.4 m | 0.13 | 11.9 m | 9.2 m | -6.1 m | implied_height_excess, height_outlier | suspicious |
| L4CTHV001 | t95 | noise | nearest | -0.8 | 9.2 m | -0.2 | 12.1 m | 9.2 m | -3.0 m | implied_height_excess | suspicious |
| L4BMMNK01 | t95 | noise | nearest | 2.7 | 8.8 m | -0.17 | 11.6 m | 9.2 m | -5.8 m | implied_height_excess | suspicious |
| NCJSEAW01 | t44 | core | nearest | -0.8 | 8.7 m | 0.28 | 11.0 m | 9.2 m | -4.9 m | implied_height_excess, height_outlier | suspicious |
| NCKDTWO01 | t44 | noise | nearest | -1.4 | 8.4 m | -0.14 | 10.6 m | 9.2 m | -5.1 m | implied_height_excess, height_outlier | suspicious |
| L498W8C01 | t95 | core | nearest | 1.1 | 7.3 m | -0.23 | 9.6 m | 9.2 m | -2.5 m | anti_layover, implied_height_excess | suspicious |
| L4CTHV301 | t95 | noise | nearest | 1.8 | 5.6 m | -0.79 | 7.4 m | 9.2 m | -2.0 m | anti_layover | suspicious |
| L4B171S01 | t95 | core | nearest | 0.5 | 5.0 m | -0.17 | 6.6 m | 9.2 m | -8.5 m | height_outlier | suspicious |
| NCI03HL01 | t44 | core | directional_buffer | -0.2 | 4.3 m | 0.5 | 5.5 m | 9.2 m | -2.1 m | height_outlier | suspicious |
| NCJSEB001 | t44 | noise | directional_buffer | 0.8 | 2.7 m | 0.31 | 3.4 m | 9.2 m | -9.6 m | height_outlier | suspicious |
| NCKDTWR01 | t44 | core | directional_buffer | -0.1 | 1.3 m | 1.0 | 1.6 m | 9.2 m | -15.7 m | height_outlier | suspicious |
| NCJ6YP801 | t44 | noise | directional_buffer | 1.2 | 0.6 m | -0.52 | 0.8 m | 9.2 m | -2.8 m | height_outlier | suspicious |
| L48NGMM01 | t95 | core | nearest | -0.5 | 6.2 m | 0.21 | 8.1 m | 9.2 m | 3.0 m | - | covered_geometry |
| L498W8E01 | t95 | core | directional_buffer | -0.5 | 4.3 m | 0.94 | 5.7 m | 9.2 m | 1.5 m | - | covered_geometry |
| L4AFRG001 | t95 | core | nearest | 0.5 | 4.3 m | -0.17 | 5.7 m | 9.2 m | -6.8 m | - | covered_geometry |
| L49UBU801 | t95 | core | nearest | -0.4 | 4.2 m | -0.17 | 5.6 m | 9.2 m | -4.0 m | - | covered_geometry |
| NCI03HO01 | t44 | core | directional_buffer | -1.9 | 2.2 m | 0.31 | 2.7 m | 9.2 m | -0.1 m | - | covered_geometry |
| NCJ6YP601 | t44 | core | nearest | -1.7 | 2.1 m | -0.5 | 2.6 m | 9.2 m | 1.3 m | - | covered_geometry |
| NCKDTWP01 | t44 | noise | directional_buffer | 1.3 | 1.0 m | -0.35 | 1.3 m | 9.2 m | 0.8 m | - | covered_geometry |

## audit_s6_238100070_k2x (gba:238100070, run 19a2e0ba)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L55EAWI01 | t95 | noise | nearest | -0.7 | 13.7 m | 0.27 | 18.1 m | 9.2 m | -3.8 m | implied_height_excess, height_outlier | suspicious |
| L58DGXB01 | t95 | noise | nearest | -2.5 | 6.7 m | 0.86 | 8.8 m | 9.2 m | -12.7 m | height_outlier | suspicious |
| L55ZQI701 | t95 | noise | directional_buffer | -1.1 | 4.2 m | 0.86 | 5.5 m | 9.2 m | 1.1 m | - | covered_geometry |
| L55EAWG01 | t95 | core | directional_buffer | -1.6 | 1.3 m | -0.28 | 1.7 m | 9.2 m | 0.8 m | - | covered_geometry |

## audit_s6_238057563_k2x (gba:238057563, run 2bfa4f70)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFW1YKM01 | t44 | noise | nearest | 0.1 | 14.2 m | 0.24 | 17.9 m | 13.2 m | 4.6 m | implied_height_excess | suspicious |
| NFU9NRA01 | t44 | noise | nearest | 0.8 | 13.2 m | 0.44 | 16.7 m | 13.2 m | 15.1 m | implied_height_excess | suspicious |
| L44HFBD01 | t95 | noise | nearest | -5.8 | 6.3 m | -0.56 | 8.3 m | 13.2 m | -13.0 m | anti_layover | suspicious |
| NG20AMD01 | t44 | noise | nearest | -1.6 | 2.8 m | -0.91 | 3.6 m | 13.2 m | 5.4 m | anti_layover | suspicious |
| NFYFOZQ01 | t44 | core | nearest | 0.9 | 9.7 m | 0.19 | 12.3 m | 13.2 m | 0.3 m | - | covered_geometry |
| NFXU9DY01 | t44 | noise | nearest | 1.0 | 8.8 m | 0.19 | 11.1 m | 13.2 m | 5.1 m | - | covered_geometry |
| NFZMK7A01 | t44 | noise | nearest | 1.0 | 8.4 m | -0.08 | 10.7 m | 13.2 m | -1.0 m | - | covered_geometry |
| NFUV3CY01 | t44 | noise | nearest | 1.8 | 5.6 m | -0.19 | 7.1 m | 13.2 m | 4.8 m | - | covered_geometry |
| L40WTOS01 | t95 | core | directional_buffer | -3.0 | 4.4 m | 0.97 | 5.8 m | 13.2 m | -2.7 m | - | covered_geometry |
| L3XC82201 | t95 | noise | directional_buffer | -3.9 | 4.3 m | 0.55 | 5.7 m | 13.2 m | -0.5 m | - | covered_geometry |
| NFUV3D001 | t44 | noise | directional_buffer | 1.6 | 3.8 m | 0.28 | 4.8 m | 13.2 m | -10.2 m | - | covered_geometry |
| NFU9NR901 | t44 | core | directional_buffer | 0.2 | 3.3 m | -0.06 | 4.2 m | 13.2 m | 13.2 m | - | covered_geometry |
| NG1EV0K01 | t44 | core | nearest | 1.7 | 3.3 m | -0.25 | 4.2 m | 13.2 m | 3.8 m | - | covered_geometry |
| NFW1YKJ01 | t44 | core | directional_buffer | 0.7 | 2.1 m | 0.59 | 2.7 m | 13.2 m | 2.9 m | - | covered_geometry |
| L3Z4IVG01 | t95 | core | directional_buffer | -3.5 | 2.0 m | 0.83 | 2.6 m | 13.2 m | 8.1 m | - | covered_geometry |
| NFW1YKL01 | t44 | noise | directional_buffer | 2.5 | 1.8 m | 0.24 | 2.2 m | 13.2 m | 7.0 m | - | covered_geometry |
| L40BE3001 | t95 | core | directional_buffer | -3.9 | 1.3 m | 0.55 | 1.7 m | 13.2 m | 2.9 m | - | covered_geometry |
| L3XXNNU01 | t95 | core | directional_buffer | -3.7 | 1.1 m | 0.54 | 1.4 m | 13.2 m | 1.5 m | - | covered_geometry |
| L3ZPYH801 | t95 | core | directional_buffer | -3.2 | 1.1 m | 0.52 | 1.5 m | 13.2 m | 6.1 m | - | covered_geometry |
| NFVGIYQ01 | t44 | noise | directional_buffer | 1.7 | 0.9 m | -0.23 | 1.1 m | 13.2 m | -7.3 m | - | covered_geometry |
| NFX8TS501 | t44 | core | directional_buffer | 1.0 | 0.9 m | 0.24 | 1.1 m | 13.2 m | 2.4 m | - | covered_geometry |
| L3YJ39M01 | t95 | core | directional_buffer | -5.0 | 0.9 m | -0.27 | 1.2 m | 13.2 m | 1.3 m | - | covered_geometry |

## audit_s6_113309843_k2x (gba:113309843, run 2bfa4f70)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFDLITC01 | t44 | core | nearest | 0.5 | 2.1 m | -0.35 | 2.7 m | 16.1 m | 2.9 m | height_outlier | suspicious |
| NFFDTMO01 | t44 | core | directional_buffer | 1.1 | 1.2 m | -0.35 | 1.5 m | 16.1 m | -7.2 m | height_outlier | suspicious |
| NFBT80001 | t44 | core | directional_buffer | 0.6 | 1.1 m | 0.6 | 1.4 m | 16.1 m | 1.9 m | height_outlier | suspicious |
| NFDLITB01 | t44 | core | directional_buffer | 1.0 | 1.9 m | -0.6 | 2.4 m | 16.1 m | -1.1 m | - | covered_geometry |

## audit_s6_227901743_k2x (gba:227901743, run 7c53499a)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FBPKXA7 | t93 | noise | nearest | -1.1 | 9.6 m | -0.31 | 7.0 m | 9.7 m | -2.4 m | anti_layover | suspicious |
| FBMLR9M | t93 | noise | nearest | 0.2 | 4.7 m | -0.75 | 3.4 m | 9.7 m | 12.6 m | anti_layover, height_outlier | suspicious |
| FBM0BNU | t93 | noise | nearest | 0.1 | 2.9 m | -0.11 | 2.1 m | 9.7 m | 8.5 m | height_outlier | suspicious |
| FBOZHOP | t93 | core | nearest | -0.2 | 2.3 m | -0.92 | 1.7 m | 9.7 m | 1.4 m | anti_layover | suspicious |
| FBKTGG9 | t93 | noise | directional_buffer | -0.8 | 0.8 m | -0.11 | 0.6 m | 9.7 m | 14.4 m | height_outlier | suspicious |
| FBPKXAB | t93 | core | directional_buffer | -0.6 | 0.6 m | 0.11 | 0.4 m | 9.7 m | -8.4 m | height_outlier | suspicious |
| DRHBEDJ | t70 | noise | nearest | -0.2 | 10.1 m | 0.52 | 8.0 m | 9.7 m | -10.7 m | - | covered_geometry |
| DRHWTZB | t70 | noise | nearest | -0.3 | 9.2 m | 0.31 | 7.2 m | 9.7 m | -9.8 m | - | covered_geometry |
| DRJ3P6V | t70 | noise | nearest | 1.2 | 8.5 m | 0.17 | 6.7 m | 9.7 m | -9.1 m | - | covered_geometry |
| FBOZHOF | t93 | noise | nearest | -1.1 | 8.3 m | 0.03 | 6.1 m | 9.7 m | -4.5 m | - | covered_geometry |
| FBG1ZLV | t93 | noise | directional_buffer | 1.1 | 7.2 m | 0.96 | 5.2 m | 9.7 m | 6.3 m | - | covered_geometry |
| FBH8UTF | t93 | noise | directional_buffer | 0.3 | 6.7 m | 0.95 | 4.9 m | 9.7 m | 2.3 m | - | covered_geometry |
| FBH8UTG | t93 | noise | directional_buffer | 0.5 | 5.3 m | 1.0 | 3.8 m | 9.7 m | 3.9 m | - | covered_geometry |
| FBJ15MR | t93 | noise | directional_buffer | 1.8 | 5.0 m | 0.92 | 3.7 m | 9.7 m | -2.3 m | - | covered_geometry |
| FBGNF7P | t93 | noise | directional_buffer | 0.5 | 4.7 m | 0.99 | 3.4 m | 9.7 m | 7.4 m | - | covered_geometry |
| FBH8UTH | t93 | noise | directional_buffer | 1.0 | 4.3 m | 0.99 | 3.1 m | 9.7 m | 5.6 m | - | covered_geometry |
| FBHUAFD | t93 | noise | directional_buffer | 0.7 | 3.7 m | 0.99 | 2.7 m | 9.7 m | 5.7 m | - | covered_geometry |
| FBHUAFE | t93 | noise | nearest | 0.6 | 3.7 m | 0.91 | 2.7 m | 9.7 m | 6.3 m | - | covered_geometry |
| FBN76V5 | t93 | core | nearest | 0.4 | 3.5 m | -0.11 | 2.6 m | 9.7 m | -1.0 m | - | covered_geometry |
| DRFJ3K1 | t70 | noise | directional_buffer | 1.4 | 3.3 m | 0.99 | 2.6 m | 9.7 m | -5.0 m | - | covered_geometry |
| FBMLR9E | t93 | noise | nearest | 1.5 | 3.0 m | -0.5 | 2.2 m | 9.7 m | 7.5 m | - | covered_geometry |
| DRHWTZ8 | t70 | noise | directional_buffer | 0.0 | 2.8 m | 0.67 | 2.2 m | 9.7 m | -8.9 m | - | covered_geometry |
| FBOE22Q | t93 | core | nearest | 0.2 | 2.8 m | -0.4 | 2.1 m | 9.7 m | 0.0 m | - | covered_geometry |
| DRHBEDF | t70 | noise | directional_buffer | 2.0 | 2.7 m | 0.67 | 2.1 m | 9.7 m | -10.1 m | - | covered_geometry |
| DRHBED8 | t70 | core | nearest | 0.2 | 2.3 m | -0.17 | 1.8 m | 9.7 m | 0.1 m | - | covered_geometry |
| DRFJ3JZ | t70 | noise | directional_buffer | 1.5 | 2.2 m | 0.99 | 1.8 m | 9.7 m | -2.9 m | - | covered_geometry |
| DRG4J5O | t70 | core | nearest | 0.4 | 2.1 m | -0.17 | 1.7 m | 9.7 m | 3.2 m | - | covered_geometry |
| DRGPYRN | t70 | core | directional_buffer | 1.3 | 1.5 m | 0.17 | 1.2 m | 9.7 m | -4.0 m | - | covered_geometry |
| FBN76V6 | t93 | core | directional_buffer | 0.9 | 1.3 m | -0.12 | 0.9 m | 9.7 m | -1.2 m | - | covered_geometry |
| FBNSMGY | t93 | core | directional_buffer | -0.1 | 1.3 m | 0.11 | 1.0 m | 9.7 m | -4.3 m | - | covered_geometry |
| DRHBEDE | t70 | noise | directional_buffer | 2.7 | 1.2 m | 0.99 | 1.0 m | 9.7 m | -9.4 m | - | covered_geometry |
| FBN76VA | t93 | core | directional_buffer | -0.6 | 0.9 m | -0.99 | 0.7 m | 9.7 m | 5.6 m | - | covered_geometry |
| DRKW003 | t70 | noise | directional_buffer | 1.7 | 0.7 m | 0.16 | 0.6 m | 9.7 m | -9.0 m | - | covered_geometry |
| FBM0BNT | t93 | core | directional_buffer | 0.0 | 0.6 m | -0.11 | 0.4 m | 9.7 m | 7.0 m | - | covered_geometry |
| FBNSMGZ | t93 | core | directional_buffer | 0.2 | 0.6 m | 0.11 | 0.4 m | 9.7 m | -1.4 m | - | covered_geometry |

## audit_s6_227901749_k2x (gba:227901749, run 7c53499a)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FBUCE4J | t93 | noise | directional_buffer | -0.7 | 1.2 m | 1.0 | 0.9 m | 11.4 m | 12.7 m | height_outlier | suspicious |
| FBUCE4I | t93 | noise | directional_buffer | -0.3 | 1.0 m | 1.0 | 0.7 m | 11.4 m | 12.7 m | height_outlier | suspicious |
| FBXWZQY | t93 | noise | nearest | -0.4 | 9.6 m | 0.33 | 7.0 m | 11.4 m | -6.0 m | - | covered_geometry |
| FBXWZQZ | t93 | noise | nearest | 0.2 | 8.8 m | 0.61 | 6.4 m | 11.4 m | -9.0 m | - | covered_geometry |
| FBW4OY0 | t93 | noise | directional_buffer | 0.9 | 7.5 m | 0.99 | 5.5 m | 11.4 m | -1.3 m | - | covered_geometry |
| FBWQ4JJ | t93 | noise | directional_buffer | 0.2 | 7.5 m | 1.0 | 5.5 m | 11.4 m | -6.8 m | - | covered_geometry |
| FBXBK58 | t93 | noise | nearest | -0.1 | 7.5 m | 0.77 | 5.4 m | 11.4 m | -7.1 m | - | covered_geometry |
| FBXBK59 | t93 | noise | nearest | -1.1 | 6.8 m | 0.93 | 5.0 m | 11.4 m | -7.8 m | - | covered_geometry |
| DR6LLHI | t70 | noise | nearest | 2.5 | 6.6 m | 0.17 | 5.2 m | 11.4 m | -7.8 m | - | covered_geometry |
| FC0AQ63 | t93 | noise | nearest | -0.3 | 6.5 m | 0.1 | 4.8 m | 11.4 m | -8.1 m | - | covered_geometry |
| FC0W5RV | t93 | noise | nearest | -0.3 | 6.5 m | 0.1 | 4.7 m | 11.4 m | -9.5 m | - | covered_geometry |
| FBUXTQF | t93 | core | directional_buffer | 0.7 | 6.0 m | 1.0 | 4.4 m | 11.4 m | 5.1 m | - | covered_geometry |
| FBXBK5J | t93 | core | directional_buffer | -0.2 | 6.0 m | 1.0 | 4.4 m | 11.4 m | -4.2 m | - | covered_geometry |
| FBXWZR0 | t93 | noise | nearest | -0.8 | 6.0 m | 0.63 | 4.4 m | 11.4 m | -6.7 m | - | covered_geometry |
| FBWQ4JP | t93 | noise | directional_buffer | -0.7 | 5.2 m | 1.0 | 3.8 m | 11.4 m | -1.4 m | - | covered_geometry |
| FBXWZR1 | t93 | noise | directional_buffer | 0.3 | 4.8 m | 0.86 | 3.5 m | 11.4 m | -7.1 m | - | covered_geometry |
| FBTQYIR | t93 | core | directional_buffer | -0.1 | 4.6 m | 1.0 | 3.4 m | 11.4 m | 10.3 m | - | covered_geometry |
| DR6LLHH | t70 | noise | nearest | 3.3 | 4.5 m | 0.17 | 3.5 m | 11.4 m | -8.4 m | - | covered_geometry |
| FBXBK5I | t93 | noise | directional_buffer | 1.9 | 4.5 m | 1.0 | 3.3 m | 11.4 m | -2.5 m | - | covered_geometry |
| FC0AQ64 | t93 | noise | nearest | 0.8 | 4.5 m | 0.1 | 3.3 m | 11.4 m | -10.1 m | - | covered_geometry |
| FBXBK5A | t93 | noise | directional_buffer | 0.7 | 4.3 m | 1.0 | 3.1 m | 11.4 m | -4.9 m | - | covered_geometry |
| DR0N9FB | t70 | noise | nearest | 0.1 | 4.0 m | -0.17 | 3.1 m | 11.4 m | 3.0 m | - | covered_geometry |
| DR18P13 | t70 | noise | nearest | 0.3 | 3.8 m | -0.17 | 3.0 m | 11.4 m | -0.7 m | - | covered_geometry |
| FBXWZR5 | t93 | core | directional_buffer | -0.2 | 3.3 m | 1.0 | 2.4 m | 11.4 m | -4.9 m | - | covered_geometry |
| DQZGE7R | t70 | noise | nearest | 2.0 | 3.2 m | 0.22 | 2.6 m | 11.4 m | -0.6 m | - | covered_geometry |
| FBXWZR6 | t93 | core | directional_buffer | -0.2 | 3.2 m | 1.0 | 2.4 m | 11.4 m | -4.5 m | - | covered_geometry |
| FBXWZR8 | t93 | noise | directional_buffer | -0.5 | 3.2 m | 1.0 | 2.4 m | 11.4 m | -3.8 m | - | covered_geometry |
| FBXBK5E | t93 | core | directional_buffer | -0.2 | 3.1 m | 1.0 | 2.3 m | 11.4 m | -1.9 m | - | covered_geometry |
| FBXWZR4 | t93 | noise | directional_buffer | -0.3 | 3.0 m | 1.0 | 2.2 m | 11.4 m | -4.8 m | - | covered_geometry |
| DR47V20 | t70 | noise | nearest | 1.2 | 2.8 m | -0.17 | 2.2 m | 11.4 m | -2.2 m | - | covered_geometry |
| FBXBK5H | t93 | core | directional_buffer | 0.5 | 2.2 m | 1.0 | 1.6 m | 11.4 m | 0.3 m | - | covered_geometry |
| FBYIFCW | t93 | noise | directional_buffer | -1.7 | 2.2 m | 1.0 | 1.6 m | 11.4 m | -6.0 m | - | covered_geometry |
| DQX2NSO | t70 | noise | directional_buffer | 2.2 | 1.9 m | 0.87 | 1.5 m | 11.4 m | 7.0 m | - | covered_geometry |
| FBWQ4JQ | t93 | core | directional_buffer | -0.5 | 1.9 m | 1.0 | 1.4 m | 11.4 m | 3.5 m | - | covered_geometry |
| FBXWZR9 | t93 | core | directional_buffer | 0.6 | 1.9 m | 1.0 | 1.4 m | 11.4 m | -1.6 m | - | covered_geometry |
| DQY9J0A | t70 | noise | directional_buffer | -0.2 | 1.8 m | 0.98 | 1.4 m | 11.4 m | 1.8 m | - | covered_geometry |
| FBZPAKO | t93 | core | directional_buffer | 0.4 | 1.8 m | -0.1 | 1.3 m | 11.4 m | 5.4 m | - | covered_geometry |
| FC0W5S8 | t93 | core | directional_buffer | 0.4 | 1.8 m | -0.1 | 1.3 m | 11.4 m | 0.8 m | - | covered_geometry |
| DQWH871 | t70 | noise | directional_buffer | 2.1 | 1.7 m | 0.98 | 1.3 m | 11.4 m | 7.1 m | - | covered_geometry |
| DQY9J0B | t70 | core | directional_buffer | 0.5 | 1.6 m | 0.98 | 1.3 m | 11.4 m | 1.6 m | - | covered_geometry |
| FC2OGLK | t93 | core | directional_buffer | 0.1 | 1.6 m | -0.1 | 1.2 m | 11.4 m | -8.1 m | - | covered_geometry |
| DR1U4N7 | t70 | noise | directional_buffer | 0.2 | 1.5 m | 0.17 | 1.1 m | 11.4 m | -1.5 m | - | covered_geometry |
| DR2FK8Z | t70 | noise | directional_buffer | 1.1 | 1.5 m | 0.17 | 1.2 m | 11.4 m | -4.5 m | - | covered_geometry |
| FBZ3UYW | t93 | core | directional_buffer | 0.8 | 1.5 m | -0.1 | 1.1 m | 11.4 m | 4.2 m | - | covered_geometry |
| DQVVSLB | t70 | core | directional_buffer | 0.9 | 1.4 m | 0.98 | 1.1 m | 11.4 m | 8.8 m | - | covered_geometry |
| DQX2NSQ | t70 | core | directional_buffer | 1.3 | 1.4 m | 0.98 | 1.1 m | 11.4 m | 6.6 m | - | covered_geometry |
| DQXO3EG | t70 | core | directional_buffer | 0.5 | 1.4 m | 0.75 | 1.1 m | 11.4 m | 5.6 m | - | covered_geometry |
| DQXO3EM | t70 | core | directional_buffer | 0.7 | 1.4 m | 0.98 | 1.1 m | 11.4 m | 2.7 m | - | covered_geometry |
| DR01TTK | t70 | noise | directional_buffer | 1.3 | 1.4 m | 0.73 | 1.1 m | 11.4 m | -3.1 m | - | covered_geometry |
| DQX2NSP | t70 | noise | directional_buffer | 1.9 | 1.1 m | 0.98 | 0.9 m | 11.4 m | 7.4 m | - | covered_geometry |
| DQX2NSU | t70 | core | directional_buffer | 1.4 | 1.1 m | 0.98 | 0.9 m | 11.4 m | 5.2 m | - | covered_geometry |
| DQYUYM0 | t70 | core | directional_buffer | 0.9 | 1.1 m | 0.48 | 0.8 m | 11.4 m | 1.9 m | - | covered_geometry |
| DQX2NST | t70 | core | directional_buffer | 1.3 | 1.0 m | 0.98 | 0.8 m | 11.4 m | 5.8 m | - | covered_geometry |
| DQY9J08 | t70 | core | directional_buffer | 0.6 | 1.0 m | -0.17 | 0.8 m | 11.4 m | 5.6 m | - | covered_geometry |
| DQWH86X | t70 | noise | directional_buffer | 1.8 | 0.9 m | 0.98 | 0.7 m | 11.4 m | 10.0 m | - | covered_geometry |
| FC2OGL9 | t93 | noise | directional_buffer | -0.8 | 0.8 m | 0.1 | 0.6 m | 11.4 m | -0.4 m | - | covered_geometry |
| FC6UHTZ | t93 | noise | directional_buffer | 0.7 | 0.8 m | -0.1 | 0.6 m | 11.4 m | -7.8 m | - | covered_geometry |
| DQYUYM1 | t70 | core | directional_buffer | 0.8 | 0.7 m | 0.98 | 0.6 m | 11.4 m | 1.4 m | - | covered_geometry |
| FC3VBST | t93 | noise | directional_buffer | 0.6 | 0.7 m | 0.1 | 0.5 m | 11.4 m | -4.1 m | - | covered_geometry |
| FC5270D | t93 | noise | directional_buffer | 0.1 | 0.7 m | 0.1 | 0.5 m | 11.4 m | -8.1 m | - | covered_geometry |

## audit_s6_113309836_k2x (gba:113309836, run 9a23764c)

| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FGRRKRZ | t93 | noise | nearest | 3.6 | 2.8 m | -1.0 | 2.0 m | 11.1 m | 12.2 m | anti_layover | suspicious |
| DQU3HDL | t70 | core | directional_buffer | -3.0 | 2.2 m | 0.56 | 1.7 m | 11.1 m | 15.0 m | height_outlier | suspicious |
| DQUOWZC | t70 | core | directional_buffer | -2.6 | 1.7 m | 0.99 | 1.4 m | 11.1 m | 13.7 m | height_outlier | suspicious |
| DQUOWZD | t70 | core | directional_buffer | -3.4 | 1.3 m | 0.14 | 1.0 m | 11.1 m | 14.3 m | height_outlier | suspicious |
| FGWJ1MC | t93 | noise | nearest | 1.4 | 10.8 m | -0.18 | 7.9 m | 11.1 m | -7.5 m | - | covered_geometry |
| FGQKPK6 | t93 | noise | nearest | 4.5 | 8.1 m | 0.18 | 5.9 m | 11.1 m | -2.5 m | - | covered_geometry |
| FGWJ1MB | t93 | noise | nearest | 2.7 | 8.1 m | -0.18 | 5.9 m | 11.1 m | -10.5 m | - | covered_geometry |
| DQXO308 | t70 | core | directional_buffer | -3.4 | 5.2 m | 0.56 | 4.1 m | 11.1 m | -1.7 m | - | covered_geometry |
| DR01TFA | t70 | core | nearest | -4.3 | 4.7 m | 0.18 | 3.7 m | 11.1 m | -5.1 m | - | covered_geometry |
| FGSYFZM | t93 | core | nearest | 4.1 | 4.0 m | -0.18 | 2.9 m | 11.1 m | -9.8 m | - | covered_geometry |
| DQVVS6Y | t70 | core | directional_buffer | -4.1 | 3.1 m | 0.71 | 2.4 m | 11.1 m | 5.0 m | - | covered_geometry |
| FGQKPKI | t93 | core | nearest | 5.2 | 3.1 m | 0.32 | 2.3 m | 11.1 m | -11.4 m | - | covered_geometry |
| FGSYFZL | t93 | core | nearest | 4.7 | 2.8 m | -0.18 | 2.0 m | 11.1 m | -9.1 m | - | covered_geometry |
| DR01TFB | t70 | core | nearest | -4.4 | 2.4 m | -0.09 | 1.9 m | 11.1 m | -2.6 m | - | covered_geometry |
| DQX2NEG | t70 | core | directional_buffer | -3.6 | 2.3 m | 0.99 | 1.8 m | 11.1 m | 4.2 m | - | covered_geometry |
| FGPDUCP | t93 | core | nearest | 2.9 | 2.0 m | 0.18 | 1.5 m | 11.1 m | 1.0 m | - | covered_geometry |
| DQVVS6W | t70 | core | directional_buffer | -5.1 | 1.9 m | 0.99 | 1.5 m | 11.1 m | 9.0 m | - | covered_geometry |
| DQZGDTN | t70 | core | directional_buffer | -3.2 | 1.9 m | 1.0 | 1.5 m | 11.1 m | -7.7 m | - | covered_geometry |
| DQVVS6Z | t70 | core | directional_buffer | -4.1 | 1.7 m | 1.0 | 1.3 m | 11.1 m | 5.8 m | - | covered_geometry |
| DQWH7SO | t70 | core | directional_buffer | -4.4 | 1.5 m | 0.99 | 1.2 m | 11.1 m | 7.4 m | - | covered_geometry |
| DR0N914 | t70 | core | directional_buffer | -2.2 | 1.5 m | 0.99 | 1.1 m | 11.1 m | -7.9 m | - | covered_geometry |
| DR30ZG8 | t70 | noise | directional_buffer | -4.1 | 1.5 m | -0.09 | 1.2 m | 11.1 m | -4.1 m | - | covered_geometry |
| DQXO309 | t70 | core | directional_buffer | -2.9 | 1.4 m | 0.19 | 1.1 m | 11.1 m | 3.2 m | - | covered_geometry |
| DQYUY7Y | t70 | noise | directional_buffer | -6.3 | 1.4 m | 0.1 | 1.1 m | 11.1 m | 3.2 m | - | covered_geometry |
| DQVACL7 | t70 | core | directional_buffer | -3.7 | 1.3 m | 1.0 | 1.1 m | 11.1 m | 8.4 m | - | covered_geometry |
| FGSD0DS | t93 | core | directional_buffer | 5.3 | 1.1 m | 0.89 | 0.8 m | 11.1 m | -1.8 m | - | covered_geometry |
| DQYUY7U | t70 | core | directional_buffer | -4.4 | 1.0 m | 0.56 | 0.8 m | 11.1 m | -2.8 m | - | covered_geometry |
| DQVACL8 | t70 | core | directional_buffer | -3.3 | 0.9 m | 0.99 | 0.7 m | 11.1 m | 9.0 m | - | covered_geometry |
| DQWH7SS | t70 | core | directional_buffer | -3.8 | 0.7 m | 0.99 | 0.6 m | 11.1 m | 4.8 m | - | covered_geometry |
