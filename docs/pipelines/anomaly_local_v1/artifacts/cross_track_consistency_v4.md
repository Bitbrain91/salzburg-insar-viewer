# Cross-Track-Konsistenz: T44 (aufsteigend) vs T95 (absteigend)

Stand: 2026-07-15T11:06:03.934769+00:00

## Methodik

- Verglichen werden je Gebaeude die gespeicherten Track-Bewegungen `track_motion_mm_a` der entgegengesetzten Tracks T44 und T95 EINES SNT-Runs.
- Diese Werte sind laut Rollup-Vertrag bereits vertikale Proxies: `vertical_proxy = LOS / max(cos(incidence_angle), 0.30)` (Deckel 0.30 gegen Rauschverstaerkung bei flachem Einfall). Es wird NICHT neu gerechnet.
- `delta = T44 - T95`; Toleranz `allowed = 1.0 + 0.15 * slope` mm/a; `within_allowed = |delta| <= allowed`; `agreement = exp(-|delta| / allowed)`.
- Hangwinkel aus SRTM (nominal 30 m) via `building_terrain_context.slope_mean_deg`, ersatzweise `building_context.slope_mean_deg`; ohne Wert Klasse "unbekannt". Vorbehalt: 30-m-SRTM glaettet kleinraeumige Hangkanten.
- Terrain-Klassen (einzige Quelle `terrain_classes.py`): flach `<5°`, uebergang `5–15°`, hang `≥15°`.
- Vorzeichen-Totband (Deadband): `±0.5` mm/a; `stable` bei `|v| <= 0.5`.
- Core-Support-Schwelle je Track: `2`.
- Dedupe ueber Runs auf `(area_id, building_source, building_id)`: bei Mehrfachvorkommen gewinnt das Gebaeude mit hoeherem `kept_point_count`.
- Lesart: Plausibilitaetsindikator fuer geometrische Konsistenz, KEINE Ground-Truth-Kalibrierung.

## Verwendete Runs

| Label | Run-ID | Dataset | Source | Model | BBox | Status | Punkte |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sbg_flat_ext_01 | 8dbeb164-3346-4952-addc-6dc0c8fcd867 | salzburg_snt | bev | local_hdbscan_rulegate_v4_k2xhf_diffv2 (25286) | 13.030000,47.800000,13.046000,47.812000 | succeeded | 25286 |
| sbg_flat_ext_02 | d1a5e56c-9962-4bb8-a536-210dec41882d | salzburg_snt | bev | local_hdbscan_rulegate_v4_k2xhf_diffv2 (22480) | 13.018000,47.785000,13.036000,47.798000 | succeeded | 22480 |
| sbg_hang_ext_01 | 4ed36e33-253f-4389-9975-9ca0149b8ce2 | salzburg_snt | bev | local_hdbscan_rulegate_v4_k2xhf_diffv2 (17318) | 13.045000,47.799000,13.060000,47.810000 | succeeded | 17318 |
| bg_flat_ext_01 | f3d22d72-8fa8-4551-96c5-273d84bc8d7a | bad_gastein_snt | bev | local_hdbscan_rulegate_v4_k2xhf_diffv2 (9109) | 13.125000,47.095000,13.145000,47.115000 | succeeded | 9109 |
| bg_slope_ext_01 | 929e79d9-149b-414d-91aa-6db4e4d3f36f | bad_gastein_snt | bev | local_hdbscan_rulegate_v4_k2xhf_diffv2 (8514) | 13.130000,47.112000,13.150000,47.128000 | succeeded | 8514 |

## Kernbefund je Filtergruppe und Terrain-Klasse

_Leitdiskriminatoren fuer den Terrain-Klassenvergleich: `Median Δ (abs)`, `MAE`, `Spearman` (Roh- und Rangebene, ganz links). `Vorzeichen` und `≤ Toleranz` stehen bewusst rechts: `Vorzeichen` ist totband-streng, `≤ Toleranz` misst nur RELATIV zur hangabhaengigen Modelltoleranz `1.0 + 0.15·slope` und eignet sich daher NICHT fuer den Flach-vs-Hang-Vergleich._

### strict (Leitgruppe: ok ∧ mittel/hoch ∧ Support)

| Terrain-Klasse | n | Median Δ (abs) | MAE | Spearman | Bias median | Agreement median | Pearson | Vorzeichen | ≤ Toleranz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flach (<5°) | 1283 | 0.704 | 0.829 | 0.169 | -0.256 | 0.592 | 0.256 | 43.2% | 79.3% |
| Übergang (5–15°) | 279 | 0.815 | 1.028 | 0.105 | -0.449 | 0.708 | 0.025 | 35.5% | 90.3% |
| Hang (≥15°) | 165 | 1.215 | 2.014 | -0.307 | -0.256 | 0.756 | -0.342 | 24.8% | 83.6% |
| Gepoolt | 1727 | 0.766 | 0.975 | 0.106 | -0.318 | 0.631 | 0.050 | 40.2% | 81.5% |

### Beide Tracks vorhanden

| Terrain-Klasse | n | Median Δ (abs) | MAE | Spearman | Bias median | Agreement median | Pearson | Vorzeichen | ≤ Toleranz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flach (<5°) | 1381 | 0.765 | 0.955 | 0.100 | -0.257 | 0.578 | 0.109 | 41.9% | 76.2% |
| Übergang (5–15°) | 294 | 0.831 | 1.370 | -0.006 | -0.419 | 0.697 | -0.429 | 34.0% | 87.1% |
| Hang (≥15°) | 183 | 1.279 | 2.664 | -0.409 | -0.127 | 0.734 | -0.608 | 24.0% | 79.2% |
| Gepoolt | 1858 | 0.769 | 1.189 | 0.023 | -0.318 | 0.615 | -0.237 | 38.9% | 78.3% |

### Status ok

| Terrain-Klasse | n | Median Δ (abs) | MAE | Spearman | Bias median | Agreement median | Pearson | Vorzeichen | ≤ Toleranz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flach (<5°) | 1340 | 0.766 | 0.959 | 0.102 | -0.258 | 0.577 | 0.113 | 41.9% | 76.0% |
| Übergang (5–15°) | 290 | 0.831 | 1.373 | -0.011 | -0.419 | 0.699 | -0.433 | 34.1% | 86.9% |
| Hang (≥15°) | 176 | 1.280 | 2.727 | -0.414 | -0.128 | 0.736 | -0.612 | 23.3% | 78.4% |
| Gepoolt | 1806 | 0.769 | 1.198 | 0.024 | -0.319 | 0.613 | -0.240 | 38.8% | 78.0% |

### Zuverlässigkeit mittel/hoch

| Terrain-Klasse | n | Median Δ (abs) | MAE | Spearman | Bias median | Agreement median | Pearson | Vorzeichen | ≤ Toleranz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flach (<5°) | 1319 | 0.704 | 0.824 | 0.171 | -0.256 | 0.596 | 0.255 | 43.3% | 79.7% |
| Übergang (5–15°) | 283 | 0.815 | 1.030 | 0.109 | -0.449 | 0.707 | 0.029 | 35.3% | 90.5% |
| Hang (≥15°) | 172 | 1.216 | 1.976 | -0.306 | -0.256 | 0.755 | -0.336 | 25.6% | 84.3% |
| Gepoolt | 1774 | 0.765 | 0.969 | 0.107 | -0.317 | 0.634 | 0.052 | 40.3% | 81.8% |

### Core-Support ≥ min je Track

| Terrain-Klasse | n | Median Δ (abs) | MAE | Spearman | Bias median | Agreement median | Pearson | Vorzeichen | ≤ Toleranz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flach (<5°) | 1381 | 0.765 | 0.955 | 0.100 | -0.257 | 0.578 | 0.109 | 41.9% | 76.2% |
| Übergang (5–15°) | 294 | 0.831 | 1.370 | -0.006 | -0.419 | 0.697 | -0.429 | 34.0% | 87.1% |
| Hang (≥15°) | 183 | 1.279 | 2.664 | -0.409 | -0.127 | 0.734 | -0.608 | 24.0% | 79.2% |
| Gepoolt | 1858 | 0.769 | 1.189 | 0.023 | -0.318 | 0.615 | -0.237 | 38.9% | 78.3% |

## Je AOI (Leitgruppe strict, gepoolt)

| AOI | n | Median Δ (abs) | MAE | Spearman | Bias median | Agreement median | Pearson | Vorzeichen | ≤ Toleranz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sbg_flat_ext_01 | 539 | 0.639 | 0.767 | 0.137 | -0.381 | 0.677 | 0.189 | 41.9% | 87.8% |
| sbg_flat_ext_02 | 501 | 0.832 | 0.937 | 0.219 | -0.576 | 0.530 | 0.279 | 37.9% | 73.3% |
| sbg_hang_ext_01 | 414 | 0.641 | 0.830 | 0.111 | -0.066 | 0.697 | 0.132 | 45.2% | 88.9% |
| bg_flat_ext_01 | 170 | 0.915 | 1.158 | -0.007 | -0.349 | 0.621 | 0.015 | 37.1% | 78.2% |
| bg_slope_ext_01 | 103 | 1.333 | 2.522 | -0.533 | 0.878 | 0.504 | -0.517 | 27.2% | 65.0% |

## Dedupe

- Entfernte Duplikate gesamt: 290
  - bg_flat_ext_01 -> bg_slope_ext_01: 7
  - bg_slope_ext_01 -> bg_flat_ext_01: 119
  - sbg_flat_ext_01 -> sbg_hang_ext_01: 46
  - sbg_hang_ext_01 -> sbg_flat_ext_01: 118

## Showcase-Gebaeude

| Klasse | AOI | Building | Slope | T44 | T95 | Δ | Deep-Link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Flach übereinstimmend & bewegt | sbg_flat_ext_02 | bev:{822040A9-9EFD-46FA-846A-DB07C896ABD2} | 2.53 | 0.513 | 0.511 | 0.001 | [Karte](http://localhost:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{822040A9-9EFD-46FA-846A-DB07C896ABD2}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Flach übereinstimmend & bewegt | sbg_flat_ext_02 | bev:{BF729BA2-ECBB-4335-8DC6-97DDE6A550F4} | 1.95 | -0.897 | -0.896 | -0.001 | [Karte](http://localhost:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{BF729BA2-ECBB-4335-8DC6-97DDE6A550F4}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Flach übereinstimmend & bewegt | sbg_flat_ext_01 | bev:{57DBA420-3ABB-4F65-9E9F-7BFB36D78D6A} | 3.36 | 0.513 | 0.511 | 0.002 | [Karte](http://localhost:3000/?area=salzburg&run=8dbeb164-3346-4952-addc-6dc0c8fcd867&building=bev:{57DBA420-3ABB-4F65-9E9F-7BFB36D78D6A}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Flach übereinstimmend & bewegt | sbg_flat_ext_01 | bev:{D7678F6C-4829-4F52-8CE1-CDA1DDE6C03E} | 1.49 | 0.641 | 0.639 | 0.002 | [Karte](http://localhost:3000/?area=salzburg&run=8dbeb164-3346-4952-addc-6dc0c8fcd867&building=bev:{D7678F6C-4829-4F52-8CE1-CDA1DDE6C03E}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Flach übereinstimmend & bewegt | sbg_flat_ext_02 | bev:{CE2A0E57-70A2-426E-99BD-4A4C731E23B5} | 3.25 | -1.025 | -1.023 | -0.002 | [Karte](http://localhost:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{CE2A0E57-70A2-426E-99BD-4A4C731E23B5}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Hang differenziell | bg_flat_ext_01 | bev:{6D7ECD8C-AA71-46A6-A917-E252C1AD7923} | 32.15 | 8.412 | -14.179 | 22.592 | [Karte](http://localhost:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{6D7ECD8C-AA71-46A6-A917-E252C1AD7923}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Hang differenziell | bg_slope_ext_01 | bev:{4848DDF8-249A-405C-8606-12046CBA0CEC} | 22.92 | 7.010 | -11.921 | 18.931 | [Karte](http://localhost:3000/?area=bad_gastein&run=929e79d9-149b-414d-91aa-6db4e4d3f36f&building=bev:{4848DDF8-249A-405C-8606-12046CBA0CEC}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Hang differenziell | bg_slope_ext_01 | bev:{EE9933B7-1B6D-4974-B366-5D72103377DC} | 19.62 | 5.098 | -11.921 | 17.020 | [Karte](http://localhost:3000/?area=bad_gastein&run=929e79d9-149b-414d-91aa-6db4e4d3f36f&building=bev:{EE9933B7-1B6D-4974-B366-5D72103377DC}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Hang differenziell | bg_slope_ext_01 | bev:{42A742BC-E066-41B4-B778-3C2EAE89AE85} | 19.06 | 1.976 | -12.109 | 14.085 | [Karte](http://localhost:3000/?area=bad_gastein&run=929e79d9-149b-414d-91aa-6db4e4d3f36f&building=bev:{42A742BC-E066-41B4-B778-3C2EAE89AE85}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |
| Hang differenziell | bg_slope_ext_01 | bev:{BADCD91F-370D-4889-8D26-5FED12C5926A} | 19.05 | 5.990 | -7.780 | 13.771 | [Karte](http://localhost:3000/?area=bad_gastein&run=929e79d9-149b-414d-91aa-6db4e4d3f36f&building=bev:{BADCD91F-370D-4889-8D26-5FED12C5926A}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1) |

## Diagramme

- `docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4_scatter_t44_t95.png`
- `docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4_scatter_t44_t95.svg`
- `docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4_agreement_by_class.png`
- `docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4_agreement_by_class.svg`
- `docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4_absdelta_by_class.png`
- `docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4_absdelta_by_class.svg`

## Interpretation

- Leitdiskriminatoren fuer den Terrain-Klassenvergleich sind die Roh- und Rangmetriken `Median |Δ|`, `MAE` und `Spearman` (nicht die toleranz- oder totbandrelativen Anteile): flach (n=1283) `Median |Δ|` 0.704 / `MAE` 0.829 / `Spearman` 0.169 gegenueber hang (n=165) `Median |Δ|` 1.215 / `MAE` 2.014 / `Spearman` -0.307. Sie diskriminieren die Klassen konsistent: am Hang groessere Absolutabweichung und schwaechere bzw. gegenlaeufige Rangordnung.
- `Anteil ≤ Toleranz` misst Konsistenz RELATIV zur hangabhaengigen Modelltoleranz `allowed = 1.0 + 0.15·slope` und ist deshalb NICHT fuer den Flach-vs-Hang-Vergleich geeignet: das Toleranzband weitet sich am Hang, sodass der Anteil dort trotz groesserer Rohabweichung hoeher liegen kann (hang 83.6% vs flach 79.3%). Er taugt nur als Innerhalb-Klasse-Konsistenzmass.
- Nachgeordnet, keine fuehrende Kopfzahl: Vorzeichen-Uebereinstimmung 40.2% (strict gepoolt). Die Metrik ist streng, weil quasi-stabile Gebaeude nahe ±0.5 mm/a schon durch kleine Schwankungen die Klasse wechseln; das Totband klammert stabile Gebaeude bewusst aus der Vorzeichenwertung aus.
- Der negative `Spearman` am Hang (-0.307) bedeutet, dass auf- und absteigende Blickrichtung die Bewegung tendenziell GEGENLAEUFIG rangieren. Das ist ein Hinweis auf eine horizontale bzw. hangabwaerts gerichtete Bewegungskomponente, die beide Geometrien mit unterschiedlichem Vorzeichen in die LOS projizieren; es motiviert eine 2D-Dekomposition (Vertikal-/Ost-West-Zerlegung) statt der reinen Vertikalproxy-Annahme.
- Cross-Track-Konsistenz bleibt ein geometrischer Plausibilitaetsindikator: hohe Werte zeigen, dass auf- und absteigende Geometrie dieselbe (Vertikal-)Bewegung sehen, sie ersetzen aber keine unabhaengige Ground-Truth.
