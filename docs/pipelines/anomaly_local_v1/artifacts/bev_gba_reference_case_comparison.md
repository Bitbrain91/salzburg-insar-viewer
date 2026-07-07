# BEV-vs-GBA Referenzfall-Vergleich (Validierungslaeufe)

Stand: 2026-07-06
Kontext: Meeting-Beschluss 2026-06-19 (BEV statt GBA, Verarbeitungskonzept
offen), `../bev_building_source_concept.md`, BEV-Recheck
`bev_footprint_recheck_96959851.md`, Labels `reference_labels.json`.
Modellstand beider Seiten: `local_hdbscan_rulegate_v2_k2x`, identische
Default-Params, einziger Unterschied `--source`.

## Verwendete Runs

| Label | Run-ID | Dataset | Source | BBox | Status |
| --- | --- | --- | --- | --- | --- |
| moos_gba | 43c7a712-6e9a-4f39-8cd1-a6b3fab17ca1 | salzburg_snt | gba | 13.02714,47.79189,13.03074,47.79549 | succeeded |
| moos_bev | 6dcd5ecc-c4ff-4238-a7fd-75636aad562e | salzburg_snt | bev | (identisch) | succeeded |
| bgslope_tsx_gba | 51f54484-567f-4095-b9f8-f9e92d266a17 | bad_gastein_tsx_paz | gba | 13.138531,47.118449,13.141531,47.121449 | succeeded |
| bgslope_tsx_bev | a4aa1dcc-4744-44fe-ac91-8f82c53623bb | bad_gastein_tsx_paz | bev | (identisch) | succeeded |
| bgslope_snt_gba | 2c734086-23bd-4708-8e7c-75e8a876e523 | bad_gastein_snt | gba | (identisch) | succeeded |
| bgslope_snt_bev | de4f5f2c-e537-4c2c-8250-428d434a1828 | bad_gastein_snt | bev | (identisch) | succeeded |

ID-Mapping (max-overlap, 1:1 verifiziert): 96959851 -> {A9A7E442-BA31-41D0-8949-A120CB660943},
96637447 -> {33DD9DFA-1065-4A7C-BC6C-3A4132493CCF}, 113309836 -> {26E36608-58B4-4BE1-B711-C6F3E20F330C}.

## Fall 96959851 (unkartiertes Nebengebaeude)

Punktvergleich (Auszug, gelabelte Punkte):

| Punkt | Label | gba: assign/role/main | bev: assign/role/main |
| --- | --- | --- | --- |
| NTC3CYZ01 t95 | foreign | nearest / core / MAIN | directional / core / MAIN |
| NTDA86J01 t95 | foreign | directional / core / MAIN | within / core / MAIN |
| O2HC2XV01 t44 | foreign | nearest / noise | within / noise |
| NTF2IZV01 t95 | roof | within / core / MAIN | directional / core / MAIN |
| NTG9E7F01 t95 | roof | directional / core / MAIN | directional / core / MAIN |
| O2CKM3N01 t44 | roof | within / core / MAIN | directional / core / MAIN |
| O2FJS4J01 t44 | roof | within / core / MAIN | within / core / MAIN |

Rollup:

| Quelle | Status | Motion mm/a | Reliability | Band | kept |
| --- | --- | --- | --- | --- | --- |
| gba | ok | -0.64 | 0.78 | medium | 9 |
| bev | ok | -0.64 | 0.86 | **high** | 12 |

**Zentrale Beobachtung (Schein-Dekontamination bestaetigt):** Der groessere
BEV-Footprint absorbiert das Nebengebaeude; die Fremdpunkte werden
within/directional und bleiben Main-Cluster-Cores. Die Bewegung bleibt von
der Fremdstruktur gepraegt (-0.64 unveraendert), aber die Reliability STEIGT
auf high, weil die Assignment-Qualitaet formal besser wird. Ein besseres
Band unter BEV ist hier also KEIN Qualitaetsbeweis. Die nearest-Hygiene (a5)
ist fuer diese Punkte strukturell nicht mehr anwendbar -> die Fehlerklasse
gehoert unter BEV zu Multi-Cluster/Differential-Motion (P8-B/P8-C).

## Fall 96637447 (Differential-Anker, Anti-Layover-Cores)

| Punkt | Label | gba: role/main | bev: role/main |
| --- | --- | --- | --- |
| O37J5KI01 t44 | foreign | core | **noise** (gefangen) |
| O384L6A01 t44 | foreign | core | **noise** (gefangen) |
| O355F5A01 t44 | foreign | core | core / **MAIN** (verschlechtert) |
| O36XPYO01 t44 | foreign | core / MAIN | core / MAIN (bleibt) |
| NSZL99801/99701, NT06OUX01 t95 | foreign | noise | noise (bleibt gefangen) |
| NSVF80S01 t95 | roof | core / MAIN | **excluded** (VERLOREN) |
| NSXSYFW01 t95 | roof | core / MAIN | core / MAIN |
| O33D4C101, O32ROQ901 t44 | unclear | core | excluded/noise |

Rollup: gba ok +0.38, rel 0.74 medium, differential_flag TRUE, kept 29 ->
bev ok +0.80, rel 0.79 high, differential_flag FALSE, kept 25.

**Beobachtung:** Unter BEV faengt die Geometrie 2 der 4 Anti-Layover-Cores,
aber die Differential-Semantik geht verloren (Flag kippt auf false) und ein
bestaetigter Dachpunkt wird excluded. Motion aendert sich um +0.42 mm/a.

## Watch-Item 113309836 (Bad Gastein, P7-N4)

| Dataset | Quelle | Status | Motion mm/a | Rel/Band | kept |
| --- | --- | --- | --- | --- | --- |
| tsx_paz | gba | ok | -0.27 | 0.80 high | 58 |
| tsx_paz | bev | ok | -0.59 | 0.80 high | 58 |
| snt | gba | single_track_only | -5.14 | 0.70 medium | 10 |
| snt | bev | noise_dominated | -5.14 | 0.49 medium | 12 |

BEV-Hoehe 14.9 m statt GBA 5.9 m -> groessere Candidate Area. Der
TSX-Vorzeichenwechsel-Wert (-0.27, P7-N4) verschiebt sich unter BEV auf
-0.59; SNT wird ehrlicher als noise_dominated eingestuft. Menschliche
Pruefung (P7-N4) bleibt offen, jetzt mit BEV-Kontext.

## Metriken gegen den Label-Korpus (20 Punkte, 2 Gebaeude)

Score-relevant = core im Main-Cluster. "Gefangen" = noise/excluded/demotiert.

| Kennzahl | gba (k2x) | bev (k2x) |
| --- | --- | --- |
| foreign gefangen (von 10) | 4 | 6 |
| foreign noch core (main) | 2 (NTC3CYZ01, NTDA86J01) + 1 (O36XPYO01) | 4 (NTC3CYZ01, NTDA86J01, O355F5A01, O36XPYO01) |
| foreign noch core (non-main) | 3 | 0 |
| roof verloren (von 6) | 0 | 1 (NSVF80S01) |

Lesart: BEV verbessert die Recall-Seite der Hygiene (6/10 statt 4/10),
verschiebt aber Fremdpunkte des verschmolzenen Footprints in den
Main-Cluster und kostet einen bestaetigten Dachpunkt. Netto ist BEV die
bessere DATENBASIS (gemessene Hoehen, kartierte Nebengebaeude), aber die
k2x-Hygiene ist auf BEV-Footprints NICHT kalibriert.

## Entscheidungsnotiz: BEV als Produktions-Default

**User-Entscheidung 2026-07-07: BEV IST der Standard** (Datenqualitaet
unstrittig besser: gemessene ALS-Hoehen, vollstaendigere Footprints —
belegt durch diesen Vergleich und `bev_footprint_recheck_96959851.md`).
App-/Pipeline-Default steht seit Commit a970742 auf bev. GBA bleibt
AUSSCHLIESSLICH als Mess-/Regressionsbasis des Harness bestehen, bis die
Baselines und Referenzfaelle auf BEV-IDs migriert sind (P8-A, vorgezogen).

Die urspruengliche Empfehlung "noch nicht umstellen" bezog sich auf diese
Messbasis und auf die folgenden Hygiene-Punkte, die durch die Umstellung
NICHT hinfaellig werden, sondern dringlicher (phase8):

1. das Hoehen-Mapping (buffer=height_max, plausibility=height_median)
   umgesetzt ist,
2. Anti-Layover-/Layover-Reichweiten-Checks als kartierungsfreie Hygiene
   auch within/directional-Punkte pruefen (Fall NTC3CYZ01/NTDA86J01 unter
   BEV!),
3. Multi-Cluster-/Differential-Handling die verschmolzenen BEV-Footprints
   abdeckt (Fall 96637447: differential_flag darf nicht kippen),
4. Referenzfaelle/Baselines auf BEV-IDs migriert und neu eingefroren sind.

Reproduktion: SQL-Muster siehe `../phase8_bev_hygiene_plan.md` (Anhang);
Runs bleiben in ml_runs/Viewer inspizierbar.
