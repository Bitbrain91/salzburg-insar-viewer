# Phase 7 - GBA-Gebaeudehoehen-Audit (P7-A-W1-T6)

Stand: 2026-06-10
Datenstand: PostGIS `insar` (Salzburg 57,489 / Bad Gastein 5,057 GBA-Gebaeude),
`data/gba/salzburg_gba.geojson`, OSM Salzburg 49,240 Gebaeude.
Ausloeser: User-Verdacht "alle Hoehen wirken zu niedrig" (2026-06-10).

## Kernbefund

Die GBA-Hoehen sind systematisch zu niedrig, aber es liegt KEIN Lade- oder
Interpretationsfehler der Pipeline vor: Die Rohdaten enthalten die Werte
bereits so. GBA ist ein satellitenbasiertes LoD1-Schaetzprodukt; sein
Hoehenmodell unterschaetzt im Median um ~27 % und saettigt bei hohen
Gebaeuden drastisch.

## Evidenz

### E1: Rohdaten == DB (kein Loader-Fehler)

`data/gba/salzburg_gba.geojson`, erste Features (woertlich):
`"properties": { "source": "ms", "id": "Austria_120230030_67284",
"height": 0.8795..., "var": 0.7478..., "region": "AUT" }`.
Der Loader (`pipeline/download_gba.py`, `pipeline/prepare_buildings.py`)
uebernimmt `height` numerisch 1:1 (Fallback 10.0 nur bei fehlender Spalte).
Quellen sind gemischt (`source: ms|osm`), inklusive Kleinststrukturen
(Garagen/Schuppen) mit Hoehen unter 1 m. Die Schaetzvarianz `var` wird
aktuell nirgends genutzt.

### E2: Verteilung (PostGIS, 2026-06-10)

```sql
SELECT area_id, count(*) n, round(min(height)::numeric,2) min,
       round(percentile_cont(0.05) WITHIN GROUP (ORDER BY height)::numeric,2) p05,
       round(percentile_cont(0.5)  WITHIN GROUP (ORDER BY height)::numeric,2) med,
       round(percentile_cont(0.9)  WITHIN GROUP (ORDER BY height)::numeric,2) p90,
       round(percentile_cont(0.99) WITHIN GROUP (ORDER BY height)::numeric,2) p99,
       round(max(height)::numeric,2) max
FROM gba_buildings GROUP BY area_id;
```

| area | n | min | p05 | med | p90 | p99 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| salzburg | 57,489 | 0.01 | 1.82 | 4.49 | 7.65 | 12.53 | 30.38 |
| bad_gastein | 5,057 | 0.02 | 0.41 | 3.22 | 6.47 | 11.93 | 17.75 |

Maximum 30.4 m im gesamten Salzburger Datensatz ist fuer eine Stadt mit
Dom, Kirchtuermen und Hotels offensichtlich gesaettigt.

### E3: Vergleich mit oeffentlichen OSM-Hoehen (Salzburg)

Matching: OSM-Gebaeude mit `height`-Tag bzw. `building:levels`, Centroid im
GBA-Footprint (7,593 Matches, davon 673 mit numerischem height-Tag):

```sql
-- Kern: NULLIF(regexp_replace(tags->>'height','[^0-9.]+.*$',''),'')::float,
-- Join: ST_Contains(g.geom, ST_Centroid(o.geom))
```

- Median-Verhaeltnis `GBA / OSM-height` = `0.735` (~27 % Unterschaetzung).
- Median-Verhaeltnis `GBA / (levels * 3 m)` = `0.824`.

Landmark-Beispiele (OSM oeffentlich -> GBA):

| Gebaeude | OSM [m] | GBA [m] |
| --- | ---: | ---: |
| Salzburger Dom | 78.0 | 27.4 |
| Hotel Europa | 56.0 | 29.6 |
| OeGK | 47.0 | 27.2 |
| Tower Eleven | 43.5 | 11.7 |
| Sankt Andrae Kirche | 40.0 | 23.3 |
| Kollegienkirche | 29.0 | 10.8 |
| Hotel Stein | 22.0 | 4.3 |
| OeGK Kundenservice | 20.0 | 24.1 |

(Letztes Beispiel zeigt: Einzelfaelle koennen auch ueberschaetzt sein; der
Bias ist statistisch, nicht uniform. Gaisberg-Sendemast 100 m -> 4.6 ist
kein Gebaeude und kein fairer Fall.)

### E4: Bad-Gastein-Gegenprobe NICHT moeglich

`osm_buildings` enthaelt fuer `area_id='bad_gastein'` 0 Zeilen (OSM ist im
Manifest aktiviert, wurde aber nie geladen; es existiert auch kein
BG-OSM-Parquet). Die OSM-Gegenprobe ist daher nur fuer Salzburg moeglich.
Die BG-Verteilung (Median 3.22 m bei einem Kurort mit Grandhotels) ist
konsistent mit demselben Bias.

### E5: Wirkungsquantifizierung auf die nearest-Quote (Mirabell)

Frage: Wie viele `nearest`-Punkte fielen in die Candidate-Area, wenn die
Hoehe um den Bias korrigiert wuerde (`height / 0.735`)? Test gegen Run
`488aa8d0` (Mirabell-Baseline), Candidate-Area-Formel der Pipeline
nachgerechnet (UTM, `range_offset = clamp(h*tan(inc), 3, 30)`,
Lateral-Slack 2 m, Richtungsvektoren T44 261.4 deg / T95 101.5 deg):

| Track | nearest gesamt | jetzt in Area (Sanity) | mit korrigierter Hoehe | mittl. Distanz |
| ---: | ---: | ---: | ---: | ---: |
| 44 | 210 | 0 | 10 (4.8 %) | 7.9 m |
| 95 | 207 | 0 | 14 (6.8 %) | 8.7 m |

WICHTIGE EINORDNUNG: Die Hoehen-Unterschaetzung erklaert nur ~5-7 % der
nearest-Zuordnungen. Der dominante Grund ist NICHT die zu kurze
Range-Verlaengerung, sondern seitlicher Versatz: Die Candidate-Area waechst
nur in Range-Richtung, die laterale Slack betraegt 2 m, waehrend die
SNT-Geokodierung +-8-12 m (1 sigma) streut. Punkte quer zur Blickrichtung
liegen daher unabhaengig von der Hoehe ausserhalb - oder sie sind echte
Fremd-/Bodenobjekte. Konsequenz: Eine Hoehenkorrektur "rettet" die
nearest-Punkte NICHT mehrheitlich; die Assignment-Hygiene (`P7-C-W1-T5`,
v. a. Demotion A1) bleibt der primaere Hebel.

## Hoehenstrategie-Empfehlung (keine produktive Umsetzung in P7-A)

1. EMPFOHLEN O1 (fuer das Feature `height_above_ground_m`): selbstkalibrierte
   Hoehe aus InSAR-Punkten (Median Punkthoehe minus
   `insar_point_terrain`-Gelaendehoehe, gebietsweise geoid-kalibriert).
   Generisch, sensorunabhaengig, keine Handfaktoren; zirkulaer fuer
   punktarme Gebaeude -> Fallback-Kette GBA -> Default. Primaerer Nutzen:
   Dach- vs. Bodenobjekt-Plausibilitaet in `P7-C-W1-T5` (A3), nicht
   Candidate-Area-Rettung (siehe E5).
2. O3 (Kalibrierfaktor ~1/0.735 + `var`-Zuschlag auf die Candidate-Area):
   als Experimentvariante zulaessig, Erwartung gemaess E5 aber gering
   (~5-7 % der nearest-Punkte). Globaler Faktor ist generikvertraeglich
   (kein Gebietstuning), Wirkung je AOI zu messen.
3. O2 (OSM-Anreicherung): nur ~673 Gebaeude mit height-Tag in Salzburg,
   0 in Bad Gastein -> als alleinige Strategie unbrauchbar, als
   Validierungsquelle wertvoll.
4. O4 (hoeherer Mindestoffset/laterale Slack): beruehrt das
   P6-Candidate-Area-Modell und bleibt ausserhalb von P7-A; als
   T5-Experimentachse (A2-Verwandt) dokumentiert.

## Reproduktion

Alle Queries dieses Audits sind oben woertlich angegeben; Ausfuehrung via
`backend/.venv-wsl/bin/python` + asyncpg gegen
`postgresql://insar:insar@localhost:5432/insar`. E5 nutzt Run
`488aa8d0-4697-4906-b0a8-27c8ab7eff1c` (Mirabell, 2026-06-10).
