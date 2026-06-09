# Phase-7-Research-Matrix: Regelbasis für die Clustering-Optimierung `anomaly_local_v1`

Stand: 2026-06-10
Ticket: `P7-A-W1-T2` (Phase 7 / Optimierungsphase 1, Welle `P7-A-W1`)

Diese Matrix übersetzt die externe und lokale Quellenbasis in verbindliche
Planregeln. Sie ist die Regelbasis für ALLE Phase-7-Experimente: jedes
Experiment-Design, jede Scorecard-Bewertung und jeder
Produktivierungsvorschlag (`P7-B` bis `P7-E`) muss gegen diese Regeln geprüft
werden. Abweichungen sind nur mit expliziter Begründung im
Experiment-Protokoll zulässig.

## Quellen und Statusdefinitionen

Lokale Primärquellen (Volltexte ausgewertet):

- AUGMENTERRA InSAR Handbuch v1.3 (17.03.2026, 25 Seiten):
  `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`
- TRE ALTAMIRA InSAR products Handbook 2.2 (04.06.2018, 70 Seiten):
  `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`
- `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_plan.md`,
  Abschnitte "Research-Synthese", "Handbook-abgeleitete Pflichtregeln",
  "Aktuelle Datenlage", "Externe Quellenbasis" (PostGIS-/Parquet-Audits
  2026-06-08 bis 2026-06-10).

Statusdefinitionen:

- `verified_local`: direkt im lokalen Handbook-Volltext bzw. in lokalen
  Daten-Audits (PostGIS/Parquet) belegt. Seitenangaben beziehen sich auf die
  gedruckte Seitenzahl des jeweiligen PDFs.
- `verified_web`: Webquelle am 2026-06-09 geprüft (keine erneute Recherche in
  diesem Ticket nötig).
- `assumed`: Quelle nicht direkt gelesen bzw. Aussage extrapoliert; siehe
  Abschnitt "Bewusste Abweichungen / Offene Unsicherheiten".

## 1. AUGMENTERRA InSAR Handbuch v1.3

| Quelle | Kernaussage | Abgeleitete Planregel für Phase 7 | Status |
| --- | --- | --- | --- |
| AUG Kap. 2.2.4, S. 9-10 | InSAR misst nur den Bewegungsanteil parallel zur LOS; ASC blickt nach Osten, DSC nach Westen. Der Einfallswinkel ist variabel (SNT ca. 20-46°, TSX 20-60°) und beeinflusst Abschattung, Lagegenauigkeit und Bewegungsinterpretation. | Interpretiere `velocity` ausschließlich als LOS-Projektion; rechne Vertical-Proxies immer mit der trackspezifischen Inzidenz und dokumentiere `cos(incidence)` als trackabhängige Rauschverstärkung (T22 cos=0.70, T95 cos=0.80, TSX 0.59-0.62). | verified_local |
| AUG Kap. 2.2.6, S. 12 | 2D-Dekomposition (vertikal + Ost-West) erfordert ASC- und DSC-Daten und läuft auf einem Raster (z. B. 10x10 m); Ergebnis sind Pseudo-Messpunkte mit verminderter Lagegenauigkeit und Dichte. Die N-S-Komponente ist nur mit Zusatzdaten (GNSS, Modelle) bestimmbar. | Erzwinge keine punktscharfe ASC/DSC-Fusion auf Gebäudeebene; werte Cross-Track nur als aggregiertes Konsistenzsignal und niemals als 3D-Bewegungsrekonstruktion. | verified_local |
| AUG Kap. 2.4.1, Tab. 1, S. 14 | Typische Geokodierungspräzision (<1 km vom REF, >=30 Szenen): TSX N ±1 m / O ±3 m / H ±1.5 m, SNT ±8 m je Komponente. | Setze Lage-/Matching-Toleranzen dataset-spezifisch: SNT niemals enger als 8 m (konservativ 10-15 m, siehe TRE-Ostwert ±12 m), TSX/PAZ wenige Meter; verlange in der HR-Pseudo-Referenz keine exakten Punktübereinstimmungen. | verified_local |
| AUG Kap. 2.4.1, Tab. 2, S. 15 | Standardabweichung der mittleren Verschiebungsrate < 1 mm/a, Einzelmessung im Mittel ±5 mm (<1 km REF, >=30 Szenen, 2 Jahre); Präzision nimmt mit REF-Abstand ab. | Behandle Velocity-Differenzen unterhalb ~1-2 mm/a als nicht interpretierbar; lege Disagreement-Schwellen der Scorecard nie unter diesen Präzisionsboden. | verified_local |
| AUG Kap. 2.2.2 + Kap. 3, Tab. 3, S. 8 u. 17 | Eindeutige Messung nur bis λ/4 pro Aufnahmeintervall (C-Band ~1.4 cm); zuverlässiges Monitoring nur bis ca. 100 mm/a, u. a. wegen winterlicher Datenlücken; stark nichtlineare Bewegung ist nicht lückenlos erfassbar. | Führe Zeitreihenabdeckung, Gap-Struktur und Step-/Roughness-Indikatoren als Qualitätsgates; flagge Punkte/Cluster mit Raten nahe der Aliasing-Grenze als unzuverlässig statt sie als Bewegungsbefund zu werten. | verified_local |
| AUG Kap. 3, Tab. 3, S. 17 | Steile Hänge erzeugen Abschattung, Überlagerung und Verzerrung; die Punktdichte auf N- und S-Hängen ist systembedingt vermindert; InSAR ist nahezu blind für reine N-S-Bewegung. | Markiere Hang-AOIs grundsätzlich als Stress-AOIs (nie als Kalibrierungsanker) und interpretiere fehlende Punkte bzw. Track-Asymmetrien in Hanglagen zuerst geometrisch, nicht als Clusterfehler. | verified_local |
| AUG Appendix 7, S. 23-24 | Attributkonvention: `vel`/`acc` sind reine LOS-Größen, positive Werte = Bewegung zum Satelliten; `eff_area` in m² beschreibt die DS-Fläche, PS erhalten den Wert 0; `dYYYYMMDD` sind kumulative Verschiebungen relativ zur ersten Szene. | Fixiere die LOS-Vorzeichenkonvention zentral im Harness; klassifiziere Punkte mit `eff_area > 0` als DS-Patch (mit `sqrt(eff_area)` als zusätzlicher Lageunsicherheit) und behandle Zeitreihen stets relativ zum jeweiligen Track-Zeitnullpunkt. | verified_local |
| AUG Appendix 7.4, S. 24 | `coherence` (0-1) bezieht sich auf Phasenrauschen und Modellfit; hohe Werte (z. B. > 0.7) stehen für zuverlässige Messpunkte; `h_stdev`/`v_stdev`/`a_stdev` und Saisonfelder sind Präzisionsangaben. | Nutze `coherence`-Bänder nur dataset-intern als Qualitätsindikator; ziehe `height_std`/`velocity_std`/`acceleration_std` und Saisonfelder als Qualitäts-Features in die Experimentachsen ein. | verified_local |

## 2. TRE ALTAMIRA Handbook 2.2

| Quelle | Kernaussage | Abgeleitete Planregel für Phase 7 | Status |
| --- | --- | --- | --- |
| TRE §2.1, S. 10 | SqueeSAR braucht mindestens 15-20 Szenen gleicher Aufnahmegeometrie; PS sind punktförmige Reflektoren, DS statistisch homogene Flächen-Patches. Die DS-Information bezieht sich auf die effektive Fläche, die exakte Form wird nicht geliefert. | Prüfe je Experiment die Szenenbasis (lokal erfüllt: 57-92 Epochen je Track) und behandle DS-Punkte als Flächenrepräsentanten, nie als exakte Einzelziele. | verified_local |
| TRE §2.1, S. 11-12 | Alle Messungen sind differentiell: räumlich relativ zum REF, zeitlich relativ zur ersten Szene. Der REF ist imagery-abhängig (kann bei geänderter Bildbasis wechseln) und darf selbst eine lineare Regionalbewegung enthalten. | Vergleiche absolute Velocities über Track-/Dataset-Grenzen nur mit expliziter Offset-Toleranz; werte kleine konstante Track-Offsets als erwartbar (eigener REF + eigenes Zeitraster je Track), nicht als Clusterfehler. | verified_local |
| TRE §2.1.1.1, Tab. 1, S. 13 | Geokodierungspräzision (1σ, <1 km REF, >=30 Szenen): SNT N ±8 / O ±12 / V ±8 m; TSX N ±1 / O ±3 / V ±1.5 m. DS-Fehlerbalken ähneln PS, entsprechen aber mehreren Bildpixeln; relative Genauigkeit ist wichtiger als absolute. | Verwende für SNT-Gebäudezuordnung und HR-Vergleiche die konservative Toleranz 10-15 m (Ost-Komponente!); akzeptiere systematische Lage-Shifts zwischen Datasets als korrigierbar statt sie als Datenfehler zu werten. | verified_local |
| TRE §2.1.1.2, S. 14-15 | Rate-Präzision < 1 mm/a und Einzelmessung ±5 mm gelten nur unter Idealbedingungen; Sentinel braucht dafür ~19-20 Monate (~50 Szenen) regelmäßiger Akquisition; Präzision sinkt mit REF-Distanz und Datenlücken. | Kalibriere Signifikanzschwellen je Dataset nach Epochenzahl/Zeitspanne; gewichte Velocity-Differenzen in kurzen oder lückigen Fenstern (TSX 2021-2023, Common-Window-Experimente) konservativer. | verified_local |
| TRE §2.1.1.2, S. 16 | Temporal coherence ist ein Modellfit-Index (automatische Model Order Selection; abhängig von Szenenzahl, Zeitspanne, Gaps): "it is not possible to directly compare coherence values between different independent SqueeSAR processing". | Verwende `coherence` niemals als absolute Cross-Dataset-Schwelle; nutze für Cross-Dataset-Experimente innerhalb-Dataset-Perzentile oder Z-Scores (adaptive Gate-Variante als Experimentachse in `P7-C`, produktiv nur über `P7-E`). | verified_local |
| TRE §2.1.1.3, S. 16-18 | Auf isolierten Einzelzielen ist nur Bewegung < λ/2 zwischen zwei Szenen eindeutig; bei unzureichender Punktdichte führt fehlerhaftes Unwrapping zu Unterschätzung; räumlich korrelierte Bewegung plus hohe Dichte entschärfen das. | Flagge isolierte Extrempunkte und abrupte Zeitreihensprünge als Unwrapping-Verdacht; schließe solche Punkte aus Kalibrier- und Referenzvergleichen aus statt sie wegzumitteln. | verified_local |
| TRE §2.1.2, S. 19 | "Measurements obtained from different LOS cannot be directly compared." Eine vertikale Reprojektion liefert nur dann echte Vertikalbewegung, wenn die Horizontalkomponenten vernachlässigbar sind. | Cross-Track-Vergleiche tragen immer `cross_track_pair_type` (`same_geometry` DSC-DSC 22/95 vs. `opposite_geometry` ASC-DSC 44/95 und 93/70); werte Disagreement in `opposite_geometry`-Paaren in Hanglagen als mögliches Horizontalsignal, nicht automatisch als Fehler. | verified_local |
| TRE §2.1.2, S. 20-21 | 2D-Dekomposition arbeitet auf ~100x100-m-Zellen mit gemittelten Pseudo-MPs, interpoliert auf ein gemeinsames Zeitraster mit gleichem REF und gleichem Zeitnullpunkt; abgeleitete Daten sollen immer von den Einzelgeometrien aus analysiert werden. | Führe Cross-Track-Bewertung nur aggregiert (Gebäude-/Zellebene) mit Support-Gates auf beiden Tracks; starte jede Fehleranalyse bei den Einzeltrack-Daten und stelle vor jedem Vergleich Referenz-/Zeitnullpunkt-Kompatibilität sicher. | verified_local |
| TRE §2.1.3, S. 23 | `acceleration` und `seasonality` sind Modellfits (Polynom `d(t)=a+bt+ct²` bzw. zusätzlicher harmonischer Term; Saisonphase relativ zur ersten Szene), jeweils mit eigener Standardabweichung. | Behandle Acceleration-/Saison-Features als modellabhängig: vergleiche sie nie über unterschiedliche Beobachtungsfenster (SNT 2022-2025 vs. TSX 2021-2023) hinweg und führe sie nur dataset-intern als Features ein. | verified_local |
| TRE §9.1, S. 51-53 | Geometrische Verzerrungen: Foreshortening (Hangneigung nahe LOS-Winkel), Layover (Hangneigung > LOS-Winkel; nicht zuverlässig interpretierbar), Shadowing (nicht sichtbar). Aus Aufnahmegeometrie plus Topografie sind a-priori Visibility-Maps ableitbar. | Berechne für Hang-AOIs ein Look-vs-Slope-/Visibility-Feature aus `insar_point_terrain` (per-Punkt `slope_deg`/`aspect_deg`) plus Track-Look/Inzidenz; flagge Layover-/Shadow-Verdacht als Qualitätsgate statt die Punkte unkommentiert zu clustern. | verified_local |
| TRE §11.6, S. 65-67 | DS sind flächige, statistisch homogene Streuer; nach Space-Time-Filterung liefern PS und DS Schätzungen vergleichbarer Qualität, die DS-Information gilt jedoch für einen homogenen Boden-Patch, nicht für ein Einzelziel. | Schreibe DS-Punkte (lokal: `eff_area` bis ~740 m², Patch-Durchmesser bis ~30 m) nie gebäudescharf einem einzelnen Dach zu; weise den DS-Anteil je `AOI x Track` aus und prüfe DS-dominierte Cluster im Visual-Audit auf Boden-/Umfeldsignal. | verified_local |

## 3. Webquellen (verifiziert am 2026-06-09)

| Quelle | Kernaussage | Abgeleitete Planregel für Phase 7 | Status |
| --- | --- | --- | --- |
| HDBSCAN Parameter Selection, https://hdbscan.readthedocs.io/en/latest/parameter_selection.html | `min_samples` defaultet auf `min_cluster_size`; größeres `min_samples` macht die Clusterung konservativer und erzeugt mehr Noise. `eom` liefert wenige große, `leaf` viele kleine homogene Cluster; `cluster_selection_epsilon` verhindert Über-Fragmentierung; `allow_single_cluster` überschreibt das Single-Cluster-Verbot. | Sweepe `min_cluster_size` und `min_samples` als getrennte Achsen (Default-Kopplung explizit brechen und protokollieren); dokumentiere `cluster_selection_method` und `cluster_selection_epsilon` je Experiment; teste `allow_single_cluster` gezielt für Ein-Dach-Gebäude. | verified_web |
| scikit-learn Clustering Guide, https://scikit-learn.org/stable/modules/clustering.html | Interne Metriken (Silhouette u. a.) bewerten nur Modellgeometrie; ihre Konvexitätsannahmen benachteiligen Dichte-Cluster. ARI/AMI benötigen eine Referenzpartition (Ground Truth); OPTICS vs. HDBSCAN unterscheiden sich in Laufzeit-/Speicher-Tradeoffs. | Nutze interne Metriken nur als Nebenindikator, nie als primäres Auswahlkriterium für HDBSCAN-Resultate; setze ARI/AMI ausschließlich für Partition-gegen-Partition-Vergleiche ein (Bootstrap-Stabilität, Cross-Track, HR-Pseudo-Referenz); begründe jeden OPTICS-Einsatz als explizites Experiment (kein Runtime-Fallback, siehe `P7-A-W1-T5`). | verified_web |
| Liu, Yu, Blair 2022, WIREs Comp Stat, https://pmc.ncbi.nlm.nih.gov/articles/PMC9787023/ | Stabilitätsschätzung via Perturbation/Resampling ist primär ein "red flag"-Detektor: Instabilität ist ein starkes Warnsignal, Stabilität allein ist kein definitiver Selektor für die richtige Clusterlösung. | Verwende Stabilität (Messrauschen-Perturbation, Leave-one-out; Bootstrap nur High-N) als Veto-Guardrail in der Scorecard: instabile Konfigurationen scheiden aus, stabile gewinnen dadurch allein nicht. | verified_web |

## 4. Lokale Datenbefunde (Plan-Audits 2026-06-08 bis 2026-06-10)

| Quelle | Kernaussage | Abgeleitete Planregel für Phase 7 | Status |
| --- | --- | --- | --- |
| Plan "Aktuelle Datenlage" (PostGIS-Audit 2026-06-09) | Alle SNT-Punkte (Salzburg und Bad Gastein) haben `eff_area = 0` (PS-like). TSX/PAZ: T70 62.162/288.146 und T93 107.861/512.017 DS-Punkte (~21 % global), in urbanen AOI-Zellen aber nur ~5-8 %; DS-Patches liegen überwiegend auf Nicht-Gebäudeflächen. | Aktiviere DS-Sonderbehandlung nur für TSX/PAZ; berücksichtige `sqrt(eff_area)` als Lageunsicherheits-Zuschlag und schließe DS-Patches von gebäudescharfen Dachzuordnungen aus. | verified_local |
| Plan "Aktuelle Datenlage" (Amplituden) | `amp_mean`/`amp_std` sind nur für Salzburg/SNT gefüllt; Bad-Gastein/SNT und TSX/PAZ haben weder Amplitudenfeatures noch Amplituden-Zeitreihen-Parquets. | Setze in Bad-Gastein- und TSX-Experimenten keine AMP-Features voraus; führe AMP-Features ausschließlich als Salzburg-only-Achse. | verified_local |
| Plan "Beobachtungszeiträume" (Parquet-Audit 2026-06-09) | SNT Bad Gastein (2022-10 bis 2025-09) und TSX/PAZ (2021-05 bis 2023-05) überlappen nur ~7.5 Monate; ein Common-Window-Refit hätte für SNT nur ~18-19 Epochen und läge unter dem produktiven Gate `min_valid_epochs = 24`. | Werte SNT-vs-TSX-Bewegungsdifferenzen nie als Clusterfehler (weitgehend disjunkte Zeiträume); führe Common-Window-Velocity-Refits höchstens als explizit markiertes Experiment, nie als hartes Gate. | verified_local |
| Plan "Kohärenzregime" (Parquet-Audit 2026-06-09) | Der universelle Kohärenz-Floor 0.45 ist auf Salzburg kalibriert (schneidet ~3 %) und entfernt in Bad-Gastein/SNT 17-24 % aller Punkte vor der Clusterung (Median dort nur 0.49-0.51); TSX liegt bei 0.1-0.2 % Exklusion. | Berichte Gate-Exklusionsraten je `Dataset x Track x Grund` in jedem Experiment; kalibriere Scorecard-Erwartungen dataset-spezifisch statt Salzburg-Werte zu übertragen; behandle den absoluten Floor 0.45 als dokumentiertes Generik-Risiko (`P7-C`-Experimentachse). | verified_local |
| Plan "Gemessene n-Regime-Verteilung" (Runs `2c4cec7b`, `c7515149`, `c9f9f55d`) | In Bad-Gastein/SNT liegen ~76 % der `Gebäude x Track`-Gruppen unter 6 Punkten; in TSX/PAZ dominiert das Regime 13-50 Punkte (42 %) plus 8 % über 50. | Übertrage HDBSCAN-Sweep-Ergebnisse nicht von Salzburg auf Bad-Gastein/SNT (dort entscheidet Small-N-/Gate-Logik); behandle die High-N-Strategie (`P7-C-W2-T2`) für TSX/PAZ als Hauptregime-Pflicht, nicht als Spike. | verified_local |
| Plan "Track-22-Abdeckung" (PostGIS-Audit 2026-06-09) | Track 22 deckt nur den Ostteil von Bad Gastein ab (lon >= ~13.168); alle sieben AOI-Kandidaten haben 0 T22-Punkte; im gesamten T22-Gebiet haben nur 20 GBA-Gebäude T22-Punkte (~259 Punkte). | Weise Track-22-Verfügbarkeit je AOI explizit aus (`P7-A-W1-T3`); nutze Track 22 höchstens als Punkt-/Nicht-Gebäude-Diagnose im Osten (DSC-DSC-Redundanz) oder lasse ihn begründet aus (`P7-B-W1-T4`). | verified_local |
| Plan "Feldverfügbarkeit" (Audit 2026-06-09) | `velocity_std`, `height_std`, `acceleration_std`, `s_amp_std`, `s_phs_std`, `season_phs`, `eff_area`, `incidence_angle` sind in Parquet und PostGIS voll befüllt, werden von der produktiven Query aber nicht selektiert; TSX hat Inzidenz nur als Track-Konstante; per-Punkt-Terrain (`slope_deg`, `aspect_deg`) existiert. | Lade die Qualitäts-/Geometriefelder im Experiment-Harness explizit nach (Namens-Mapping: Handbook `h_stdev`/`v_stdev`/`a_stdev` = DB `height_std`/`velocity_std`/`acceleration_std`); baue das Look-vs-Slope-Feature aus vorhandenem Terrain ohne neues Datenprodukt. | verified_local |
| Plan "Research-Synthese" (Trackgeometrie-Audit) | Bad Gastein liegt in der Überlappung zweier DSC-Tracks: T22 look 280.2°/inc 45.66°, T95 look 281.5°/inc 37.16°; 22/95 ist ein `same_geometry`-Paar (insensitiv gegen Ost-West-Bewegung), 44/95 und 93/70 sind `opposite_geometry`-Paare. | Behandle `same_geometry`-Vergleiche als schärfste Redundanzprüfung für Prozessierungs-/Clusterkonsistenz, aber nie als Ersatz für eine ASC/DSC-Prüfung; berücksichtige unterschiedliche Inzidenzen als unterschiedliche Rauschverstärkung der Vertical-Proxies. | verified_local |
| Plan "GBA-Gebäudehöhen" (Audit 2026-06-10) | GBA-Höhen unterschätzen systematisch (Median-Verhältnis GBA/OSM 0.735, Sättigung bei hohen Gebäuden, z. B. Dom 78 m -> 27.4 m); `range_offset = height * tan(incidence)` macht Candidate-Areas dadurch zu kurz und nährt mutmaßlich die ~30 % nearest-Quote. | Entscheide die Höhenstrategie in `P7-A-W1-T6` vor allen Candidate-Area-Experimenten (`P7-C-W1-T5`); prüfe die Nutzung des mitgelieferten `var`-Felds und behandle GBA-Höhe als untere Schranke, nicht als wahre Gebäudehöhe. | verified_local |
| Plan "Research-Synthese" (Scorecard, User-Entscheidung 2026-06-10) | Es gibt keine Einzelmetrik für "richtiges" Clustering ohne Labels. Primärsignale der Scorecard: Cross-Track-Konsistenz mit Support-Gates, HR-Pseudo-Referenz (Bad Gastein), Experten-Analyse plus Visual-Audit; Sensitivität/Konfidenz ist Nebensignal, interne Metriken sind Nebenindikator. | Optimiere nie auf eine einzelne Zahl: jede Experiment-Bewertung füllt die volle Scorecard (Guardrails + drei Primärsignale + Nebensignale) und dokumentiert Konflikte zwischen den Signalen explizit. | verified_local |

## 5. Nicht direkt verifizierte externe Quellen

| Quelle | Kernaussage | Abgeleitete Planregel für Phase 7 | Status |
| --- | --- | --- | --- |
| Copernicus EGMS ATBD, https://land.copernicus.eu/en/technical-library/egms-algorithm-theoretical-basis-document/@@download/file | Sentinel-1-ASC/DSC-Messungen sind nicht direkt vergleichbar; vertikale Reprojektion liefert nur bei vernachlässigbarer Horizontalbewegung echte Vertikalbewegung (laut Plan-Synthese; inhaltlich identisch zu TRE §2.1.2, S. 19). | Übernimm die ASC/DSC-Regeln aus TRE §2.1.2 als Primärquelle; lies das ATBD direkt, bevor EGMS-spezifische Verfahren zitiert oder übernommen werden. | assumed |
| Tibshirani/Walther, Prediction Strength, https://statistics.stanford.edu/technical-reports/cluster-validation-prediction-strength | Clustervalidierung über die Vorhersagekraft einer Clusterlösung auf unabhängigen Datensplits; setzt ausreichend große Stichproben pro Cluster voraus. | Setze Prediction Strength höchstens im High-N-Regime (TSX 13-50 und >50) ein; im Small-N-Regime (Bad-Gastein/SNT) ist die Methode nicht anwendbar. | assumed |
| Crosetto et al. 2016, PSI-Review, https://www.sciencedirect.com/science/article/pii/S0924271615002415 | Übersichtsarbeit zum Stand der Persistent-Scatterer-Interferometrie (Verfahren, Genauigkeiten, Anwendungen). | Als nicht regelbildend verworfen: alle für P7 relevanten PSI-Aussagen sind durch die beiden lokalen Handbooks gedeckt; nur als Hintergrundreferenz führen. | assumed |
| ESA SNAP Horizontal/Vertical Motion Operator, https://step.esa.int/main/wp-content/help/versions/9.0.0/snap-toolboxes/org.esa.s1tbx.s1tbx.op.insar.ui/operators/HorizontalVerticalMotionOp.html | Operative Implementierung der ASC+DSC-Dekomposition unter Annahme vernachlässigbarer N-S-Bewegung. | Als nicht regelbildend verworfen: Konventionen sind durch AUG Kap. 2.2.6 und TRE §2.1.2 gedeckt; nur als Implementierungsreferenz heranziehen, falls eine eigene Dekomposition gebaut wird. | assumed |
| Kirillov et al. 2023 (arXiv:2304.02643) und Ren et al. 2023 (arXiv:2304.13000) | Segment-Anything-Modelle liefern starke generische Segmentierung; die Übertragbarkeit auf Fernerkundungsdaten ist gemischt und domänenabhängig. | Halte automatische Dach-/Objektsegmentierung als Research-Spike außerhalb des kritischen Pfads; das Visual-Audit bleibt in P7 KI-Agenten-/Screenshot-basiert (Playwright). | assumed |

## Konsolidierte Pflichtregeln (Kurzreferenz für alle P7-Experimente)

1. Cross-Track-Vergleiche tragen immer `cross_track_pair_type` und laufen nur aggregiert mit Support-Gates auf beiden Tracks.
2. Vertikale Reprojektion und Vertical-Proxies gelten nur bei vernachlässigbarer Horizontalbewegung als Vertikalbewegung; in Hanglagen ist Cross-Track-Disagreement ein Signal, kein Fehler.
3. `coherence` und absolute Velocities werden nie cross-dataset mit gemeinsamer absoluter Schwelle verglichen; innerhalb-Dataset-Perzentile/Z-Scores verwenden.
4. SNT-Lagetoleranzen betragen konservativ 10-15 m, TSX/PAZ wenige Meter; HR-Pseudo-Referenz erzwingt nie exakte Punktkorrespondenzen.
5. DS-Punkte (`eff_area > 0`, nur TSX/PAZ relevant) werden als Patches behandelt und nie gebäudescharf zugeordnet.
6. SNT-vs-TSX-Vergleiche respektieren die nur ~7.5 Monate zeitliche Überlappung; Differenzen sind kein Clusterfehler, Common-Window-Refits nur als markiertes Experiment.
7. Gate-Exklusionsraten und n-Regime-Histogramme werden je `Dataset x Track` berichtet; Parameter-Sweeps werden nicht zwischen Regimen übertragen.
8. HDBSCAN-Parameter (`min_cluster_size`, `min_samples`, `eom`/`leaf`, `cluster_selection_epsilon`, `allow_single_cluster`) werden je Experiment vollständig protokolliert; OPTICS nie als stiller Fallback.
9. Interne Metriken sind Nebenindikator; Stabilität ist Veto-Guardrail; die Scorecard mit drei Primärsignalen ist das Bewertungsinstrument.
10. Velocity-Differenzen unter dem Präzisionsboden (~1-2 mm/a unter Idealbedingungen, dataset-spezifisch schlechter) werden nicht interpretiert.
11. Hang-AOIs sind Stress-AOIs mit Look-vs-Slope-/Visibility-Kontext; flache AOIs sind die einzigen Kalibrierungsanker.
12. Bewegungswerte werden als relativ zu trackspezifischem REF und Zeitnullpunkt geführt; konstante Track-Offsets sind erwartbar und werden modelliert statt wegdiskutiert.

## Abdeckung der Ticket-DoD

- HDBSCAN/OPTICS: Abschnitt 3 (hdbscan-Doku, scikit-learn) plus Regel 8.
- Interne Metriken: Abschnitt 3 (scikit-learn) plus Regel 9.
- Stabilität: Abschnitt 3 (Liu/Yu/Blair 2022) plus Regel 9.
- Cross-Track-InSAR: Abschnitte 1, 2 und 4 (AUG 2.2.4/2.2.6, TRE §2.1.2,
  Trackgeometrie-Audit) plus Regeln 1-2.
- Optische/Segmentierungsbewertung: Abschnitt 5 (SAM-Quellen, als
  Research-Spike eingestuft); Visual-Audit bleibt Playwright-basiert.
- Handbooks mit Seitenreferenzen zu PS/DS, LOS, Geokodierung, Referenzpunkt,
  Kohärenz, 2D-Dekomposition, Zeitreihenfeldern, Layover/Shadowing:
  Abschnitte 1 und 2.

## Bewusste Abweichungen / Offene Unsicherheiten

- EGMS ATBD wurde nicht direkt gelesen (Download-PDF); die für P7 tragende
  Kernaussage ist lokal durch TRE §2.1.2 (S. 19) als Primärquelle gedeckt.
  Vor Übernahme EGMS-spezifischer Details ist das ATBD direkt zu lesen.
- Prediction Strength (Tibshirani/Walther) ist im dominierenden
  Small-N-Regime von Bad-Gastein/SNT (~76 % der Gruppen < 6 Punkte) praktisch
  nicht anwendbar; sie bleibt auf High-N-Experimente (TSX/PAZ) beschränkt.
- Die Plan-Aussage "coherence < 0.5 gilt nach TRE-Handbook als zunehmend
  verrauscht" ist im TRE-Volltext nicht als explizite 0.5-Schwelle belegt;
  belegt sind nur die Modellfit-Semantik (TRE §2.1.1.2) und "> 0.7
  zuverlässig" (AUG Appendix 7.4). Kohärenzschwellen sind deshalb
  verteilungsbasiert je Dataset zu begründen, nicht über absolute Literaturwerte.
- AUG Tab. 1 (SNT ±8 m je Komponente) und TRE Tab. 1 (SNT Ost ±12 m) sind
  inkonsistent; die Matrix übernimmt konservativ 10-15 m als
  SNT-Matching-Toleranz.
- Das Datenfeld `coherence` entspricht der temporal coherence (Modellfit),
  nicht der Interferogramm-Kohärenz (TRE §11.2.2); Verwechslungsgefahr bei
  externer Kommunikation.
- Web-Verifikationsstand ist der 2026-06-09; die HDBSCAN-Dokumentation ist
  versioniert (Bibliothek `hdbscan` vs. `sklearn.cluster.HDBSCAN`), die
  Parameter-Semantik muss bei einem Bibliothekswechsel erneut geprüft werden.
- TSX/PAZ-Inzidenz liegt nur als Track-Konstante vor (51.68°/53.9°,
  Default-Fill); das Look-vs-Slope-/Visibility-Feature ist für TSX/PAZ daher
  nur näherungsweise berechenbar (für SNT per-Punkt).
- Der GBA-Höhenvergleich basiert auf 673 OSM-gematchten Gebäuden in Salzburg;
  die Übertragung des ~27-%-Unterschätzungsfaktors auf Bad Gastein ist eine
  Annahme und in `P7-A-W1-T6` zu prüfen.
- Die beiden Handbooks sind keine unabhängigen Quellen: das
  AUGMENTERRA-Handbuch beschreibt dieselbe SqueeSAR-Prozesskette und
  übernimmt mehrere Abbildungen direkt von TRE ALTAMIRA. Übereinstimmungen
  zwischen beiden sind daher Konsistenz innerhalb einer Methodenfamilie,
  keine unabhängige Bestätigung.
- Die Seitenangaben beziehen sich auf die gedruckten Seitenzahlen der
  PDF-Fußzeilen (AUG: Fußzeile = PDF-Seite minus 1; TRE: "Page n of 70").
