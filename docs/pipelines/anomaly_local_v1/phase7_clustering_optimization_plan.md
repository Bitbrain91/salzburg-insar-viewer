# `anomaly_local_v1` Phase 7 / Optimierungsphase 1

Stand: 2026-06-09 (revidiert nach unabhaengigem Review-Audit: Code-,
PostGIS-, Parquet- und Handbook-Verifikation)
Status: AUSGEFUEHRT und abgeschlossen (2026-06-10, zwei
Supervisor-Sessions). Die "Status: planned"-Felder der Tickets unten
sind der Planungsstand und werden nicht einzeln nachgepflegt -
massgeblich fuer den Ausfuehrungsstatus ist die Ticket-Gesamttabelle in
`phase7_clustering_optimization_report.md` (alle green; P7-C-W2-T3
deferred per User-Entscheidung). Ergebnis: integrate_candidate = k2x,
produktiv seit `MODEL_SET_VERSION local_hdbscan_rulegate_v2_k2x`;
Folgepunkte in `next_steps.md` (P7-N1..N7).

Kurzname: `phase7_clustering_optimization`

Dieser Plan ist der Umsetzungsplan fuer die erste Optimierungsphase der bestehenden
ML-Pipeline. Im Forschungsprojekt ist es die "Phase-1-Optimierung" der bereits
implementierten Pipeline `anomaly_local_v1`; in der Repo-Historie wird sie als
`P7` weitergefuehrt, weil `P1` bis `P6` der Pipeline schon existieren.

## Projekt- und Anwendungskontext

Der Viewer ist eine Forschungs- und Analyseanwendung fuer InSAR-basierte
Gebaeudebewegungen:

- Frontend: React, Vite, MapLibre, Layer- und Inspector-UI.
- Backend: FastAPI, PostGIS, MBTiles, ML-Run-API und MLflow-Tracking.
- Daten: Salzburg/SNT und Bad Gastein/SNT plus Bad Gastein/TSX-PAZ,
  GBA-Gebaeudepolygone, OSM, Terrain-Kontext, Displacement- und optionale
  Amplituden-Zeitreihen.
- Bad-Gastein/SNT Track 22 ist durch AUGMENTERRA bestaetigt und im Viewer als
  verifizierter Descending Track integriert: Blickrichtung `280.2 deg`,
  Sensor-Bearing `100.2 deg`, Einfallswinkel `45.66 deg`.
- Aktuelle Pipeline: `anomaly_local_v1`, lokal pro `Gebaeude x Track`.

Die Pipeline beantwortet aktuell:

1. Welche InSAR-Punkte werden einem Gebaeude zugeordnet?
2. Welche Punkte bleiben nach Gate-Regeln fuer die Auswertung?
3. Welche lokalen Cluster entstehen pro `Gebaeude x Track`?
4. Welcher Cluster ist der `main_cluster`?
5. Ist das Gebaeude trackuebergreifend plausibel?
6. Welche Punkte/Cluster/Gebaeude sind auffaellig oder nur schwach gestuetzt?

Die neue Forschungsfrage liegt nicht mehr bei "lokal statt global", sondern bei
der Qualitaet der lokalen Clusterentscheidung und ihrer Evaluation ohne echte
Ground-Truth-Daten.

## Aktueller technischer Startpunkt

Produktiver Code:

- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/ml/track_geometry.py`
- `backend/app/ml/rollups.py`

Aktuelle Clustering-Semantik:

- `< 3` behaltene Punkte pro `Gebaeude x Track`: `insufficient_support`.
- `3-5` behaltene Punkte: Small-N-Fallback mit Ein-Cluster-Hypothese.
- `>= 6` behaltene Punkte: HDBSCAN. Aktuell existiert ein stiller
  OPTICS-Runtime-Fallback bei fehlendem `hdbscan`-Import; per
  User-Entscheidung 2026-06-10 wird dieser ENTFERNT (`P7-A-W1-T5`):
  `hdbscan` wird harte Dependency, fehlender Import ist ein harter Fehler.
  OPTICS bleibt als explizit waehlbarer Vergleichsalgorithmus im
  Experiment-Harness erhalten - niemals als stiller Ersatz.
- HDBSCAN-Default:
  - `allow_single_cluster=True`
  - `cluster_selection_method="eom"`
  - `min_cluster_size=max(2, min(8, ceil(0.2 * n)))`
  - `min_samples=max(1, floor(min_cluster_size / 2))`
  - `metric="euclidean"`
- Cluster-Matrix:
  - `along_look_offset_m` Gewicht `1.10`
  - `cross_look_offset_m` Gewicht `1.00`
  - `height_rank_in_building` Gewicht `0.75`
  - `velocity` Gewicht `1.30`
  - `acceleration` Gewicht `0.90`
  - `coherence_penalty` Gewicht `0.80`
  - `RobustScaler(quantile_range=(15, 85))`
- Nach HDBSCAN/OPTICS existiert ein Borderline-Noise-Reassignment.
- `P6` hat `keep_2d_vector` entschieden. Candidate-Area- und Track-Geometrie
  sind nicht primaeres Thema dieser Optimierungsphase.

Bekannte Schwachstellen:

- Small-N-Fragilitaet, insbesondere weak secondary track.
- Cross-Track-Vergleich kann irrefuehren, wenn ein Track zu wenige Punkte,
  andere Gebaeudeteile oder nur Nebengebaeude/Anbauten sieht.
- `nearest`-lastige Gebaeude koennen scheinbar gute Cluster zeigen, obwohl die
  Gebaeudezuordnung unsicher ist.
- Der `nearest`-Fallback (<= 15 m) nimmt Punkte OHNE geometrische
  Begruendung auf (weder Polygon noch blickwinkel-korrigierte
  Candidate-Area). Fremdobjekte wie Carports/Schuppen fehlen im GBA und
  koennen daher vom P3-Nachbarschafts-Check nie als wahre Quelle erkannt
  werden - ihre Punkte fallen zwangslaeufig dem naechsten echten Gebaeude zu
  (realer User-Befund; siehe Asymmetrie-Prinzip und `P7-C-W1-T5`).
- Multi-Cluster-Faelle duerfen nicht weggeglattet werden, weil sie echte
  Dach-/Anbau-/differenzielle Bewegungsstruktur enthalten koennen.
- Hangausrichtung und Blickrichtung koennen in Bad Gastein starke
  trackabhaengige Unterschiede erzeugen.
- Es gibt keine vollwertige Ground Truth.

Verifizierter Implementierungsstand Cross-Track (Code-Audit 2026-06-09):

- `_build_building_rollup` in `anomaly_local_v1.py` berechnet
  `track_agreement_score`, `diff_before_mm_a`/`diff_after_mm_a` und
  `full_support` hartkodiert nur fuer das Trackpaar `44/95`.
- Konsequenz Bad-Gastein/SNT: Track 22 fliesst in `main_tracks`,
  `building_status` und `building_motion_mm_a` ein, wird im Track-Agreement
  aber vollstaendig ignoriert. Ein Gebaeude mit Main-Clustern nur auf `22+44`
  oder `22+95` zaehlt als Zwei-Track-Gebaeude ohne jeden Agreement-Check.
- Konsequenz Bad-Gastein/TSX-PAZ: `track_agreement_score` ist immer `NULL`
  und `full_support` immer `false` (verifiziert: Smoke-Run `c9f9f55d` hat
  `buildings_with_full_track_support = 0`). `cross_track_consistency` faellt
  im Quality-Score auf den Neutralwert `0.50` zurueck, die
  `cross_track_mismatch`-Penalty feuert nie.
- Folge fuer P7: Cross-Track-Diagnostik fuer Bad Gastein muss in `P7-B`
  harness-seitig dataset-agnostisch berechnet werden (alle Main-Cluster-Paare
  je Dataset, inkl. Paartyp, siehe Cross-Track-Abschnitt). Baseline-Werte aus
  der Pipeline duerfen fuer TSX/PAZ und Track 22 nicht als "Cross-Track ok"
  gelesen werden, sondern als "nicht berechnet". Eine produktive
  Generalisierung des Rollups ist eine Pipeline-Aenderung und laeuft
  ausschliesslich ueber `P7-E` als Kandidat.
- Ebenfalls 44/95-gebunden: `phase2_harness.py` (fixe Salzburg-AOIs und
  Run-IDs, fuer Bad-Gastein-Baselines nicht direkt nutzbar) und die
  Candidate-Area-Farben im Frontend (`MapView.tsx`
  `focusCandidateColorExpression`: Tracks 22/70/93 fallen auf Grau zurueck,
  fuer TSX/PAZ-Visual-Audits sind Candidate-Areas farblich nicht nach Track
  unterscheidbar).

## Research-Synthese

### Clustering ohne Ground Truth

Es gibt keine einzelne Metrik, die uns ohne Labels sagt, welches Clustering
"richtig" ist. Die externe Literatur stuetzt deshalb einen mehrschichtigen
Evaluationsansatz:

- Interne Metriken wie Silhouette, Calinski-Harabasz oder Davies-Bouldin messen
  Geometrie, aber nicht fachliche Wahrheit. Scikit-learn dokumentiert diese als
  nutzbar, wenn Ground Truth fehlt, weist aber auch auf Strukturannahmen hin.
- ARI/NMI/AMI brauchen normalerweise Ground Truth. Sie sind fuer uns trotzdem
  nuetzlich, wenn wir zwei Partitionen derselben oder vergleichbarer Objekte
  vergleichen: Bootstrap-Stabilitaet, Cross-Track-Konsistenz oder
  High-Resolution-vs-Low-Resolution-Pseudo-Referenz.
- Stabilitaet unter Resampling ist ein etablierter Ersatz fuer fehlende Labels:
  Cluster werden als glaubwuerdiger betrachtet, wenn sie bei leichten
  Perturbationen, Subsampling und Feature-Rauschen erhalten bleiben.
- HDBSCAN ist fuer variable Dichten und Noise passend, aber seine Parameter
  sind nicht frei interpretierbar: `min_cluster_size` definiert die kleinste
  fachlich akzeptierte Gruppe, `min_samples` macht die Clusterung konservativer
  und erzeugt mehr Noise.

Konsequenz:

Die Phase optimiert nicht auf eine einzige Zahl. Sie baut eine Scorecard aus
(Gewichtung per User-Entscheidung 2026-06-10):

- Domain-Guardrails,
- PRIMAER: Cross-Track-Konsistenz mit Support-Gates,
- PRIMAER: High-Resolution-Pseudo-Referenz (Bad Gastein),
- PRIMAER: Experten-Analyse der Ergebnisdaten plus Visual-Audit,
- Nebensignal: Sensitivitaet/Konfidenz (Messrauschen-Perturbation,
  Leave-one-out; Bootstrap nur fuer High-N, siehe Abschnitt 3),
- internen Metriken als Nebenindikator.

### InSAR-spezifische Evaluation

InSAR misst LOS-Bewegung, nicht direkt vertikale Bewegung. Ascending und
Descending koennen daher nicht blind direkt verglichen werden. Das EGMS ATBD
formuliert explizit, dass Sentinel-1 ASC/DSC-Messungen nicht direkt vergleichbar
sind und eine vertikale Reprojektion nur bei vernachlaessigbarer horizontaler
Bewegung echte Vertikalbewegung liefert.

Konsequenz:

- Cross-Track ist ein starker Plausibilitaetsindikator, aber kein Ground Truth.
- Cross-Track darf nur gewertet werden, wenn beide Tracks ausreichend Support,
  vergleichbare Gebaeudeteile und hinreichende Assignment-Qualitaet haben.
- In Hanglagen muss Cross-Track als Stresssignal statt als harte Wahrheit
  behandelt werden.
- Bad-Gastein/TSX-PAZ kann als hochaufloesende Pseudo-Referenz dienen, aber
  wegen anderer Sensor-/Blickgeometrie nicht als absolute Wahrheit.

Dieselbe Kernaussage steht auch im lokalen TRE-Handbook (Teil 1, §2.1.2):
"measurements obtained from different LOS cannot be directly compared" und
die vertikale Reprojektion liefert nur bei vernachlaessigbarer
Horizontalbewegung echte Vertikalbewegung. Die EGMS-ATBD-Referenz ist damit
lokal durch eine Primaerquelle gedeckt.

Tracküberlappung und Paartypen:

Bad Gastein liegt in der Ueberlappungszone zweier Descending-Tracks
(22: look `280.2 deg`, incidence `45.66 deg`; 95: look `281.5 deg`,
incidence `37.16 deg`). Daraus folgt eine fachliche Unterscheidung, die der
bisherige, undifferenzierte "Cross-Track"-Begriff verdeckt:

- `same_geometry`-Paare (DSC-DSC, z. B. 22/95): nahezu gleiche
  Blickrichtung, Differenz im Wesentlichen im Einfallswinkel. Der Vergleich
  der Vertical-Proxies ist weitgehend insensitiv gegen Ost-West-Bewegung
  und misst primaer Prozessierungs-/Rausch-/Clusterkonsistenz. Er ist die
  schaerfste verfuegbare Redundanzpruefung, aber kein Ersatz fuer eine
  ASC/DSC-Pruefung.
- `opposite_geometry`-Paare (ASC-DSC, z. B. 44/95, 93/70): enthalten den
  Horizontalanteil mit entgegengesetztem Vorzeichen. Disagreement ist hier
  nicht automatisch ein Fehler, sondern in Hanglagen ein erwartbares
  Horizontalbewegungssignal.
- Auch Tracks desselben Datasets haben je Track einen eigenen Referenzpunkt
  und ein eigenes Zeitraster (TRE-Handbook: REF ist imagery-abhaengig).
  Kleine konstante Offsets zwischen Track-Velocities sind deshalb auch
  innerhalb eines Datasets normal; die bestehende Toleranz
  `1.0 + 0.15 * slope` faengt das implizit, muss aber bei
  Inzidenzunterschieden (22: cos=0.70, 95: cos=0.80; TSX: 0.59-0.62)
  als unterschiedliche Rauschverstaerkung des Vertical-Proxy mitgedacht
  werden.

### Handbook-abgeleitete Pflichtregeln

Die beiden lokalen Handbooks
`docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf` und
`docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf` verschaerfen
einige Planregeln:

- Ein SqueeSAR-Messpunkt ist nicht immer ein punktfoermiger Reflektor. PS sind
  punktweise Scatterer, DS stehen fuer statistisch homogene Flaechen/Patches.
  `eff_area = 0` deutet PS an, `eff_area > 0` DS. Cluster- und Visual-Audit-
  Logik muss DS als Flaecheninformation behandeln.
- SNT und TSX/PAZ haben unterschiedliche typische Geokodierungsgenauigkeit.
  AUGMENTERRA-Handbook Tabelle 1: SNT ±`8 m` je Komponente, TSX
  N ±`1 m` / O ±`3 m` / H ±`1.5 m`. TRE-Handbook Tabelle 1 nennt fuer
  C-Band-SNT Ost sogar ±`12 m` (1 sigma, <1 km vom REF, >=30 Szenen).
  Konservative SNT-Matching-Toleranz daher eher `10-15 m` als `8 m`;
  HR-Pseudo-Referenz darf keine exakten Punktuebereinstimmungen erzwingen.
  Fuer DS-Punkte kommt die Patch-Ausdehnung hinzu (`sqrt(eff_area)` als
  zusaetzliche Lageunsicherheit).
- Alle Bewegungen sind relativ zu Referenzpunkt und erstem Akquisitionsdatum.
  Absolute Bewegungswerte zwischen unabhaengigen Prozessierungen duerfen nur
  verglichen werden, wenn Referenzpunkt, Zeitraum und zeitliche Abtastung
  kompatibel sind oder die Unsicherheit explizit modelliert ist.
- `coherence` ist temporal/model-fit-bezogen und nicht direkt zwischen
  unabhaengigen SqueeSAR-Prozessierungen vergleichbar. Fuer Cross-Dataset-
  Experimente sind innerhalb-Dataset-Perzentile oder Z-Scores zu bevorzugen.
- `h_stdev`, `v_stdev`, `a_stdev`, `s_amp_std`, `s_phs_std`, `eff_area` und
  `incidence_angle` sind fachlich relevante Qualitaets-/Geometriefelder. Die
  Phase muss pruefen, ob diese Felder in Rohdaten, Parquet und PostGIS voll
  verfuegbar sind, bevor sie als Features genutzt werden.
- Layover, Foreshortening und Shadowing sind in steiler Topografie echte
  Interpretationsgrenzen. Hangstress-AOIs brauchen ein Sichtbarkeits- oder
  Look-vs-Slope-Signal, sofern der vorhandene Terrain-Kontext das traegt.
- Phase-Unwrapping, Datenluecken und stark nichtlineare Bewegung koennen Werte
  unzuverlaessig machen. Zeitreihenabdeckung, Gap-Struktur und Step-/Roughness-
  Features sind deshalb nicht nur Modellfeatures, sondern Qualitaetsgates.

### Aktuelle Datenlage zu PS/DS und Amplituden

PostGIS-Audit vom 2026-06-09:

- `eff_area` ist in `insar_points` vorhanden.
- Salzburg/SNT Track 44/95: alle Punkte `eff_area = 0`, also PS-like.
- Bad-Gastein/SNT Track 22/44/95: alle Punkte `eff_area = 0`, also PS-like.
- Bad-Gastein/TSX-PAZ:
  - Track 70: `62,162` Punkte mit `eff_area > 0` von `288,146`.
  - Track 93: `107,861` Punkte mit `eff_area > 0` von `512,017`.
  - Diese Punkte sind DS-like und muessen als Patch-/Flaecheninformation
    bewertet werden.
- `amp_mean`/`amp_std` sind aktuell nur fuer Salzburg/SNT gefuellt
  (`246,865` T44-Punkte und `242,836` T95-Punkte).
- Bad-Gastein/SNT und Bad-Gastein/TSX-PAZ haben aktuell keine geladenen
  Amplitudenfeatures und keine Amplituden-Zeitreihen-Parquets. Fuer TSX/PAZ
  duerfen Experimente daher keine AMP-Features voraussetzen.
- DS-Anteil in den urbanen AOI-Zellen ist deutlich niedriger als global:
  in `bg_flat_01` z. B. T70 `227/3152` und T93 `171/3598` DS-Punkte
  (~5-8 % statt ~21 % global). DS-Patches liegen ueberwiegend auf
  Nicht-Gebaeudeflaechen; `eff_area` reicht bis ~`740 m²`, d. h. ein
  DS-Patch kann einen Lagedurchmesser von ~`30 m` haben und darf nicht als
  exakter Dachpunkt einem einzelnen Gebaeude zugeschrieben werden.

### Beobachtungszeitraeume und zeitliche Kompatibilitaet (Parquet-Audit 2026-06-09)

| Dataset/Track | Epochen | Zeitraum |
| --- | ---: | --- |
| Salzburg/SNT T44 | 90 | 2022-04-05 .. 2025-03-20 |
| Salzburg/SNT T95 | 88 | 2022-04-09 .. 2025-03-24 |
| Bad-Gastein/SNT T22 | 90 | 2022-10-01 .. 2025-09-27 |
| Bad-Gastein/SNT T44 | 92 | 2022-10-02 .. 2025-09-28 |
| Bad-Gastein/SNT T95 | 90 | 2022-10-06 .. 2025-09-20 |
| Bad-Gastein/TSX-PAZ T70 | 57 | 2021-05-15 .. 2023-05-26 |
| Bad-Gastein/TSX-PAZ T93 | 65 | 2021-05-20 .. 2023-05-27 |

Harte Konsequenzen:

- Bad-Gastein/SNT und Bad-Gastein/TSX-PAZ ueberlappen zeitlich nur etwa
  `2022-10` bis `2023-05` (~7.5 Monate, ~2/3 der Zeitreihen disjunkt).
  Velocity-/Bewegungsvergleiche SNT vs. TSX/PAZ vergleichen damit
  weitgehend verschiedene Zeitraeume; bei nichtlinearer Bewegung sind
  Abweichungen erwartbar und kein Clusterfehler.
- Ein Common-Window-Velocity-Refit auf dem Ueberlappungsfenster haette fuer
  SNT nur ~18-19 Epochen und laege unter dem produktiven Gate
  `min_valid_epochs = 24`; er ist als hartes Gate nicht zulaessig und
  hoechstens als explizit markiertes Experiment erlaubt.
- Die drei Bad-Gastein-SNT-Tracks sind untereinander zeitlich kompatibel
  (gleiches Fenster, 90-92 Epochen); Salzburg/SNT liegt ~6 Monate versetzt.

### Kohaerenzregime und Gate-Selektivitaet (Parquet-Audit 2026-06-09)

| Dataset/Track | coh p05 | coh Median | Anteil `< 0.45` |
| --- | ---: | ---: | ---: |
| Salzburg/SNT T44 | 0.46 | 0.73 | 3.2 % |
| Salzburg/SNT T95 | 0.47 | 0.73 | 2.8 % |
| Bad-Gastein/SNT T22 | 0.41 | 0.49 | 23.9 % |
| Bad-Gastein/SNT T44 | 0.42 | 0.51 | 17.1 % |
| Bad-Gastein/SNT T95 | 0.41 | 0.49 | 24.2 % |
| Bad-Gastein/TSX-PAZ T70 | 0.53 | 0.65 | 0.1 % |
| Bad-Gastein/TSX-PAZ T93 | 0.52 | 0.62 | 0.2 % |

Harte Konsequenzen:

- Der universelle Kohaerenz-Floor `0.45` im Gate
  `max(0.45, track_p05)` ist auf Salzburg kalibriert (schneidet ~3 %) und
  schneidet in Bad-Gastein/SNT `17-24 %` aller Punkte vor jeder Clusterung.
  Das verschiebt die n-Regime massiv Richtung Small-N/insufficient.
- Nach TRE-Handbook gilt `coherence < 0.5` als zunehmend verrauscht; rund
  die Haelfte der Bad-Gastein-SNT-Punkte liegt unter 0.5. Die erwartbare
  Clusterqualitaet in Bad Gastein/SNT ist darum strukturell schlechter als
  in Salzburg; Scorecard-Erwartungen muessen dataset-spezifisch kalibriert
  werden, nicht von Salzburg uebertragen.
- `P7-A-W1-T1` muss Gate-Exklusionsraten je Dataset/Track/Grund berichten.
  Der absolute Floor `0.45` ist ein dokumentiertes Generik-Risiko im Sinne
  des Projektziels "keine gebietsspezifischen Handschwellen": eine
  selbstadaptive Gate-Variante (verteilungs-/perzentilbasiert je
  `dataset x track`) ist deshalb eine regulaere Experimentachse in `P7-C`,
  als produktive Aenderung aber nur ueber `P7-E`.

### Gemessene n-Regime-Verteilung (kept Punkte pro `Gebaeude x Track`)

Aus realen Runs (Mirabell `2c4cec7b`, Bad-Gastein-Smoke-Runs `c7515149`
SNT / `c9f9f55d` TSX, jeweils bbox-lokal, Audit 2026-06-09):

| Dataset | `<3` | `3-5` | `6-12` | `13-50` | `>50` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Salzburg/SNT (Mirabell) | 22 % | 18 % | 34 % | 22 % | 4 % |
| Bad-Gastein/SNT (Smoke) | 39 % | 37 % | 21 % | 3 % | 0 % |
| Bad-Gastein/TSX-PAZ (Smoke) | 13 % | 13 % | 24 % | 42 % | 8 % |

Harte Konsequenzen:

- In Bad-Gastein/SNT liegen ~3/4 aller Gruppen unter 6 Punkten: dort
  entscheidet die Small-N-/Gate-Logik, nicht der HDBSCAN-Parameterraum.
  HDBSCAN-Sweep-Ergebnisse aus Salzburg sind nicht auf Bad-Gastein/SNT
  uebertragbar.
- In TSX/PAZ dominiert `13-50` (42 %) plus relevantes `>50`-Segment: die
  High-N-Strategie (`P7-C-W2-T2`) ist dort kein Spike-Luxus, sondern
  betrifft das Hauptregime.
- `P7-A-W1-T1` muss diese Histogramme fuer alle Pflicht-AOIs ausweisen und
  einfrieren.

### Track-22-Abdeckung (PostGIS-Audit 2026-06-09)

- Track 22 deckt nur den Ostteil des Gebiets ab:
  lon `13.168..13.276`, lat `47.041..47.144` (78,226 Punkte).
- Alle sieben AOI-Kandidaten (`bg_flat_01..04`, `bg_slope_01..03`) liegen
  westlich von lon `13.145` und haben `0` Track-22-Punkte. Die
  SNT-Totalwerte in der AOI-Tabelle unten bestehen ausschliesslich aus
  T44+T95.
- Die Tracknutzung von Track 22 fuer Gebaeude-Evaluation ist damit nur in
  einer eigenen Ost-Overlap-AOI moeglich, sofern dort genug Gebaeude mit
  Punkten aller drei Tracks existieren; eine Zellsuche
  (`0.003 deg`-Raster, `n22/n44/n95 >= 30`, `>= 3` Gebaeude) fand keinen
  Kandidaten. Im gesamten Track-22-Gebiet haben nur `20` GBA-Gebaeude
  Track-22-Punkte in ~30-m-Naehe (insgesamt `259` Punkte): Track 22 sieht
  ueberwiegend Nicht-Gebaeude-Ziele (Haenge/Infrastruktur).
  `P7-A-W1-T3` muss die Track-22-Verfuegbarkeit pro AOI explizit ausweisen;
  `P7-B-W1-T4` darf Track 22 mit dieser Datenlage begruendet auslassen oder
  als reine Punkt-/Nicht-Gebaeude-Diagnose im Osten fuehren
  (DSC-DSC-Redundanz, siehe Cross-Track-Abschnitt).

### Feldverfuegbarkeit Qualitaets-/Geometriefelder (Audit 2026-06-09)

- In Parquet UND PostGIS (`insar_points`) fuer alle Datasets vollstaendig
  befuellt: `velocity_std`, `height_std`, `acceleration_std`, `s_amp_std`,
  `s_phs_std`, `season_phs`, `eff_area`, `incidence_angle`.
  Achtung Namenskonvention: Handbook `h_stdev/v_stdev/a_stdev` heissen in
  Daten/DB `height_std/velocity_std/acceleration_std`.
- Die produktive Pipeline-Query selektiert `height_std`,
  `acceleration_std`, `s_amp_std`, `s_phs_std`, `season_phs` aktuell NICHT;
  fuer Feature-Experimente muss der Harness sie zusaetzlich laden (kein
  Loader-Blocker).
- TSX/PAZ hat `incidence_angle`/`look_angle` nur als Track-Konstante
  (51.68/53.9 bzw. 279.45/83.77, Default-Fill); SNT hat per-Punkt-Inzidenz.
- Per-Punkt-Terrain existiert in `insar_point_terrain` (Parquet + PostGIS):
  `slope_deg`, `aspect_deg` pro Punkt (~1.68M Zeilen). Ein
  Look-vs-Slope-/Sichtbarkeits-Feature (Foreshortening/Layover/Shadow-Proxy
  nach TRE-Handbook Teil 2, §9.1) ist damit ohne neues Datenprodukt
  berechenbar.

### GBA-Gebaeudehoehen (Audit 2026-06-10)

User-Verdacht bestaetigt, aber KEIN Lade-/Interpretationsfehler unserer
Pipeline - die Werte stehen so in den Rohdaten:

- `data/gba/salzburg_gba.geojson` enthaelt `height` (Meter) plus `var`
  (Schaetzvarianz); der Loader uebernimmt 1:1. GBA ist ein
  satellitenbasiertes LoD1-Schaetzprodukt mit gemischten Footprint-Quellen
  (`source: ms|osm`) inklusive Kleinststrukturen (Garagen/Schuppen,
  Hoehen < 1 m).
- Verteilung: Salzburg Median `4.49 m`, p90 `7.65 m`, Maximum `30.4 m` im
  gesamten Datensatz; Bad Gastein Median `3.22 m`, Maximum `17.8 m`.
- Vergleich mit oeffentlichen OSM-Hoehen (673 gematchte Gebaeude, Salzburg):
  Median-Verhaeltnis GBA/OSM = `0.735` (~27 % Unterschaetzung); gegen
  `building:levels * 3 m`: `0.824`.
- Saettigung bei hohen Gebaeuden: Salzburger Dom OSM `78 m` -> GBA `27.4`;
  Hotel Europa `56` -> `29.6`; Tower Eleven `43.5` -> `11.7`;
  Kollegienkirche `29` -> `10.8`; Hotel Stein `22` -> `4.3`.
- Die mitgelieferte Unsicherheit `var` wird aktuell nirgends genutzt.

Pipeline-Konsequenz: `range_offset = height * tan(incidence)` macht die
Candidate-Areas systematisch zu kurz (im Median ~27 %, bei
Tuermen/Hotels um Faktor 2-4). Echte Dachpunkte fallen dadurch aus der
Candidate-Area und rutschen in den unbegruendeten `nearest`-Fallback -
das erklaert mutmasslich einen Teil der ~30 % nearest-Quote und verstaerkt
den Carport-Befund. Behandlung: `P7-A-W1-T6` (Hoehenstrategie) als Input
fuer `P7-C-W1-T5`.

### Optische Luftbild-/Satellitenbildanalyse

Visuelle Analyse kann typische Fehler erkennen:

- Hauptdach und Carport werden als ein Cluster gemischt.
- Wintergarten/Vorhaus/Nebengebaeude wird faelschlich Hauptcluster.
- Cluster-Huellen liegen sichtbar auf einem Nachbarobjekt.
- Track A und Track B sehen unterschiedliche Gebaeudeteile.

Diese visuelle Bewertung ist in V1 kein automatisches Labelsystem, sondern ein
KI-Agenten-Audit ueber Playwright-Screenshots des Viewers mit Satelliten-/Luftbild,
Gebaeudeumriss, Candidate-Areas, Cluster-Huellen, Punkten und Track-Filter. Sie
wird als qualitative Guardrail und Failure-Taxonomie verwendet.

Automatische Segmentierung, z. B. mit Segment Anything oder Remote-Sensing-SAM-
Varianten, ist ein sinnvoller Folgeschritt. Fuer diese Phase bleibt sie ein
Research-Spike, nicht der kritische Pfad.

## Externe Quellenbasis

Diese Quellen sind Startpunkte fuer die Supervisor-Session; sie muessen bei der
Ausfuehrung aktualisiert und bei Bedarf erweitert werden:

- HDBSCAN Parameter Selection:
  https://hdbscan.readthedocs.io/en/latest/parameter_selection.html
- scikit-learn Clustering Metrics:
  https://scikit-learn.org/stable/modules/clustering.html
- Liu, Yu, Blair 2022, Stability estimation for unsupervised clustering:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9787023/
- Tibshirani/Walther, Prediction Strength:
  https://statistics.stanford.edu/technical-reports/cluster-validation-prediction-strength
- Crosetto et al. 2016, Persistent Scatterer Interferometry review:
  https://www.sciencedirect.com/science/article/pii/S0924271615002415
- Copernicus EGMS Algorithm Theoretical Basis Document:
  https://land.copernicus.eu/en/technical-library/egms-algorithm-theoretical-basis-document/@@download/file
- ESA SNAP Horizontal/Vertical Motion operator:
  https://step.esa.int/main/wp-content/help/versions/9.0.0/snap-toolboxes/org.esa.s1tbx.s1tbx.op.insar.ui/operators/HorizontalVerticalMotionOp.html
- Kirillov et al. 2023, Segment Anything:
  https://arxiv.org/abs/2304.02643
- Ren et al. 2023, Segment anything, from space?:
  https://arxiv.org/abs/2304.13000

## Lokale Bad-Gastein-AOI-Kandidaten

Aus PostGIS wurde am 2026-06-08 eine zellbasierte Voranalyse gerechnet. Zellgroesse:
`0.003 deg x 0.003 deg`. Punktzaehlung ist eine Dichte-/AOI-Vorauswahl, keine
exakte Pipeline-Gebaeudezuordnung.

Flache Kandidaten fuer High-Resolution-Pseudo-Referenz:

| ID | BBox | Gebaeude | avg slope | avg relief | SNT total | TSX/PAZ total | Zweck |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `bg_flat_01` | `13.132531,47.106449,13.135531,47.109449` | 72 | 2.85 | 0.31 | 1195 | 6750 | primaerer flacher HR-Vergleich |
| `bg_flat_02` | `13.117531,47.091449,13.120531,47.094449` | 113 | 2.74 | 0.12 | 581 | 3877 | dichte flache Kontrollzelle |
| `bg_flat_03` | `13.138531,47.124449,13.141531,47.127449` | 106 | 3.76 | 0.25 | 1125 | 4657 | flache Kontrollzelle mit vielen Gebaeuden |
| `bg_flat_04` | `13.135531,47.127449,13.138531,47.130449` | 37 | 2.20 | 0.46 | 548 | 2193 | sehr flache Zusatzkontrolle |

Hang-/Stress-Kandidaten erst nach flacher Kalibrierung:

| ID | BBox | Gebaeude | avg slope | avg relief | SNT total | TSX/PAZ total | Zweck |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `bg_slope_01` | `13.138531,47.118449,13.141531,47.121449` | 55 | 20.34 | 3.66 | 717 | 4209 | primaerer Blickrichtungs-/Hangstress |
| `bg_slope_02` | `13.135531,47.115449,13.138531,47.118449` | 30 | 23.21 | 3.73 | 323 | 2015 | steiler HR-Vergleich |
| `bg_slope_03` | `13.141531,47.121449,13.144531,47.124449` | 32 | 21.83 | 5.53 | 385 | 1961 | steiler Zusatzstress |

Diese BBoxen sind initiale Gate-AOIs. `P7-A-W1-T3` muss sie mit exakter
Gebaeude-/Pipeline-Semantik verifizieren und darf sie ersetzen, wenn ein besserer
flacher oder steiler Kandidat datenbasiert belegt wird.

Verifikationsstand 2026-06-09: Die SNT-/TSX-Punktsummen der Tabellen wurden
in PostGIS exakt bestaetigt (z. B. `bg_flat_01`: SNT 561+634=1195,
TSX 3152+3598=6750). Wichtig: alle SNT-Summen bestehen nur aus T44+T95;
Track 22 hat in keiner Kandidatenzelle Punkte (Abdeckung nur lon >= ~13.168,
siehe Datenlage-Abschnitt). Der AOI-Katalog (`P7-A-W1-T3`) muss deshalb pro
AOI ausweisen: verfuegbare Tracks je Dataset, Punktzahl je Track,
DS-Punktanteil je Track, Beobachtungsfenster je Dataset und
`temporal_overlap_days` zwischen SNT und TSX/PAZ.

## Zielbild

Projektrahmen (User-Klarstellung 2026-06-09):

- Das Produktziel ist und bleibt ein sinnvolles, belastbares Clustering auf
  den flaechig verfuegbaren Daten Track 44/95 (Sentinel). Bad-Gastein/TSX-PAZ,
  Track 22, Visual-Audit und alle weiteren Quellen sind
  VALIDIERUNGSINSTRUMENTE fuer diese Zielpipeline, keine Datenfusion und kein
  gemeinsames Clustering ueber Sensoren hinweg.
- Das Kernproblem dieser Phase ist Validierung: Wie gut ist das Clustering,
  wie verlaesslich ist der Motion-Score? Bisher traegt das fast allein die
  ASC/DSC-Kreuzpruefung; Phase 7 baut zusaetzliche, unabhaengige
  Validierungsachsen (HR-Pseudo-Referenz, Stabilitaet, Experten-/Visual-Audit).
- Generik vor Feintuning: AUGMENTERRA setzt heute pro Gebiet manuell
  Schwellenwerte; erklaertes Projektziel ist ein moeglichst generischer
  Algorithmus, der sich selbststaendig an die Datenverteilung eines Gebiets
  anpasst (perzentil-/verteilungsbasierte statt absolute Parameter).
  Gebietsspezifisch handgesetzte Schwellen sind ein Anti-Ziel, auch wenn sie
  kurzfristig Metriken verbessern.

Phase 7 liefert eine belastbare, reproduzierbare Entscheidung:

- Welche Clustering-Strategie ist fuer welchen Punktzahlbereich sinnvoll?
- Welche Parameter und Features verbessern die Pipeline wirklich?
- Wann ist Cross-Track-Konsistenz valide, und wann muss sie als unsicher
  markiert werden?
- Wie gut stimmen Salzburg/SNT und Bad-Gastein/SNT gegen
  Bad-Gastein/TSX-PAZ als hochaufloesende Pseudo-Referenz?
- Welche Fehler werden in der optischen KI-Analyse sichtbar?
- Wird ein Kandidat produktiv integriert, oder bleibt der aktuelle Stand?

Erlaubte Abschlussentscheidungen:

- `keep_current`: kein Kandidat schlaegt Baseline und Guardrails klar.
- `integrate_candidate`: genau ein Kandidat ist klar besser und wird integriert.
- `defer`: wichtige Daten, Expertenlabels oder Runtime-Voraussetzungen fehlen.
- `inconclusive`: sauber experimentiert, aber keine belastbare Entscheidung.

## Fachliches Zielbild: Was ist ein gutes Cluster?

Phase 7 optimiert nicht auf Clustering-Metriken, sondern auf diese fachliche
Zieldefinition. Ein Cluster pro `Gebaeude x Track` ist gut, wenn es eine
physisch zusammenhaengende, kinematisch homogene Teilstruktur des Gebaeudes
repraesentiert:

1. Physische Traegerschaft: Die Punkte liegen auf demselben Bauteil
   (Hauptdach/-flaeche, Fassade, Turm, Anbau), nicht verstreut ueber
   Fremdobjekte. Operationalisierung: Cluster-Huelle liegt im Gebaeudepolygon
   plus sensorbedingter Range-Toleranz; hoher Anteil
   `within`/`directional_buffer`; `nearest`-Punkte duerfen ein Cluster nicht
   dominieren.
2. Kinematische Homogenitaet: Konsistente Bewegung innerhalb des Clusters
   (enge Velocity-Streuung relativ zum Track-Rauschniveau, konsistente
   Zeitreihenform). Abweichler werden als Noise/Einzelsignal ausgewiesen,
   nicht weggemittelt.
3. Trennschaerfe statt Glaettung: Differenzielle Bewegung (eine Gebaeudeseite
   setzt sich) erscheint als >= 2 Cluster mit signifikantem
   `motion_delta_to_main` relativ zur kombinierten Unsicherheit - nicht als
   ein Cluster mit aufgeblaehter Varianz.
4. Anbau-/Nebenobjekt-Hygiene: Wintergarten, Carport, Garage, Nebengebaeude
   bilden eigene Cluster oder Noise und fliessen NIEMALS stillschweigend in
   den Main-Cluster oder den Gebaeude-Motion-Score ein. Der Gebaeudewert darf
   nicht durch Mittelung ueber Fremd-/Anbaustrukturen verfaelscht werden.
5. Stabilitaet: Der Cluster ueberlebt Bootstrap/Perturbation (hoher
   Jaccard/Survival), seine Median-Bewegung hat ein enges Konfidenzintervall.
6. Ehrliche Konfidenz: Jedes Ergebnis traegt Support, Assignment-Qualitaet,
   Stabilitaet und Cross-Track-Status als Konfidenz. Small-N oder
   nearest-dominiert ergibt niedrige Konfidenz, nicht keine Aussage.

Asymmetrie-Prinzip (User-Entscheidung 2026-06-10): Im Zweifel wird ein Punkt
eher ausgeschlossen als aufgenommen. Ein zu Unrecht ausgeschlossener Punkt
kostet Support und damit sichtbar Konfidenz; ein zu Unrecht aufgenommener
Fremdpunkt (Carport, Schuppen, Nachbarobjekt) verfaelscht den Motion-Score
unsichtbar. Falsche Aufnahme ist teurer als falscher Ausschluss. Punkte, die
ausserhalb von Polygon UND blickwinkel-korrigierter Candidate-Area liegen
(`nearest`-Fallback), haben keine geometrische Begruendung und duerfen den
Gebaeudewert nicht praegen. Verschaerfend: Der P3-Nachbarschafts-Check kann
nur Konkurrenz zwischen KARTIERTEN Gebaeuden erkennen - ein Carport, der im
GBA fehlt, kann einen Punkt nie "gewinnen", der Punkt faellt zwangslaeufig
dem naechsten echten Gebaeude zu.

Zielaussage auf Gebaeudeebene: "Gebaeude X bewegt sich mit Y mm/a
(Vertical-Proxy, Konfidenzband), differenzielle Bewegung ja/nein mit
betroffenem Teilbereich, gestuetzt durch n Punkte auf m Tracks, Stabilitaet
S" - frei von Kontamination durch Anbauten und Nachbarobjekte.

Bekannter realer Failure-Fall (User-Beobachtung im Viewer): Ein Cluster lag
eindeutig auf einem viele Meter vom Gebaeude entfernten Carport und wurde
vermutlich ueber die `nearest`-Zuordnung dem Gebaeude zugeschlagen. Solche
Faelle sind genau das, was Visual-Audit-Label `possible_carport_merge` und
die nearest-heavy Referenzfaelle abfangen muessen.

Daraus folgt eine explizite Pruefachse: Die aktuelle Main-Cluster-Wahl ist
primaer support-basiert (Punktzahl, dann Kohaerenz, dann Hoehenrang). Ein
dichter Anbau-/Nebenobjekt-Cluster kann so zum Main-Cluster werden, obwohl
er nicht der Hauptbaukoerper ist. `P7-C`/`P7-D` muessen alternative
Main-Cluster-Kriterien (Footprint-Ueberlappung der Cluster-Huelle,
within-/buffer-Anteil, Hoehenrang, Flaechenbezug) als Experimentachse
fuehren und mindestens einen Carport-/Anbau-Fall als Referenzfall bewerten.

## Scope

In Scope:

- Clustering-Logik und Feature-Matrix von `anomaly_local_v1`.
- n-regime-spezifische Strategie: `<3`, `3-5`, `6-12`, `13-50`, `>50`.
- HDBSCAN-Parameter, `eom` vs. `leaf`, `min_cluster_size`, `min_samples`,
  `allow_single_cluster`, optional `cluster_selection_epsilon`.
- Entfernung des stillen OPTICS-Runtime-Fallbacks (`P7-A-W1-T5`,
  User-Auftrag).
- Algorithmus-Sequenz strikt gestaffelt: zuerst HDBSCAN-Ergebnisse, dann
  OPTICS als expliziter Vergleich, erst danach weitere
  Clustering-Algorithmen als groesserer eigener Part.
- Small-N-Alternativen.
- Feature-Ablation und Feature-Erweiterung.
- Borderline-Noise-Reassignment.
- Cross-Track-Evaluation mit Support-/Coverage-Gates.
- Bad-Gastein/TSX-PAZ als hochaufloesende Pseudo-Referenz.
- Bad-Gastein flach zuerst, Hanglage danach.
- KI-Agenten-gestuetzte optische Analyse ueber Playwright-Screenshots.
- Reproduzierbarer Experiment-Harness und Scorecard.
- Run-Transparenz in der UI als Pflicht (`P7-E-W1-T3`): Parameter, Features,
  Algorithmus und Versionen jedes Runs uebersichtlich sichtbar
  (Forschungsplattform-Anspruch, User-Auftrag 2026-06-10); weitere
  API/UI-Diagnose nur, wenn neue Evaluierungsfelder fuer Review noetig sind.
- Viewer-Deep-Links und Track-Farben als eng begrenzte Frontend-Aenderung
  fuer den Visual-Audit (`P7-B-W2-T0`, vom User freigegeben).
- GBA-Hoehen-Audit und Hoehenstrategie (`P7-A-W1-T6`, User-Befund:
  systematische Unterschaetzung).

Nicht in Scope:

- Datenfusion: TSX/PAZ-, Track-22- oder sonstige Zusatzdaten werden NICHT mit
  den 44/95-Daten in einem gemeinsamen Clustering vermischt; sie dienen
  ausschliesslich der Validierung der 44/95-Zielpipeline.
- Vollautomatische Luftbildsegmentierung als Produktfeature.
- Neues DTM/DSM/nDSM-Datenprodukt als Voraussetzung.
- Umbau der Candidate-Area-Track-Geometrie aus `P6`.
- MatchSAR-/AUGMENTERRA-Backend als Blocker.
- Breiter Frontend-Refactor.
- Training eines supervised Modells ohne Labelset.
- Globale Stadt-BBox als primaere Optimierungsbasis.
- Produktive Algorithmusaenderung ohne Scorecard-Gate.

## Feature-Hypothesen

Die Phase bewertet Features nicht nur nach Modellscore, sondern nach fachlichem
Nutzen und Robustheit.

### Bestehende Cluster-Features

- `along_look_offset_m`
- `cross_look_offset_m`
- `height_rank_in_building`
- `velocity`
- `acceleration`
- `coherence_penalty`

### Kandidaten fuer Cluster-Matrix

- `ts_slope`
- `ts_residual_std`
- `ts_primary_step_abs`
- `ts_roughness`
- `season_amp`
- `local_density`
- `assignment_method` als penalty/weight statt nur Rollup
- `distance_m` oder normalisierter Footprint-Abstand
- `amp_ts_cv` und `amp_ts_spike_rate`, nur Salzburg/SNT (siehe Datenlage)
- `height_std` (Handbook `h_stdev`): verfuegbar in Parquet+PostGIS, alle
  Datasets; von der Pipeline-Query aktuell nicht selektiert
- `velocity_std` (bereits Feature), `acceleration_std`, `s_amp_std`,
  `s_phs_std`, `season_phs`: verfuegbar in Parquet+PostGIS, alle Datasets
- `eff_area` und daraus abgeleitet `scatterer_type` (`ps_like`, `ds_like`):
  nur in TSX/PAZ differenzierend (SNT durchgehend `0`); bei `ds_like`
  zusaetzlich `sqrt(eff_area)` als Lageunsicherheits-/Assignment-Vorsicht
- coherence-Perzentil innerhalb desselben `area_id/dataset_id/track`
  (Pflicht fuer jede Cross-Dataset-Verwendung, siehe Kohaerenzregime)
- look-vs-slope/aspect Feature: konkret berechenbar aus
  `insar_point_terrain.slope_deg/aspect_deg` plus Track-Look/Inzidenz
  (Foreshortening: Hang dem Sensor zugewandt und Hangneigung nahe
  Einfallswinkel; Layover: Hangneigung > Einfallswinkel; Shadow: steil
  abgewandt)

### Kandidaten nur fuer Scoring/Guardrails

- `track_point_count`
- `main_cluster_support`
- `kept_support_ratio`
- `nearest_share`
- `assignment_quality`
- `height_above_ground_m`: Punkthoehe minus Gelaendehoehe aus
  `insar_point_terrain`, lokal mediankalibriert (Geoid-/Ellipsoid-Offset);
  Dach- vs. Bodenobjekt-/Carport-Plausibilitaet
- `osm_foreign_structure_flag`: Punkt in/nahe einer OSM-Struktur ohne
  GBA-Entsprechung (Garage/Carport); aktuell nur Salzburg verfuegbar
- `cluster_hull_overlap_with_building`
- `cluster_centroid_distance_to_building`
- `track_coverage_similarity`
- `high_res_support_score`
- `visual_audit_label`
- `sensor_geocode_tolerance_m`
- `reference_period_compatibility`
- `raw_coherence_cross_dataset_forbidden`
- `ds_patch_share`
- `layover_shadow_risk`
- `phase_unwrap_or_gap_risk`

## Algorithmus-Hypothesen nach Punktzahl

Diese Matrix ist Startpunkt fuer Experimente, keine Vorentscheidung:

| n kept pro `Gebaeude x Track` | Baseline | Kandidaten | Akzeptanzidee |
| ---: | --- | --- | --- |
| `<3` | `insufficient_support` | keine echte Clusterung | Status muss konservativ bleiben |
| `3-5` | Small-N Ein-Cluster + lokale Outlier | MAD/medoid, leave-one-out, pairwise-consistency, weak-support status | keine kuenstliche Sicherheit |
| `6-12` | HDBSCAN | HDBSCAN konservativ/locker, OPTICS, robust single-cluster with outlier option | stabile Main-Cluster und weniger Fragilitaet |
| `13-50` | HDBSCAN | HDBSCAN Sweep, `leaf`, Feature-Ablation, GMM/PAM-Spike | Multi-Cluster erhalten, Noise plausibel |
| `>50` | HDBSCAN | hierarchisch: spatial-first/motion-second, `leaf`, `cluster_selection_epsilon`, TSX-HR calibration | grosse Dach-/Nebengebaeude-Strukturen trennen |

Gewichtung nach gemessener Regimeverteilung (siehe Datenlage): Salzburg/SNT
hat sein Hauptregime in `6-12` (34 %), Bad-Gastein/SNT in `<6` (76 %),
TSX/PAZ in `13-50` (42 %) plus `>50` (8 %). HDBSCAN-Parameter-Schluesse
gelten darum immer nur pro Dataset-Regime-Kombination; fuer Bad-Gastein/SNT
sind `P7-C-W1-T3` (Small-N) und Gate-Diagnostik wichtiger als der
HDBSCAN-Sweep.

Hinweis zur Baseline-Heuristik: Die Produktion setzt
`min_samples = floor(min_cluster_size / 2)` und ist damit BEWUSST weniger
konservativ als der Bibliotheks-Default (`min_samples = min_cluster_size`).
Im Regime `6-12` bedeutet das `min_cluster_size = 2`, `min_samples = 1`,
also faktisch Single-Linkage-Verhalten mit Paar-Clustern. Der Sweep in
`P7-C-W1-T1` muss den Bibliotheks-Default als expliziten Vergleichspunkt
enthalten.

## Evaluationsstrategie

### 1. Baseline und Regression

Pflicht-AOIs Salzburg:

- Mirabell: `13.04027,47.80375,13.04387,47.80735`
- Moosstrasse: `13.02714,47.79189,13.03074,47.79549`
- Osthang-Stressbereich: `13.0492,47.8036,13.0528,47.8054`

Pflicht-AOIs Bad Gastein:

- `bg_flat_01`
- `bg_flat_02`
- `bg_flat_03`
- `bg_slope_01`
- optional `bg_slope_02`, `bg_slope_03`

### 2. Interne Metriken

Nur Nebenindikatoren:

- Noise/kept
- Cluster count
- Core size distribution
- Silhouette oder DBCV, wenn sinnvoll fuer Noise/Density-Cluster
- Cluster separation in der tatsaechlichen Cluster-Matrix
- HDBSCAN probabilities/outlier scores

### 3. Sensitivitaet und Konfidenz (User-Entscheidung 2026-06-10: Nebensignal, kein Hauptpfeiler)

Begruendung aus der gemessenen Datenlage: In Bad-Gastein/SNT haben 76 % der
Gruppen unter 6 Punkte, und 2-Punkt-Cluster sind legitime Ergebnisse
(`reliable_core` beginnt bei 2 Punkten). Punkte-Entfernen per
Bootstrap/Subsampling ist dort methodisch sinnlos und darf kleine Cluster
nicht bestrafen. Primaere Evaluationspfeiler sind Cross-Track, die
HR-Pseudo-Referenz und die Experten-/Visual-Validierung.

Stattdessen ein leichtes, regime-bewusstes Sensitivitaetsmodul, dessen
Output eine ehrliche Konfidenzangabe pro `Gebaeude x Track` ist:

- Messrauschen-Perturbation (funktioniert fuer JEDES n, auch n=2):
  Velocity jedes Punkts innerhalb seiner gelieferten `velocity_std`
  jittern und pruefen, ob Clusterzuordnung, Bewegungsvorzeichen und
  Main-Cluster-Median standhalten. Beantwortet "ist das Signal vom
  Messrauschen unterscheidbar?" statt "ueberlebt das Cluster das Entfernen
  von Punkten" - ein 2-Punkt-Cluster kann dabei volle Konfidenz erreichen.
- Leave-one-out (ab n >= 4): jeden Punkt einmal weglassen, Flip-Rate von
  Main-Cluster-Identitaet, Building-Status und Motion-Vorzeichen erfassen.
  Bei n=5 sind das 5 deterministische, interpretierbare Reruns;
  Referenzfall `548205` ist genau so ein Ein-Punkt-Flip-Fall.
- Bootstrap/Subsampling NUR ab n >= 8 als Zusatzdiagnose
  (Cluster-Survival/Jaccard, ARI/AMI, Motion-CI). Nie ein hartes Gate fuer
  Small-N-Regime.
- Output: `confidence_band` plus Flip-/Jitter-Raten in der Scorecard.
  Im Kandidatenvergleich ist das ein Nebensignal; ein Kandidat wird primaer
  an Cross-Track, HR-Referenz und Visual-Audit gemessen.

### 4. Cross-Track-Evaluation

Implementierungsvorgabe: Wegen des 44/95-Hardcodes im produktiven Rollup
berechnet `P7-B` alle Cross-Track-Diagnosen harness-seitig und
dataset-agnostisch aus den Main-Cluster-Rollups (`main_cluster_by_track`,
`track_motion_mm_a`), getrennt nach Paartyp:

- `opposite_geometry` (ASC-DSC): 44/95 in beiden SNT-Datasets, 93/70 in
  TSX/PAZ. Disagreement kann Horizontalbewegung enthalten und ist in
  Hanglagen ein Diagnose-, kein Fehlersignal.
- `same_geometry` (DSC-DSC): 22/95 in Bad-Gastein/SNT, nur in der
  Ost-Overlap-Zone verfuegbar. Horizontal weitgehend insensitiv, misst
  primaer Prozessierungs-/Clusterkonsistenz und ist dort die schaerfste
  Redundanzpruefung.

Cross-Track wird nur gewertet, wenn:

- beide Tracks mindestens `main_cluster_support >= 2`, fuer "strong" >= 3,
- beide Tracks nicht nur weak-secondary-track sind,
- `nearest_share` nicht ueber einer definierten Warnschwelle liegt,
- Cluster-Huellen oder Track-Coverage nicht offensichtlich verschiedene
  Gebaeudeteile abdecken,
- Hang-/Aspekt-Stress explizit markiert ist.
- beide Track-Resultate im selben Sensor-/Prozessierungsvertrag vergleichbar
  sind, oder der Vergleich als qualitative Diagnose statt Score markiert ist.
- rohe `coherence`-Werte nicht ueber unabhaengige Prozessierungen hinweg
  verglichen werden.

Neue Diagnoseideen:

- `track_support_class`: `none`, `weak`, `usable`, `strong`
- `cross_track_pair_type`: `opposite_geometry`, `same_geometry`
- `cross_track_source`: `pipeline_rollup` vs. `harness_computed`
- `temporal_overlap_days` bzw. `reference_period_compatibility`
- `coverage_overlap_score`
- `track_part_mismatch_flag`
- `cross_track_evaluation_weight`
- `cross_track_not_applicable_reason`
- `coherence_normalization_scope`
- `sensor_geocode_tolerance_m`
- `scatterer_type_mix`

### 5. High-Resolution-Pseudo-Referenz

Bad-Gastein/TSX-PAZ dient als Pseudo-Referenz gegen Bad-Gastein/SNT:

- Die Pseudo-Referenz ist primaer RAEUMLICH-STRUKTURELL: wo sitzen
  Scatterer am Gebaeude, welche Dach-/Anbauteile sind getrennt, wird der
  SNT-Main-Cluster durch dichte TSX/PAZ-Punkte in derselben Teilregion
  gestuetzt. Bewegungsvergleiche sind wegen des nur ~7.5-monatigen
  Zeitueberlapps (TSX/PAZ 2021-05..2023-05 vs. SNT 2022-10..2025-09)
  grundsaetzlich nur qualitativ zulaessig (Vorzeichen/Persistenz starker
  Bewegungen) und muessen `temporal_overlap_days` ausweisen. "SNT weicht von
  TSX/PAZ-Bewegung ab" ist bei nichtlinearer Bewegung KEIN Gate-Fail.
- SNT 22/44/95 und TSX/PAZ 70/93 getrennt auswerten.
- SNT Track 22 ist geometrisch verifiziert (Descending, look `280.2 deg`,
  incidence `45.66 deg`), deckt aber nur den Ostteil ab (lon >= ~13.168)
  und hat in keiner der AOI-Kandidatenzellen Punkte. In den Pflicht-AOIs
  besteht "SNT" daher faktisch aus T44+T95; Track 22 laeuft, wenn
  ueberhaupt, als separate Ost-Diagnose.
- Vergleich nicht als Punkt-zu-Punkt-Ground-Truth, sondern als
  Gebaeude-/Cluster-Level-Konsistenz:
  - Hauptcluster liegt auf derselben Gebaeudeteilregion,
  - SNT-main-cluster wird durch mehrere TSX/PAZ-Punkte gestuetzt,
  - SNT-Noise oder SNT-Nebengebaeude-Cluster wird in TSX/PAZ sichtbar,
  - Bewegungsrichtung/-ordnung ist kompatibel, falls Geometrie das erlaubt.
- Der Vergleich nutzt sensorabhaengige Lage-Toleranzen. Eine SNT/TSX-Abweichung
  im Meterbereich ist nicht automatisch ein Fehler.
- Absolute Geschwindigkeiten werden nur verglichen, wenn Referenzpunkt,
  Beobachtungszeitraum und Zeitnullpunkt kompatibel sind; sonst nur relative
  Muster, Rangfolge, Vorzeichen unter LOS-Vorbehalt und Clustergeometrie.
  Fuer SNT vs. TSX/PAZ ist diese Kompatibilitaet nach aktueller Datenlage
  NICHT gegeben (disjunkte Zeitraeume, getrennte REFs, Inzidenz 37-46 deg
  vs. 52-54 deg mit entsprechend verschiedener
  Vertical-Proxy-Rauschverstaerkung).
- Ein Common-Window-Refit (2022-10..2023-05) unterschreitet fuer SNT das
  Epochen-Gate und ist nur als explizit markiertes Experiment erlaubt,
  nie als hartes Gate.
- DS-dominierte Cluster werden als Flaechen-/Patch-Information bewertet, nicht
  als exakte Dachpunkt-Labels.
- Flache AOIs sind harte Gate-AOIs. Hang-AOIs sind Stress- und Diagnose-AOIs.

### 6. Optische KI-Auditierung

V1-Pflichtbestandteil:

- Playwright-MCP bedient den Viewer.
- Pro ausgewaehltem Fall werden Screenshots erzeugt:
  - Satelliten-/Luftbildbasemap,
  - GBA-Umriss,
  - Candidate-Areas,
  - Cluster-Huellen,
  - Punkte nach Cluster/Noise/Gate,
  - Trackfilter `all`, `ASC`, `DSC` bzw. dataset-spezifische Tracks.
- KI-Agent analysiert Bild und schreibt strukturierte Audit-Labels:
  - `plausible_main_roof_cluster`
  - `possible_carport_merge`
  - `possible_outbuilding_as_main`
  - `track_part_mismatch`
  - `offset_expected_due_to_sar_geometry`
  - `offset_within_sensor_tolerance`
  - `ds_patch_ambiguous`
  - `layover_shadow_possible`
  - `ambiguous_visual`
  - `needs_human_review`

Diese Labels sind qualitative Evidence, keine automatische Wahrheit.

## Scorecard und Guardrails

Ein Kandidat ist nur integrationsfaehig, wenn er alle harten Gates erfuellt und
mindestens einen fachlichen Gewinn zeigt.

Harte Gates:

- Keine produktive Default-Aenderung vor Kandidatenentscheidung.
- Salzburg-Pflichtreferenzen bleiben plausibel oder Abweichung ist
  fallbezogen belegt.
- Differential-/Multi-Cluster-Faelle werden nicht weggeglattet.
- Small-N und weak-secondary-track werden nicht als hohe Sicherheit ausgegeben.
- `nearest`-lastige Faelle werden nicht gesundgerechnet, ohne Assignment-
  Unsicherheit sichtbar zu halten.
- Bad-Gastein flach muss mindestens baseline-kompatibel bleiben, bevor Hangstress
  als Optimierungserfolg gewertet wird.
- Optischer Audit darf keine offensichtliche Verschlechterung bei
  Pflichtfaellen zeigen.
- Cross-Track-/HR-Felder in der Scorecard tragen immer `cross_track_source`,
  `cross_track_pair_type` und `temporal_overlap_days`; fuer TSX/PAZ und
  Track 22 duerfen Pipeline-Rollup-Werte (44/95-Hardcode) nicht als
  Agreement-Evidenz gewertet werden.
- EVALUATIONS-Erwartungen werden je Dataset gesetzt (Salzburg-Erwartungen
  duerfen wegen des anderen Kohaerenz- und n-Regimes nicht unveraendert auf
  Bad-Gastein/SNT angewendet werden). Davon strikt getrennt: PRODUKTIVE
  Algorithmus-Parameter muessen generisch bleiben. Ein Kandidat, der seine
  Gewinne nur durch gebietsspezifisch handgesetzte Schwellen erreicht, ist
  nicht integrationsfaehig; bevorzugt sind selbstadaptive,
  verteilungsbasierte Parameter (Perzentile/Z-Scores je
  `area_id x dataset_id x track`), die ohne manuelles Nachziehen auf neue
  Gebiete uebertragbar sind.
- Ein Bewegungs-Mismatch SNT vs. TSX/PAZ allein (disjunkte Zeitraeume) ist
  kein `candidate_red`-Grund; nur strukturelle/raeumliche HR-Widersprueche
  gaten hart.

Weiche Ziele:

- bessere Robustheit der Main-Cluster gegen Messrauschen und
  Einzelpunkt-Ausfall,
- bessere High-Resolution-Uebereinstimmung in flachen Bad-Gastein-AOIs,
- weniger Fehl-Noise bei plausiblen Hauptdachpunkten,
- weniger Nebengebaeude-/Carport-Merge,
- klarere Diagnose bei nicht auswertbaren Cross-Track-Faellen.

## Pflichtartefakte

- `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_research_matrix.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_aoi_catalog.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_baseline_summary.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_reference_cases.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_experiment_matrix.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_cases.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`

Optionale Artefakte:

- `backend/app/ml/evaluation/phase7_clustering_experiments.py`
- `backend/app/ml/evaluation/phase7_visual_audit_export.py`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.md`
- Screenshots unter `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`

## Abhaengigkeiten

Harte Abhaengigkeiten:

- lokale PostGIS-Daten fuer Salzburg und Bad Gastein,
- `backend/.venv-wsl/bin/python` oder dokumentierter Ersatz,
- `hdbscan` als harte Pflicht-Dependency der Pipeline (nach `P7-A-W1-T5`
  fuehrt fehlender Import zu hartem Fehler statt stillem OPTICS-Wechsel),
- MLflow/PostGIS fuer Live-Runs,
- Supervisor-Workflow mit Subagents,
- `gpt-5.5` mit reasoning effort `xhigh`.

Weiche Abhaengigkeiten:

- Playwright-MCP fuer optischen Audit; wenn nicht verfuegbar, muss der
  Visual-Audit-Pfad `red` oder `inconclusive` dokumentiert werden.
- Frontend/Backend lokal erreichbar.
- Internet fuer aktualisierte Quellenpruefung.
- Spaetere menschliche Expertenlabels.

## Plan -> Phase -> Welle -> Ticket

### Phase P7-A: Baseline, Research und AOI-Vertrag

Phasen-DoD:

- Ausgangslage, Quellenbasis, AOIs und Referenzfaelle sind eingefroren.
- Bad-Gastein-Flach-/Hang-AOIs sind mit exakter Pipeline-Semantik verifiziert.
- Der Supervisor kann danach Experimente gegen feste Gates laufen lassen.

#### Welle P7-A-W1: Parallele Grundlagen

##### Ticket P7-A-W1-T1: Baseline einfrieren

- Ziel: aktuellen produktiven Stand und alle Pflicht-AOIs reproduzierbar messen.
- Abhaengigkeiten:
  - hard: `P7-A-W1-T5` (Baseline wird auf bereinigtem Code ohne stillen
    OPTICS-Fallback eingefroren)
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_baseline_summary.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- DoD:
  - Runtime, Python, `hdbscan`, DB/MLflow-Status dokumentiert.
  - Salzburg-Pflicht-AOIs neu oder ueber vorhandene gueltige Runs belegt.
  - Bad-Gastein-SNT und TSX/PAZ fuer mindestens `bg_flat_01` und `bg_slope_01`
    baseline-metrisch belegt oder konkreter Blocker dokumentiert.
  - Aktuelle Parameter/Features aus Code extrahiert.
  - n-Regime-Histogramm (kept Punkte pro `Gebaeude x Track`) je AOI und
    Dataset ausgewiesen und eingefroren.
  - Gate-Exklusionsraten je Dataset/Track/Gate-Grund ausgewiesen
    (insb. Kohaerenz-Floor-Effekt in Bad-Gastein/SNT, Erwartung ~17-24 %).
  - Cross-Track-Baselinewerte sind je Dataset als `pipeline_rollup`
    (nur 44/95) oder `not_computed` gekennzeichnet; TSX/PAZ- und
    Track-22-Werte duerfen nicht als "agreement ok" interpretiert werden.
  - Hinweis: `phase2_harness.py` ist auf Salzburg-AOIs/Run-IDs fixiert;
    Bad-Gastein-Baselines laufen ueber CLI-Runs plus dokumentierte
    Ad-hoc-Auswertung oder den neuen P7-Harness.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T2: Externe Research-Matrix

- Ziel: Clustering-/Evaluation-/InSAR-Literatur in umsetzbare Regeln uebersetzen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_research_matrix.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- DoD:
  - Quellen zu HDBSCAN/OPTICS, internen Metriken, Stabilitaet, Cross-Track-InSAR
    und optischer/Segmentierungsbewertung sind geprueft.
  - Die beiden lokalen AUGMENTERRA-/TRE-Handbooks sind mit Seitenreferenzen fuer
    PS/DS, LOS, Geokodierung, Referenzpunkt, Kohaerenz, 2D-Dekomposition,
    Zeitreihenfelder und Layover/Shadowing ausgewertet.
  - Jede Quelle fuehrt zu einer klaren Planregel oder wird als nicht relevant
    verworfen.
  - Unsicherheiten sind explizit benannt.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T3: AOI-Katalog Bad Gastein und Salzburg

- Ziel: feste AOIs fuer flach, gemischt und Hangstress definieren.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_aoi_catalog.json`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Startkandidaten:
  - Salzburg: Mirabell, Moosstrasse, Osthang.
  - Bad Gastein: `bg_flat_01`, `bg_flat_02`, `bg_flat_03`, `bg_slope_01`.
- DoD:
  - jedes AOI hat area_id, dataset_id(s), bbox, terrain stats, point counts,
    building counts und Zweck.
  - jedes AOI enthaelt Sensor-/Dataset-Metadaten fuer erwartete Lage-Toleranz,
    Beobachtungszeitraum und Cross-Dataset-Vergleichbarkeit.
  - flache AOIs haben belegte niedrige Hangneigung und ausreichende SNT/TSX-Dichte.
  - Hang-AOIs sind als Stress, nicht als Kalibrierungsanker markiert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T4: Referenz- und Failure-Faelle erweitern

- Ziel: Experimente gegen konkrete Gebaeude-/Cluster-Falltypen fuehren.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_reference_cases.json`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Startliste:
  - Salzburg: `548205`, `548204`, `96637447`, `96637522`, `96637488`,
    `96959854`, `96637551`, `395674088`, `54773363`, `150506168`.
  - Bad Gastein: aus `P7-A-W1-T3` building-level zu bestimmen.
- DoD:
  - Faelle decken Standard, Multi-Cluster, Small-N, weak-secondary-track,
    nearest-heavy, noise-dominated, Cross-Track-Mismatch, flach-HR und Hang-HR ab.
  - Jede Erwartung ist semantisch formuliert, nicht nur als Metrik.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-A-W1-T5: OPTICS-Runtime-Fallback entfernen

- Ziel: deterministische Pipeline-Semantik. Der stille Wechsel auf OPTICS
  bei fehlendem `hdbscan`-Import wird entfernt; `hdbscan` wird harte
  Dependency mit klarer Fehlermeldung. User-Auftrag 2026-06-10
  ("niemals als Runtime-Fallback").
- Einordnung zur Regel "keine produktiven Algorithmusaenderungen vor
  `P7-E`": Diese Aenderung ist davon ausgenommen, weil sie im
  Referenz-Environment (hdbscan 0.8.42 installiert und verifiziert) KEIN
  Ergebnis aendert; sie beseitigt nur einen environment-abhaengigen stillen
  Semantikwechsel und macht die Baseline erst reproduzierbar.
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - `docs/pipelines/anomaly_local_v1/methodik.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- DoD:
  - OPTICS-Import und Fallback-Zweig aus der Pipeline entfernt; bei
    fehlendem `hdbscan` harter, verstaendlicher Fehler.
  - `compileall` gruen; ein Belegrun (Mirabell) liefert identische
    Kennzahlen wie davor (kein Verhaltensdelta mit installiertem hdbscan).
  - `MODEL_SET_VERSION` unveraendert, mit dokumentierter Begruendung.
  - Methodik beschreibt `hdbscan` als harte Dependency.
- Kritischer Pfad: ja (laeuft vor dem Baseline-Freeze)
- Status: planned

##### Ticket P7-A-W1-T6: GBA-Hoehen-Audit und Hoehenstrategie

- Ziel: die belegte GBA-Hoehen-Unterschaetzung (siehe Datenlage-Abschnitt,
  User-Befund 2026-06-10) in eine Entscheidung ueberfuehren, welche
  Gebaeudehoehe die Pipeline kuenftig verwendet.
- Optionen, datenbasiert zu bewerten (Generik-Prinzip beachten, keine
  gebietsspezifischen Handfaktoren):
  - O1 Selbstkalibrierte Hoehe aus InSAR: Median(Punkthoehe minus
    Gelaendehoehe) der within-Footprint-Punkte, gebietsweise
    geoid-kalibriert. Generisch und sensorunabhaengig, aber zirkulaer fuer
    punktarme Gebaeude -> Fallback-Kette noetig.
  - O2 OSM-Anreicherung (`height` bzw. `building:levels * 3`), wo
    vorhanden (Salzburg: nur ~673 Gebaeude mit height-Tag, sparse).
  - O3 GBA-Kalibrierfaktor (Groessenordnung 1/0.735) plus Nutzung der
    mitgelieferten Varianz `var` als Unsicherheitszuschlag auf die
    Candidate-Area-Laenge.
  - O4 Konservativ: Candidate-Area-Offset weniger hoehenabhaengig machen
    (hoeherer Mindestoffset), Hoehe nur noch als Soft-Feature.
- Abgrenzung: Das Candidate-Area-MODELL aus `P6` bleibt unangetastet; es
  geht um die Qualitaet seines Hoehen-Inputs.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_gba_height_audit.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten: keine harten (reine Analyse); Ergebnis ist Input fuer
  `P7-C-W1-T5` und alle Candidate-Area-sensitiven Experimente.
- DoD:
  - Audit-Zahlen eingefroren (Verteilungen, OSM-Vergleich, Landmark-Faelle,
    Bad-Gastein-Gegenprobe).
  - Hoehenstrategie-Empfehlung mit Generik-Begruendung; produktive
    Umsetzung nur ueber `P7-E`.
  - Wirkung quantifiziert: fuer mindestens eine AOI, wie viele
    `nearest`-Punkte mit korrigierter Hoehe in die Candidate-Area fielen.
- Kritischer Pfad: ja (Input fuer Assignment-Hygiene)
- Status: planned

### Phase P7-B: Evaluation-Harness und Scorecard

Phasen-DoD:

- Varianten koennen reproduzierbar gegen alle AOIs, Referenzfaelle,
  Cross-Track-Diagnostik, High-Resolution-Pseudo-Referenz und visuelle
  Audits bewertet werden; Sensitivitaet/Konfidenz liegt als Nebensignal bei.

#### Welle P7-B-W1: Harness-Grundlage

##### Ticket P7-B-W1-T1: Clustering-Experiment-Harness

- Ziel: Varianten ausfuehren, ohne produktive Defaults zu aendern.
- Write-Set:
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_experiment_matrix.json`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-A-W1-T1`
  - hard: `P7-A-W1-T3`
  - hard: `P7-A-W1-T4`
- DoD:
  - Baseline und No-op-Variante laufen deterministisch.
  - Varianten sind per Experiment-ID konfigurierbar.
  - Outputs enthalten Run-IDs, Parameter, Feature-Set und Scorecard-Inputs.
  - Jeder Experiment-Run schreibt Experiment-ID und vollstaendige
    Konfiguration (Parameter, Feature-Set, Algorithmus) nach
    `ml_runs.params`, damit die UI sie anzeigen kann (`P7-E-W1-T3`).
  - Produktiver Default bleibt unveraendert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-B-W1-T2: Scorecard und Acceptance-Gates

- Ziel: maschinenlesbar definieren, wann ein Kandidat besser ist.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.json`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_scorecard.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-A-W1-T1`
  - hard: `P7-A-W1-T4`
- DoD:
  - Scorecard hat Aggregate, Referenzfaelle, Cross-Track-Diagnostik,
    HR-Pseudo-Referenz, optische Audit-Felder, Guardrail-Flags und
    Sensitivitaet/Konfidenz als Nebensignal.
  - Bewertet werden `candidate_green`, `candidate_red`, `candidate_inconclusive`.
  - Niedrige Noise-Rate allein kann keinen Kandidaten gruen machen.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-B-W1-T3: Sensitivitaets-/Konfidenzmodul

- Ziel: leichte, regime-bewusste Konfidenzmetriken statt schwerem Bootstrap
  (User-Entscheidung 2026-06-10, siehe Evaluationsstrategie Abschnitt 3).
- Write-Set:
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
- DoD:
  - Messrauschen-Perturbation auf Basis `velocity_std` fuer alle n
    implementiert (auch n=2; kein Size-Penalty).
  - Leave-one-out-Flip-Raten ab n >= 4 implementiert.
  - Bootstrap (Survival/Jaccard, ARI/AMI, Motion-CI) nur ab n >= 8,
    als Zusatzdiagnose markiert.
  - `confidence_band` je `Gebaeude x Track` wird ausgegeben und ist nie ein
    hartes Gate gegen kleine, aber rauschfeste Cluster.
- Kritischer Pfad: nein (Nebensignal; Scorecard ist auch ohne dieses Modul
  mit Cross-Track/HR/Visual entscheidungsfaehig)
- Status: planned

##### Ticket P7-B-W1-T4: High-Resolution-Pseudo-Reference-Modul

- Ziel: SNT-Ergebnisse gegen TSX/PAZ in Bad Gastein auswerten.
- Write-Set:
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-A-W1-T3`
- DoD:
  - SNT/TSX-Runs je AOI koennen gekoppelt ausgewertet werden.
  - Bad-Gastein/SNT Track 22: Auslassung in den Pflicht-AOIs ist mit der
    Abdeckungslage (keine Punkte westlich lon ~13.168, kein
    AOI-Kandidaten-Overlap) bereits datenbasiert begruendet; optional
    DSC-DSC-Redundanzdiagnose (22/95) in der Ost-Overlap-Zone, building-frei
    oder mit den dort wenigen Gebaeuden, klar als Diagnose markiert.
  - Cross-Track-/Cross-Dataset-Werte werden harness-seitig berechnet und
    tragen `cross_track_pair_type` und `cross_track_source`.
  - Metriken sind cluster-/building-level, nicht Punkt-Ground-Truth; der
    raeumlich-strukturelle Vergleich ist die primaere Achse, der
    Bewegungsvergleich ist wegen des ~7.5-Monats-Zeitueberlapps nur
    qualitativ und traegt `temporal_overlap_days`.
  - sensorabhaengige Geokodierungs-Toleranz (SNT eher `10-15 m`, TSX `1-3 m`)
    und DS-Patch-Semantik (`sqrt(eff_area)`-Zuschlag) sind im Matching
    beruecksichtigt.
  - absolute Bewegungsvergleiche werden nur bei kompatiblem Referenzpunkt/
    Zeitraum zugelassen; fuer SNT vs. TSX/PAZ ist diese Kompatibilitaet nach
    aktueller Datenlage nicht gegeben.
  - flach vs. Hang wird getrennt reported.
- Kritischer Pfad: ja
- Status: planned

#### Welle P7-B-W2: Visueller Audit

##### Ticket P7-B-W2-T0: Viewer-Deep-Links und Track-Farben fuer Visual-Audit

- Ziel: Visual-Audit-Ansichten deterministisch per URL herstellbar machen,
  damit Playwright-Faelle reproduzierbar sind statt fragiler Klickpfade.
  Vom User am 2026-06-09 freigegeben; Umsetzung erst in der
  Supervisor-Session, nicht vorab.
- Write-Set:
  - `frontend/src/lib/urlState.ts` (neu)
  - `frontend/src/main.tsx`
  - `frontend/src/components/MapView.tsx`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Implementierungsvorgabe (vor-designt, Code-Audit 2026-06-09):
  - Query-Parameter werden SYNCHRON VOR dem ersten React-Render in den
    zustand-Store geschrieben (`useAppStore.setState` in `main.tsx` vor
    `createRoot(...).render`). Damit entfaellt jede Race: `selectedAreaId`
    ist beim Mount bereits gesetzt (kein `fitBounds`-Kampf, kein
    Selection-Reset durch `setSelectedAreaId`), `activeRunId`/`selection`
    triggern die bestehenden react-query-Fetches
    (`map-ml-run-detail`, `map-ml-building-context`) beim Mount.
  - Parameter: `area` (area_id), `run` (ml run_id), `building`
    (`gba:<id>`/`osm:<id>`), `mlview`
    (`cluster|quality|anomaly|cross-track|reliability`), `track`
    (`all` oder `<dataset_id>:<track>`), `hulls`/`excluded`/`mlpoints`/
    `mlbuildings`/`gba`/`osm` (0/1), `basemap` (`light|satellite`).
    Kamera weiterhin ueber den vorhandenen MapLibre-Hash
    (`#zoom/lat/lon/bearing/pitch`).
  - Auto-Fit: Ist `building` gesetzt und KEIN Kamera-Hash vorhanden, wird
    nach Eintreffen von `focusContextQuery.data.building` einmalig
    `fitBounds` auf die Gebaeudegeometrie ausgefuehrt (one-shot Flag).
    Der Auto-Fit erzwingt dabei die Nadir-Standardansicht
    (`pitch=0`, `bearing=0`); optionale Query-Parameter `pitch`/`bearing`
    erlauben einen expliziten Override (z. B. Schraegansicht).
  - Ungueltige Parameterwerte werden still ignoriert (validieren gegen
    bekannte Enums/Formate, kein Crash).
  - Candidate-Area-Farben: `focusCandidateColorExpression`/
    `focusCandidateLineExpression` in `MapView.tsx` um Eintraege fuer
    Tracks `22`, `70`, `93` ergaenzen (eindeutige, von 44/95
    unterscheidbare Farbtoene), damit TSX/PAZ-Audits Track-Identitaet
    farblich belegen koennen.
- Abhaengigkeiten: keine harten; soft: `P7-A-W1-T4` (Falliste fuer
  Beispiel-Links).
- DoD:
  - `cd frontend && npm run build` gruen.
  - Ein Deep-Link der Form
    `/?area=salzburg&run=<id>&building=gba:548205&mlview=cluster&hulls=1&basemap=satellite`
    stellt nachweislich (Playwright-Screenshot) die Focus-View mit
    Satellitenbild, Umriss, Candidate-Areas, Huellen und Punkten her.
  - Verhalten ohne Parameter ist unveraendert (Default-Start identisch).
  - Kein breiter UI-Refactor; Aenderung bleibt auf die drei Dateien begrenzt.
- Kritischer Pfad: ja, weil `P7-B-W2-T1` und `P7-D-W1-T3` darauf aufbauen
- Status: planned

##### Ticket P7-B-W2-T1: Playwright-gestuetzter Visual-Audit-Workflow

- Ziel: Viewer-Screenshots fuer qualitative Clusterpruefung reproduzierbar machen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_cases.json`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`
  - optional `backend/app/ml/evaluation/phase7_visual_audit_export.py`
  - optional Screenshots `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`
- Abhaengigkeiten:
  - hard: `P7-A-W1-T4`
  - hard: `P7-B-W2-T0`
  - soft: `P7-B-W1-T1`
- Bekannte UI-Randbedingungen (Frontend-Audit 2026-06-09):
  - Cluster-Huellen und Candidate-Areas existieren nur in der Focus-View
    eines selektierten Gebaeudes (`anomaly_local_v1`), nicht als globale
    Layer; der Track-Filter wirkt nur in der Focus-View.
  - Ohne `P7-B-W2-T0` gibt es keine URL-Parameter fuer Run/Area/Gebaeude
    (nur Kamera-Hash) und Candidate-Farben nur fuer 44/95. `P7-B-W2-T0`
    behebt beides; dieser Workflow setzt deshalb auf den Deep-Links auf und
    referenziert pro Audit-Fall den vollstaendigen Deep-Link.
- Kamera-Standard (User-Frage 2026-06-10, fachlich entschieden):
  - Primaeransicht ALLER Audit-Screenshots ist Nadir: `pitch=0`, Nord oben,
    feste Zoomstufe, Gebaeude zentriert. Begruendung: Das Orthofoto ist
    eine flache Draufsicht-Textur; Kippen erzeugt keine echte
    Schraegbild-Information, sondern nur perspektivische Verzerrung, die
    die Punkt-zu-Gebaeude-Zuordnung systematisch verfaelscht.
  - Baseline- und Kandidaten-Screenshots desselben Falls nutzen IDENTISCHE
    Kameraparameter (Deep-Link-Hash), damit Bildunterschiede ausschliesslich
    vom Clustering stammen.
  - Optionale Zweitansicht NUR fuer Hoehen-/Anbaufragen (Carport, Anbau,
    Hoehenrang): Schraegansicht `pitch~55-60`, 3D-GBA-Extrusion aktiv
    (`gba=1`), Blickrichtung dokumentiert. Keine Pflicht fuer alle Faelle.
- DoD:
  - Backend/Frontend Startanleitung oder laufende Services dokumentiert.
  - mindestens ein Salzburg-Fall und ein Bad-Gastein-Flachfall sind als
    Screenshot-Audit belegt, jeweils in Nadir-Standardansicht.
  - Labelschema fuer visuelle Fehler ist JSON-kompatibel.
  - Visual-Audit unterscheidet echte visuelle Fehlzuordnung von tolerierbarem
    sensorbedingtem Offset und DS-Patch-Ambiguitaet.
  - Wenn Playwright/Frontend blockiert: konkreter `red`/`inconclusive` Blocker.
- Kritischer Pfad: ja, weil User V1-optische Analyse gefordert hat
- Status: planned

### Phase P7-C: Isolierte Algorithmus- und Feature-Experimente

Phasen-DoD:

- Die wichtigen Veraenderungsachsen sind getrennt getestet.
- Kein Kandidat gewinnt nur durch Vermischung mehrerer Effekte.

#### Welle P7-C-W1: Primaere Varianten

##### Ticket P7-C-W1-T1: HDBSCAN-Parameter-Sweep

- Ziel: HDBSCAN-Heuristik kontrolliert bewerten.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_hdbscan_*`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- Testachsen:
  - `min_cluster_size` fraction/cap,
  - `min_samples` ratio, inkl. Bibliotheks-Default
    `min_samples = min_cluster_size` als Pflicht-Vergleichspunkt,
  - `eom` vs. `leaf`,
  - `allow_single_cluster`,
  - optional `cluster_selection_epsilon`.
- Ergebnisse werden pro Dataset-Regime-Kombination berichtet; ein
  Salzburg-`6-12`-Gewinn darf nicht als Bad-Gastein-Gewinn gewertet werden.
- DoD:
  - alle Varianten mit identischer Scorecard.
  - Effekte auf Small-N-nahe Gruppen, Multi-Cluster und HR-Pseudo-Referenz
    separat ausgewiesen.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T2: Feature-Ablation und Feature-Erweiterung

- Ziel: klaeren, welche Inputs die Clusterqualitaet verbessern.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_features_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- Testachsen:
  - Velocity-Dominanz reduzieren,
  - Acceleration entfernen/reduzieren,
  - Spatial-Features staerken,
  - Time-series Features zuschalten,
  - Assignment-/distance penalty,
  - optional `amp_ts_*`, aber aktuell nur fuer Salzburg/SNT nutzbar; keine
    TSX/PAZ- oder Bad-Gastein-SNT-Variante darf AMP-Features voraussetzen,
  - optional `eff_area`/`scatterer_type` (nur TSX/PAZ differenzierend),
    `height_std`, `acceleration_std`, `s_amp_std`, `s_phs_std`, `season_phs`
    (alle in Parquet+PostGIS vorhanden, Harness muss sie zusaetzlich zur
    Pipeline-Query laden),
  - coherence nur dataset-/track-normalisiert fuer Cross-Dataset-Fragen,
  - optional terrain/look feature fuer Hangdiagnose.
- DoD:
  - Feature-Gewinne sind pro n-Regime und AOI-Typ berichtet.
  - Features, die nur Hang-AOIs verbessern aber flache HR-AOIs verschlechtern,
    werden nicht integriert.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T3: Small-N-Alternativen

- Ziel: `3-5` kept points fachlich robuster behandeln.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_small_n_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- Testachsen:
  - MAD/medoid score,
  - leave-one-out consistency,
  - pairwise motion/spatial support,
  - stronger weak-secondary-track marking,
  - separate `weak_support` statt scheinbarer Core-Cluster.
- DoD:
  - Small-N wird nicht zu hoher Sicherheit hochgestuft.
  - `548205` und Bad-Gastein-Small-N-Faelle sind explizit bewertet.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T4: Borderline-Noise-Reassignment auditieren

- Ziel: pruefen, ob Reassignment plausible Punkte rettet oder Unsicherheit verdeckt.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_reassign_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
- DoD:
  - Reassignment-Zaehler je AOI, n-Regime, assignment method und Falltyp.
  - nearest-heavy Gebaeude werden separat bewertet.
  - Visual-Audit-Faelle pruefen mindestens einen reassignment-sensitiven Fall.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-C-W1-T5: Assignment-Hygiene - nearest-Politik und Fremdobjekt-Veto

- Ziel: klaeren, wie Punkte ohne geometrische Zuordnungs-Begruendung
  (`nearest`-Fallback) behandelt werden, gemaess Asymmetrie-Prinzip
  (User-Auftrag 2026-06-10). Abgrenzung: Die Candidate-Area-GEOMETRIE aus
  `P6` wird nicht umgebaut; es geht um die Aufnahme-POLITIK.
- Kontext (gemessen): In Mirabell sind ~30 % der zugeordneten Punkte
  `nearest` (T44: 210/632, T95: 207/721); nearest-heavy Beispiele:
  `324384` (54/214), `548206` (25/106), `150506168` (23/47). Ein blanker
  Ausschluss ist also ein grosser Eingriff in die n-Regime und muss
  gemessen, nicht angenommen werden. Gegenlaeufige Ursache fuer legitime
  Ausreisser: SNT-Geokodierung bis ~8-12 m; die laterale Slack der
  Candidate-Area betraegt nur 2 m.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_assign_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-B-W1-T2`
  - soft: `P7-A-W1-T6` (Hoehenstrategie; ein Teil der nearest-Punkte ist
    mutmasslich Folge zu kurzer Candidate-Areas durch GBA-Unterschaetzung,
    nicht Fremdobjekte - Varianten gegen beide Hypothesen rechnen)
- Testachsen (Varianten gegen Baseline A0 = nearest <= 15 m mit Penalty):
  - A1 Demotion: `nearest`-Punkte bleiben sichtbar/geflaggt, werden aber von
    Main-Cluster-Mitgliedschaft und Gebaeude-Motion-Score ausgeschlossen.
  - A2 Verschaerfung: `max_distance_m` deutlich reduzieren (z. B. 5 m oder
    sensorabhaengig an der Geokodierungs-Toleranz orientiert).
  - A3 Hoehenplausibilitaet: `height_above_ground_m` (Punkthoehe minus
    `insar_point_terrain`-Gelaendehoehe, lokal mediankalibriert wegen
    Geoid-/Ellipsoid-Offset) muss zur Gebaeudehoehe passen; ein
    Bodenobjekt-/Carport-Punkt (~2-3 m) faellt durch.
  - A4 OSM-Fremdobjekt-Veto: Punkt liegt in/nahe einer OSM-Struktur
    (Garage/Carport/Schuppen), die im GBA fehlt -> Veto gegen
    Gebaeudezuordnung. Aktuell nur Salzburg moeglich (kein
    Bad-Gastein-OSM-Parquet geladen); fuer Bad Gastein dokumentieren.
- DoD:
  - Der reale Carport-Fall (User-Beobachtung) ist als Referenzfall erfasst
    und wird von mindestens einer Variante korrekt behandelt.
  - Je Variante: Veraenderung der n-Regime/Status-Verteilungen
    (Ehrlichkeitskosten: wie viele Gebaeude fallen auf
    `small_n`/`insufficient_support`) und der Cross-Track-Agreements.
  - HR-Gegenprobe in Bad Gastein, wo verfuegbar: zeigen dichte TSX/PAZ-Punkte
    am selben Objekt, dass ausgeschlossene SNT-`nearest`-Punkte tatsaechlich
    nicht zum Gebaeude gehoeren?
  - Visual-Audit mindestens eines nearest-heavy Gebaeudes vor/nach Variante.
  - Kein "Gesundrechnen": eine Variante darf nicht gewinnen, WEIL sie mehr
    Punkte aufnimmt; konservativer Punktverlust ist gemaess
    Asymmetrie-Prinzip zulaessig und kein Regression-Fail, solange die
    Konfidenzdarstellung ehrlich bleibt.
- Kritischer Pfad: ja (vom User explizit beauftragt)
- Status: planned

#### Welle P7-C-W2: Alternative Clusterer und High-N

##### Ticket P7-C-W2-T1: OPTICS-Vergleich (strikt nach HDBSCAN-Sweep)

- Ziel: OPTICS als explizit waehlbare Harness-Variante fair gegen die
  HDBSCAN-Sweep-Ergebnisse vergleichen (User-Sequenz 2026-06-10: zuerst
  HDBSCAN-Ergebnisse, dann OPTICS, erst danach weitere Algorithmen).
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_optics_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T1`
  - hard: `P7-C-W1-T1` (HDBSCAN-Sweep-Ergebnisse liegen vor)
  - soft: `P7-A-W1-T2`
- Testachsen:
  - OPTICS `min_samples`/`min_cluster_size`,
  - `xi`- vs. dbscan-artige Clusterextraktion,
  - identische Feature-Matrix und Scorecard wie der HDBSCAN-Sweep.
- DoD:
  - OPTICS ist eine per Experiment-ID waehlbare Variante, kein Fallback.
  - Vergleich pro Dataset-Regime gegen den besten HDBSCAN-Kandidaten.
  - Ergebnis darf `no_alt_gain` oder `inconclusive` sein.
- Kritischer Pfad: nein
- Status: planned

##### Ticket P7-C-W2-T3: Weitere Clustering-Algorithmen (groesserer Part, strikt nach OPTICS)

- Ziel: erst wenn HDBSCAN-Sweep UND OPTICS-Vergleich ausgewertet sind,
  weitere Algorithmusfamilien pruefen (GMM, PAM/k-Medoids, robuste
  Clusterer, optional geometrie-informierte/Constraint-Ansaetze).
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_alt_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-C-W2-T1`
  - hard: `P7-C-W1-T1`
- DoD:
  - Auswahl der Kandidaten ist aus den HDBSCAN-/OPTICS-Befunden begruendet
    (welcher Schwachpunkt soll behoben werden?).
  - keine neue schwere Dependency ohne starken Gewinn.
  - Ergebnis darf `no_alt_gain`, `inconclusive` oder `defer` in eine
    Folgephase sein; dieser Part ist bewusst als groesserer, eigener
    Block geschnitten und darf P7 nicht blockieren.
- Kritischer Pfad: nein
- Status: planned

##### Ticket P7-C-W2-T2: High-N-/TSX-PAZ-spezifische Strategie

- Ziel: pruefen, ob sehr dichte Gebaeude eine andere Clusterlogik brauchen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_high_n_*`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W1-T4`
- Testachsen:
  - HDBSCAN `leaf` fuer feinere Dach-/Anbau-Struktur,
  - spatial-first/motion-second,
  - main-roof cluster selection gegen HR-Pseudo-Referenz.
- DoD:
  - nur Bad-Gastein-HR-Verbesserung reicht nicht fuer SNT-Default.
  - Ergebnis kann als separate HR-Diagnose oder Folgephase enden.
- Kritischer Pfad: nein
- Status: planned

### Phase P7-D: Kombinierte Kandidaten und visuelle Gate-Pruefung

Phasen-DoD:

- Maximal drei kombinierte Kandidaten werden voll gegen Scorecard, HR-Pseudo-
  Referenz und Visual-Audit getestet.

#### Welle P7-D-W1: Kandidatenbildung

##### Ticket P7-D-W1-T1: Kombinierte Kandidaten definieren

- Ziel: aus isolierten Experimenten kleine Kandidatenliste erstellen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_shortlist.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: alle kritischen `P7-C-W1` Tickets
  - soft: `P7-C-W2-T1`
  - soft: `P7-C-W2-T2`
  - soft: `P7-C-W2-T3`
- DoD:
  - maximal drei Kandidaten plus Baseline.
  - jedes Delta ist klein genug fuer Integration.
  - keine unerklaerte Vermischung mehrerer Effekte.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-D-W1-T2: Kandidaten gegen volle Scorecard laufen lassen

- Ziel: Shortlist vollstaendig bewerten.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.json`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_candidate_<id>.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-D-W1-T1`
- DoD:
  - alle Salzburg- und Bad-Gastein-Pflicht-AOIs.
  - Cross-Track-Diagnostik, HR-Pseudo-Referenz und Sensitivitaet/Konfidenz
    enthalten.
  - flach und Hang getrennt bewertet.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-D-W1-T3: Visual-Audit der Shortlist

- Ziel: KI-Agent prueft Clusterbilder fuer Baseline und Kandidaten.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_report.md`
  - Screenshots `docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_*.png`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-B-W2-T1`
  - hard: `P7-D-W1-T2`
- DoD:
  - mindestens 12 visuelle Faelle:
    - 3 Salzburg,
    - 3 Bad-Gastein flach SNT/TSX,
    - 3 Bad-Gastein Hang,
    - 3 Failure-/nearest-/Small-N-Faelle.
  - jedes Bild hat strukturiertes Audit-Label und kurze Begruendung.
  - Offensichtliche Carport-/Nebengebaeude-Fehler sind als Gate-Signal erfasst.
- Kritischer Pfad: ja
- Status: planned

### Phase P7-E: Entscheidung und bedingte Integration

Phasen-DoD:

- Entscheidung ist eindeutig.
- Bei Integration sind Code, Methodik, Runbook und Verifikation aktualisiert.
- Ohne Integration bleiben keine produktiven Algorithmus-Aenderungen zurueck.

#### Welle P7-E-W1: Entscheidung

##### Ticket P7-E-W1-T1: Kandidatenentscheidung

- Ziel: Baseline und Kandidaten nach Scorecard zusammenfuehren.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-D-W1-T2`
  - hard: `P7-D-W1-T3`
- DoD:
  - Entscheidung ist `keep_current`, `integrate_candidate`, `defer` oder
    `inconclusive`.
  - Bei `integrate_candidate` ist genau ein Kandidat benannt.
  - Bei Nicht-Integration ist begruendet, warum kein produktiver Change erfolgt.
- Kritischer Pfad: ja
- Status: planned

##### Ticket P7-E-W1-T2: Produktive Integration, nur bei `integrate_candidate`

- Ziel: kleinste produktive Codeaenderung umsetzen.
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - optional `backend/app/ml/evaluation/phase2_harness.py`
  - optional `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  - `docs/pipelines/anomaly_local_v1/methodik.md`
  - `docs/pipelines/anomaly_local_v1/runbook.md`
  - `docs/pipelines/anomaly_local_v1/iterations.md`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - hard: `P7-E-W1-T1` mit `integrate_candidate`
- DoD:
  - `MODEL_SET_VERSION` aktualisiert, wenn Verhalten produktiv anders ist.
  - Backend kompiliert.
  - alle Pflicht-AOIs laufen neu.
  - Scorecard zeigt Guardrails gruen oder begruendete Abweichungen.
  - Methodik und Runbook beschreiben neue Semantik.
- Kritischer Pfad: bedingt
- Status: planned

##### Ticket P7-E-W1-T3: Run-Transparenz in der UI (Pflicht) und API/UI-Diagnose

- Ziel: Forschungsplattform-Anspruch (User-Auftrag 2026-06-10): Im Viewer
  muss pro ML-Run komfortabel und uebersichtlich sichtbar sein, WOMIT er
  gelaufen ist. Zusaetzlich neue Diagnosefelder sichtbar machen, falls die
  Integration welche erzeugt.
- Pflichtumfang Run-Transparenz (PipelinePanel/Run-Detail):
  - Pipeline-Name und -Version, `FEATURE_SET_VERSION`, `MODEL_SET_VERSION`,
  - vollstaendige Run-Parameter (`ml_runs.params`) lesbar aufbereitet
    (Gates, Clustering-Parameter, Feature-Set, Algorithmus),
  - Experiment-ID bei Harness-Runs,
  - Area/Dataset/Track/BBox, Status, Zeitstempel, Kennzahlen.
- Write-Set:
  - optional `backend/app/routers/ml.py`
  - optional `frontend/src/hooks/useApi.ts`
  - optional `frontend/src/components/InspectorPanel.tsx`
  - `frontend/src/components/PipelinePanel.tsx`
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
- Abhaengigkeiten:
  - soft: `P7-B-W1-T1` (Experiment-IDs/Konfigurationen existieren)
  - hard: `P7-E-W1-T2`, falls Integration neue Felder erzeugt
- DoD:
  - Run-Transparenz wie oben fuer mindestens einen Pipeline- und einen
    Experiment-Run per Screenshot belegt.
  - kein breiter UI-Refactor.
  - Frontend-Build bei Frontend-Aenderung.
  - Visual-Diagnose im Viewer bleibt bedienbar.
- Kritischer Pfad: nein, aber Pflicht vor Abschluss
  (`P7-F-W1-T1` haengt hart daran)
- Status: planned

### Phase P7-F: Abschlussbericht und Folgeplanung

#### Welle P7-F-W1

##### Ticket P7-F-W1-T1: Abschlussbericht

- Ziel: Ergebnis fuer Forschung und naechste Supervisor-Session abschliessen.
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_report.md`
  - optional `docs/pipelines/anomaly_local_v1/next_steps.md`
- Abhaengigkeiten:
  - hard: `P7-E-W1-T1`
  - hard: `P7-E-W1-T2`, falls integriert
  - hard: `P7-E-W1-T3` (Run-Transparenz ist Pflicht, User-Auftrag 2026-06-10)
- DoD:
  - Entscheidung, Run-IDs, Artefakte und Restrisiken sind verlinkt.
  - Offene Forschungsfragen sind als konkrete Follow-up-Tickets formuliert.
  - Es gibt keine stillen Experimentaenderungen im produktiven Code.
- Kritischer Pfad: ja
- Status: planned

## Supervisor-Regeln

- Ticket-Arbeit wird an Subagents delegiert.
- Supervisor bleibt Scheduler, Gatekeeper, Integrator und Statusfuehrer.
- Alle Agents: `gpt-5.5`, reasoning effort `xhigh`.
- Kein Modell-Downgrade. Wenn `gpt-5.5` nicht verfuegbar ist: Stop und Blocker.
- Research-Tickets duerfen `green`, `red` oder `inconclusive` enden.
- `inconclusive` darf weitergefuehrt werden, wenn es nicht auf dem kritischen Pfad
  blockiert oder der Supervisor eine dokumentierte Annahme setzt.
- Produktive Defaults bleiben bis `P7-E-W1-T1` unveraendert.

## Mindestpruefungen

Immer:

- `git status --short --branch`
- Python-/`hdbscan`-Importcheck. Achtung: das installierte `hdbscan 0.8.42`
  hat KEIN `__version__`-Attribut; Version ueber
  `importlib.metadata.version("hdbscan")` pruefen.
- DB-/MLflow-Erreichbarkeit
- `backend/.venv-wsl/bin/python -m compileall backend/app`
- `git diff --check`

Bei produktiver Pipeline-Aenderung:

- neue Runs fuer alle Salzburg-Pflicht-AOIs,
- neue Runs fuer mindestens `bg_flat_01`, `bg_flat_02`, `bg_slope_01`,
- Harness-/Scorecard-Rerun,
- Methodik/Runbook/Iterations aktualisiert,
- `MODEL_SET_VERSION` geprueft/aktualisiert.

Bei Frontend-Aenderung:

- `cd frontend && npm run build`
- Playwright-Screenshots fuer mindestens einen Salzburg- und einen
  Bad-Gastein-Fall.

## Empfohlener Session-Schnitt

Eine frische Supervisor-Session soll nur diesen Einzeiler brauchen:

`Lies docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_supervisor_prompt.md und fuehre es vollstaendig aus.`
