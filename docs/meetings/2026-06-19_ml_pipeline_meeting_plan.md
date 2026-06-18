# Meeting-Plan: InSAR Viewer und aktuelle ML-Pipeline

Stand: 2026-06-18  
Meeting: 2026-06-19  
Fokus: InSAR Viewer, `anomaly_local_v1`, Clustering-Qualitaet, Gebaeude-Scoring und naechste Verbesserungen

## Inhaltsverzeichnis

- [Ziel fuer das Meeting](#ziel-fuer-das-meeting)
- [Kurzfassung fuer den Einstieg](#kurzfassung-fuer-den-einstieg)
- [Vorschlag fuer die Agenda](#vorschlag-fuer-die-agenda)
- [Pipeline in groben Schritten](#pipeline-in-groben-schritten)
  - [Datenbasis](#1-datenbasis)
  - [Punkt-zu-Gebaeude-Zuordnung](#2-punkt-zu-gebaeude-zuordnung)
  - [Gate-Regeln](#3-gate-regeln)
  - [k2x: aktuelle Directional-/Nearest-Hygiene](#4-k2x-aktuelle-directional-nearest-hygiene)
  - [Features fuer das Clustering](#5-features-fuer-das-clustering)
  - [Weitere Features fuer Scoring und Diagnose](#6-weitere-features-fuer-scoring-und-diagnose)
- [Clustering-Logik](#clustering-logik)
- [Vom Cluster zum Gebaeudescore](#vom-cluster-zum-gebaeudescore)
- [Punkt-Level-Score](#punkt-level-score)
- [Was wurde zuletzt umgesetzt?](#was-wurde-zuletzt-umgesetzt)
- [Zentrale Zahlen fuer das Meeting](#zentrale-zahlen-fuer-das-meeting)
  - [k2x gegenueber Baseline auf 7 Pflicht-AOIs](#k2x-gegenueber-baseline-auf-7-pflicht-aois)
  - [Cross-Track-Median nach AOI](#cross-track-median-nach-aoi)
  - [Bad Gastein: flach vs. Hang](#bad-gastein-flach-vs-hang)
  - [SNT vs. hochaufloesende TSX/PAZ in Bad Gastein](#snt-vs-hochaufloesende-tsx-paz-in-bad-gastein)
- [GBA-Hoehen und bessere Gebaeudequellen](#gba-hoehen-und-bessere-gebaeudequellen)
- [Wie messen wir Clusterqualitaet?](#wie-messen-wir-clusterqualitaet)
- [Wichtigste bekannte Grenzen](#wichtigste-bekannte-grenzen)
- [Konkrete Verbesserungsoptionen](#konkrete-verbesserungsoptionen)
- [Gute Diskussionsfragen](#gute-diskussionsfragen)
- [Praesentationsfolie: moegliche Kernaussagen](#praesentationsfolie-moegliche-kernaussagen)
- [Quellen im Repo](#quellen-im-repo)
- [Externe Quelle fuer BEV-Daten](#externe-quelle-fuer-bev-daten)

<a id="ziel-fuer-das-meeting"></a>

## Ziel fuer das Meeting

Die Pipeline soll nicht als Blackbox vorgestellt werden, sondern als nachvollziehbarer Workflow:

1. InSAR-Punkte werden Gebaeuden zugeordnet.
2. Pro `Gebaeude x Track` werden lokale Gruppen und Ausreisser erkannt.
3. Pro Track wird ein Hauptcluster bestimmt.
4. Daraus entsteht ein Gebaeude-Rollup mit Bewegung, Status und Zuverlaessigkeit.
5. Die Qualitaet wird ueber Cross-Track, High-Resolution-Vergleiche, Referenzfaelle und Visual-Audits bewertet.

Die wichtigste Botschaft: Der aktuelle Stand ist nicht "fertig", aber methodisch deutlich stabiler als eine einfache Punktaggregation. Die offenen Punkte sind gut eingrenzbar: bessere Gebaeudequellen, robustere Punkt-Gebaeude-Zuordnung, saubereres Ground Truth und feinere HR-Validierung.

<a id="kurzfassung-fuer-den-einstieg"></a>

## Kurzfassung fuer den Einstieg

- Aktuelle Pipeline: `anomaly_local_v1`, produktiver Modellstand `local_hdbscan_rulegate_v2_k2x`.
- Analyseebene: lokal pro `Gebaeude x Track`, nicht global ueber die ganze Stadt.
- Zuordnung: `within` -> `directional_buffer` -> `nearest` als Fallback.
- Clustering: HDBSCAN ab 6 behaltenen Punkten; eigener Small-N-Fallback fuer 3-5 Punkte; `<3` Punkte = `insufficient_support`.
- Gebaeudeergebnis: Main-Cluster je Track, Bewegungsproxy, Cross-Track-Agreement, Reliability Score/Band und Status.
- Phase-7-Ergebnis: k2x reduziert `nearest`-dominierte Main-Cluster ueber 7 Pflicht-AOIs von 151 auf 49 und verbessert den flachen Bad-Gastein-SNT-HR-Vergleich deutlich.
- Groesste offene Schwachstelle: unkartierte Strukturen, die im GBA/OSM fehlen und entlang der Blickrichtung liegen, koennen weiterhin als legitime Dachpunkte ueberleben.
- Datenstrategie: GBA aktuell primaere Quelle, aber Hoehen sind systematisch zu niedrig. Kuenftig GBA nur als Fallback; bevorzugt USM High, wo vorhanden, und fuer Oesterreich BEV DLM-Bauwerke bzw. andere hochwertige nationale Gebaeude-/Hoehenquellen.

<a id="vorschlag-fuer-die-agenda"></a>

## Vorschlag fuer die Agenda

| Block | Inhalt | Ziel |
| --- | --- | --- |
| 1. Viewer-Kontext | Daten, Tracks, Gebaeude, Bad Gastein, ML-Layer | Alle sehen, was im Viewer bereits pruefbar ist |
| 2. Pipeline-Schritte | Assignment, Gates, Clustering, Scoring, Rollup | Gemeinsames Modellverstaendnis |
| 3. Zuordnung/Buffer | Directional Buffer, k2x, bekannte Grenzen | Diskutieren, wie Punkt-Gebaeude-Zuordnung besser wird |
| 4. Features | Aktuelle Features und moegliche Erweiterungen | Welche Signale fehlen noch? |
| 5. Qualitaetsmessung | Scorecards, Cross-Track, HR Bad Gastein, Visual-Audit | Wie wissen wir, ob Aenderungen besser sind? |
| 6. Naechste Schritte | Datenquellen, Ground Truth, Phase-2-Gebaeudescore | Priorisierung nach Nutzen und Risiko |

<a id="pipeline-in-groben-schritten"></a>

## Pipeline in groben Schritten

<a id="1-datenbasis"></a>

### 1. Datenbasis

Die Pipeline arbeitet aktuell auf:

- InSAR-Punkten mit Geschwindigkeit, Beschleunigung, Kohaerenz, Hoehe, Einfallswinkel und Zeitreihe.
- Optionalen Amplituden-Zeitreihen.
- GBA-Gebaeudepolygonen mit Gebaeudehoehe.
- Terrain-Kontext: Slope, Aspect/Exposition, Relief, Hoehenkontext.
- Track-Geometrie: Blickrichtung, Sensor-Bearing, Einfallswinkel.

Relevante Datenmengen:

| Gebiet/Dataset | Punkte | Hinweise |
| --- | ---: | --- |
| Salzburg/SNT | 550,764 | Track 44: 247,388; Track 95: 303,376 |
| Bad Gastein/SNT | 325,583 | Track 22: 78,226; Track 44: 127,384; Track 95: 119,973 |
| Bad Gastein/TSX-PAZ | 800,163 | Track 70: 288,146; Track 93: 512,017 |
| Bad Gastein gesamt | 1,125,746 | 79,262,665 Displacement-Zeilen |
| GBA-Gebaeude | 62,546 | Salzburg 57,489; Bad Gastein 5,057 |

<a id="2-punkt-zu-gebaeude-zuordnung"></a>

### 2. Punkt-zu-Gebaeude-Zuordnung

Pro Punkt wird das beste Gebaeude in dieser Reihenfolge gesucht:

1. `within`: Punkt liegt im Gebaeudepolygon.
2. `directional_buffer`: Punkt liegt in der richtungsabhaengigen Candidate Area.
3. `nearest`: naechstes Gebaeude innerhalb `max_distance_m = 15 m`.

Der Directional Buffer verwendet die InSAR-Geometrie:

```text
range_offset = clamp(
  building_height * tan(incidence_angle) * buffer_multiplier,
  min_buffer_m,
  max_buffer_m
)
```

Default-Parameter:

- `buffer_multiplier = 1.0`
- `min_buffer_m = 3.0`
- `max_buffer_m = 30.0`
- `lateral_slack_m = 2.0`
- `default_height_m = 12.0`
- `max_distance_m = 15.0`

Interpretation: Ein Dachreflektor kann wegen Layover entlang der Blickrichtung versetzt erscheinen. Ein rein kreisfoermiger Buffer waere fachlich zu grob; die Candidate Area ist deshalb richtungs- und hoehenabhaengig.

<a id="3-gate-regeln"></a>

### 3. Gate-Regeln

Bevor geclustert wird, werden harte Ausschluesse gesetzt:

- Kein Gebaeude gefunden: `no_building_assignment`
- Weniger als 24 gueltige Displacement-Epochen
- Weniger als 50 Prozent der erwarteten Track-Epochen
- Niedrige Kohaerenz: `coherence < max(0.45, track_p05)`
- Seit k2x: problematische `nearest`-Punkte werden zusaetzlich demotiert

Wichtig: Demotierte Punkte bleiben sichtbar, tragen aber nicht zu Cluster oder Score bei.

<a id="4-k2x-aktuelle-directional-nearest-hygiene"></a>

### 4. k2x: aktuelle Directional-/Nearest-Hygiene

Seit Phase 7 ist k2x produktiv. Kernidee: `nearest` ist nur ein Fallback und darf nicht ungeprueft den Main-Cluster bestimmen.

Neue Regel:

```text
limit =
  median(abs(cross_look_offset) der within/directional-Anker)
  + 3 * 1.4826 * MAD
  + 3 m Geocoding-Marge
  + sqrt(eff_area)
```

Wenn ein `nearest`-Punkt quer zur Blickrichtung ausserhalb dieser selbstkalibrierten Toleranz liegt, wird er demotiert. Ohne `within`- oder `directional_buffer`-Anker wird `nearest` ebenfalls demotiert, weil es keine geometrische Referenz gibt.

Warum nur Cross-Look? Layover erklaert Versatz laengs der Blickrichtung, aber nicht quer zur Blickrichtung.

<a id="5-features-fuer-das-clustering"></a>

### 5. Features fuer das Clustering

Die HDBSCAN-Matrix enthaelt aktuell sechs Features. Vor dem Clustering werden sie robust skaliert und gewichtet:

| Feature | Gewicht | Bedeutung |
| --- | ---: | --- |
| `along_look_offset_m` | 1.10 | Lage relativ zum Gebaeude entlang der Blickrichtung |
| `cross_look_offset_m` | 1.00 | Quer-Versatz zur Blickrichtung |
| `height_rank_in_building` | 0.75 | relativer Hoehenrang des Punktes am Gebaeude |
| `velocity` | 1.30 | Bewegungsrate in mm/a |
| `acceleration` | 0.90 | nichtlineare Bewegungstendenz |
| `coherence_penalty` | 0.80 | Signalqualitaetsstrafe aus Kohaerenz |

Die Gewichtung zeigt die Modellannahme: Bewegung und Geometrie sind primaer, Signalqualitaet verhindert aber, dass schwache Punkte zu viel Einfluss bekommen.

<a id="6-weitere-features-fuer-scoring-und-diagnose"></a>

### 6. Weitere Features fuer Scoring und Diagnose

Diese Features sind nicht alle Teil der Cluster-Matrix, wirken aber in Gates, Scores, Rollups oder Diagnose:

- Zeitreihe: `ts_slope`, `ts_residual_std`, `ts_max_abs_delta`, `ts_roughness`, `ts_missing_rate`, `ts_primary_step_abs`
- Signal: `velocity_std`, `coherence`, `amp_ts_cv`, `amp_ts_spike_rate`
- Gebaeude/Terrain: `building_height`, `slope_mean_deg`, `slope_max_deg`, `relief_range_m`
- Lokal: `local_density`, `step_support`, `kept_support_ratio`, Assignment-Methode
- Nachbarschaft: Fit zum eigenen Cluster vs. benachbarten Clustern

Vorstellbare naechste Features:

- `height_above_ground_m`: Punkt-Hoehe minus hochwertiges DTM, geoid-/datumskorrigiert.
- Polygon-aware Cross-Look-Excess statt Centroid-Cross-Offset.
- Anti-Layover-Check: Punkte auf der physikalisch falschen Seite der Range-Verschiebung.
- Layover-Reichweiten-Check: implizite Reflektorhoehe gegen plausible Gebaeudehoehe.
- Aspect/Look-vs-Slope: Sichtbarkeit und erwartete Track-Differenz in Hanglagen.
- `h_stdev`, `v_stdev`, `a_stdev`, `s_amp_std`, `s_phs_std`, `eff_area` aus SqueeSAR als Qualitaets-/Unsicherheitsfeatures.
- Amplituden-Konsistenz innerhalb eines Clusters, aber nicht als einfache harte Regel.
- Bessere Gebaeudequelle: USM High oder BEV-DLM statt GBA-Hoehe, GBA nur Fallback.

<a id="clustering-logik"></a>

## Clustering-Logik

### Fall A: weniger als 3 behaltene Punkte

Kein Clustering. Status: `insufficient_support`.

### Fall B: 3-5 behaltene Punkte

Small-N-Fallback. Seit k2x wird nur dann ein Pseudo-Core gebildet, wenn mindestens zwei Punkte velocity-konsistent sind:

```text
abs(v - median(v)) <= max(1 mm/a, 2 * velocity_std)
```

Ohne diese Konsistenz bekommt die Gruppe `weak_support` statt eines kuenstlichen Clusters.

### Fall C: ab 6 behaltenen Punkten

HDBSCAN:

- `min_cluster_size = max(2, min(8, ceil(0.2 * n)))`
- `min_samples = max(1, floor(min_cluster_size / 2))`
- `allow_single_cluster = true`
- `cluster_selection_method = "eom"`

Danach gibt es ein vorsichtiges Borderline-Noise-Reassignment, aber nur bei hinreichender lokaler Naehe, ausreichender Kohaerenz und plausibler Assignment-Distanz.

<a id="vom-cluster-zum-gebaeudescore"></a>

## Vom Cluster zum Gebaeudescore

### 1. Cluster-Rollup

Pro Cluster werden unter anderem berechnet:

- Punktanzahl
- Median-`velocity`
- Median-`vertical_proxy`
- Median-Kohaerenz
- Median-Hoehenrang
- Cluster-Schwerpunkt
- Assignment-Qualitaet
- Cluster-Reliability

Der `vertical_proxy` ist:

```text
vertical_proxy = velocity / cos(incidence_angle)
```

Das ist keine echte 3D-Dekomposition, sondern eine robuste Naeherung fuer Faelle, in denen vertikale Bewegung dominiert.

### 2. Main-Cluster pro Track

Unter den verlaesslichen Core-Clustern wird je Track ein Main-Cluster gewaehlt:

1. Mehr Punkte
2. Hoehere Median-Kohaerenz
3. Hoeherer Median-Hoehenrang
4. Stabile Cluster-ID als Tie-Breaker

### 3. Track-Motion

Die Track-Bewegung ist der Median-`vertical_proxy` des Main-Clusters.

### 4. Cross-Track-Agreement

Fuer 44/95 im produktiven Rollup:

```text
allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg
track_agreement_score = exp(-abs(motion_44 - motion_95) / allowed_diff)
```

Wichtig: In Phase 7 berechnet das Experiment-Harness Cross-Track dataset-agnostisch, also auch fuer TSX/PAZ 93/70. Der produktive Rollup ist historisch noch 44/95-zentriert.

### 5. Building-Motion und Reliability

`building_motion_mm_a` ist aktuell der Mittelwert der vorhandenen Track-Motions. Die Reliability kombiniert:

- 35 Prozent Support
- 25 Prozent Signalqualitaet
- 20 Prozent Assignment-Qualitaet
- 20 Prozent Track-Agreement
- Penalties fuer Single-Track, schwachen Main-Cluster, Noise-Dominanz, Differential Motion und sehr niedriges Agreement

Reliability-Bands:

- `high >= 0.75`
- `medium >= 0.45`
- `low < 0.45`

Building-Status:

- `ok`
- `single_track_only`
- `small_n`
- `noise_dominated`
- `insufficient_support`

<a id="punkt-level-score"></a>

## Punkt-Level-Score

Der Punkt-Score setzt sich aus Anomalie und Qualitaet zusammen:

```text
anomaly_score =
  0.60 * cluster_outlier_score
  + 0.25 * local_deviation_score
  + 0.15 * rule_penalty
```

```text
quality_score =
  0.45 * (1 - anomaly_score)
  + 0.25 * cross_track_component
  + 0.20 * kept_support_ratio
  + 0.10 * signal_quality
```

Labels:

- `normal`: `quality_score >= 0.70`
- `suspect`: `0.40 <= quality_score < 0.70`
- `outlier`: `< 0.40` oder harte Gate-Ausschluesse

<a id="was-wurde-zuletzt-umgesetzt"></a>

## Was wurde zuletzt umgesetzt?

| Thema | Stand | Bedeutung |
| --- | --- | --- |
| Bad Gastein integriert | abgeschlossen, verifiziert 2026-06-05 | Zweiter AOI mit SNT und TSX/PAZ, area-/dataset-aware |
| HDBSCAN hart gemacht | P7-A-W1-T5 | Kein stiller OPTICS-Fallback mehr |
| k2x produktiv | 2026-06-10 | Cross-Look-Demotion fuer `nearest` + striktes Small-N |
| Phase-7-Harness | abgeschlossen | No-op punktidentisch zu Baselines; Varianten scorecard-basiert vergleichbar |
| Visual-Audit-Workflow | v2 seit 2026-06-12 | Pflicht: Survivors-Pass, Punkt-Codes, Footprints, Luftbild/3D-Pruefung |
| Bad-Gastein-Amplituden | Daten geladen fuer SNT 44/95 | Re-Baseline der BG-AOIs noch offen |
| Run-Transparenz/UI | umgesetzt | Runs zeigen Version, BBox, Parameter, Experiment-Konfiguration |

<a id="zentrale-zahlen-fuer-das-meeting"></a>

## Zentrale Zahlen fuer das Meeting

<a id="k2x-gegenueber-baseline-auf-7-pflicht-aois"></a>

### k2x gegenueber Baseline auf 7 Pflicht-AOIs

| Kennzahl | Baseline | k2x | Interpretation |
| --- | ---: | ---: | --- |
| Kept Points | 15,146 | 13,681 | Strengere Assignment-Hygiene reduziert Score-Beitrag |
| gewichtete Noise-Rate | 32.7 Prozent | 32.0 Prozent | keine kosmetische Noise-Optimierung |
| `nearest`-dominierte Main-Cluster | 151 | 49 | ca. 68 Prozent weniger problematische Hauptcluster |
| Multi-Cluster-Gebaeude | 312 | 270 | weniger kontaminierte Gruppen, robuste Multi-Cluster bleiben erhalten |
| `ok`-Gebaeude | 275/539 | 242/539 | mehr Ehrlichkeit, weniger fragwuerdige "ok"-Aussagen |
| `insufficient_support` | 105/539 | 150/539 | bewusst konservativer, wenn Support fehlt |
| Konfidenz stabil | 316/824 | 311/763 | stabiler Anteil steigt leicht: 38.3 -> 40.8 Prozent |
| stabil oder monitor | 582/824 | 550/763 | 70.6 -> 72.1 Prozent |

Praesentationssatz: k2x macht die Pipeline nicht einfach "optimistischer", sondern ehrlicher. Es reduziert stark die Faelle, in denen `nearest`-Punkte den Main-Cluster dominieren, und nimmt dafuer mehr `insufficient_support` in Kauf.

<a id="cross-track-median-nach-aoi"></a>

### Cross-Track-Median nach AOI

| AOI | Rolle | Baseline | k2x | Lesart |
| --- | --- | ---: | ---: | --- |
| Mirabell/SNT | flacher Kontrollbereich | 0.6497 | 0.6499 | stabil |
| Moosstrasse/SNT | gemischte Strukturen | 0.4395 | 0.4383 | praktisch stabil, aber weniger `nearest`-Mains |
| Osthang/SNT | Salzburg-Hangstress | 0.8497 | 0.8179 | leicht niedriger, aber bekannte Stressfaelle bleiben sichtbar |
| Bad Gastein flat/SNT | flacher HR-Vergleich | 0.5619 | 0.6646 | deutliche Verbesserung |
| Bad Gastein slope/SNT | Hangstress | 0.1871 | 0.1646 | sehr niedrig, als Hang-/LOS-Stress zu lesen |
| Bad Gastein flat/TSX | HR flach | 0.5267 | 0.5091 | leicht niedriger, HR-Struktur bleibt stark |
| Bad Gastein slope/TSX | HR Hangstress | 0.0856 | 0.0858 | extrem niedriger Hangstress |

<a id="bad-gastein-flach-vs-hang"></a>

### Bad Gastein: flach vs. Hang

| Kennzahl | bg_flat_01 | bg_slope_01 |
| --- | ---: | ---: |
| mittlere Slope | 2.8 Grad | 19.8 Grad |
| maximale Slope | 7.5 Grad | 31.5 Grad |
| SNT-Punkte im AOI | 1,195 | 717 |
| TSX/PAZ-Punkte im AOI | 6,750 | 4,209 |
| k2x Cross-Track SNT | 0.6646 | 0.1646 |
| k2x Cross-Track TSX/PAZ | 0.5091 | 0.0858 |

Interpretation: Im flachen Bad-Gastein-AOI passt die Struktur deutlich besser zusammen. Im Hang-AOI sind die niedrigen Werte kein einfacher Pipeline-Fehler, sondern ein erwartbares Stresssignal durch Blickrichtung, Hangbewegung, Layover/Foreshortening und unterschiedliche Track-Geometrien.

<a id="snt-vs-hochaufloesende-tsx-paz-in-bad-gastein"></a>

### SNT vs. hochaufloesende TSX/PAZ in Bad Gastein

Auf `bg_flat_01` wurde TSX/PAZ als High-Resolution-Pseudo-Referenz genutzt:

- k2x: 64 gekoppelte Gebaeude SNT/TSX.
- Davon 54 mit Match-Evaluation.
- `hr_main_region_match_rate = 1.000`, also 54/54 evaluierten Gebaeuden mit passender Hauptregion.
- Zeitliche Ueberlappung SNT vs. TSX/PAZ: 232 Tage. Bewegungsvergleich daher nur qualitativ, nicht als harte Wahrheit.

Wichtig fuer die Diskussion: Die HR-Metrik auf Gebaeudeebene saettigt inzwischen. Fuer die naechste Phase braucht es feinere Patch-/Cluster-Metriken, z. B. TSX-Clusterzentren gegen SNT-Cluster-Footprints.

<a id="gba-hoehen-und-bessere-gebaeudequellen"></a>

## GBA-Hoehen und bessere Gebaeudequellen

### Aktueller Stand

GBA wird aktuell fuer die Pipeline genutzt, weil es global verfuegbar ist und fuer Bad Gastein bereits automatisiert geladen wurde. Es ist aber bei der Hoehe problematisch.

Audit-Ergebnisse:

| Gebiet | GBA-Gebaeude | Median-Hoehe | p90 | p99 | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Salzburg | 57,489 | 4.49 m | 7.65 m | 12.53 m | 30.38 m |
| Bad Gastein | 5,057 | 3.22 m | 6.47 m | 11.93 m | 17.75 m |

Vergleich Salzburg mit oeffentlichen OSM-Hoehen:

- 7,593 GBA/OSM-Footprint-Matches.
- 673 davon mit numerischem OSM-Height-Tag.
- Median `GBA / OSM-height = 0.735`, also ca. 27 Prozent Unterschaetzung.
- Hohe Gebaeude saettigen stark, z. B. Salzburger Dom 78.0 m in OSM vs. 27.4 m in GBA.

Aber: Hoehenkorrektur allein loest die Assignment-Probleme nicht. Im Mirabell-Test wuerde `height / 0.735` nur 10/210 `nearest`-Punkte in Track 44 und 14/207 in Track 95 in die Candidate Area holen, also nur ca. 5-7 Prozent. Dominant sind Quer-Versatz, Geokodierungsstreuung und Fremdobjekte.

### Vorgeschlagene Datenstrategie

Prioritaet der Gebaeudequellen:

1. Hochwertige lokale/nationale Gebaeudequelle mit Footprint und Hoehenattributen, z. B. USM High, falls verfuegbar.
2. Fuer Oesterreich: BEV DLM-Bauwerke als Kandidat fuer Flaechen- und Hoehenattribute.
3. OSM als Validierungs- und Zusatzquelle, nicht als alleiniger Ersatz.
4. GBA als globaler Fallback.
5. Default-Hoehe nur, wenn keine Quelle belastbar ist.

BEV-Hinweis: Das BEV beschreibt DLM-Bauwerke als oesterreichweiten Vektordatensatz mit mehreren Hoeheninformationen, GPKG-Abgabe und 2.5D/LoD-1-Darstellung. Das passt fachlich gut zu unserem Bedarf, muss aber technisch noch auf Schema, Lizenz, Aktualitaet, CRS/Hoehenbezug und Matching gegen InSAR/GBA geprueft werden.

Technisch sinnvoll waere ein normalisiertes Gebaeudeschema:

- `footprint_source`
- `height_source`
- `height_mean_m`
- `height_max_m`
- `height_min_or_ground_m`
- `height_quality`
- `source_date`
- `positional_accuracy`
- `source_priority`

Damit kann die Pipeline nicht nur eine Hoehe verwenden, sondern auch wissen, wie belastbar sie ist.

<a id="wie-messen-wir-clusterqualitaet"></a>

## Wie messen wir Clusterqualitaet?

Es gibt keine echte Ground Truth fuer alle Gebaeude. Deshalb sollte Qualitaet mehrschichtig gemessen werden.

### Aktuelle Evaluationsschichten

1. Cross-Track-Konsistenz: ASC/DSC sollten in flachen, vertikal dominierten Situationen aehnlich sein.
2. HR-Pseudo-Referenz: Bad Gastein SNT gegen TSX/PAZ, primaer raeumlich-strukturell.
3. Referenzfaelle: dokumentierte schwierige Gebaeude mit erwarteten Status-/Rollenmustern.
4. Visual-Audit: Nadir-Luftbild, Footprints, Punktcodes, Kandidat vs. Baseline.
5. Survivors-Pass: nicht nur entfernte Punkte pruefen, sondern auch alle ueberlebenden score-relevanten Off-Footprint-Punkte.
6. Konfidenz/Stabilitaet: Jitter, Leave-one-out, Bootstrap fuer groessere Gruppen.
7. Guardrails: weniger Noise allein zaehlt nicht als Verbesserung, wenn Cross-Track oder Referenzfaelle schlechter werden.

### Was man nicht ueberbewerten sollte

- Silhouette, Davies-Bouldin und aehnliche interne Cluster-Metriken messen Form im Feature-Raum, aber nicht fachliche Wahrheit.
- Cross-Track ist kein Ground Truth in Hanglagen, weil horizontale Bewegungsanteile und LOS-Geometrie stark wirken koennen.
- TSX/PAZ ist hochaufloesender, aber hat andere Sensor-/Zeit-/Referenzpunktbedingungen. Es ist eine Pseudo-Referenz, keine absolute Wahrheit.

<a id="wichtigste-bekannte-grenzen"></a>

## Wichtigste bekannte Grenzen

### 1. Unkartierte Strukturen

Fall 96959851 zeigt die wichtigste neue Fehlerklasse: Ein unkartiertes Nebengebaeude mit Blechdach fehlt in GBA und OSM. Einige Punkte ueberleben unter k2x, weil die Struktur entlang der Blickrichtung liegt. Die Cross-Look-Regel ist dort blind.

Konsequenz:

- k2x loest Quer-Versatz-Faelle, aber nicht alle Along-Look-/Hoehen-Faelle.
- Naechste Checks muessen kartierungsfrei sein: Anti-Layover, Layover-Reichweite, Hoehenprofil.
- Visual-Audit muss immer einen Survivors-Pass enthalten.

### 2. Centroid-basierter Cross-Look

Aktuell wird der Quer-Versatz zum Gebaeudezentroid verwendet. Bei langen oder unregelmaessigen Gebaeuden kann das zu falschen Demotions fuehren.

Verbesserung: polygon-aware Cross-Look-Excess:

1. Gebaeudepolygon auf Cross-Look-Achse projizieren.
2. Punkt auf dieselbe Achse projizieren.
3. Nur den Abstand ausserhalb der Polygonspanne als `cross_excess_m` werten.
4. Rohes Centroid-Offset nur noch als Diagnosefeature.

### 3. Hoehen und Terrain

GBA-Hoehen sind als absolute Gebaeudehoehen zu ungenau. SRTM ist fuer gebaeudescharfe Hoeheninterpretation zu grob und als DSM nicht ideal fuer Dach-vs.-Boden-Fragen.

Naechste Richtung:

- Hochwertige Gebaeudehoehen einbinden.
- Hochaufloesendes DTM/DSM/nDSM pruefen.
- Vertikaldatum sauber harmonisieren.
- `height_above_ground_m` nicht als harte Wahrheit, sondern als Plausibilitaetsfeature nutzen.

### 4. Ground Truth fehlt

Die Pipeline ist unsupervised. Fuer eine belastbare Bewertung brauchen wir Expertenlabels:

- 50-100 Gebaeude mit verschiedenen Schwierigkeitstypen.
- Welche Punkte gehoeren zum Gebaeude?
- Welche Punkte sind Fremdstruktur/Outlier?
- Welche Cluster sind fachlich plausibel?
- Welcher Gebaeudestatus ist korrekt?

<a id="konkrete-verbesserungsoptionen"></a>

## Konkrete Verbesserungsoptionen

### Kurzfristig

- Bad-Gastein-AOIs nach Amplitudenintegration neu baselinen.
- k2x-Zahlen im Viewer mit aktuellen Runs demonstrieren.
- Demotierte `nearest`-Punkte in der Karte staerker kennzeichnen.
- Survivors-Scan fuer weitere Referenzfaelle ausfuehren.
- 96959851 und 96637447 als Pflicht-Gegenbeispiele fuer jede neue Assignment-Politik verwenden.

### Naechste Mini-Phase

- Polygon-aware Cross-Look-Excess implementieren.
- Anti-Layover-Check testen.
- Layover-Reichweiten-Check mit plausibler Hoehe testen.
- Komposit `k2xh = k2x + Hoehenprofil` im Harness pruefen.
- HR-Pseudo-Referenz auf Cluster-/Patch-Ebene verfeinern.

### Phase 2

- Gebaeude-Score formal definieren: "Gebaeude X bewegt sich mit Y mm/a, Konfidenz Z".
- Robuste Track-Aggregation: Median, gewichteter Mittelwert, Bootstrap-Konfidenzintervall.
- 2D-Dekomposition pruefen, wo beide Geometrien ausreichend Support haben.
- Differential Motion als eigenes Gebaeudesignal ausbauen.
- Experten-Ground-Truth einholen und Precision/Recall/F1 fuer Outlier/Assignment berechnen.

### Datenquellen

- GBA nur noch als globaler Fallback.
- BEV DLM-Bauwerke fuer Oesterreich technisch evaluieren.
- USM High, falls verfuegbar, als bevorzugte hochwertige Gebaeudequelle pruefen.
- OSM als Validierung und Zusatzquelle nutzen.
- Gebaeudequellen in einem normalisierten, priorisierten Schema zusammenfuehren.

<a id="gute-diskussionsfragen"></a>

## Gute Diskussionsfragen

- Welche Aussage soll ein Gebaeude-Score genau liefern: Bewegung des Hauptdachs, schlechtester Gebaeudeteil oder differenzielle Bewegung?
- Wann ist ein Single-Track-Ergebnis fuer Nutzer noch hilfreich?
- Soll die Pipeline lieber konservativ `insufficient_support` sagen oder mehr `ok`-Aussagen mit niedriger Konfidenz liefern?
- Welche Gebaeudequellen sind fuer Salzburg/Oesterreich realistisch verfuegbar und lizenzseitig nutzbar?
- Wer kann 50-100 Referenzgebaeude fachlich labeln?
- Welche Bad-Gastein-Faelle sollen als Standard-Benchmark in jede kuenftige Iteration?
- Welche Fehler sind schlimmer: echte Gebaeudepunkte zu verlieren oder Fremdstrukturpunkte im Score zu behalten?

<a id="praesentationsfolie-moegliche-kernaussagen"></a>

## Praesentationsfolie: moegliche Kernaussagen

1. Wir sind von einer globalen Punkt-Anomalie zu einer lokalen Gebaeude-x-Track-Analyse gegangen.
2. Directional Buffer bildet SAR-Geometrie besser ab als ein Kreisbuffer.
3. k2x reduziert `nearest`-dominierte Main-Cluster um ca. 68 Prozent ueber die Pflicht-AOIs.
4. Bad-Gastein flat zeigt gute SNT/TSX-Strukturuebereinstimmung; Hangbereiche bleiben bewusst als Stressfaelle sichtbar.
5. GBA-Hoehen sind nuetzlich als Fallback, aber als primaere Hoehenquelle zu schwach.
6. Die naechste Qualitaetsstufe ist nicht nur ein anderer Clusteralgorithmus, sondern bessere Assignment-Hygiene plus bessere Gebaeude-/Hoehendaten plus Expertenlabels.

<a id="quellen-im-repo"></a>

## Quellen im Repo

- Methodik: `docs/pipelines/anomaly_local_v1/methodik.md`
- Runbook: `docs/pipelines/anomaly_local_v1/runbook.md`
- Phase-7-Report: `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Phase-7-Plan: `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_plan.md`
- Naechste Schritte: `docs/pipelines/anomaly_local_v1/next_steps.md`
- k2x-Scorecard: `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_k2x.md`
- Shortlist-Scorecard: `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard_shortlist.md`
- GBA-Hoehen-Audit: `docs/pipelines/anomaly_local_v1/artifacts/phase7_gba_height_audit.md`
- Bad-Gastein-Verifikation: `docs/bad_gastein_integration_verification.md`
- Visual-Audit v2: `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`
- Survivors-Scan: `docs/pipelines/anomaly_local_v1/artifacts/phase7_survivors_scan_s6.md`
- Amplituden-Recon: `docs/pipelines/anomaly_local_v1/artifacts/phase7_amplitude_recon.md`
- Pipeline-Code: `backend/app/ml/pipelines/anomaly_local_v1.py`
- Track-Geometrie: `backend/app/ml/track_geometry.py`

<a id="externe-quelle-fuer-bev-daten"></a>

## Externe Quelle fuer BEV-Daten

- BEV DLM-Bauwerke: https://www.bev.gv.at/Services/Produkte/Digitales-Landschaftsmodell/Bauwerke.html
