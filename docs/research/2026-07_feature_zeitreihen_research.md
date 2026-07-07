# Research: Feature-Engineering + Zeitreihen-Methoden fuer PS-InSAR auf Gebaeudeebene

Stand: 2026-07-07
Anlass: Meeting-Beschluss 2026-06-19 ("Feature-Satz bewerten und erweitern"
+ Research-Task), `../meetings/2026-06-19_ml_pipeline_meeting_notes.md` §5,
`../pipelines/anomaly_local_v1/next_steps.md` §7 (Abgleich mit Research).

## Methodik und Verlaesslichkeit

Deep-Research-Workflow (5 Suchwinkel, Quellen-Fetch, adversariale
3-Voter-Verifikation). **Einschraenkung:** Lauf durch Nutzungslimit
teilweise abgebrochen (Synthese + Teil der Verifikationen). Kennzeichnung:

- **[V]** adversarial verifiziert (2-3 von 3, keine Refutation)
- **[U]** aus der Quelle extrahiert, nicht fertig verifiziert
- 1 Claim wurde refutiert und ist hier NICHT enthalten.

## 1. Zeitreihen-Vergleich/-Clustering: was die Literatur wirklich tut

- **[V]** Schneider & Soergel (GCPR 2021 / ISPRS 2022) clustern PS-Punkte
  **auf Einzelgebaeude-Ebene nach Aehnlichkeit der Bewegungszeitreihe**:
  hybride Distanz aus **Pearson-Korrelation + euklidischer Distanz**,
  danach **UMAP**-Reduktion auf 2D und **DBSCAN** (Noise-Floor aus dem
  Core-Distance-Graph). Datengrundlage: 89 TSX-Epochen, 11-Tage-Sampling —
  also genau unser Kurz-Zeitreihen-Regime. Bemerkenswert: **kein DTW**.
  Quellen: https://link.springer.com/chapter/10.1007/978-3-030-92659-5_40 ,
  https://isprs-annals.copernicus.org/articles/V-3-2022/123/2022/
- **[V]** k-means + **DTW auf der ersten Hauptkomponente (PC1)** statt auf
  Rohserien (Remote Sensing 2024) — Dimension zuerst reduzieren, dann
  formbasiert vergleichen.
  Quelle: https://doi.org/10.3390/rs16081375
- **[U]** SARClust: hierarchisches Clustering auf **DTW-Distanzen** ueber
  multivariate **(vertikal + Ost-West)**-Serien, mit **Sakoe-Chiba-Fenster**
  und **Tiefpass-Filterung**; Autoren raeumen ein, dass DTW fuer verrauschte
  InSAR-Serien nur mit Filterung praktikabel ist.
  Quelle: https://www.mdpi.com/2071-1050/15/4/3728
- **[V]** In einer echten **Ablation** (LSTM-Autoencoder auf EGMS-Serien,
  Rom) verbessert eine **shape-aware soft-DTW-Loss** gegenueber L1 die
  Erkennung aller drei Anomalietypen (Trend/Noise/Step) deutlich, am
  staerksten fuer Trend-Anomalien — Form schlaegt reine Magnitude.
  Quelle: https://ieeexplore.ieee.org/document/10188664/

**Shortlist fuer unsere Harness-Achsen (Reihenfolge = Empfehlung):**

1. Hybride Pearson+Euklid-Distanz als Zeitreihen-Aehnlichkeitsfeature
   innerhalb Gebaeude x Track (an Gebaeuden validiert, billig, robust).
2. Trend+Saison-Residuen-Features (haben wir teilweise: ts_slope,
   ts_residual_std, season_*) — vor DTW ausreizen.
3. DTW nur als Kandidat MIT Tiefpass + Fenster (SARClust-Lektion),
   bevorzugt auf PC1/reduzierten Repraesentationen.

## 2. Gates und Features: zwei belastbare Warnungen

- **[V]** **Kohaerenz-Gate-Confound:** Temporale Modell-Kohaerenz aus
  linearer PSI-Prozessierung vermischt Signalqualitaet mit
  **Modell-Misfit**. Gebaeudeteile mit stark nichtlinearer (thermisch
  saisonaler) Bewegung liefern kaum PS ueber einer 0.6-Schwelle; senkt man
  auf 0.4, erscheinen dort Punkte, deren lineare Geschwindigkeiten aber
  Prozessierungsartefakte sind. **Konsequenz fuer uns:** unser
  `coherence_floor`-Gate (max(0.45, track_p05)) kann echte Gebaeudepunkte
  auf thermisch arbeitenden Strukturen systematisch ausschliessen;
  `season_amp`-bewusste Gate-Ausnahme als Harness-Achse pruefen.
  Quelle: https://isprs-annals.copernicus.org/articles/V-3-2022/123/2022/
- **[U]** Klassische PS-Selektion (Amplituden-Dispersion/Kohaerenz)
  uebersieht phasenstabile Streuer mit niedriger Amplitude (Hooper-Linie) —
  Amplituden-Features als HARTE Gates waeren daher riskant; als weiche
  Evidenz (Gewicht/Score) einsetzen.
  Quelle: https://www.sciencedirect.com/science/article/pii/S0924271615002415

## 3. Punktattribute fuer Fremdpunkt-/Outlier-Trennung

- **[U]** Multivariate Outlier-Detektion auf PS-Attributen arbeitet mit
  genau unserem Kandidatensatz: **velocity, (Residual-)Hoehe, deren
  Standardabweichungen (v_stdev, h_stdev), Kohaerenz, kumulative
  Verschiebung**; Pipeline: DBSCAN (raeumlich) -> robuste Statistik ->
  Flags. Stuetzt die geplanten `h_stdev`/`v_stdev`/`eff_area`-Achsen.
  Quelle: https://www.academia.edu/93224973/ (Data-Mining-Ansatz, InSAR-Postprocessing)
- **[U]** **Geokodierungs-Versatz liegt entlang der Blickrichtung** und
  stammt u. a. von der Referenzpunkt-Wahl; PS-zu-Gebaeude-Matching
  arbeitet in der Literatur mit **ICP-Alignment + nearest-polygon-Regel**
  und benennt die geometrische Natur als Kernproblem. Ein Review stuft die
  **eindeutige PS-Gebaeude-Zuordnung als zentrales ungeloestes Problem**
  der PSI ein. **Konsequenz:** unser Fokus (directional buffer, k2x,
  Anti-Layover/Reichweite) adressiert genau die richtige Front; ein
  globaler ICP-artiger Offset-Abgleich je Dataset waere eine pruefbare
  Ergaenzung (systematischer Shift vor Punktzuordnung).
  Quellen: https://www.researchgate.net/publication/314879200 ,
  https://www.sciencedirect.com/science/article/pii/S0924271615002415
- **[U]** **PS-Muster auf Fassaden sind ueber Aufnahmegeometrien instabil**
  (verschwinden bei leicht geaenderter Geometrie); relative
  3D-Lokalisierung natuerlicher PS aus Meter-TSX ist stark anisotrop
  (~2-4 cm range/azimuth, aber 0,6-1,4 m cross-range). **Stuetzt den
  Decision Record** gegen Punkt-Overlay-Vergleiche zwischen Sensoren
  (`../pipelines/anomaly_local_v1/tsx_structural_reference_decision.md`).
  Quelle: https://www.sciencedirect.com/science/article/abs/pii/S0924271614001488
- **[U]** Terrafirma-Inter-Comparison: Residual-Topographie-Fehler (RTE)
  mit 0,9-2,0 m Streuung => Geokodierungs-Unsicherheit 2,1-4,7 m schon
  bei ERS/Envisat — quantitative Basis fuer unsere Toleranzbaender.
  Quelle: https://www.sciencedirect.com/science/article/pii/S0924271615002415

## 4. Evaluation ohne Ground Truth: das wichtigste Ergebnis

- **[V]** **Synthetische Anomalie-Injektion** ist das etablierte Muster:
  In der EGMS-Rom-Studie wurden mangels Ground Truth Serien im
  Test-Split durch augmentierte Varianten dreier Typen ersetzt
  (**trend** = addierte Steigung, **noise** = verstaerkte LOS-Werte,
  **step** = vertikaler Sprung; Injektionsraten 1-25 %) und die
  Detektionsrate gemessen.
  Quelle: https://ieeexplore.ieee.org/document/10188664/
- **[V]** Interne Konsistenz gegen **unabhaengige Gebaeudegeometrie**
  (per-Segment-Entropie der Cluster-Zugehoerigkeit ueber kNN auf
  Mesh-Vertices) als Clusterqualitaets-Metrik ohne Bewegungs-Ground-Truth.
  Quelle: https://isprs-annals.copernicus.org/articles/V-3-2022/123/2022/
- **[U]** Interne Validitaetsindizes (Xie-Beni, WB, S_Dbw) und
  **Cross-Sensor-Konsistenz** (S1/TSX/ALOS-2) als weitere Schichten.
  Quellen: https://doi.org/10.3390/rs16081375 , https://www.mdpi.com/2071-1050/15/4/3728

**Konsequenz fuer die Hygiene-/Feature-Ablation (phase8):** Zusaetzlich zu
Label-Korpus, Referenzfaellen, Scorecards und Cross-Track sollte der
Harness eine **Injection-Achse** bekommen: synthetische Fremdpunkt-/
Anomalie-Injektion (Trend/Step/Noise + "verschobener Reflektor") in echte
Gebaeude x Track-Gruppen, Messung von Erkennungsrate und roof-Verlusten.
Das ist die skalierbare, label-freie Ergaenzung zum (kleinen) internen
Label-Korpus — und deckt genau die Bewertungsluecke, die durch fehlende
Experten-Labels und fehlende SNT/TSX-Zeitueberlappung entsteht.

## 5. Direkt ableitbare Harness-Achsen (Vorschlag fuer P8-C)

| Achse | Basis | Aufwand |
| --- | --- | --- |
| `ts_pearson_euclid` (Aehnlichkeit zum Gebaeude-Median-Verlauf) | [V] Schneider/Soergel | klein |
| `gate_seasonal_exception` (coherence_floor mit season_amp-Ausnahme) | [V] Kohaerenz-Confound | klein |
| `h_v_stdev_features` (h_stdev, v_stdev, eff_area in Score/Gates) | [U] multivariate outlier lit. | klein |
| `amp_soft_evidence` (Amplitude nur als Gewicht, nie hartes Gate) | [U] Hooper-Linie | klein |
| `dataset_icp_offset` (systematischer Shift je Dataset vor Zuordnung) | [U] PS-Matching-Literatur | mittel |
| `synthetic_injection` (Evaluations-Achse, kein Feature) | [V] EGMS-Rom | mittel |
| `dtw_pc1` (nur falls 1-3 ausgereizt; mit Tiefpass/Fenster) | [V]/[U] | mittel |

## 6. Offene Punkte

- Verifikation der [U]-Claims nachziehen (kleines Follow-up, gleiche
  Quellenliste; Abbruch war ein Ressourcen-, kein Evidenzproblem).
- Fuer `eff_area`/SqueeSAR-Unsicherheiten existiert wenig oeffentliche
  Ablation — hier bleibt der eigene Harness die primaere Evidenzquelle.
- Abgleich mit dem aelteren `deep_research_report.md` der Pipeline steht
  aus (next_steps §7) — dieser Bericht ist der erste Baustein dafuer.
