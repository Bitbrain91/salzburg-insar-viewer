# `anomaly_local_v1` Phase-2 Decision Log

Stand: 2026-04-22
Status: Phase 0 / `P0-W2`

## Zweck

Dieses Dokument friert die minimalen V1-Entscheidungen fuer `P1` ein, damit Pipeline, API, Tiles und UI gegen denselben Vertrag arbeiten.

## Entscheidungsuebersicht

| ID | Thema | Entscheidung |
| --- | --- | --- |
| D1 | Persistenzrichtung | `P1` bleibt derive-first auf Basis von `ml_point_results`; keine neuen Ergebnis-Tabellen erzwingen. |
| D2 | Clustervertrag | `P1` fuehrt einen expliziten Cluster-Rollup-Vertrag mit `is_main_cluster` und `cluster_rank` ein. |
| D3 | Building-Vertrag | `P1` fuehrt einen expliziten Building-Rollup-Vertrag mit `building_motion_mm_a`, `building_reliability_score` und `differential_motion_flag` ein. |
| D4 | Cross-Track-Basis | Primaere Gebaeude-Fusion und primaere Cross-Track-Plausibilisierung laufen ueber `main_cluster`, nicht ueber alle `core`-Punkte. |

## D1: Persistenzrichtung fuer V1

Default fuer `P1`:

- `ml_point_results` bleibt Source of Truth.
- Cluster- und Building-Level werden in einem gemeinsamen Backend-Rollup aus Punktdaten abgeleitet.
- API, Tiles und UI duplizieren diese Rollup-Logik nicht, sondern konsumieren denselben Rollup-Pfad.
- Eigene Tabellen wie `ml_cluster_results` oder `ml_building_results` sind fuer `P1` optional und nur dann noetig, wenn Query-Kosten oder Nachvollziehbarkeit den derive-first-Ansatz brechen.

Begruendung:

- minimiert Migrations- und Integrationsrisiko in `P1`
- passt zum aktuellen System, das Punkt-Meta bereits vollstaendig persistiert
- erlaubt spaetere Materialisierung ohne erneute Semantikdiskussion

## D2: V1-Datenvertrag fuer Cluster-Level

`P1` braucht einen stabilen Cluster-Rollup-Vertrag, unabhaengig davon, ob dieser aus SQL, Python-Rollups oder neuen Tabellen gespeist wird.

### Pflichtfelder

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `cluster_id` | `str` | stabile Cluster-ID innerhalb eines Runs |
| `building_source` | `str` | aktuell `gba` |
| `building_id` | `str` | Gebaeude-ID |
| `track` | `int` | `44` oder `95` |
| `cluster_role` | `str` | `core`, `noise`, `excluded`, `insufficient_support` |
| `is_main_cluster` | `bool` | markiert den primaeren Cluster je `Gebaeude x Track` |
| `cluster_rank` | `int` | deterministische Rangfolge innerhalb des Gebaeudes |
| `point_count` | `int` | Punkte im Cluster |
| `median_velocity_mm_a` | `float | null` | Median der LOS-Geschwindigkeit |
| `median_vertical_proxy_mm_a` | `float | null` | Median des aktuellen `vertical_proxy` |
| `median_coherence` | `float | null` | Cluster-Signalqualitaet |
| `median_height_rank` | `float | null` | Hoehenlage innerhalb des Gebaeudes |
| `cluster_reliability_score` | `float | null` | clusterinterne Belastbarkeit fuer V1 |
| `motion_delta_to_main_mm_a` | `float | null` | Differenz zum `main_cluster` desselben Tracks |

### V1-Entscheidungen

- `is_main_cluster` ist fuer `noise`, `excluded` und `insufficient_support` immer `false`.
- `cluster_rank = 1` gehoert immer dem `main_cluster`.
- `motion_delta_to_main_mm_a` wird fuer den `main_cluster` selbst auf `0` gesetzt.
- `cluster_reliability_score` ist ein Cluster-Signal, kein Ersatz fuer `building_reliability_score`.

## D3: V1-Datenvertrag fuer Building-Level

Das Building-Level ist das primaere Produktobjekt fuer `P1`.

### Pflichtfelder

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `building_source` | `str` | aktuell `gba` |
| `building_id` | `str` | Gebaeude-ID |
| `building_status` | `str` | `ok`, `single_track_only`, `small_n`, `noise_dominated`, `insufficient_support` |
| `building_motion_mm_a` | `float | null` | finaler Gebaeudebewegungswert fuer V1 |
| `building_reliability_score` | `float | null` | numerische Belastbarkeit `0..1` |
| `building_reliability_band` | `str | null` | `high`, `medium`, `low` |
| `track_agreement_score` | `float | null` | ASC/DSC-Uebereinstimmung auf `main_cluster`-Basis |
| `differential_motion_flag` | `bool` | differenzielle Bewegung innerhalb des Gebaeudes |
| `main_cluster_track_44_id` | `str | null` | Hauptcluster fuer Track 44 |
| `main_cluster_track_95_id` | `str | null` | Hauptcluster fuer Track 95 |
| `cluster_count` | `int` | Anzahl sichtbarer Cluster |
| `reliable_cluster_count` | `int` | Anzahl `core`-Cluster mit Building-Relevanz |
| `kept_point_count` | `int` | Punkte nach Gate-Rules |
| `noise_point_count` | `int` | als `noise` markierte Punkte |
| `excluded_point_count` | `int` | per Gate ausgeschlossene Punkte |

### V1-Berechnung

- `building_motion_mm_a` kommt nicht mehr aus `AVG(quality_score)` oder `AVG(anomaly_score)`.
- Track-lokal wird der Bewegungswert aus dem `main_cluster` berechnet.
- Wenn beide Tracks vorhanden sind, basiert `track_agreement_score` nur auf den `main_cluster`-Rollups.
- Wenn nur ein Track vorhanden ist, bleibt `building_motion_mm_a` befuellt, aber `building_status` und `building_reliability_score` spiegeln den fehlenden Gegencheck wider.

## D4: Harte und weiche Dependencies fuer `P1`

### Harte Dependencies

- `P1-W1-T1` muss den Cluster-Rollup und die `main_cluster`-/`differential_motion_flag`-Semantik liefern, bevor API/Tiles/UI auf den neuen Vertrag umgestellt werden.
- `P1-W2-T1` darf erst gruen werden, wenn die in diesem Dokument genannten Cluster- und Building-Felder tatsaechlich ueber Backend-Schemas und Endpunkte verfuegbar sind.
- `P1-W2-T2` darf erst gruen werden, wenn die UI dieselben Feldnamen und dieselbe Semantik verwendet; keine parallele Altsemantik in lokalen Building-Views.
- `P1-W3-T1` startet erst nach erfolgreicher Backend- und Frontend-Umstellung auf den Vertrag aus `D2` und `D3`.

### Weiche Dependencies

- Die UI darf ihre Darstellungsstruktur schon vorbereiten, solange die Feldnamen aus `D2`/`D3` stabil bleiben.
- Tiles und Detail-Endpunkte duerfen zunaechst denselben derive-first-Rollup konsumieren; eine spaetere Materialisierung in eigene Tabellen ist kein Blocker fuer `P1`.
- Zusatzauswertungen wie AOI-Notizen oder Kalibrationsmetriken duerfen bestehende Diagnosefelder weiter mitfuehren, solange die neue Building-/Cluster-Semantik nicht verwischt wird.

## D5: Legacy-Removal-Schnitt fuer lokale API/UI

Es gibt im aktuellen Repo kaum noch direkte `anomaly_v1`-Modulreste in den lokalen Views. Der eigentliche Legacy-Schnitt betrifft daher vor allem vererbte Semantik: Gebaeude werden noch ueber Punktdurchschnitte und Diagnose-Proxys interpretiert, nicht ueber einen echten Building-Vertrag.

### Removal-Liste fuer `P1`

| Bereich | Aktuelle Altannahme | Entscheidung fuer `P1` |
| --- | --- | --- |
| Backend-Schema `MLBuildingAnalysis` | `avg_quality_score`, `avg_anomaly_score` und `avg_cross_track_consistency` wirken als primaere Gebaeudeaussage. | Als primaere Produktsemantik entfernen bzw. in sekundare Diagnosefelder verschieben; ersetzen durch `building_motion_mm_a`, `building_reliability_score`, `building_reliability_band`, `differential_motion_flag`. |
| Backend-Router Building Summary | `building_status` wird nur aus `kept_point_count`, `noise_point_count` und `cluster_count` abgeleitet. | Ersetzen durch den in `D3` eingefrorenen Building-Status; `cluster_count` bleibt Diagnose, nicht Endurteil. |
| Cross-Track-Rollup | `track_agreement_score` mittelt faktisch Punkt-Konsistenzen ueber alle nicht-noise Punkte des Gebaeudes. | Auf `main_cluster`-basierte Gebaeudeplausibilisierung umstellen; die alte Aggregation nicht als primaeres Signal beibehalten. |
| Cluster-Summary | `clusters[]` enthaelt nur `cluster_id`, `track`, `point_count`, Medianwerte ohne Rang oder Hauptcluster-Markierung. | Erweitern auf den Vertrag aus `D2`; keine dauerhafte Clusterliste ohne `is_main_cluster` und `cluster_rank`. |
| Inspector | Der Building-Bereich zeigt derzeit `Clusters / status`, `Average quality`, `Average anomaly`, `Average cross-track`, `Track agreement` als Hauptblock. | Diese Altlogik als primaeren Summary-Block ersetzen. Diagnosewerte duerfen bleiben, aber nur nachgeordnet hinter Building-Motion, Reliability und `differential_motion_flag`. |
| Map-Building-Tooltip und Building-Layer | Farben und Tooltip fuer Gebaeude basieren auf `avg_quality_score`, `avg_anomaly_score`, `outlier_count`, `cluster_count`. | Als primaere Gebaeudelogik ersetzen; die Karte soll auf echte Building-Felder reagieren. `outlier_count` und `cluster_count` bleiben optionales Diagnose-Overlay. |
| UI-View `label` | `PipelinePanel` nennt den View `Reliability label`, waehrend `MapView` dafuer Punkt-`label` bzw. Gebaeude-`outlier_count` nutzt. | Diese Benennung/Logik nicht konservieren. In `P1` muss `label` entweder echtes `building_reliability_band` bedeuten oder in `point_label` / `building_reliability` getrennt werden. |

### Explizit behalten als Diagnose, aber nicht als Zielzustand

- `top_points` und Punkt-`label` im Inspector: behalten als Debug-/Forensik-Hilfe
- `cluster_count`, `noise_point_count`, `excluded_point_count`: behalten als Diagnose- und Verifikationskontext
- Cluster-Huellen, Kandidatenflaechen und Punktrollen in der Karte: behalten; die bestehende Visualisierung ist kein Legacy-Problem, sondern braucht nur den neuen Datenvertrag

## Nicht eingefroren in `P0-W2-T1`

- exakte Gewichtung der Formel fuer `building_reliability_score`
- finale Kalibrierung der `differential_motion_flag`-Schwelle
- spaetere Materialisierung in eigene Tabellen

Diese Punkte sind fuer `P1` bewusst als dokumentierte Defaults eingefroren, aber nicht als dauerhaft unveraenderliche Endform.
