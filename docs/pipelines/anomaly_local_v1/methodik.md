# `anomaly_local_v1` Methodik

## Ziel
`anomaly_local_v1` ist die neue Phase-1-Pipeline fuer die Gebaeude-nahe Analyse von InSAR-Punkten. Sie ersetzt den fachlich unzureichenden globalen `IsolationForest` nicht im System, sondern fuegt parallel eine lokalere Alternative hinzu.

Die Kernfrage lautet nicht mehr: `Ist dieser Punkt in der gesamten Stadt ungewoehnlich?`

Sondern: `Passt dieser Punkt geometrisch, signaltechnisch und zeitlich zu genau diesem Gebaeude und zu den anderen Punkten dieses Gebaeudes?`

## Warum ein lokaler Ansatz
Der erste Implementierungsversuch (`anomaly_v1`) arbeitet track-weit ueber alle Punkte in der gewaehlten BBox. Das ist fuer die eigentliche Fragestellung zu grob:

- Ein Punkt kann global unauffaellig, aber fuer sein Gebaeude ein klarer Ausreisser sein.
- Mehrere konsistente Teilcluster an einem Gebaeude sind fachlich plausibel, z. B. Dach vs. Balkon.
- Viele Gebaeude haben nur sehr wenige Punkte. Der relevante Kontext ist deshalb der lokale Gebaeudeverband, nicht die ganze Stadt.
- Das Projektmeeting hat explizit gefordert, dass Nachbargebaeude-Reflexionen, Wintergaerten, Terrassen oder Hinterhofpunkte getrennt betrachtet werden.

Deshalb verarbeitet `anomaly_local_v1` jedes `Gebaeude x Track` separat.

## InSAR-Kontext
Die wichtigsten Annahmen aus dem Handbook, die direkt in die Pipeline einfliessen:

- InSAR misst primär Bewegung in Blickrichtung (`LOS`), nicht direkt vertikal.
- Track 44 ist in Salzburg aufsteigend (`ASC`), Track 95 absteigend (`DSC`).
- Track 44/A blickt mit Look-Bearing `81.4 deg` ostwaerts, Track 95/D mit `281.5 deg` westwaerts.
- Negative `velocity`- oder Displacement-Werte bedeuten Bewegung vom Satelliten weg; positive Werte bedeuten Bewegung zum Satelliten hin.
- Aufsteigende und absteigende Tracks sehen die Szene aus unterschiedlichen 2D-Richtungen; dieselbe Gebaeudestruktur kann deshalb seitlich versetzt erscheinen.
- Niedrige Kohärenz deutet oft auf unzuverlaessige Reflexionen hin.
- Punkt-`height` liegt im ellipsoidischen Bezugssystem; SRTM-Gelaende ist nicht direkt ohne Datumsharmonisierung abziehbar.
- Steile Hänge, Vegetation, Mehrwegeffekte und geometrische Verzerrungen erzeugen systematische Problemfaelle.

Konsequenz fuer Phase 1:

- Punkt-zu-Gelaende-Hoehen als absolute Differenz werden nicht direkt verwendet.
- Terrain geht ueber `slope_mean_deg`, `slope_max_deg` und `relief_range_m` ein.
- Cross-Track-Konsistenz wird nur als robuster Plausibilisierungsmechanismus benutzt, nicht als harte Wahrheit.

## Datenkontext im Repository
Relevante Tabellen und Datensaetze:

- `insar_points`
- `insar_timeseries`
- `insar_amplitude_timeseries`
- `gba_buildings`
- `building_terrain_context`
- `insar_point_terrain`
- `ml_runs`
- `ml_point_results`

Wichtige empirische Beobachtungen aus Salzburg:

- Viele Gebaeude haben nur sehr wenige Punkte; kleine Stichproben sind der Normalfall.
- Ein grosser Anteil der bisherigen Zuordnungen kam nur ueber `nearest`, nicht ueber polygoninterne Treffer.
- `eff_area` ist in den Salzburg-Testdaten praktisch nicht brauchbar.
- Amplitudenfeatures fehlen fuer Track 95 teilweise; sie bleiben optional.
- Die Hoehenbeziehung Punkt vs. Terrain ist ohne Vertikal-Datumsharmonisierung nicht robust genug fuer harte Schlussfolgerungen.

## Pipeline-Ueberblick
Die Pipeline besteht aus sechs fachlichen Kernschritten:

1. Lokale Punktzuordnung an GBA-Gebaeude.
2. Zeitreihen- und Qualitaetsfeatures pro Punkt.
3. Gate-Rules fuer harte Ausschluesse.
4. Lokale Clusterung pro `Gebaeude x Track`.
5. Outlier- und Qualitaetsscore.
6. Cross-Track-Validierung zwischen `ASC` und `DSC`.

Danach werden die Ergebnisse fuer Gebaeude, Cluster, Nachbarschaftskontext und UI/DB-Ausgabe aufbereitet. Diese nachgelagerte Schicht ist keine zusaetzliche Detektionslogik im engeren Sinn, sondern macht die lokalen Entscheidungen interpretierbar, vergleichbar und visualisierbar.

## 1. Punktzuordnung
### Richtungssensitiver Buffer
Fuer jedes GBA-Gebaeude wird eine richtungsabhaengige Kandidatenflaeche gebaut:

- Ausgangspunkt ist das Originalpolygon.
- Dann wird das Polygon in UTM 33N entlang des aus dem track-spezifischen 2D-Look abgeleiteten Sensorseitenvektors verschoben.
- Die Kandidatenflaeche wird sensorseitig erweitert, also in die Gegenrichtung des jeweiligen Looks.
- Fuer Track 44/A ist das bei Look `81.4 deg` die Gegenrichtung um `261.4 deg`; fuer Track 95/D bei Look `281.5 deg` die Gegenrichtung um `101.5 deg`.
- Aus Originalpolygon und verschobenem Polygon wird eine vereinigte Kandidatenflaeche erzeugt.
- Darauf kommt ein kleiner lateraler Slack-Buffer.

Die finale Keep-Entscheidung fuer diese 2D-Vektor-Geometrie bleibt bis zur W3-Verifikation offen.

Formel:

`range_offset = clamp(height_m * tan(incidence_angle) * buffer_multiplier, min_buffer_m, max_buffer_m)`

### Warum diese Strategie
- Sie ist fachlich naeher an der InSAR-Geometrie als ein isotroper Kreisbuffer.
- Sie bildet den typischen Layover-Versatz erhoehter Scatterer zur Sensor- bzw. Near-Range-Seite ab.
- Sie erklaert den haeufigen seitlichen Versatz von Gebaeudereflektionen.
- Sie ist generalisierbarer als Salzburg-spezifische Starroffsets.

### Fallback
Wenn weder `within` noch `directional_buffer` greift, wird nur noch `nearest <= 15 m` verwendet.

Wichtig:

- `nearest` ist bewusst nur Fallback.
- Die Zuordnungsart wird fuer jeden Punkt gespeichert und visualisiert.

## 2. Features
### Clustering-Features
Diese Features bestimmen die lokale Gruppierung:

- `along_look_offset_m`
- `cross_look_offset_m`
- `height_rank_in_building`
- `velocity`
- `acceleration`
- `coherence_penalty`

Warum:

- Die ersten drei Features modellieren die geometrische Lage relativ zum Gebaeude.
- `velocity` und `acceleration` erfassen das Bewegungsverhalten.
- `coherence_penalty` bestraft signaltechnisch schwache Punkte.

### Scoring-Features
Diese Features beeinflussen Outlier- und Qualitaetsbewertung:

- `velocity_std`
- `season_amp`
- `ts_slope`
- `ts_residual_std`
- `ts_max_abs_delta`
- `ts_roughness`
- `ts_missing_rate`
- `amp_ts_cv`
- `amp_ts_spike_rate`
- `building_height`
- `slope_mean_deg`
- `slope_max_deg`
- `relief_range_m`
- `local_density`

Warum:

- Diese Groessen bewerten Stabilitaet, Signalqualitaet und topografischen Kontext.
- Sie sind fuer Soft-Penalties geeigneter als fuer harte Clusterbildung.

## 3. Gate-Rules
Phase 1 darf pragmatisch harte Regeln nutzen, aber nur zentral, dokumentiert und spaeter ersetzbar.

### Aktive Hard Rules
1. Kein Gebaeude gefunden
2. Weniger als `24` gueltige Displacement-Epochen
3. Weniger als `50%` der erwarteten Track-Epochen
4. `coherence < max(0.45, track_p05)`

### Begruendung
1. Ohne Gebaeudezuordnung gibt es keinen lokalen Kontext.
2. Mit extrem kurzer Zeitreihe sind Trend- und Step-Features nicht belastbar.
3. Hohe Missingness verfälscht lokale Vergleiche.
4. Sehr niedrige Kohärenz ist in InSAR typischerweise ein starkes Warnsignal.

### Einordnung
- `24` Epochen und `50%` Ratio sind pragmatische Phase-1-Schwellen und spaeter lernbar.
- Die Kohärenzregel ist teils universell, teils datengetrieben, weil ein Track-Perzentil einbezogen wird.

## 4. Clustering und Outlier-Erkennung
### Standardfall: HDBSCAN
Ab `>= 6` behaltenen Punkten wird lokal pro `Gebaeude x Track` mit HDBSCAN geclustert.

Parameterlogik:

- `allow_single_cluster=True`
- `cluster_selection_method="eom"`
- `min_cluster_size = max(2, ceil(0.2 * n))`, gedeckelt bei `8`
- `min_samples = max(1, floor(min_cluster_size / 2))`

Warum HDBSCAN:

- Unbekannte Clusterzahl
- robuste Behandlung von Noise
- lokale Dichteunterschiede besser als klassisches DBSCAN
- sinnvoll fuer heterogene Punktdichten innerhalb einzelner Gebaeude

Wenn `hdbscan` im Laufzeitumfeld nicht verfuegbar ist, faellt die Implementierung auf `OPTICS` zurueck.

### Small-N-Fallback
Fuer `3-5` behaltene Punkte ist Phase 1 explizit konservativer:

- Es wird von einer Ein-Cluster-Hypothese ausgegangen.
- Ein robuster Lokalscore auf Raumlage, Bewegung und Kohärenz trennt Kernpunkte von Noise.

Warum:

- Bei sehr kleinen Stichproben sind dichtebasierte Entscheidungen instabil.
- Das Meeting hat genau diese kleinen Gebaeude als Praxisfall benannt.

### Insufficient Support
Bei `< 3` behaltenen Punkten wird nicht geclustert.

Dann gilt:

- Status `insufficient_support`
- Label mindestens `suspect`
- visuelle Kennzeichnung bleibt trotzdem erhalten

## 5. Scoring
### Teilkomponenten
- `cluster_outlier_score`
- `local_deviation_score`
- `rule_penalty`

### Endscore
`anomaly_score = 0.60 * cluster_outlier_score + 0.25 * local_deviation_score + 0.15 * rule_penalty`

### Qualitaet
`quality_score = 0.45 * (1 - anomaly_score) + 0.25 * cross_track_consistency_or_neutral + 0.20 * kept_support_ratio + 0.10 * signal_quality`

### Labels
- `normal >= 0.70`
- `suspect 0.40-0.69`
- `outlier < 0.40`
- harte Gate-Ausschluesse werden ebenfalls als `outlier` markiert

## 6. Cross-Track-Validierung
Die Pipeline vergleicht `ASC` und `DSC` nach dem lokalen Filtern erneut.

Verwendet wird ein robuster vertikaler Proxy:

`vertical_proxy = velocity / cos(incidence_angle)`

Das Vorzeichen bleibt dabei erhalten: negative Proxy-Werte bleiben Bewegung vom Satelliten weg, positive Proxy-Werte Bewegung zum Satelliten hin. `vertical_proxy` ist keine echte Vertikalkomponente, sondern nur eine Naeherung fuer Faelle, in denen vertikale Bewegung dominiert und horizontale Bewegungsanteile klein sind.

Die Toleranz steigt mit der Hangneigung:

`allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg`

Warum:

- In Hanglagen und komplexer Topografie ist ein enger Vergleich unplausibel.
- Cross-Track-Uebereinstimmung ist ein starker Vertrauensindikator, aber kein perfekter Ground Truth.

## Nachgelagerte Rollups und Kontextbewertung
Nach den sechs Kernschritten werden Punkt-, Cluster- und Gebaeudeinformationen zusammengefuehrt. Ziel ist, aus einzelnen Punktlabels eine interpretierbare Gebaeudeperspektive zu erzeugen.

### Cluster-Rollups
Fuer jedes Cluster werden zusammengefasst:

- `cluster_role` (`core`, `noise`, `insufficient_support`, `excluded`)
- Punktanzahl
- Median-`velocity`
- Median-`vertical_proxy`
- Cluster-Schwerpunkt in UTM
- Median-`coherence`
- Median-`height_rank_in_building`
- `cluster_reliability_score`
- Abstand der Bewegung zum Main-Cluster (`motion_delta_to_main_mm_a`)

Der Main-Cluster je Track wird unter den verlaesslichen Core-Clustern gewaehlt. Prioritaet haben:

1. mehr Punkte
2. hoehere Median-Kohärenz
3. hoeherer Median-Hoehenrang
4. stabile deterministische Cluster-ID als Tie-Breaker

### Gebaeude-Rollup
Pro Gebaeude werden die Track-Rollups zusammengefuehrt. Daraus entstehen:

- `building_motion_mm_a`
- `track_agreement_score`
- `building_reliability_score`
- `building_reliability_band` (`high`, `medium`, `low`)
- `differential_motion_flag`
- Main-Cluster-IDs fuer Track 44 und Track 95
- Zaehlwerte fuer Punkte, behaltene Punkte, Noise, Ausschluesse und Cluster

Der Gebaeudestatus beschreibt die Belastbarkeit der Aussage:

- `ok`: ausreichend lokaler und track-uebergreifender Support
- `single_track_only`: nur ein Track liefert verwertbaren Main-Cluster-Support
- `small_n`: nur wenige Punkte stuetzen die Aussage
- `noise_dominated`: mehr als die Haelfte der behaltenen Punkte ist Noise
- `insufficient_support`: zu wenig verwertbare Punkte oder kein Main-Cluster

Die Gebaeude-Zuverlaessigkeit kombiniert Support, Signalqualitaet, Zuordnungsqualitaet und Cross-Track-Uebereinstimmung. Sie wird reduziert bei Single-Track-Lage, schwachem Main-Cluster-Support, Noise-Dominanz, schlechter Track-Uebereinstimmung oder differentieller Bewegung.

### Nachbarschaftskontext
Nachbargebaeude werden genutzt, um Grenzfaelle sichtbar zu machen, nicht um Punktzuordnungen automatisch umzuschreiben.

Aktuelle Logik:

- Kandidaten sind benachbarte Gebaeude innerhalb von `25 m`.
- Maximal `8` Nachbargebaeude werden betrachtet.
- Verglichen werden nur verwertbare Core-Cluster mit ausreichendem Support.
- Clusterprofile bestehen aus Bewegungsproxy, Along-/Cross-Look-Lage, Hoehenrang und groesstem Zeitreihen-Step.
- Ein Punkt kann als moegliche Fehlzuordnung markiert werden, wenn er schlecht zum eigenen Cluster, aber deutlich besser zu einem Nachbarcluster passt.
- Ein Gebaeude kann als nachbarschaftlich gestuetztes Ereignis markiert werden, wenn mehrere Nachbargebaeude konsistente Bewegungsmuster zeigen.

Wichtige Ergebnisfelder:

- `best_neighbour_building_id`
- `best_neighbour_cluster_id`
- `own_cluster_fit_score`
- `neighbour_fit_score`
- `neighbour_fit_delta`
- `neighbour_misassignment_flag`
- `neighbour_event_score`
- `neighbour_event_flag`
- `supporting_neighbour_count`

Diese Werte sind Diagnose- und Interpretationshilfen. Sie dienen vor allem dazu, Nachbargebaeude-Reflexionen, gemeinsam bewegte Bereiche und moegliche Randzuordnungen im Inspector nachvollziehbar zu machen.

## Persistenz und Ergebnisstruktur
Die Pipeline schreibt pro Punkt einen Datensatz in `ml_point_results`.

Gespeichert werden die numerischen Kernwerte:

- `score` / `quality_score`
- `anomaly_score`
- `cross_track_consistency`
- `label`
- `cluster_id`
- `building_source`
- `building_id`
- `distance_m`
- `feature_set_version`
- `model_set_version`

Zusaetzlich enthaelt `meta` die interpretierbaren Kontextdaten:

- `feature_flags`
- `building_context`
- `cross_track_summary`
- `cluster_rollup`
- `building_rollup`
- `neighbour_context`
- `detector_scores`
- `explain_top_features`
- `visual_context`

Die Persistenz ist bewusst breit, damit die UI nicht nur ein Label zeigt, sondern die Methodik pruefbar macht: Zuordnung, Gate-Entscheidungen, Clusterrolle, Cross-Track-Kontext, Nachbarschaftskontext und wichtigste Erklaergruende bleiben pro Punkt nachvollziehbar.

## Visualisierung
Phase 1 sieht bewusst eine visuelle Gebaeudeansicht vor.

Fuer ein selektiertes Gebaeude zeigt die UI:

- Originalpolygon
- richtungsabhaengige Kandidatenflaechen fuer `ASC` und `DSC`
- Cluster-Huellen
- Clusterpunkte
- Noise-Punkte
- Gate-ausgeschlossene Punkte

Diese Ansicht ist kein Nice-to-have, sondern Teil der Methodik. Ohne sie lassen sich Fehlzuordnungen und fachliche Grenzfaelle nicht sauber beurteilen.

## Failure Modes
Bekannte Grenzfaelle:

- sehr kleine Gebaeude mit nur 1-2 Punkten
- nur ein vorhandener Track
- Hanglagen mit starker Reliefwirkung
- verschobene Reflexionen an Dachkanten
- Wintergaerten, Terrassen, Nebengebaeude
- fehlende Amplitudendaten

Die Pipeline versucht diese Faelle sichtbar und nachvollziehbar zu machen, nicht sie in Phase 1 vollautomatisch perfekt zu loesen.

## Hard-Rule-Register
| Rule | Zweck | Typ |
|---|---|---|
| `no_building_assignment` | kein lokaler Gebaeudekontext | spaeter lernbar |
| `too_few_valid_epochs` | instabile Zeitreihenbasis vermeiden | spaeter lernbar |
| `too_sparse_timeseries` | fehlende Beobachtungen begrenzen | spaeter lernbar |
| `low_coherence` | signaltechnisch schlechte Punkte ausschliessen | teils universell, teils datengetrieben |

## Warum diese Methodik verwendet wurde
Kurz gesagt:

- Sie passt zur fachlichen Frage auf Gebaeudeebene.
- Sie verarbeitet kleine Stichproben besser als ein globales Modell.
- Sie laesst mehrere legitime Teilcluster zu.
- Sie trennt harte Ausschluesse von weichen Penalties.
- Sie ist fuer spaetere lernbare Schritte offen, ohne in Phase 1 ueberengineert zu sein.

## Ausblick Phase 2+
Naechste sinnvolle Schritte:

- lernbare Gebaeudezuordnung statt fixer Buffer-Formel
- adaptivere Gate-Schwellen pro Stadt/Track
- clusterweises statt nur gebaeudeweises Cross-Track-Matching
- schwach ueberwachte Labels aus stabilen Asc/Desc-Uebereinstimmungen
- spaetere Verdichtung zu einem Gebaeude-Scoring mit Konfidenzintervall
