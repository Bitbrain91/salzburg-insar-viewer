# HR-Offset-Recon: SNT-Main-Cluster vs. TSX-Cores

Stand: 2026-07-07T10:15:05.850547+00:00

Vorversuch fuer P7-N3 (Go/No-Go Patch-Matching), Kontext:
`../tsx_structural_reference_decision.md`. Quelle beidseitig `gba`,
Experiment `noop` (Produktionslogik), Bewegung out of scope.
Salzburg-TSX ist single-track descending (t93), ohne Amplituden,
eff_area NULL (reine PS); BG-TSX behaelt den DS-Toleranzterm.

Referenz-Toleranz: SNT 12 m + TSX 3 m = 15 m.

## Gepoolte Verteilung

| Metrik | n | Median | p75 | p90 | Anteil <= 15 m |
| --- | ---: | ---: | ---: | ---: | ---: |
| min_offset_m | 240 | 2.43 | 4.74 | 6.94 | 0.983 |
| median_offset_m | 240 | 8.93 | 11.57 | 15.63 | 0.879 |
| main_centroid_dist_m | 239 | 6.35 | 9.15 | 12.93 | 0.95 |

Histogramm `main_centroid_dist_m` (gepoolt): {"0-3m": 40, "3-6m": 71, "6-9m": 65, "9-12m": 31, "12-15m": 20, "15-20m": 7, "20-30m": 5, "30-infm": 0}

## Je Paar

| Paar | gekoppelt | main_centroid_dist Median | p90 | min_offset Median |
| --- | ---: | ---: | ---: | ---: |
| bg_flat_01 | 54 | 5.41 | 11.74 | 0.0 |
| bg_slope_01 | 34 | 6.25 | 11.03 | 0.0 |
| mirabell | 33 | 7.12 | 17.99 | 4.34 |
| moosstrasse | 83 | 5.83 | 13.52 | 3.38 |
| osthang | 36 | 7.07 | 12.49 | 3.87 |

## Lesart (Go/No-Go P7-N3)

- `main_centroid_dist_m` misst, wie praezise sich SNT- und
  TSX-Hauptcluster raeumlich entsprechen. Liegt der gepoolte Median
  in der Groessenordnung der Toleranz (~15 m), wuerde ein
  Patch-Matching primaer Geokodierungsrauschen messen -> No-Go.
- Deutlich kleinere Werte (<~5 m) wuerden Sub-Gebaeude-Matching
  rechtfertigen (Go, mit Toleranzband).
- Entscheidung wird im Decision Record nachgetragen.
