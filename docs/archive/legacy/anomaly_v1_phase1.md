# anomaly_v1 Phase 1

**Stand:** 2026-03-11  
**Ziel:** Eine vorzeigbare Punkt- und Gebaeudeanalyse fuer Salzburg, die die im Meeting vom 2026-02-19 besprochenen Kernpunkte als funktionierendes Tool im bestehenden Viewer umsetzt.

## 1. Zielbild

Phase 1 liefert kein allgemeines Forschungsframework, sondern ein nutzbares Demo-Werkzeug im bestehenden React/FastAPI/PostGIS-Stack:

- Ein Run `anomaly_v1` kann fuer die aktuelle Karten-BBox gestartet werden.
- Jeder InSAR-Punkt erhaelt:
  - `quality_score`
  - `anomaly_score`
  - `cross_track_consistency`
  - `label` (`normal`, `suspect`, `outlier`)
- Die Karte kann diese Werte direkt visualisieren.
- Der Inspector erklaert fuer einen Punkt, warum er als verlaesslich oder fragwuerdig eingestuft wurde.
- Gebaeude werden aggregiert dargestellt, damit die Ergebnisse auch raeumlich vorzeigbar sind.

## 2. Methodische Leitentscheidungen

Die Phase-1-Implementierung folgt den fachlichen Eckpunkten aus Meeting, vorhandener Projektdokumentation und dem AUGMENTERRA-Handbook.

### 2.1 Gebaeude-first statt globales Clustering

Die Basiseinheit ist nicht der isolierte Punkt und auch nicht ein globaler DBSCAN-Cluster, sondern der Punkt im Kontext seines Gebaeudes und des Gegen-Tracks.

Konsequenzen in der Implementierung:

- `anomaly_v1` akzeptiert aktuell nur `source="gba"`.
- Die Gebaeudezuordnung wird fuer den Run on-the-fly berechnet.
- Die Bewertung nutzt Gebaeude- und Cross-Track-Kontext als Kernsignal.

### 2.2 InSAR-Fachwissen aus dem AUGMENTERRA-Handbook

Folgende Punkte sind fuer die Methodik verbindlich:

- `velocity` und `acceleration` sind LOS-Groessen, keine direkte 3D-Bewegung.
- `coherence` ist ein zentraler Qualitaetsindikator fuer die Stabilitaet des Streuers.
- `eff_area = 0` signalisiert einen PS-Kandidaten; groessere Werte deuten auf DS-artige Flaechen hin.
- InSAR-`height` ist die Punkt-Hoehe im Hoehensystem des Datensatzes.
- GBA-`height` ist Gebaeudehoehe.

Wichtige methodische Folge:

- Es wird **keine direkte Differenz** zwischen Punkt-Hoehe und GBA-Gebaeudehoehe gebildet.
- Hoehe wird in Phase 1 nur **relativ innerhalb eines Gebaeudes** genutzt (`lower`, `middle`, `upper`, `unknown`).

### 2.3 Cross-Track als Validierung und Score-Signal

Ascending und Descending werden nicht als perfektes Ground Truth behandelt, aber als wichtigstes verfuegbares Konsistenzsignal ohne externe Labels.

Konsequenzen:

- Beide Tracks werden im selben Run verarbeitet.
- Das Modell wird pro Track separat fit- und kalibriert.
- Auf Gebaeudeebene wird eine Cross-Track-Konsistenz ueber einen einfachen vertikalen Proxy abgeleitet.
- "Voll belastbar" ist das Signal nur bei mindestens 5 Punkten pro Track und Gebaeude.

### 2.4 Abrupte Schritte muessen lokal validiert werden

Ein einzelner Zeitschritt darf nicht automatisch als Defekt gelten. Phase 1 unterscheidet deshalb zwischen:

- lokal unterstuetztem Ereignis auf einem Gebaeude
- singulaerem Schritt ohne lokalen Support

Das wird ueber `step_support` im Gebaeudekontext abgebildet.

## 3. Was in Phase 1 implementiert wurde

## 3.1 Backend-Pipeline

Neue Pipeline:

- `backend/app/ml/pipelines/anomaly_v1.py`

Einbindung:

- `backend/app/ml/registry.py`
- `backend/app/ml/runner.py`

Die Pipeline fuehrt folgende Schritte aus:

1. Punkte, Verschiebungszeitreihen und Amplitudenzeitreihen fuer die aktuelle BBox laden
2. GBA-Gebaeude on-the-fly zuordnen
3. Features berechnen
4. Isolation-Forest pro Track trainieren
5. Regelkanal berechnen
6. Scores fusionieren und Labels vergeben
7. Ergebnisse in PostGIS speichern
8. Run-Metriken fuer Demo und Validierung ablegen

## 3.2 Datenmodell

`ml_point_results` wurde fuer Anomalie- und Reliability-Scores erweitert um:

- `anomaly_score`
- `quality_score`
- `cross_track_consistency`
- `label`
- `feature_set_version`
- `model_set_version`

Zusatzlich werden strukturierte Erklaerungen in `meta` gespeichert:

- `detector_scores`
- `explain_top_features`
- `feature_flags`
- `building_context`
- `cross_track_summary`

Migrationen:

- `backend/app/ml/schema.py`
- `backend/sql/migrations/002_anomaly_v1.sql`
- `backend/sql/schema.sql`

## 3.3 API und Serving

Neue und erweiterte Schnittstellen:

- `POST /api/ml/runs` mit `pipeline="anomaly_v1"`
- `GET /api/ml/runs/{run_id}/tiles/{z}/{x}/{y}.pbf`
- `GET /api/ml/runs/{run_id}/buildings/{z}/{x}/{y}.pbf`
- `GET /api/ml/runs/{run_id}/points/{code}?track=...`

Der Punkt-Inspector-Endpunkt liefert:

- Scores und Label
- Gebaeudezuordnung
- Detector-Scores
- Top-Gruende
- Support-Informationen
- Cross-Track-Zusammenfassung

## 3.4 Frontend

Die UI wurde so erweitert, dass `anomaly_v1` direkt vorzeigbar ist:

- neue Pipeline im linken Panel
- GBA-Fixierung fuer `anomaly_v1`
- Visualisierungsmodi:
  - `quality`
  - `anomaly`
  - `cross-track`
  - `label`
- Inspector mit Run-Analyse und Begruendung
- Gebaeudeanzeige mit aggregierten Werten

Wichtige Dateien:

- `frontend/src/components/PipelinePanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/hooks/useApi.ts`
- `frontend/src/lib/store.ts`

## 4. Methodik der Phase-1-Pipeline

## 4.1 Gebaeudezuordnung

Die GBA-Zuordnung erfolgt pro Punkt in dieser Reihenfolge:

1. `within`
2. `adaptive_buffer`
3. `nearest`

Der adaptive Buffer verwendet:

- GBA-Gebaeudehoehe
- Inzidenzwinkel des Punktes
- `buffer_multiplier`
- `min_buffer_m`
- `default_height_m`

Damit wird der Meeting-Punkt "hoehenabhaengiger Buffer" direkt umgesetzt.

## 4.2 Feature-Gruppen

### Punkt- und Signalfeatures

- `velocity`
- `abs_velocity`
- `velocity_std`
- `acceleration`
- `abs_acceleration`
- `coherence`
- `season_amp`
- `incidence_angle`
- `amp_mean`
- `amp_std`
- `eff_area`
- `is_ps`

### Verschiebungszeitreihe

- `ts_slope`
- `ts_residual_std`
- `ts_max_abs_delta`
- `ts_roughness`
- `ts_missing_rate`
- `ts_primary_step_abs`
- `ts_primary_step_sign`

### Amplitudenzeitreihe

- `amp_ts_mean`
- `amp_ts_std`
- `amp_ts_cv`
- `amp_ts_spike_rate`

### Gebaeudekontext

- `building_velocity_robust_z`
- `building_coherence_rank`
- `building_point_count_track`
- `other_track_point_count`
- `height_band_lower`
- `height_band_middle`
- `height_band_upper`
- `step_support`

### Cross-Track

- `cross_track_consistency_score`
- `full_support` nur bei mindestens 5 Punkten pro Track

## 4.3 Modelle und Score-Fusion

Phase 1 verwendet bewusst nur interpretierbare Basiskomponenten:

- `IsolationForest` als Kernmodell
- `Rule Gate` als fachlicher Korrektur- und Erklaerkanal

Fusion:

- `anomaly_score = 0.7 * isolation_forest + 0.3 * rule_gate`

Der `quality_score` wird aus dem inversen Anomaly-Signal abgeleitet und mit Signal- und Support-Penalties modifiziert.

## 4.4 Labels

Die Label-Grenzen sind in Phase 1:

- `normal`: `quality_score >= 0.70`
- `suspect`: `0.40 <= quality_score < 0.70`
- `outlier`: `quality_score < 0.40`

## 4.5 Regelkanal

Der Rule Gate erhoeht den Anomalie-Score unter anderem bei:

- niedriger Kohaerenz
- hoher Unsicherheit (`velocity_std`)
- instabiler Amplitudenzeitreihe
- grossem Zeitschritt ohne lokalen Support
- Cross-Track-Widerspruch bei ausreichender Gegentrack-Abdeckung
- schwachem Gebaeude- oder Gegentrack-Support

Wichtig:

- Ein starker Schritt mit lokaler Unterstuetzung wird **nicht** automatisch als Defekt behandelt.
- Ein singulaerer starker Schritt ohne Support wird explizit abgestraft.

## 5. Validierung in Phase 1

Da keine Ground-Truth-Labels vorliegen, nutzt die Pipeline drei Validierungsarten:

### 5.1 Asc/Desc-Konsistenz

Es wird verglichen, wie stark sich der Cross-Track-Unterschied verbessert, wenn man auf Punkte mit hohem `quality_score` filtert.

Run-Metriken:

- `median_cross_track_diff_all`
- `median_cross_track_diff_high_quality`
- `cross_track_improvement`

### 5.2 Synthetische Injektion

Es werden drei Stoerungsarten simuliert:

- `step`
- `noise`
- `trend_break`

Dazu werden Recall- und Lift-Metriken pro Track gespeichert.

### 5.3 Support-Metriken fuer die Demo

Fuer die Vorfuehrung sind besonders relevant:

- `assigned_points`
- `assigned_buildings`
- `full_cross_track_points`
- `normal_points`
- `suspect_points`
- `outlier_points`

## 6. Mapping: Meeting-Punkte zu sichtbarer Umsetzung

| Meeting-Punkt | Umsetzung in Phase 1 |
|---|---|
| GBA als primaerer Kontext | `anomaly_v1` ist auf `source="gba"` festgelegt |
| Gebaeudebezogene Analyse | Gebaeudezuordnung, Building Context, Gebaeudeaggregation in den Tiles |
| Verlaesslichkeitsindex | `quality_score` und `label` im Backend, Tile-Serving und UI |
| Asc/Desc als Validierung | `cross_track_consistency`, Support-Regeln, Run-Metriken |
| Hoehenabhaengiger Buffer | adaptive Gebaeudezuordnung mit Gebaeudehoehe und Inzidenzwinkel |
| Punktzahl je Track beachten | `full_support` erst ab 5 Punkten pro Track/Gebaeude |
| Echte abrupte Ereignisse von Artefakten trennen | `step_support` und Rule-Gate-Unterscheidung |
| Punktanalyse erklaerbar machen | Inspector-Endpunkt + Top-Reasons im Frontend |

## 7. Demo-Ablauf

## 7.1 Voraussetzungen

- PostGIS laeuft
- Backend laeuft
- Frontend laeuft
- GBA und InSAR-Daten sind geladen

## 7.2 Run starten

Im Frontend:

1. Kartenbereich auf einen Salzburg-Ausschnitt setzen
2. Im linken Panel `Anomaly v1 (Reliability + Cross-Track)` waehlen
3. Track `All` fuer beide Tracks oder gezielt `44` bzw. `95` waehlen
4. Run starten

Optional ueber API:

```bash
curl -X POST http://127.0.0.1:8000/api/ml/runs \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline": "anomaly_v1",
    "source": "gba",
    "track": null,
    "bbox": [12.98, 47.75, 13.12, 47.85],
    "params": {
      "max_distance_m": 30.0,
      "buffer_multiplier": 1.0,
      "min_buffer_m": 3.0,
      "default_height_m": 12.0
    }
  }'
```

## 7.3 Was bei der Vorfuehrung gezeigt werden sollte

1. Visualisierung `quality` als primarer Reliability-View
2. Visualisierung `cross-track`, um Gebaeude mit gutem/schlechtem Support zu zeigen
3. Punktklick im Inspector:
   - Label
   - Quality und Anomaly
   - Cross-Track-Konsistenz
   - Gebaeudezuordnung
   - Top-Reasons
4. Gebaeudedarstellung mit aggregiertem Quality-/Outlier-Bild
5. Run-Metriken im Panel:
   - Normal/Suspect/Outlier
   - Full cross-track support
   - Cross-track improvement

## 8. Grenzen von Phase 1

Phase 1 ist absichtlich konservativ:

- keine 3D-Bewegungsrekonstruktion
- kein LSTM/Autoencoder
- kein GNN
- keine finalen Gebaeuderisikoklassen A-E
- keine externe Ground Truth
- keine OSM-only-Variante

Das ist kein Fehler der Phase, sondern Teil der Abgrenzung: Zuerst ein robustes, erklaerbares Punkt- und Reliability-Werkzeug, danach komplexere Modellgenerationen.

## 9. Naechste sinnvolle Schritte nach Phase 1

- kuratierte Salzburg-Demoausschnitte im Repo dokumentieren
- kleine Test-Suite fuer Feature- und Scoring-Bausteine ausbauen
- optionale CLI-Beispiele fuer `anomaly_v1` dokumentieren
- Phase-2-Kanal nur dann beginnen, wenn die Phase-1-Demo fachlich akzeptiert ist
