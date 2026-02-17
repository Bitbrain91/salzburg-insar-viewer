# Deep Research Report: InSAR Anomalie- und Qualitätsdetektion für den Salzburg InSAR Viewer

**Version:** 1.0  
**Datum:** 17. Februar 2026  
**Projekt:** Salzburg InSAR Viewer (FH Salzburg / AUGMENTERRA / Synthetic Dimension)  
**Stack:** React/MapLibre, FastAPI, PostGIS, MLflow  

---

## 1. Executive Summary

1. **Problemstellung:** 550.764 InSAR-Messpunkte (SqueeSAR/TRE Altamira, Sentinel-1, Tracks 44/95, ~3 Jahre) benötigen ein trainierbares Qualitäts-/Anomalie-Scoring statt starrer Regelfilter. Kein Ground-Truth in Salzburg verfügbar.
2. **Kernprinzip:** „Messpunkte sollen sich durch ihren räumlichen Kontext selbst validieren" — Anomalie = Punkt, dessen Verhalten inkonsistent mit seiner Nachbarschaft, seinem Gebäude oder dem gegenüberliegenden Track ist.
3. **Empfohlener Startansatz:** Isolation-Forest-Ensemble auf engineerten Features (punktweise + temporal + spatial + Gebäude + Asc/Desc-Konsistenz). Wissenschaftlich belegt, label-frei, interpretierbar via SHAP, deploybar in 4–6 Wochen. **(Evidenzstufe: A – wissenschaftlich gesichert für unsupervised AD; B – plausible Annahme für InSAR-Spezifik)**
4. **Backup-Pfad:** PCA-basierte Zeitreihenmusteranalyse + DBSCAN-Clustering (bereits im Stack, geringeres Risiko). **(Evidenzstufe: A)**
5. **Validierung ohne Ground Truth:** Asc/Desc-Konsistenzmetrik (ΔLOS-Residuen nach 2D-Dekomposition), Spatial-Autocorrelation (Moran's I), Synthetic-Injection-Tests.
6. **Score-Architektur:** Point Quality Score (PQS, 0–1 pro Messpunkt) → aggregiert zu Building Risk Class (BRC, 5 Stufen pro Gebäude).
7. **Feature-Engineering** nutzt alle verfügbaren Attribute: velocity, v_stdev, coherence, acceleration, season_amp, height, eff_area, Amplitude-Zeitreihe + räumliche Nachbarschaftsstatistiken + Gebäude-Kontext (GBA-Höhe, Anzahl Punkte pro Gebäude) + Asc/Desc-Differenz.
8. **Phasenplan:** Phase 1 (4–6 Wo.) = Feature Store + Isolation Forest + PQS-API; Phase 2 (8–12 Wo.) = Gebäude-Aggregation + Spatial Features + Active Learning Loop; Phase 3 (12–20 Wo.) = Graph Neural Network auf Punkt-Nachbarschaftsgraph.
9. **Technische Integration:** Neue PostGIS-Tabellen (`point_quality_scores`, `building_risk_classes`), FastAPI-Endpoints (`/api/v1/quality/points`, `/api/v1/quality/buildings`), MLflow-Tracking aller Experiment-Runs.
10. **Kritischer Fehlertyp:** False Normal (schlechter Punkt wird nicht erkannt) ist gefährlicher als False Outlier – daher Recall-Optimierung bei der Anomaliedetektion.
11. **EGMS-Kompatibilität:** Qualitätsindikatoren des European Ground Motion Service (temporal coherence, RMSE) als Benchmark für eigene Scores nutzbar.
12. **~84% der Punkte sind stabil** (±2 mm/a) — Anomalien sind seltene Events (~2–5% erwartet), was Isolation-Forest-Ansätze besonders geeignet macht.
13. **Amplituden-Zeitreihen** (338k/336k Punkte) sind ein unterschätzter Informationsträger für Material-/Reflexionseigenschaften und temporale Stabilität — sollten ab Phase 1 als Features integriert werden.
14. **Risiko:** Ohne Ground-Truth ist kein klassisches Precision/Recall-Benchmarking möglich → synthetische Anomalie-Injection + Expert-Review als Proxy.
15. **Langfristig:** GNN-basierter Ansatz auf Punkt-Nachbarschaftsgraph (k-NN oder Delaunay) kann räumliche Kontextbeziehungen direkt modellieren — erfordert aber mehr Entwicklungszeit und Expertise.

---

## 2. Problem-Formalisierung

### 2.1 Input/Output-Definition

**Input pro Messpunkt x_i:**

| Kategorie | Features | Quelle |
|-----------|----------|--------|
| Kinematisch | vel, v_stdev, acc, a_stdev | Stadt_Salzburg.gpkg |
| Qualität | coherence, eff_area | Stadt_Salzburg.gpkg |
| Geometrisch | height, h_stdev, incidence_angle | Stadt_Salzburg.gpkg |
| Saisonal | season_amp, season_phs | Stadt_Salzburg.gpkg |
| Temporal | Zeitreihe d20YYMMDD (88–90 Werte) | Stadt_Salzburg.gpkg |
| Amplitude | Amplituden-Zeitreihe (88–90 Werte) | ASC_T44/T95_AMP.gpkg |
| Spatial | Nachbarschaftsstatistiken (k-NN) | Berechnet |
| Gebäude-Kontext | Gebäudehöhe, Distanz, Zuordnung | gba_buildings, osm_buildings |
| Cross-Track | Asc/Desc-Residuum | Berechnet aus beiden Tracks |

**Output:**

- **Point Quality Score (PQS):** Kontinuierlicher Score ∈ [0, 1], wobei 0 = höchste Qualität (normal), 1 = Anomalie
- **Anomalie-Label:** Binär {0, 1} basierend auf Threshold τ auf PQS
- **Building Risk Class (BRC):** Ordinalskala {1, 2, 3, 4, 5} pro Gebäude, aggregiert aus PQS + kinematischen Attributen der zugeordneten Punkte

**Formale Definition:**

Gegeben: Datensatz X = {x₁, ..., x_n}, x_i ∈ ℝ^d mit n ≈ 550.000, d ≈ 15–25 (nach Feature Engineering).

Gesucht: Scoring-Funktion f: ℝ^d → [0, 1], die ohne gelabelte Trainingsbeispiele anomale Messpunkte identifiziert.

### 2.2 Umgang mit fehlenden Labels

**Strategie: Unsupervised Learning + Pseudo-Label-Generierung**

Da in Salzburg kein Ground-Truth existiert, verfolgen wir einen dreistufigen Ansatz:

1. **Unsupervised Anomalie-Detektion** (Phase 1): Isolation Forest, LOF oder ähnliche Verfahren lernen die „normale" Datenverteilung und flaggen Ausreißer. Dies ist wissenschaftlich gesichert für Szenarien ohne Labels (Liu et al., 2008/2012; Xu et al., 2023 – Deep Isolation Forest). **(Evidenzstufe: A)**

2. **Proxy-Labels über Asc/Desc-Konsistenz** (Phase 1–2): Punkte, deren Bewegungssignal physikalisch inkonsistent zwischen Ascending und Descending ist (nach 2D-Dekomposition), liefern ein starkes Signal für Qualitätsprobleme. Dies ist ein etabliertes Validierungsverfahren in der InSAR-Community (Crosetto et al., 2016; EGMS Validation Framework, 2023). **(Evidenzstufe: A)**

3. **Active-Learning-Loop** (Phase 2–3): Ein Domänenexperte (AUGMENTERRA) labelt iterativ die unsichersten Fälle → Semi-supervised Feintuning des Modells. Empfohlen von Aghdami et al. (2023) für InSAR-Hotspot-Detektion. **(Evidenzstufe: B – plausible Annahme, noch kein direkter Nachweis für PSI-Qualität)**

### 2.3 Kritische Fehlertypen

| Fehlertyp | Beschreibung | Konsequenz | Priorität |
|-----------|-------------|------------|-----------|
| **False Normal (FN)** | Schlechter Punkt wird als „normal" klassifiziert | Fehlerhafte Bewegungsdaten fließen in Gebäude-Assessment → falsche Sicherheitsaussagen | **KRITISCH** — höchste Priorität |
| **False Outlier (FP)** | Guter Punkt wird als Anomalie geflaggt | Datenverlust, reduzierte Punktdichte → weniger Monitoring-Information | **MODERAT** — tolerierbar bis ~10% |

**Entscheidung:** Wir optimieren auf hohen Recall (Sensitivität) bei akzeptabler Precision. Ein konservatives Setting mit contamination=0.05 und nachgelagertem Expert-Review ist sinnvoller als aggressive Filterung. **(Evidenzstufe: B)**

---

## 3. Methodenvergleichstabelle

| Methode | Datenanforderungen | Interpretierbarkeit | Robustheit ohne Labels | Rechenkosten | Deployment-Risiko | Eignung Salzburg (1–5) |
|---------|-------------------|--------------------|-----------------------|-------------|-------------------|----------------------|
| **Isolation Forest** | Tabellarisch, Features engineered | Hoch (SHAP-kompatibel) | Sehr hoch (nativ unsupervised) | Niedrig (O(n·t·ψ)) | Niedrig (sklearn) | **5** |
| **Extended Isolation Forest** | Wie IF, besser bei korrelierten Features | Hoch | Sehr hoch | Niedrig | Niedrig | **5** |
| **LOF (Local Outlier Factor)** | Tabellarisch | Mittel (Score interpretierbar) | Hoch | Mittel (O(n²) naiv) | Niedrig | **4** |
| **DBSCAN-basiert** | Punktwolke mit Koordinaten | Mittel (Cluster-Zugehörigkeit) | Hoch | Mittel | Niedrig (bereits im Stack) | **3** — eher Clustering als AD |
| **Mahalanobis-Distanz** | Multivariat, Normalverteilungsannahme | Sehr hoch | Mittel (Gauss-Annahme) | Sehr niedrig | Sehr niedrig | **3** — Annahme oft verletzt |
| **Autoencoder (VAE)** | Zeitreihen, > 10k Samples | Niedrig (Black-Box) | Hoch (Reconstruction-Error) | Mittel-Hoch | Mittel (PyTorch-Infrastruktur) | **3** — Phase 3 |
| **PCA + k-Means** | Zeitreihen | Hoch (Komponentenanalyse) | Hoch | Niedrig | Sehr niedrig | **4** — bewährt für InSAR-TS |
| **LSTM-Ensemble** | Zeitreihen, lang genug | Niedrig | Mittel (benötigt Pseudo-Labels) | Hoch | Hoch | **2** — zu komplex für Phase 1 |
| **Graph Neural Network (GNN)** | Punkt-Nachbarschaftsgraph | Mittel (GNN-Explainer) | Mittel (Graph-Konstruktion kritisch) | Hoch | Hoch | **3** — Phase 3 |
| **Transformer-basiert** | Lange Zeitreihen | Niedrig | Mittel | Sehr hoch | Sehr hoch | **2** — Overengineering |
| **Random Forest (supervised)** | Benötigt Labels | Sehr hoch | Nicht anwendbar ohne Labels | Niedrig | Niedrig | **1** — Labels fehlen |

**Quellen & Begründung:**

- Isolation Forest: Liu et al. (2008, 2012) – IEEE TKDE; Hariri et al. (2019) – Extended IF; Xiang et al. (2023) – OptIForest, IJCAI. Linear-time, label-frei, SHAP-kompatibel. Ideal für Salzburg weil: unsupervised, skaliert auf 550k Punkte, Features direkt aus vorhandenen Attributen ableitbar. **(Evidenzstufe: A)**
- PCA + k-Means für InSAR-TS: Mirmazloumi et al. (2023) – ISPRS JAEOG; Valle d'Aosta-Studie mit Asc/Desc-Fusion + PCA-Dimensionsreduktion + Clustering. Direkt auf unser Setting übertragbar. **(Evidenzstufe: A)**
- Semi-supervised TSKM + DBSCAN + LSTM: Aghdami et al. (2023) – ISPRS JAEOG; Los-Angeles-Studie mit Clustering → Pseudo-Labels → LSTM. Guter Referenzansatz für Phase 2. **(Evidenzstufe: A für die Methode, B für Übertragbarkeit auf PSI-Qualität)**
- GNN für räumliche Punktnetzwerke: Kuzu et al. (2025) – Review in Sensors; wachsendes Feld, aber noch keine direkte Anwendung auf PSI-Qualitätsbewertung publiziert. **(Evidenzstufe: C – spekulativ für unser Setting)**
- PSI-Qualitätsbewertung: Omidalizarandi et al. (2024) – EGU; VAR-basiertes spatio-temporales Modelling für PS-Qualität mit LoD2-Gebäudemodellen. Sehr relevant, aber komplex. **(Evidenzstufe: A für Methode, B für Implementierbarkeit)**
- PSI Error Analysis: Shahryarinia & Hanssen (2025) – Advances in Space Research; Least-Squares-basierte Outlier-Detektion in PSI mit Asc/Desc-Integration. Direkt relevant. **(Evidenzstufe: A)**

---

## 4. Empfohlene Zielarchitektur

### 4.1 Feature Engineering

#### 4.1.1 Punktweise Features (direkt aus Attributen)

| Feature | Berechnung | Begründung |
|---------|-----------|------------|
| `vel_abs` | |vel| | Betrag der Geschwindigkeit, richtungsunabhängig |
| `vel_norm` | vel / v_stdev | Signal-to-Noise der Geschwindigkeit |
| `acc_norm` | acc / a_stdev | Signal-to-Noise der Beschleunigung |
| `coherence` | Direkt | Primärer Qualitätsindikator |
| `season_ratio` | season_amp / max(|vel|, 0.1) | Anteil saisonaler vs. linearer Bewegung |
| `height_residual` | height - median(height in Nachbarschaft) | Höhenanomalie relativ zur Umgebung |
| `eff_area_binary` | 1 wenn PS (eff_area=0), 0 wenn DS | Streuertyp-Klassifikation |
| `amp_mean` | Mittelwert der Amplituden-Zeitreihe | Reflexionsstärke |
| `amp_cv` | std(amp) / mean(amp) | Amplitudenstabilität (Dispersion Index) |

#### 4.1.2 Temporale Features (aus Verschiebungs-Zeitreihe)

| Feature | Berechnung | Begründung |
|---------|-----------|------------|
| `ts_residual_std` | Std der Residuen nach linearem Fit | Nicht-lineares Verhalten |
| `ts_max_jump` | max(|d(t+1) - d(t)|) | Größter Einzelsprung (Phase-Unwrapping-Fehler-Indikator) |
| `ts_roughness` | Summe(|d(t+1) - d(t)|) / Gesamtzeitraum | Zeitreihen-Rauheit |
| `ts_trend_r2` | R² des linearen Fits | Güte des linearen Modells |
| `ts_acceleration_sign` | sign(acc) · |acc|/a_stdev | Gerichtete, normierte Beschleunigung |
| `ts_pca_residual` | Residuum nach PCA-Projektion auf Hauptkomponenten | Abweichung vom dominanten Muster |

#### 4.1.3 Spatial Features (Nachbarschaft)

| Feature | Berechnung | Begründung |
|---------|-----------|------------|
| `vel_local_zscore` | (vel - mean_k_nn) / std_k_nn | Geschwindigkeitsanomalie in Nachbarschaft |
| `coherence_local_rank` | Rang der Kohärenz unter k nächsten Nachbarn | Relative Qualitätsposition |
| `spatial_velocity_gradient` | max(|vel_i - vel_j|) für j ∈ k-NN | Maximaler Geschwindigkeitssprung |
| `point_density` | Anzahl Punkte in r=50m Radius | Lokale Punktdichte |
| `moran_local_vel` | Lokaler Moran's I für velocity | Spatial Autocorrelation |

*k-NN Berechnung: PostGIS `ST_DWithin` oder `ST_KNearestNeighbors` mit k=20, Radius=100m. **Berechnung in SQL (PostGIS) für Effizienz.** (Evidenzstufe: B)*

#### 4.1.4 Gebäude-Kontext-Features

| Feature | Berechnung | Begründung |
|---------|-----------|------------|
| `on_building` | Boolean: Punkt innerhalb GBA/OSM-Gebäude-Footprint | Grundlegende Zuordnung |
| `building_height_diff` | |point_height - building_height_GBA| | Plausibilitätscheck der Höhenzuordnung |
| `building_point_count` | Anzahl InSAR-Punkte auf diesem Gebäude | Redundanz/Vertrauen |
| `building_vel_std` | Std der Geschwindigkeiten aller Gebäude-Punkte | Interne Konsistenz |
| `building_vel_range` | max(vel) - min(vel) der Gebäude-Punkte | Bewegungsspanne |

#### 4.1.5 Asc/Desc Cross-Validation Features

| Feature | Berechnung | Begründung |
|---------|-----------|------------|
| `has_counterpart` | Boolean: existiert Punkt im anderen Track innerhalb 50m Grid | Verfügbarkeit der Kreuzvalidierung |
| `los_residual` | |v_asc·cos(θ_asc) - v_desc·cos(θ_desc)| nach 2D-Dekomposition | Physikalische Inkonsistenz |
| `vertical_component` | v_vert aus 2D-Dekomposition | Vertikale Bewegung |
| `horizontal_component` | v_ew aus 2D-Dekomposition | Ost-West-Bewegung |
| `decomp_residual_norm` | Normiertes Residuum der Dekomposition | Qualitätsmaß der Kreuzvalidierung |

**2D-Dekomposition (Formel):** Für synthetische PS auf 50m-Grid:

```
v_vert = (v_asc / cos(θ_asc) - v_desc / cos(θ_desc)) / 
         (cos(θ_asc)/cos(θ_asc) + cos(θ_desc)/cos(θ_desc))
```

Vereinfacht (bei ähnlichen Einfallswinkeln θ_asc ≈ θ_desc ≈ 38.5°):

```
v_vert ≈ (v_asc + v_desc) / (2 · cos(θ))
v_ew   ≈ (v_asc - v_desc) / (2 · sin(θ))
```

**(Evidenzstufe: A – Standardverfahren, vgl. Cigna et al., 2013; Nefros et al., 2023)**

### 4.2 Model Core

**Empfehlung: Ensemble aus Isolation Forest + Extended Isolation Forest + LOF**

**Begründung:**

1. **Isolation Forest** ist der bewährteste unsupervised Anomalie-Detektor für tabellarische Daten (Liu et al., 2008). Lineare Zeitkomplexität O(n·t·ψ) skaliert auf 550k Punkte. SHAP-Werte für Interpretierbarkeit.
2. **Extended Isolation Forest** (Hariri et al., 2019) verbessert die Erkennung bei korrelierten Features durch nicht-achsenparallele Splits.
3. **LOF** als komplementärer Ansatz, der dichtebasierte lokale Anomalien erfasst (nützlich für räumliche Ausreißer).

**Ensemble-Strategie:** Averaging der normierten Anomalie-Scores:

```
PQS_i = w₁ · IF_score(x_i) + w₂ · EIF_score(x_i) + w₃ · LOF_score(x_i)
```

wobei w₁ = w₂ = w₃ = 1/3 initial, später optimierbar über Asc/Desc-Konsistenz-Proxy-Labels.

**(Evidenzstufe: A für einzelne Methoden; B für die Kombination im InSAR-Kontext)**

### 4.3 Score-Definition

#### Point Quality Score (PQS)

```
PQS_i ∈ [0, 1]
- 0.0 – 0.2: Hohe Qualität (kein Handlungsbedarf)
- 0.2 – 0.4: Akzeptabel (leichte Auffälligkeiten)
- 0.4 – 0.6: Prüfungsbedürftig (manuelle Inspektion empfohlen)
- 0.6 – 0.8: Wahrscheinliche Anomalie
- 0.8 – 1.0: Hohe Anomalie-Wahrscheinlichkeit (Ausschlusskandidat)
```

#### Building Risk Class (BRC)

Aggregation der PQS-Werte aller einem Gebäude zugeordneten Punkte:

```
BRC = f(
  median(PQS der Gebäude-Punkte),
  max(|vel|) der Gebäude-Punkte,
  std(vel) der Gebäude-Punkte,
  Anzahl der Punkte mit PQS > 0.6,
  Beschleunigungssignal
)
```

| Klasse | Bezeichnung | Kriterien |
|--------|------------|-----------|
| 1 | Stabil | median(PQS) < 0.2 UND max(|vel|) < 2 mm/a |
| 2 | Unauffällig | median(PQS) < 0.4 UND max(|vel|) < 5 mm/a |
| 3 | Beobachten | median(PQS) 0.4–0.6 ODER |vel| 5–10 mm/a |
| 4 | Warnung | median(PQS) > 0.6 ODER |vel| > 10 mm/a |
| 5 | Kritisch | median(PQS) > 0.8 UND |vel| > 10 mm/a UND Beschleunigung |

**(Evidenzstufe: B – plausible Engineering-Annahme; Schwellenwerte müssen empirisch kalibriert werden)**

### 4.4 Explainability

**SHAP (SHapley Additive exPlanations)** für Isolation Forest:

- Pro Punkt: Feature-Importance-Vektor → „Warum hat dieser Punkt Score 0.73?"
- Typische Erklärungen: „Niedrige Kohärenz (0.35) + hoher Geschwindigkeitsgradient (12 mm/a auf 50m) + inkonsistente Asc/Desc-Residuen"
- Aggregiert pro Gebäude: Top-3-Treiber des BRC

**Technische Umsetzung:** `shap.TreeExplainer(model)` für Isolation Forest; O(n·d) Komplexität.

**(Evidenzstufe: A – SHAP ist Standard für ML-Interpretierbarkeit, Lundberg & Lee 2017)**

---

## 5. Validierung ohne Ground Truth

### 5.1 Asc/Desc-Konsistenzmetriken

**Methodik:** Punkte beider Tracks werden auf ein 50m-Grid resampled (vgl. Cigna et al., 2013; Mirmazloumi et al., 2023). Für jede Grid-Zelle mit Asc- und Desc-Punkten wird berechnet:

**Metrik 1: LOS-Residuum nach 2D-Dekomposition**

```
Für Grid-Zelle j mit gemittelten Werten v_asc_j und v_desc_j:

v_vert_j = (v_asc_j · 1/cos(θ_d) + v_desc_j · 1/cos(θ_a)) / (1/cos(θ_a) + 1/cos(θ_d))

Residuum_j = √((v_asc_j - v_vert_j · cos(θ_a))² + (v_desc_j - v_vert_j · cos(θ_d))²)
```

Grid-Zellen mit Residuum > 2σ sind inkonsistent → Proxy-Label für Anomalie.

**Metrik 2: Zeitreihen-Kreuzkorrelation**

```
ρ_j = corr(ts_asc_j(t), ts_desc_j(t))
```

Erwartung: ρ > 0.7 für physikalisch konsistente Punkte (vertikale Bewegung dominiert in Salzburg).

**Metrik 3: Velocity-Differenz normiert**

```
Δv_norm_j = |v_asc_j - v_desc_j| / √(σ²_asc_j + σ²_desc_j)
```

Unter Nullhypothese (gleiche vertikale Bewegung) sollte Δv_norm ≈ N(0,1). Werte > 3 sind signifikant inkonsistent.

**(Evidenzstufe: A – Standardverfahren, Shahryarinia & Hanssen 2025, EGMS Validation Framework)**

### 5.2 Robustheit- und Sensitivitätstests

**Synthetic Anomaly Injection:**

1. Zufällig 5% der Punkte auswählen
2. Anomalien injizieren: (a) Velocity-Offset (+10 mm/a), (b) Zeitreihen-Sprung, (c) Kohärenz-Drop, (d) Zufalls-Rauschen
3. Recall des Modells auf injizierten Anomalien messen
4. Ziel: Recall > 0.8 auf synthetischen Anomalien

**Stabilitätstests:**

- **Subsample-Stabilität:** Modell auf 80% trainieren, Scores auf 20% bewerten → Scores sollten stabil bleiben (Korrelation > 0.9)
- **Feature-Ablation:** Systematisches Entfernen einzelner Feature-Gruppen → Impact auf Score-Verteilung messen
- **Contamination-Sensitivität:** contamination ∈ {0.01, 0.02, 0.05, 0.10} → Score-Verteilung und Ranking-Stabilität prüfen

**(Evidenzstufe: B – Standard-ML-Praxis, aber nicht spezifisch für InSAR validiert)**

### 5.3 Minimum Acceptance Criteria

Vor Produktiveinsatz müssen folgende Kriterien erfüllt sein:

1. **Synthetic Injection Recall ≥ 0.80** für alle 4 Anomalietypen
2. **Asc/Desc-Konsistenz:** ≥ 80% der als „hochqualitativ" (PQS < 0.2) klassifizierten Grid-Zellen haben Δv_norm < 2
3. **Spatial Coherence:** Lokaler Moran's I des PQS ist signifikant positiv (Anomalien sind räumlich korreliert, nicht zufällig verstreut)
4. **Expert-Review-Akzeptanz:** AUGMENTERRA-Domänenexperte bestätigt Plausibilität an ≥ 20 manuell geprüften Beispielen (10 hochwertig, 10 anomal)
5. **Score-Stabilität:** Korrelation zwischen unabhängigen Runs (mit Bootstrapping) ≥ 0.95

---

## 6. Konkreter Implementierungsplan

### Phase 1: Fundament (4–6 Wochen)

**Ziel:** Funktionsfähiges Feature Engineering + Baseline-Anomalie-Scoring + API-Integration

| Woche | Deliverable | Details |
|-------|-----------|---------|
| 1–2 | **Feature Store in PostGIS** | Materialized Views für punktweise, temporale und Amplituden-Features. SQL-basiert für Effizienz. Neue Tabelle `insar_point_features`. |
| 2–3 | **Asc/Desc Grid-Resampling** | 50m-Grid-Tabelle mit gemittelten Asc/Desc-Werten. 2D-Dekomposition (vertikal/horizontal). PostGIS-basiert. |
| 3–4 | **Isolation Forest Training** | Python-Pipeline: Features laden → sklearn IsolationForest + Extended IF → PQS berechnen. MLflow-Tracking. |
| 4–5 | **FastAPI Endpoints** | `/api/v1/quality/points/{code}` (Einzel-Score), `/api/v1/quality/points/bulk` (Batch), `/api/v1/quality/stats` (Aggregiert) |
| 5–6 | **Validierung + Dokumentation** | Synthetic Injection Test, Asc/Desc-Konsistenzprüfung, Expert-Review mit AUGMENTERRA, technische Dokumentation |

**Risiken Phase 1:**

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|-----------|
| Feature-Berechnung zu langsam für 550k Punkte | Mittel | PostGIS Spatial Index, Materialized Views, ggf. partitioniert nach Track |
| Isolation Forest liefert nur triviale Ergebnisse (nur Kohärenz-basiert) | Mittel | Feature-Ablation-Studie; sicherstellen, dass temporale + spatial Features genug Varianz tragen |
| Asc/Desc-Grid-Matching liefert zu wenige Paare | Niedrig | Grid-Größe variieren (25m, 50m, 100m); Überlappungsbereich ist ~13.4×11.4 km — ausreichend |

**Exit-Kriterien Phase 1:**

- PQS für alle 550k Punkte berechnet und in PostGIS gespeichert
- Synthetic Injection Recall ≥ 0.70 (akzeptabel, ≥ 0.80 wünschenswert)
- API-Endpoints liefern Scores in < 100ms (Einzelpunkt) / < 5s (Batch 10k)
- AUGMENTERRA bestätigt Plausibilität an 10 Stichproben

### Phase 2: Erweiterung (8–12 Wochen)

**Ziel:** Gebäude-Aggregation, Spatial Features, Active Learning, MapLibre-Visualisierung

| Deliverable | Details |
|-----------|---------|
| **Gebäude-Aggregation (BRC)** | Building Risk Class aus PQS + kinematischen Attributen. Neue Tabelle `building_risk_classes`. |
| **Spatial Neighborhood Features** | k-NN-basierte Features (vel_local_zscore, spatial_gradient etc.) via PostGIS. Feature Store erweitern. |
| **Active Learning UI** | Einfaches Labeling-Interface in MapLibre: Experte klickt auf Punkt → bestätigt/widerspricht PQS → Feedback-Tabelle in PostGIS |
| **Verbessertes Ensemble** | LOF hinzufügen, Gewichte w₁,w₂,w₃ über Proxy-Labels optimieren. Extended IF ersetzen oder ergänzen. |
| **MapLibre-Integration** | PQS als Farbgradient auf Punkten, BRC als Farbcodierung auf Gebäude-Footprints. Interaktive Tooltips mit SHAP-Erklärungen. |
| **SHAP-Berechnung** | Pro Punkt Top-3-Features speichern. API-Endpoint `/api/v1/quality/explain/{code}`. |

**Risiken Phase 2:**

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|-----------|
| BRC-Aggregation nicht aussagekräftig (zu wenige Punkte pro Gebäude) | Mittel | Mindestanzahl Punkte pro Gebäude = 3; Unsicherheitsklasse für Gebäude mit < 3 Punkten |
| Active-Learning-Loop konvergiert nicht | Niedrig | Batch-Labeling (50–100 pro Iteration); max. 5 Iterationen in Phase 2 |
| SHAP-Berechnung zu langsam für 550k Punkte | Mittel | Sampling: SHAP auf 10k Stichprobe berechnen, restliche Punkte per kNN-Interpolation |

**Exit-Kriterien Phase 2:**

- BRC für alle Gebäude mit ≥ 3 zugeordneten Punkten berechnet
- ≥ 200 Expert-Labels gesammelt
- MapLibre zeigt PQS und BRC interaktiv an
- Synthetic Injection Recall ≥ 0.80

### Phase 3: Advanced (12–20 Wochen)

**Ziel:** Graph Neural Network, tiefe Zeitreihenanalyse, Produktionsreife

| Deliverable | Details |
|-----------|---------|
| **Graph-Konstruktion** | k-NN-Graph (k=20) oder Delaunay-Triangulation auf Messpunkten. Kanten gewichtet nach Distanz + Gebäude-Zugehörigkeit. |
| **GNN-Modell (GraphSAGE oder GAT)** | Node-Anomalie-Detektion auf dem Punktgraphen. Features = engineerte Features + Zeitreihen-Embeddings. |
| **Autoencoder auf Zeitreihen** | VAE oder LSTM-AE für Zeitreihen-Anomalien. Reconstruction Error als zusätzliches Signal. |
| **Semi-supervised Feintuning** | Expert-Labels aus Phase 2 als Supervision für GNN/AE. |
| **Produktions-Pipeline** | Automatisierter Re-Training-Workflow (MLflow + Cron), Monitoring der Score-Drift, Alert-System. |

**Risiken Phase 3:**

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|-----------|
| GNN-Training instabil bei 550k Nodes | Mittel | Mini-Batch-Training (GraphSAGE), Subgraph-Sampling |
| Verbesserung gegenüber Ensemble marginal | Hoch | A/B-Test: GNN vs. Ensemble auf gleichen Validierungs-Metriken. Nur deployen wenn signifikant besser. |
| Zu viel Entwicklungsaufwand für marginalen Gewinn | Mittel | Klare Go/No-Go-Entscheidung nach 4 Wochen Phase 3 |

**Exit-Kriterien Phase 3:**

- GNN liefert ≥ 5% besseren Recall bei gleichem FP-Rate gegenüber Ensemble
- Produktions-Pipeline läuft automatisiert
- Re-Training bei neuem Daten-Update (halbjährlich) in < 2h abgeschlossen

---

## 7. Technische Integration in bestehenden Stack

### 7.1 Neue PostGIS-Tabellen

```sql
-- Feature Store (materialized, aktualisiert bei Datenupdate)
CREATE MATERIALIZED VIEW mv_point_features AS
SELECT 
    p.code, p.track, p.los,
    -- Punktweise Features
    ABS(p.vel) AS vel_abs,
    p.vel / NULLIF(p.v_stdev, 0) AS vel_norm,
    p.acc / NULLIF(p.a_stdev, 0) AS acc_norm,
    p.coherence,
    p.season_amp / GREATEST(ABS(p.vel), 0.1) AS season_ratio,
    CASE WHEN p.eff_area = 0 THEN 1 ELSE 0 END AS is_ps,
    -- Amplituden-Features (Join mit Amplitude-Tabelle)
    amp.amp_mean,
    amp.amp_cv,
    -- Temporale Features (vorberechnet via Python oder PL/pgSQL)
    ts.ts_residual_std,
    ts.ts_max_jump,
    ts.ts_roughness,
    ts.ts_trend_r2,
    p.geom
FROM insar_points p
LEFT JOIN mv_amplitude_stats amp ON p.code = amp.code
LEFT JOIN mv_timeseries_stats ts ON p.code = ts.code;

-- Ergebnis-Tabelle
CREATE TABLE point_quality_scores (
    code TEXT PRIMARY KEY,
    pqs FLOAT NOT NULL,          -- Point Quality Score [0,1]
    pqs_if FLOAT,                -- Isolation Forest Sub-Score
    pqs_eif FLOAT,               -- Extended IF Sub-Score
    pqs_lof FLOAT,               -- LOF Sub-Score
    anomaly_label BOOLEAN,       -- Binäres Label (threshold-basiert)
    shap_top1_feature TEXT,      -- Wichtigster SHAP-Treiber
    shap_top1_value FLOAT,
    shap_top2_feature TEXT,
    shap_top2_value FLOAT,
    shap_top3_feature TEXT,
    shap_top3_value FLOAT,
    model_version TEXT,          -- MLflow Run-ID
    computed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pqs_score ON point_quality_scores(pqs);
CREATE INDEX idx_pqs_anomaly ON point_quality_scores(anomaly_label);

-- Gebäude-Risiko (Phase 2)
CREATE TABLE building_risk_classes (
    building_id TEXT PRIMARY KEY,
    source TEXT,                  -- 'gba' oder 'osm'
    brc INTEGER CHECK (brc BETWEEN 1 AND 5),
    median_pqs FLOAT,
    max_vel_abs FLOAT,
    point_count INTEGER,
    anomaly_point_count INTEGER,
    dominant_driver TEXT,         -- Hauptgrund für Einstufung
    model_version TEXT,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asc/Desc Grid (Phase 1)
CREATE TABLE asc_desc_grid (
    grid_id SERIAL PRIMARY KEY,
    geom GEOMETRY(Point, 4326),
    vel_asc FLOAT,
    vel_desc FLOAT,
    v_stdev_asc FLOAT,
    v_stdev_desc FLOAT,
    v_vertical FLOAT,
    v_horizontal FLOAT,
    los_residual FLOAT,
    delta_v_norm FLOAT,
    consistency_flag BOOLEAN      -- TRUE wenn konsistent
);
CREATE INDEX idx_grid_geom ON asc_desc_grid USING GIST(geom);
```

### 7.2 FastAPI Endpoints

```
GET  /api/v1/quality/points/{code}         → PQS + SHAP-Erklärung für Einzelpunkt
GET  /api/v1/quality/points/bulk?bbox=...  → PQS für alle Punkte im Bounding Box
GET  /api/v1/quality/buildings/{id}        → BRC + Details für Gebäude
GET  /api/v1/quality/stats                 → Aggregierte Statistiken (Verteilung, Counts)
GET  /api/v1/quality/grid?bbox=...         → Asc/Desc-Konsistenz-Grid
POST /api/v1/quality/feedback              → Expert-Label (Active Learning)
GET  /api/v1/quality/model/info            → Aktuelle Modellversion, Metriken
```

### 7.3 MLflow-Integration

```
Experiment: "insar_quality_scoring"
├── Run: "phase1_isolation_forest_v1"
│   ├── Parameters: n_estimators, contamination, max_features, feature_set
│   ├── Metrics: synthetic_recall, asc_desc_consistency, spatial_coherence, score_stability
│   ├── Artifacts: model.pkl, feature_importance.json, shap_summary.png
│   └── Tags: phase=1, data_version=2025-03
├── Run: "phase1_extended_if_v1"
│   └── ...
├── Run: "phase2_ensemble_v1"
│   ├── Parameters: weights, lof_k, active_labels_count
│   └── Metrics: + expert_agreement_rate
└── Run: "phase3_gnn_v1"
    ├── Parameters: gnn_layers, hidden_dim, graph_k
    └── Metrics: + improvement_over_ensemble
```

### 7.4 MapLibre-Visualisierung

- **Punkt-Layer:** Farbgradient Grün (PQS=0) → Gelb (0.4) → Rot (1.0)
- **Gebäude-Layer:** BRC-Klassen als kategorische Farben (1=Grün, 2=Hellgrün, 3=Gelb, 4=Orange, 5=Rot)
- **Grid-Layer:** Asc/Desc-Konsistenz-Grid als Heatmap
- **Interaktion:** Click auf Punkt → Popup mit PQS, Top-3 SHAP-Features, Zeitreihenplot
- **Filter:** Slider für PQS-Threshold, Toggle für Track/LOS, BRC-Klassen-Filter

### 7.5 SQL vs. Python Aufteilung

| Aufgabe | Technologie | Begründung |
|---------|------------|------------|
| Feature Store (Materialized Views) | **SQL/PostGIS** | Effizient für 550k Punkte, Spatial Queries nativ |
| k-NN-Nachbarschaftsstatistiken | **SQL/PostGIS** | `ST_DWithin`, Window Functions |
| Asc/Desc-Grid-Resampling | **SQL/PostGIS** | `ST_SnapToGrid`, Aggregation |
| Temporale Features (Zeitreihen-Statistiken) | **Python** | NumPy/Pandas für Zeitreihenoperationen |
| Amplituden-Statistiken | **Python** | Batch-Verarbeitung der breiten Tabellen |
| Isolation Forest Training | **Python** | sklearn, Extended IF (pyod oder eigene Impl.) |
| SHAP-Berechnung | **Python** | shap-Library |
| Score-Schreiben in PostGIS | **Python** (psycopg2/asyncpg) | Batch-UPSERT |
| API-Serving | **FastAPI** (Python) | Direkte DB-Queries für Scores |

---

## 8. Offene Risiken + Mitigationen

| # | Risiko | Kategorie | Wahrscheinlichkeit | Impact | Mitigation |
|---|--------|-----------|-------------------|--------|-----------|
| R1 | Kein Ground-Truth für Validierung | Daten | Sicher | Hoch | Asc/Desc-Proxy + Synthetic Injection + Expert Review (→ Abschnitt 5) |
| R2 | Phase-Unwrapping-Fehler nicht erkennbar | Technisch | Mittel | Hoch | ts_max_jump Feature; Amplitude-CV als Zusatzindikator; langfristig: AUGMENTERRA-Feedback |
| R3 | Überanpassung an Kohärenz | Technisch | Hoch | Mittel | Feature-Ablation; Modell ohne Kohärenz trainieren und vergleichen |
| R4 | Saisonale Effekte als Anomalien detektiert | Technisch | Mittel | Mittel | Explizites season_ratio Feature; saisonale Komponente vor Anomalie-Detektion herausrechnen |
| R5 | GBA-Gebäudedaten unvollständig oder veraltet | Daten | Mittel | Mittel | Fallback auf OSM-Buildings; building_height_diff Feature nutzt absolute Differenz |
| R6 | Rechenzeit Feature-Store > 1h | Performance | Niedrig | Mittel | Materialized Views mit CONCURRENTLY REFRESH; Partitionierung nach Track |
| R7 | Domänenexpert nicht verfügbar für Active Learning | Organisatorisch | Mittel | Mittel | Phase 2 kann auch rein unsupervised starten; Active Learning ist Nice-to-Have |
| R8 | Modell-Drift bei halbjährlichem Datenupdate | Operativ | Niedrig | Mittel | MLflow-Tracking; Score-Verteilungs-Vergleich alt vs. neu; Alert bei > 10% Shift |

---

## 9. Priorisierte Quellenliste

| # | Quelle | Jahr | Relevanz für Salzburg |
|---|--------|------|----------------------|
| 1 | **Liu, F.T., Ting, K.M., Zhou, Z.-H.** "Isolation Forest." IEEE ICDM 2008, erw. TKDE 2012 | 2008/2012 | Grundlage für Phase 1: Unsupervised AD Algorithmus, linear-time, ideal für 550k Punkte ohne Labels. **(A)** |
| 2 | **Hariri, S., Kind, M.C., Brunner, R.J.** "Extended Isolation Forest." IEEE TKDE 2019 | 2019 | Verbesserte Splits für korrelierte Features (vel/v_stdev etc.). **(A)** |
| 3 | **Xu, H., Pang, G., Wang, Y., Wang, Y.** "Deep Isolation Forest for Anomaly Detection." ICML 2023 | 2023 | Deep-IF als Brücke zwischen klassisch und deep für Phase 3. **(A)** |
| 4 | **Xiang, H. et al.** "OptIForest: Optimal Isolation Forest for Anomaly Detection." IJCAI 2023 | 2023 | Optimierte IF-Variante mit besserer Baumkonstruktion. **(A)** |
| 5 | **Mirmazloumi, S.M. et al.** "Unsupervised detection of InSAR TS patterns based on PCA and K-means." ISPRS JAEOG 2023 | 2023 | Direkt übertragbar: PCA + Clustering auf Asc/Desc-fusionierten InSAR-Zeitreihen, Valle d'Aosta. **(A)** |
| 6 | **Aghdami, S. et al.** "Semi-supervised ML/DL approach for automatic detection of InSAR deformation hotspots." ISPRS JAEOG 2024 | 2024 | TSKM + DBSCAN → Pseudo-Labels → LSTM. Referenz für unsere Phase 2 Semi-supervised Strategie. **(A)** |
| 7 | **Shahryarinia, K. & Hanssen, R.** "Error analysis and outlier detection in PSI monitoring." Advances in Space Research 2025 | 2025 | Least-Squares Outlier-Detektion in PSI mit Asc/Desc-Integration. Direkt relevant für Validierungsstrategie. **(A)** |
| 8 | **Omidalizarandi, M. et al.** "Quality assessment of PSI time series using VAR-ST-PS modelling." EGU 2024 | 2024 | VAR-basierte spatio-temporale PS-Qualitätsbewertung mit LoD2-Gebäudemodellen. Relevant für Gebäude-Kontext. **(A)** |
| 9 | **Popescu, A. et al.** "Unsupervised Anomaly Detection for Volcanic Deformation in InSAR." Earth & Space Science 2025 | 2025 | CNN-basierte unsupervised AD für InSAR-Interferogramme. Methodische Referenz für unsupervised InSAR-AD. **(A)** |
| 10 | **Crosetto, M. et al.** "Persistent Scatterer Interferometry: A review." ISPRS JPRS 2016 | 2016 | Standard-Referenz für PSI-Validierung, Asc/Desc-Dekomposition, Qualitätsmetriken. **(A)** |
| 11 | **Vradi, A. et al.** "Validating the EGMS: Assessment of Measurement Point Density." ISPRS Archives 2023 | 2023 | EGMS-Validierungsworkflow: MP-Dichte, Qualitäts-Parameter, Bias-Eliminierung. Benchmark für eigene Metriken. **(A)** |
| 12 | **Martins, J.E. et al.** "Validation of EGMS with GNSS and Corner Reflectors." IGARSS 2024 | 2024 | EGMS-Validierung: Velocity-Differenz < 2 mm/a zu GNSS. Akzeptanzkriterium übertragbar. **(A)** |
| 13 | **EGMS Product User Manual** (Copernicus Land Monitoring Service) | 2023 | Offizielle Qualitätsindikatoren: temporal coherence, RMSE. Referenz für unsere Score-Definition. **(A)** |
| 14 | **Ferretti, A. et al.** "SqueeSAR: A New Algorithm for Processing InSAR Data-Stacks." IEEE TGRS 2011 | 2011 | Verständnis der Datengrundlage (TRE Altamira Prozessierung). **(A)** |
| 15 | **Farneti, E. et al.** "InSAR monitoring for multispan bridges with uncertainty quantification." SHM 2022 | 2022 | Uncertainty Quantification für InSAR-Bauwerksmonitoring. Referenz für Unsicherheitsabschätzung. **(A)** |
| 16 | **Macchiarulo, V. et al.** "Multi-temporal InSAR for transport infrastructure monitoring." Bridge Engineering 2023 | 2023 | DL-InSAR Review für Infrastruktur-Monitoring: Trends, Herausforderungen. **(A)** |
| 17 | **Kuzu, R.S. et al.** (in: Sensors Review 2025) "Deep Learning Meets InSAR for Infrastructure Monitoring: Systematic Review" | 2025 | Umfassender Review: 67 Studien, LSTM/CNN/Transformer für InSAR. Bestätigt LSTM-Dominanz, GNN-Potential. **(A)** |
| 18 | **Lundberg, S.M. & Lee, S.-I.** "A Unified Approach to Interpreting Model Predictions." NeurIPS 2017 | 2017 | SHAP-Framework für Modell-Interpretierbarkeit. Standard für Phase 1–3. **(A)** |
| 19 | **Weissgerber, F. et al.** "3D Monitoring of Buildings Using TerraSAR-X InSAR." Remote Sensing 2017 | 2017 | Gebäude-Monitoring mit InSAR: Höheninformation, Reflexionseigenschaften. Relevant für Building-Context-Features. **(A)** |
| 20 | **Yang, K. et al.** "Monitoring Building Deformation with InSAR: Experiments and Validation." Sensors 2016 | 2016 | Experimentelle Validierung von Gebäudedeformationsmonitoring. **(A)** |
| 21 | **Keuschnig, M., Dörfler, M., Hartmeyer, I.** "Satellite-based detection of ground motion for monitoring torrent catchments." Torrent/Avalanche/Landslide J. 2022 | 2022 | AUGMENTERRA-eigene Publikation; direkte Domänenexpertise des Projektpartners. **(A)** |
| 22 | **Breunig, M.M. et al.** "LOF: Identifying Density-Based Local Outliers." ACM SIGMOD 2000 | 2000 | LOF-Algorithmus als komplementärer Anomalie-Detektor im Ensemble. **(A)** |
| 23 | **Cigna, F. et al.** "Analysis of the Subsidence and Surface Faulting..." Remote Sensing 2013 | 2013 | 2D-Dekompositions-Methodik für Asc/Desc-Kombination (Grid-Resampling). Standard-Referenz. **(A)** |
| 24 | **Stradiotti, L. et al.** "Semi-Supervised Isolation Forest for Anomaly Detection." SDM 2024 | 2024 | Semi-supervised IF-Variante; relevant für Phase 2 Active-Learning-Integration. **(A)** |

---

## 10. Appendix: Reproduzierbares Experiment-Design

### 10.1 Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Daten-Vorbereitung                           │
│    ├── PostGIS Feature Store (SQL)              │
│    ├── Temporal Features (Python/NumPy)          │
│    └── Asc/Desc Grid (PostGIS)                  │
├─────────────────────────────────────────────────┤
│ 2. Baseline-Modellierung                        │
│    ├── Isolation Forest (n_estimators, contam.)  │
│    ├── Extended IF (EIF)                        │
│    ├── LOF (k, contamination)                   │
│    └── → Einzelne PQS-Scores                    │
├─────────────────────────────────────────────────┤
│ 3. Ensemble                                     │
│    ├── Score-Normalisierung (MinMax auf [0,1])  │
│    ├── Gewichtetes Averaging                    │
│    └── → Finaler PQS                            │
├─────────────────────────────────────────────────┤
│ 4. Validierung                                  │
│    ├── Synthetic Injection Test                 │
│    ├── Asc/Desc Konsistenz-Check                │
│    ├── Spatial Coherence (Moran's I)            │
│    ├── Feature Ablation                         │
│    └── Expert Review (≥20 Stichproben)          │
├─────────────────────────────────────────────────┤
│ 5. Deployment                                   │
│    ├── Scores → PostGIS                         │
│    ├── MLflow Model Registry                    │
│    └── FastAPI Endpoints                        │
└─────────────────────────────────────────────────┘
```

### 10.2 Hyperparameter-Raum

| Modell | Parameter | Suchraum | Default |
|--------|-----------|----------|---------|
| Isolation Forest | n_estimators | {100, 200, 500} | 200 |
| | contamination | {0.01, 0.02, 0.05, 0.10} | 0.05 |
| | max_features | {0.5, 0.75, 1.0} | 0.75 |
| | max_samples | {0.5, 0.75, 'auto'} | 'auto' |
| Extended IF | extension_level | {1, 2, d-1} | 1 |
| | (rest wie IF) | | |
| LOF | n_neighbors | {10, 20, 50} | 20 |
| | contamination | {0.01, 0.02, 0.05, 0.10} | 0.05 |
| | metric | {'euclidean', 'manhattan'} | 'euclidean' |
| Ensemble | weight_if | [0.2, 0.5] | 0.33 |
| | weight_eif | [0.2, 0.5] | 0.33 |
| | weight_lof | [0.1, 0.4] | 0.33 |

**Suchstrategie:** Grid Search (kleiner Parameterraum) → Total: 3×4×3×3 × 3 × 3×4×2 = 7.776 Kombinationen → Reduktion durch sequentielle Optimierung: erst IF, dann EIF, dann LOF, dann Ensemble-Gewichte.

### 10.3 Vergleichsprotokoll

| Metrik | Definition | Zielwert |
|--------|-----------|---------|
| Synthetic Injection Recall | TP_synth / (TP_synth + FN_synth) | ≥ 0.80 |
| Synthetic Injection Precision | TP_synth / (TP_synth + FP_synth) | ≥ 0.50 |
| Asc/Desc Consistency Rate | % Grid-Zellen mit PQS<0.2 und Δv_norm<2 | ≥ 0.80 |
| Spatial Coherence (Moran's I) | Global Moran's I auf PQS | > 0 (p < 0.01) |
| Score Stability (Bootstrap) | Pearson-r zwischen Runs | ≥ 0.95 |
| Expert Agreement | % Übereinstimmung mit Expert-Labels | ≥ 0.75 |
| Feature Ablation Impact | Max Δ Recall bei Feature-Entfernung | Dokumentieren |

### 10.4 Statistischer Testrahmen

- **Synthetic Injection:** Wilcoxon-Rangsummentest: PQS(injizierte Anomalien) > PQS(normale Punkte), p < 0.01
- **Asc/Desc-Konsistenz:** χ²-Test auf Unabhängigkeit von PQS-Klasse und Konsistenz-Flag
- **Modellvergleich:** Paired t-Test oder Wilcoxon auf Synthetic Recall zwischen Modellen (Bootstrap-Resampling, n=100)
- **Score-Stabilität:** Intraclass Correlation Coefficient (ICC) ≥ 0.95 über 10 Bootstrap-Runs

---

## Empfehlung Jetzt

### Bevorzugter Startpfad: Isolation-Forest-Ensemble auf engineerten Features

**Was:** Phase 1 wie beschrieben umsetzen — Feature Store in PostGIS, Isolation Forest + Extended IF trainieren, PQS berechnen, API bereitstellen.

**Warum gerade das:**
- Wissenschaftlich gesichert, labelfrei, SHAP-interpretierbar
- Nutzt alle verfügbaren Datenmodalitäten (Attribute, Zeitreihen, Amplituden, Gebäude, Asc/Desc)
- Skaliert auf 550k Punkte in Sekunden (Training) / Millisekunden (Inference)
- Kompatibel mit bestehendem Stack (Python + PostGIS + MLflow)
- Liefert in 4–6 Wochen ein nutzbares Ergebnis

**Erster konkreter Schritt:** PostGIS Materialized View `mv_point_features` aufsetzen und mit einem Jupyter Notebook die Feature-Verteilungen explorieren.

### Backup-Pfad: PCA + k-Means auf Asc/Desc-fusionierten Zeitreihen

**Was:** Mirmazloumi et al. (2023) adaptieren: Zeitreihen beider Tracks auf Grid interpolieren, 2D-Dekomposition, PCA, k-Means-Clustering, Cluster-Analyse.

**Wann:** Falls Isolation Forest in Phase 1 keine aussagekräftigen Ergebnisse liefert (Exit-Kriterium nicht erreicht) oder das Team PCA-basierte Ansätze bevorzugt.

**Vorteil:** Einfacher, transparenter, direkt in NumPy/SciPy implementierbar, kein ML-Framework nötig.

**Nachteil:** Weniger flexibel, keine native SHAP-Erklärbarkeit, kein kontinuierlicher Score (nur Cluster-Zugehörigkeit).

---

*Erstellt für das Projekt „Salzburg InSAR Viewer" — FH Salzburg Applied Data Science Lab / AUGMENTERRA GmbH / Synthetic Dimension GmbH*
