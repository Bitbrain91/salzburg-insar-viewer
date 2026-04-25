# `anomaly_local_v1` Neighbourhood Design

Stand: 2026-04-25
Status: green

## Zweck

Dieses Dokument friert den `P3`-Nachbarschaftspass fuer `anomaly_local_v1` ein.
Ergaenzt wird ein rein additiver zweiter Pass nach dem bestehenden `P2R`-Rollup.

Der Pass trennt zwei Faelle formal:

1. Punkt-Fehlzuordnung auf ein Nachbargebaeude
2. echtes Nachbarschafts-Event ueber mehrere nahe Gebaeude

`P3` liest die eingefrorenen `P2R`-Ergebnisse, veraendert sie aber nicht rueckwirkend.

## Verbindliche Basis

- Quelle bleibt `gba`.
- Nachbarschaft wird nur innerhalb desselben Runs berechnet.
- Punkt-zu-Nachbarcluster-Fit bleibt track-lokal.
- Building-Level-Event darf Track `44` und `95` zusammenfassen, wenn dieselbe
  Gebaeude-Nachbarschaft auf mindestens einem Track konsistent stuetzt.
- Verbindliche Referenz-Runs aus `P2R`:
  - Mirabell: `33fb1821-3264-4fdd-8d5e-881222eb2ae7`
  - Moosstrasse: `44b88a21-427d-4921-bcd0-ef9c6327fcab`
  - Osthang-Stressbereich: `9c4bc346-529e-4ede-81bf-26ed651905b1`

Verfuegbare Input-Bloecke aus dem aktuellen Pipeline-Stand:

- Punkt-Features und Flags nach Gates und Clustering
- `cluster_rollup`
- `building_rollup`
- `cross_track_summary`
- GBA-Gebaeudezentroide in UTM (`EPSG:32633`) aus der bestehenden
  Punkt-/Gebaeude-Zuordnung

## Nachbarschaftsdefinition

### Kandidatensuche

Ein Nachbargebaeude ist fuer `P3-v1` ein anderes `gba`-Gebaeude im selben Run mit:

- Zentroid-Distanz `<= 25 m` in `EPSG:32633`
- Zentroid aus `gba_buildings`; nur wenn dieser im Record fehlt, wird als Fallback der
  Median der zugeordneten Punktkoordinaten verwendet
- Ranking nach:
  1. Zentroid-Distanz
  2. `building_id`
- maximal `8` unterschiedliche Nachbargebaeude pro Zielgebaeude

Die Kandidatensuche ist gebaeudelokal. Ein Punkt erbt nur Kandidaten aus dem Nachbarschaftsset
seines aktuell zugeordneten Gebaeudes.

Begruendung: der `P3-v1`-Pass laeuft bewusst in-process nach dem eingefrorenen
Building-/Cluster-Rollup und fuehrt keinen neuen Geometry-Join ein. Damit bleibt der Pass
additiv, reproduzierbar aus den vorhandenen Record-Feldern und ohne neue Tabellen. Eine
Polygon-zu-Polygon-Nachbarschaft kann spaeter als eigene, neu zu verifizierende Erweiterung
eingefuehrt werden.

### Eligible Neighbour Clusters

Ein Nachbarcluster ist nur dann eligible, wenn alle Bedingungen gelten:

- `cluster_role = core`
- `point_count >= 2`
- `cluster_reliability_score` ist gesetzt
- Cluster gehoert zu einem der `<= 8` Kandidatengebaeude

Zusaetzliche Track-Regel:

- fuer Punkt-Fehlzuordnung nur gleicher Track wie der Punkt
- fuer Building-Level-Event zuerst track-lokale Pruefung, danach optionale Aggregation ueber
  beide Tracks

### Eigener Referenzcluster

Fuer `own_cluster_fit_score` gilt folgende Prioritaet:

1. eigener `core`-Cluster des Punkts
2. eingefrorener `main_cluster` des eigenen Gebaeudes auf demselben Track
3. kein eigener Referenzcluster (`own_cluster_fit_score = null`, `own_fit_weak_flag = true`)

Es gibt in `P3` keine Umbuchung von `building_id` oder `cluster_id`.

## Formale Trennung der Diagnosen

| Aspekt | Fehlzuordnung | Neighbourhood-Event |
| --- | --- | --- |
| Einheit | Punkt | Gebaeude |
| Vergleich | eigener Referenzcluster vs. bester Nachbarcluster | eigenes Hauptsignal vs. mehrere Nachbargebaeude |
| Track-Regel | immer gleicher Track | zuerst gleicher Track, danach Gebaeudeaggregation |
| Mindestsupport | ein besserer Nachbarcluster | mindestens `2` unterschiedliche Nachbargebaeude |
| Wirkung | nur Diagnose am Punkt + Aggregatzaehler | additive Gebaeudediagnose |
| Nicht erlaubt | Reassignment | Rueckkopplung in `main_cluster`/Reliability |

Ein Punkt darf `neighbour_misassignment_flag=true` tragen, ohne dass dasselbe Gebaeude ein
`neighbour_event_flag=true` erhaelt. Umgekehrt darf ein Gebaeude ein Event tragen, obwohl kein
einzelner Punkt als Fehlzuordnung markiert wird.

## Diagnose A: Punkt-Fehlzuordnung

### Auswertemenge

Die Fehlzuordnungsdiagnose laeuft nur fuer Punkte mit:

- `building_id` gesetzt
- `gate_excluded = false`
- mindestens einem eligible neighbour cluster auf demselben Track

### Fit-Definition

Der Punkt-zu-Cluster-Fit verwendet nur bereits vorhandene oder direkt aus ihnen ableitbare
Groessen:

- `vertical_proxy_mm_a`
- `along_look_offset_m`
- `cross_look_offset_m`
- `height_rank_in_building`
- `ts_primary_step_abs`

Pro Zielcluster werden robuste Cluster-Mitten und MAD-basierte Skalen aus den zugehoerigen
Punkten gebildet. Verwendete Untergrenzen fuer die Skalen:

- Bewegung: `0.75 mm/a`
- `along_look_offset_m`: `0.5 m`
- `cross_look_offset_m`: `0.5 m`
- `height_rank_in_building`: `0.10`
- `ts_primary_step_abs`: `0.75 mm`

Der Kostenwert ist eingefroren als:

```text
fit_cost =
  0.40 * motion_z
  + 0.20 * along_z
  + 0.15 * cross_z
  + 0.10 * height_z
  + 0.15 * step_z
```

Der Scorespace ist eingefroren als:

```text
fit_score = exp(-fit_cost) * (0.70 + 0.30 * cluster_reliability_score)
```

`fit_score` wird auf `[0.0, 1.0]` begrenzt. Hoeher ist besser.

### Flag-Regel

`neighbour_misassignment_flag=true`, wenn alle Bedingungen gelten:

- bester eligible neighbour cluster gehoert zu einem anderen Gebaeude
- `neighbour_fit_score >= 0.60`
- `own_fit_weak_flag = true` oder `own_cluster_fit_score < 0.45`
- `neighbour_fit_delta = neighbour_fit_score - own_cluster_fit_score >= 0.15`
  - falls kein eigener Referenzcluster existiert, wird `own_cluster_fit_score` fuer das Delta
    als `0.0` behandelt

`assignment_method` bleibt vorhandener Kontext aus `building_context`, ist aber in `P3-v1` kein
zusaetzliches hartes Gate. Das vermeidet, dass echte Within-Polygon-Grenzfaelle still
unterdrueckt werden.

## Diagnose B: Neighbourhood-Event

### Track-lokaler Support

Das Building-Level-Event wird konservativ am eingefrorenen `main_cluster` pro Track verankert.
Sekundaere Cluster duerfen cluster-lokale Diagnosen erhalten, setzen aber in `P3-v1` kein
Building-Level-Event selbststaendig nach oben fort.

Fuer einen Track unterstuetzt ein Nachbargebaeude das Signal nur dann, wenn sein bester eligible
cluster auf demselben Track:

- dieselbe Bewegungsrichtung hat wie der eigene `main_cluster`
- einen paarweisen Konsistenzscore `>= 0.60` erreicht

Der paarweise Konsistenzscore ist eingefroren als:

```text
motion_threshold_mm_a =
  max(1.5, 0.20 * max(abs(own_motion_mm_a), abs(neighbour_motion_mm_a), 1.0))

pair_consistency_score =
  exp(-abs(own_motion_mm_a - neighbour_motion_mm_a) / motion_threshold_mm_a)
  * sqrt(own_cluster_reliability_score * neighbour_cluster_reliability_score)
```

Bei unterschiedlichem Bewegungszeichen ist `pair_consistency_score = 0.0`.

### Gebaeudeaggregation

Auf Building-Level wird pro Nachbargebaeude nur der beste Track-/Cluster-Beitrag gezaehlt.
Ein Gebaeude zaehlt also hoechstens einmal, auch wenn beide Tracks stuetzen.

Eingefrorene Aggregation:

```text
supporting_neighbour_count = Anzahl unterschiedlicher Nachbargebaeude mit pair_consistency_score >= 0.60
supporting_track_count = Anzahl unterschiedlicher Tracks, aus denen mindestens ein Support kommt
neighbour_consistency_score = Mittelwert der besten Support-Scores aller stuetzenden Nachbargebaeude
neighbour_event_score = neighbour_consistency_score * min(supporting_neighbour_count / 2.0, 1.0)
```

`neighbour_event_flag=true`, wenn alle Bedingungen gelten:

- `supporting_neighbour_count >= 2`
- `neighbour_event_score >= 0.60`
- `neighbour_misassignment_share < 0.50`

Punkt-Level-Fehlzuordnungen liefern kein eigenes positives Event-Evidenzsignal; auf
Building-Level begrenzt `neighbour_misassignment_share < 0.50` die Event-Markierung.
Die Punktfelder `neighbour_event_score`, `neighbour_event_flag` und
`supporting_neighbour_count` spiegeln den finalen Building-Level-Entscheid nur auf den Punkt
zurueck, damit Inspector und Detail-API dieselbe Diagnose sehen.

## Datenvertrag

`P3` fuegt keine neue Tabelle hinzu. Alles bleibt additive Erweiterung im bestehenden
`ml_point_results.meta`-Payload.

### Punkt-Level in `meta.neighbour_context`

| Feld | Typ | Semantik |
| --- | --- | --- |
| `context_available` | `bool` | `true`, wenn fuer den Punkt mindestens ein eligible neighbour cluster auf gleichem Track existiert |
| `candidate_neighbour_count` | `int` | Anzahl der Nachbargebaeude im gefrorenen Radius-Set des eigenen Gebaeudes |
| `eligible_neighbour_cluster_count` | `int` | Anzahl eligible neighbour clusters auf dem Punkt-Track |
| `best_neighbour_building_id` | `str \| null` | Building-ID des besten Nachbarclusters |
| `best_neighbour_cluster_id` | `str \| null` | Cluster-ID des besten Nachbarclusters |
| `own_cluster_fit_score` | `float \| null` | Fit zum eigenen Referenzcluster |
| `neighbour_fit_score` | `float \| null` | Fit zum besten eligible neighbour cluster |
| `neighbour_fit_delta` | `float \| null` | `neighbour_fit_score - own_cluster_fit_score` |
| `own_fit_weak_flag` | `bool` | `true`, wenn der eigene Fit fehlt oder unter `0.45` liegt |
| `neighbour_misassignment_flag` | `bool` | Punktdiagnose fuer moegliche Fehlzuordnung |
| `neighbour_event_score` | `float \| null` | Rueckgespiegelter Building-Level-Eventscore |
| `neighbour_event_flag` | `bool` | Rueckgespiegeltes Building-Level-Eventflag |
| `supporting_neighbour_count` | `int` | Rueckgespiegelte Anzahl stuetzender Nachbargebaeude |

Null-Semantik:

- Scores sind `null`, wenn `context_available=false`.
- Flags fallen auf `false`, Zaehler auf `0`.

### Cluster-Level als Erweiterung von `meta.cluster_rollup`

| Feld | Typ | Semantik |
| --- | --- | --- |
| `cluster_centroid_x_m` | `float \| null` | UTM-X des eigenen Clusters |
| `cluster_centroid_y_m` | `float \| null` | UTM-Y des eigenen Clusters |
| `neighbour_candidate_building_count` | `int` | Anzahl Kandidatengebaeude fuer dieses Cluster |
| `best_neighbour_building_id` | `str \| null` | staerkster cluster-lokaler Nachbar |
| `best_neighbour_cluster_id` | `str \| null` | staerkster cluster-lokaler Nachbarcluster |
| `best_neighbour_consistency_score` | `float \| null` | bester paarweiser Konsistenzscore |
| `supporting_neighbour_building_count` | `int` | Anzahl Nachbargebaeude mit cluster-lokalem Support |
| `neighbour_event_candidate_flag` | `bool` | `true`, wenn dieses Cluster cluster-lokal mindestens `2` unterschiedliche Nachbargebaeude stuetzen |

Regel:

- Fuer nicht-`core`-Cluster bleiben die neuen Cluster-Felder `null` oder `false`.
- Building-Level-Event nimmt in `P3-v1` nur `main_cluster`-Signale hoch, nicht sekundaere
  Cluster-Kandidaten.

### Building-Level als Erweiterung von `meta.building_rollup`

| Feld | Typ | Semantik |
| --- | --- | --- |
| `neighbour_context_available` | `bool` | `true`, wenn mindestens ein eligible neighbour cluster in der Building-Nachbarschaft existiert |
| `neighbour_candidate_building_count` | `int` | Anzahl der bis zu `8` betrachteten Nachbargebaeude |
| `neighbour_misassignment_point_count` | `int` | Anzahl Punkte mit `neighbour_misassignment_flag=true` |
| `neighbour_misassignment_share` | `float \| null` | Anteil der misassignment-markierten Punkte an allen nicht `gate_excluded` Punkten |
| `neighbour_event_flag` | `bool` | finale Gebaeudediagnose fuer ein lokales Nachbarschafts-Event |
| `neighbour_event_score` | `float \| null` | finaler Gebaeude-Eventscore |
| `neighbour_consistency_score` | `float \| null` | Mittelwert der besten Scores aller stuetzenden Nachbargebaeude |
| `supporting_neighbour_count` | `int` | Anzahl unterschiedlicher stuetzender Nachbargebaeude |
| `supporting_track_count` | `int` | Anzahl unterschiedlicher Tracks mit mindestens einem Support-Beitrag |

## Zirkularitaetsgrenzen

`P3` ist strikt nachgelagert. Explizit erlaubt ist nur:

- Lesen von Punkt-Features und bestehenden `P2R`-Rollups
- Lesen der vorhandenen GBA-Zentroide bzw. Punkt-Median-Fallbacks fuer Distanzbildung
- additive Berechnung neuer `neighbour_*`-Felder

Explizit nicht erlaubt in `P3-v1`:

- Aenderung von `building_id`, `cluster_id`, `cluster_role`, `cluster_rank`
- Rueckkopplung in Gates, HDBSCAN/OPTICS, `anomaly_score`, `quality_score` oder Label
- Aenderung von `main_cluster`
- Aenderung von `differential_motion_flag`
- Aenderung von `building_reliability_score` oder `building_reliability_band`
- Aenderung von `track_agreement_score`
- Einfuehrung von Terrain-/Aspect-Logik aus `P4`

Interpretationsgrenze:

- geringe Cross-Track-Uebereinstimmung, hohe Hangneigung oder Relief sind in `P3` kein
  positives Event-Evidenzsignal
- solche Faelle duerfen hoechstens zurueckhaltender bewertet oder spaeter in `P4` erklaert
  werden

## Verifikationsstrategie

Verbindliche Reihenfolge bleibt gemaess Runbook:

1. Mirabell
2. Moosstrasse
3. Osthang-Stressbereich

Jede spaetere `P3`-Implementierung muss fuer die drei Pflicht-Runs mindestens folgende Checks
dokumentieren.

### Mirabell (`33fb1821-3264-4fdd-8d5e-881222eb2ae7`)

Ziel: flacher Kontrollbereich, daher konservativer Null- oder Fast-Null-Fall fuer echte
Neighbourhood-Events.

Pflichtchecks:

- `neighbour_event_flag=true` darf nur in klar begruendeten Ausnahmefaellen auftreten; ein
  leerer Event-Satz ist hier fachlich akzeptabel und sogar erwartbar.
- Mindestens ein stabiler Referenzbau ohne Nachbarschaftsdiagnose wird dokumentiert.
- Mindestens ein dichter Blockrand-/Innenhof-Fall wird auf moegliche Fehlzuordnung geprueft.
- Falls Misassignment-Punkte auftreten, muessen sie mit schwachem eigenem Fit und besserem
  Nachbarfit erklaert werden; ein blosses `candidate_neighbour_count > 0` reicht nicht.

### Moosstrasse (`44b88a21-427d-4921-bcd0-ef9c6327fcab`)

Ziel: gemischte Gebaeudestrukturen, hier muss die Trennung von Fehlzuordnung und Event
praktisch sichtbar werden.

Pflichtchecks:

- Mindestens ein Gebaeude mit Punkt-Fehlzuordnungsdiagnose wird dokumentiert oder die
  Abwesenheit solcher Faelle wird begruendet.
- Mindestens ein Event-Kandidat mit `supporting_neighbour_count >= 2` wird dokumentiert oder
  die Abwesenheit wird begruendet.
- Es muss mindestens ein Fall gezeigt werden, in dem Misassignment und Event nicht dasselbe
  Ergebnis liefern.
- Bei Event-Kandidaten muessen die stuetzenden Nachbargebaeude explizit verschieden sein; zwei
  Cluster desselben Nachbargebaeudes zaehlen nicht doppelt.

### Osthang-Stressbereich (`9c4bc346-529e-4ede-81bf-26ed651905b1`)

Ziel: Stress-Check unter Hang- und Reliefbedingungen, ohne `P4`-Terrainlogik vorzuziehen.

Pflichtchecks:

- Die `P2R`-Referenzsignale `main_cluster`, `differential_motion_flag` und
  `building_reliability_score` bleiben gegenueber dem eingefrorenen Stand unveraendert.
- Mindestens ein steiler und ein Multi-Cluster-Fall werden manuell gesichtet.
- Niedrige `track_agreement_score` oder `agreement_tension_flag=true` duerfen nicht allein zu
  `neighbour_event_flag=true` fuehren.
- Falls ein Event im Osthang gesetzt wird, muessen mindestens `2` unterschiedliche
  Nachbargebaeude stuetzen; ein einzelnes hangparalleles Band oder ein einzelner Nachbar reicht
  explizit nicht.

## Abnahmekriterium fuer `P3-W1-T1`

`P3-W1-T1` ist abgeschlossen, wenn:

- Radius, Obergrenze und Eligible-Regeln eingefroren sind
- Fehlzuordnung und Event mit festen Schwellen getrennt dokumentiert sind
- Punkt-, Cluster- und Building-Feldpfade feststehen
- Zirkularitaetsgrenzen explizit notiert sind
- Mirabell, Moosstrasse und Osthang mit konkreten Pflichtchecks beschrieben sind
