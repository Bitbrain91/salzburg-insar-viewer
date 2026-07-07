# BEV-vs-GBA-Abdeckungs-Audit (ML-Zuordnung)

Stand: 2026-07-07
Kontext: Ticket P8-A-W1-T3. BEV ist seit 2026-07-07 Produktions-Default der
Zuordnungsquelle (`bev_gba_reference_case_comparison.md`, Meeting-Beschluss
2026-06-19). Dieses Audit misst rein raeumlich, ob die BEV-Footprints die
InSAR-Punkte genauso gut erreichen wie GBA und wie stark sich die
Gebietsgeometrie zwischen den Quellen unterscheidet. Read-only, keine
Pipeline-Laeufe.

## Methode

- Zuordnungsdistanz `max_distance_m = 15.0` aus den Pipeline-Defaults
  (`anomaly_local_v1.py`, Parameter der `nearest`-Zuordnung via
  `ST_DWithin(p.geom::geography, b.geom::geography, 15)`).
- `within` = `ST_Covers(b.geom, p.geom)` (Punkt liegt strikt im Footprint;
  identisch zur `within`-Zuordnung der Pipeline).
- `<=15m` = mindestens ein Footprint der Quelle im geodaetischen Umkreis 15 m.
  Query nutzt einen Bounding-Box-Vorfilter `b.geom && ST_Expand(p.geom, 0.0003)`
  (GIST-Index, ~28 m/19 m in lat/lon bei 47.8 N — echte Supermenge von 15 m),
  verfeinert durch die exakte `ST_DWithin`-Geographie. Ohne diesen Vorfilter
  faellt die Geographie-Distanz auf Seq-Scan ueber ~70k Footprints zurueck
  (>3 min/AOI); mit Vorfilter <0.4 s/AOI.
- Kandidatensuche je Punkt gegen alle Footprints der `area_id` (nicht auf die
  BBox beschraenkt), damit Randpunkte auch Footprints knapp ausserhalb der AOI
  treffen — so wie die Pipeline die Buildings im Envelope+Slack laedt.

## 1. Punkt-Abdeckung je Pflicht-AOI

Alle AOIs Sentinel-1 (`salzburg_snt` bzw. `bad_gastein_snt`).

| AOI | Punkte | %BEV<=15m | %GBA<=15m | %within BEV | %within GBA |
| --- | --- | --- | --- | --- | --- |
| mirabell | 1481 | 89.9 | 91.3 | 41.3 | 41.1 |
| moosstrasse | 1692 | 99.3 | 99.6 | 31.7 | 33.7 |
| osthang | 616 | 98.4 | 99.5 | 38.8 | 43.3 |
| bg_flat_01 | 1195 | 88.4 | 90.7 | 26.3 | 29.8 |
| bg_slope_01 | 717 | 97.1 | 96.5 | 35.4 | 38.9 |

Lesart: Die 15-m-Erreichbarkeit ist zwischen BEV und GBA praktisch
deckungsgleich (Differenz durchgehend <2.4 pp; GBA in 4 von 5 AOIs marginal
vorn, bg_slope_01 umgekehrt). Kein AOI verliert durch die Umstellung auf BEV
nennenswert Zuordnungspotenzial. Nur ein Drittel bis zwei Fuenftel der Punkte
liegt strikt `within` eines Footprints — der Rest wird ueber
`directional`/`nearest` im 15-m-Ring erfasst; das ist quellenunabhaengig so.
Das `within`-Delta geht in den Salzburg-/BG-AOIs leicht zu GBA, weil GBA dort
groessere Einzel-Footprints hat (siehe Abschnitt 2).

## 2. Gebietsstatistik je area_id

### Footprint-Anzahl und Flaeche (geodaetische Polygonflaeche)

| area_id | Quelle | Footprints | median m2 | p90 m2 |
| --- | --- | --- | --- | --- |
| salzburg | BEV | 71565 | 95.8 | 340.8 |
| salzburg | GBA | 57489 | 124.6 | 406.9 |
| bad_gastein | BEV | 4152 | 81.4 | 268.7 |
| bad_gastein | GBA | 5057 | 73.8 | 282.0 |

Gegenlaeufig: In **salzburg** hat BEV *mehr* und *kleinere* Footprints
(71565 vs 57489; Median 95.8 vs 124.6 m2) — feinere Zerlegung. In
**bad_gastein** ist es umgekehrt: GBA hat mehr Footprints (5057 vs 4152) und
BEV die etwas groesseren Polygone.

### Abdeckungsluecken (raeumliche Ueberlappung, `ST_Intersects`)

| area_id | GBA ohne BEV-Ueberlappung | BEV ohne GBA-Ueberlappung |
| --- | --- | --- |
| salzburg | 11626 / 57489 (20.2 %) | 21712 / 71565 (30.3 %) |
| bad_gastein | 1400 / 5057 (27.7 %) | 139 / 4152 (3.3 %) |

- salzburg: BEV bringt netto Struktur hinzu — 30.3 % der BEV-Footprints haben
  gar kein GBA-Gegenstueck (Nebengebaeude, Garagen, Anbauten), waehrend 20.2 %
  der GBA-Polygone in BEV nicht mehr als eigenes Objekt auftauchen.
- bad_gastein: Deutliche BEV-Untererfassung — 27.7 % der GBA-Footprints haben
  keinerlei BEV-Ueberlappung, aber nur 3.3 % der BEV sind neu. Hier fehlen
  BEV rund 1400 GBA-Strukturen.

### Verschmelzungsgrad (max-overlap GBA -> BEV)

Jeder GBA-Footprint wird dem BEV-Footprint mit maximaler Schnittflaeche
zugeordnet (`DISTINCT ON (gba_id) ORDER BY ST_Area(ST_Intersection(...)) DESC`);
LATERAL-frei ueber den index-gestuetzten `ST_Intersects`-Join, ~1.6 s
(salzburg) bzw. 0.3 s (bad_gastein), da pro GBA nur wenige BEV-Kandidaten
anfallen.

| area_id | GBA zugeordnet | BEV-Empfaenger | davon >=2 GBA | Anteil verschmolzen | 2 GBA | >=3 GBA | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| salzburg | 45863 | 39157 | 5416 | 13.8 % | 4590 | 826 | 15 |
| bad_gastein | 3657 | 3315 | 321 | 9.7 % | 306 | 15 | 5 |

Verschmelzung ist ein relevantes Minderheitsphaenomen: 9.7 % (BG) bis 13.8 %
(salzburg) der aufnehmenden BEV-Polygone absorbieren >=2 GBA-Footprints; in
salzburg schlucken 826 BEV-Polygone sogar >=3 GBA (Maximum 15). Das ist die
quantifizierte Carport-/Nebengebaeude-Verschmelzung aus den Referenzfaellen
(z. B. 96959851).

### height_quality (BEV)

| area_id | measured | default |
| --- | --- | --- |
| salzburg | 69094 (96.5 %) | 2471 (3.5 %) |
| bad_gastein | 3547 (85.4 %) | 605 (14.6 %) |

Der Anteil gemessener ALS-Hoehen ist in salzburg sehr hoch (96.5 %), in
bad_gastein spuerbar niedriger (85.4 %) — dort greift bei ~1 von 7 Footprints
die Default-Hoehe, die ueber `tan(incidence) * buffer_multiplier` direkt in
den Kandidaten-Buffer (`directional_buffer`) eingeht.

## 3. Lesart fuer die Umstellung auf BEV

Die 15-m-Erreichbarkeit der InSAR-Punkte ist zwischen BEV und GBA in allen
fuenf Pflicht-AOIs praktisch identisch (<2.4 pp) — die Umstellung auf BEV
kostet raeumlich keine Zuordnung. In **salzburg** ist BEV die reichhaltigere
Basis: mehr, feinere Footprints und 30.3 % neu kartierte Strukturen ohne
GBA-Gegenstueck. In **bad_gastein** ist die Lage umgekehrt und mahnend: BEV
untererfasst gegenueber GBA (27.7 % der GBA-Strukturen ohne BEV-Ueberlappung,
nur 85.4 % gemessene Hoehen) — im alpinen Gebiet ist die BEV-Vollstaendigkeit
schwaecher. Verschmelzung bleibt ein systematisches Minderheitsphaenomen
(9.7-13.8 % der BEV-Empfaenger schlucken >=2 GBA-Footprints), das die
Multi-Cluster-/Differential-Hygiene (P8-B/P8-C) adressieren muss, weil hier
Fremdstrukturen in einen gemeinsamen Footprint fallen. Fazit: BEV als
Default ist fuer salzburg unstrittig, fuer bad_gastein sollten die
Abdeckungsluecke und der hoehere Default-Hoehen-Anteil als bekannte
Einschraenkung mitgefuehrt werden.
