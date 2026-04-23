# `anomaly_local_v1` Phase-2 Research Matrix

Stand: 2026-04-22
Scope: Phase 0 / `P0-W1-T1`

## Quellenbasis

- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/next_steps.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/deep_research_report.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/PipelinePanel.tsx`

## Matrix

| Thema | Aktueller Code | Research-/Plan-Empfehlung | Abweichung | Empfehlung fuer `P1` |
| --- | --- | --- | --- | --- |
| Cluster-Semantik | Die Pipeline clustert nur pro `Gebaeude x Track`, markiert `core`/`noise`/`insufficient_support`, zaehlt Cluster und persistiert nur Punkt-Meta. Ein formaler Building-/Cluster-Vertrag existiert nicht. | Multi-Cluster ist ein fachlicher Befund, nicht bloss ein Randfall. `P1` braucht einen expliziten Building- und Cluster-Vertrag. | Die aktuelle Semantik endet faktisch bei Punktlabels plus ad-hoc Router-Rollups. | `P1` fuehrt einen expliziten Cluster- und Building-Rollup-Vertrag ein; Punktdaten bleiben Diagnosebasis, nicht alleiniger Produktvertrag. |
| `main_cluster` | Es gibt kein `main_cluster_id`; alle `core`-Cluster sind gleichrangig. Die Building-API sortiert Cluster nur nach Punktzahl fuer Anzeigezwecke. | `next_steps.md` verlangt eine Entscheidungslogik, welche Cluster ins Gebaeude-Scoring eingehen. Der Research favorisiert Hauptcluster-Aggregation statt blindem Mittel ueber alle Cluster. | Der Code kann Multi-Cluster erkennen, aber nicht priorisieren. | Pro `Gebaeude x Track` genau einen `main_cluster` markieren. Prioritaet in `P1`: `reliable core cluster` > `point_count desc` > `median_coherence desc` > `median_height_rank desc` > `cluster_id`. Sekundaercluster bleiben sichtbar, fliessen aber nicht in den primaren Building-Score ein. |
| `differential_motion_flag` | Es gibt nur `multi_cluster_buildings` als Run-Metrik und `building_status = multi_cluster`; kein explizites Bewegungsdifferenz-Flag. | Mehrere zuverlaessige Cluster mit deutlich unterschiedlicher Bewegung sollen explizit markiert werden. | Multi-Cluster wird derzeit gezaehlt, aber nicht fachlich qualifiziert. | `differential_motion_flag = true`, wenn mindestens zwei zuverlaessige `core`-Cluster in demselben Gebaeude verbleiben und sich ihre Medianbewegung deutlich unterscheidet. V1-Default: Differenz der Cluster-Medianwerte `>= max(1.5 mm/a, allowed_diff_mm_a)` und beide Cluster haben mindestens 2 Punkte; Feinjustierung spaeter in `P2`. |
| Building-Score | Es gibt keinen echten Gebaeude-Score. Router und Tiles mitteln Punkt-`quality_score`/`anomaly_score` ueber das Gebaeude; Bewegungswert pro Gebaeude wird nicht geliefert. | Ziel ist ein Building-Level-Ergebnis vom Typ "Gebaeude X bewegt sich mit Y mm/a, Konfidenz Z". Research empfiehlt Hauptcluster-Aggregation statt Punktmittel. | Die aktuelle API transportiert Diagnosemittelwerte, nicht das gewuenschte Produktresultat. | V1 liefert einen expliziten `building_motion_mm_a` aus den `main_cluster`-Punkten. Track-lokal: robuster Median des `vertical_proxy` im `main_cluster`. Gebaeude-final: Fusion der verfuegbaren Track-Werte; bei nur einem Track bleibt der Track-Wert erhalten, aber die Reliability sinkt. |
| Reliability | Punkt-`quality_score` mischt Anomalie, Cross-Track, Support und Signalqualitaet. Auf Gebaeudeebene wird nur `avg_quality_score` angezeigt. | Reliability soll eigenstaendig sein, kleine `n` ehrlich abbilden und ASC/DSC als unabhaengigen Vertrauensindikator nutzen. | Punkt-Qualitaet wird derzeit implizit zum Gebaeude-Proxy hochgemittelt. | V1 fuehrt `building_reliability_score` plus Band (`high`/`medium`/`low`) ein. Inputs: `main_cluster_support`, `cross_track_agreement`, `assignment_quality`, `signal_quality`; Penalties fuer `single_track_only`, `small_n`, `differential_motion_flag` und `noise_dominated`. |
| Persistenzrichtung | Persistiert wird nur `ml_point_results`; Cluster- und Gebaeudeansichten werden im Router zur Laufzeit aus Punktdaten abgeleitet. | `P0` soll entscheiden, ob neue Tabellen noetig sind oder ob V1 aus `ml_point_results` abgeleitet wird. | Es gibt noch keinen stabilen Datenvertrag fuer Building-/Cluster-Level. | V1 bleibt derive-first: `ml_point_results` bleibt Source of Truth. `P1` fuehrt aber einen festen Rollup-Vertrag fuer Cluster- und Gebaeudeebene im Backend ein, der von API/Tiles/UI gemeinsam genutzt wird. Eigene Tabellen nur nachziehen, wenn Query-Kosten oder Reproduzierbarkeit das spaeter erzwingen. |
| Cross-Track auf Gebaeudeebene | Cross-Track-Konsistenz wird aktuell auf Gebaeudeebene ueber alle nicht-noise Punkte je Track berechnet. Clusterweises Matching existiert nicht. | Research und Methodik nennen clusterweises oder `main_cluster`-basiertes Matching als naechsten sinnvollen Schritt. | Die aktuelle Gebaeudekonsistenz kann durch Sekundaercluster verzerrt werden. | `P1` nutzt fuer den primaren Building-Score und die primare Cross-Track-Plausibilisierung nur die `main_cluster`-Rollups. Sekundaercluster bleiben Diagnosekontext. |
| API/UI-Semantik | Inspector, Map und Tiles zeigen Clusteranzahl, Punktrollen, Durchschnittsqualitaet und Diagnosewerte, aber keinen `main_cluster`, keinen Building-Motionswert und keine differenzielle Bewegung. | `next_steps.md` fordert explizite Sichtbarkeit von Hauptcluster, Clusterzuordnung und differenzieller Bewegung. | Die UI ist bereits clusterfaehig, aber noch auf Diagnose- statt Produktsemantik ausgerichtet. | `P1` sollte die bestehende Visualisierung behalten, aber um neue Building-/Cluster-Felder erweitern: `building_motion_mm_a`, `building_reliability_score`, `main_cluster`, `differential_motion_flag`, Cluster-Rang und `cluster_role`. |

## Evidence Anchors

- Clusterung nur pro `Gebaeude x Track`, ohne `main_cluster`: `backend/app/ml/pipelines/anomaly_local_v1.py:660-808`
- Cross-Track aktuell ueber alle nicht-noise Punkte je Gebaeude: `backend/app/ml/pipelines/anomaly_local_v1.py:869-943`
- Punktbasierte Persistenz ohne Building-/Cluster-Rollup-Tabelle: `backend/app/ml/pipelines/anomaly_local_v1.py:1096-1158`
- Building-API mittelt Punktwerte und leitet `building_status` ad hoc ab: `backend/app/routers/ml.py:384-511`
- Building-Tiles basieren auf `AVG(quality_score)` und `AVG(anomaly_score)`: `backend/app/routers/ml.py:942-1029`
- Inspector zeigt derzeit Durchschnittswerte, Clusterliste und Punktdiagnosen: `frontend/src/components/InspectorPanel.tsx:520-678`
- Map-Tooltip zeigt nur Diagnosedaten, nicht `main_cluster` oder Building-Motion: `frontend/src/components/MapView.tsx:1445-1493`
- Pipeline-Panel zeigt Run-Metriken, aber keinen Building-Vertrag: `frontend/src/components/PipelinePanel.tsx:234-288`

## Decision Freeze fuer `P1`

### 1. `main_cluster`

`P1` sollte pro `Gebaeude x Track` genau einen `main_cluster` markieren.

V1-Priorisierung:

1. nur `core`-Cluster beruecksichtigen
2. nur Cluster mit mindestens 2 Punkten als `reliable` behandeln
3. dann sortieren nach `point_count desc`
4. bei Gleichstand nach `median_coherence desc`
5. danach nach `median_height_rank desc`
6. finaler Tie-Break ueber `cluster_id`

Begruendung:

- passt zur Research-Empfehlung, den primaeren Building-Score nicht ueber alle Cluster zu mitteln
- bleibt nah an den bereits verfuegbaren Cluster-Merkmalen
- bevorzugt in Grenzfaellen eher den dichter und signalstabiler belegten Dach-/Hauptkoerpercluster

### 2. `differential_motion_flag`

V1-Default fuer `P1`:

- pro Gebaeude `true`, wenn mindestens ein Track mindestens zwei `reliable core`-Cluster enthaelt
- und die Differenz der Cluster-Medianbewegungen `>= max(1.5 mm/a, allowed_diff_mm_a)` ist
- `allowed_diff_mm_a` wird zunaechst an die bestehende Slope-Toleranz gekoppelt

Begruendung:

- liefert ein fruehes, explizites Gefahren-/Interpretationssignal
- bleibt konservativ genug fuer `P1`
- kann spaeter in `P2` mit AOIs und Expertenfeedback kalibriert werden

### 3. Minimaler Building-Score

V1 sollte nicht mehr `avg_quality_score` als primaeren Gebaeude-Proxy verwenden.

Empfohlene minimale Produktfelder:

- `building_motion_mm_a`
- `track_motion_mm_a` je verfuegbarem Track
- `building_reliability_score`
- `building_reliability_band`
- `main_cluster_id` je Track oder `is_main_cluster` je Cluster
- `differential_motion_flag`

V1-Berechnung:

- Track-lokal: robuster Median des `vertical_proxy` ueber die Punkte des `main_cluster`
- Building-final: Fusion der vorhandenen Track-Werte; wenn beide Tracks vorhanden sind, Mittelung/Fusion auf Rollup-Ebene, wenn nur ein Track vorhanden ist, Durchreichen des Track-Werts mit Reliability-Abschlag

### 4. Reliability

V1 sollte Reliability als eigene Building-Groesse einfuehren.

Empfohlene V1-Komponenten:

- `main_cluster_support`
- `cross_track_agreement`
- `assignment_quality`
- `signal_quality`

Pflicht-Penalties:

- `single_track_only`
- `small_n`
- `noise_dominated`
- `differential_motion_flag`

Pragmatische V1-Regel:

- numerischer Score `0..1`
- dazu Band `high >= 0.75`, `medium 0.45-0.74`, `low < 0.45`

### 5. Persistenzrichtung

Default fuer `P1`:

- keine neuen Ergebnis-Tabellen erzwingen
- `ml_point_results` bleibt Source of Truth
- ein gemeinsamer Rollup-Pfad im Backend erzeugt `cluster`- und `building`-Objekte fuer API, Tiles und UI

Begruendung:

- minimiert Migrationsrisiko in `P1`
- haelt Diagnose und Produktsemantik auf derselben Datengrundlage
- laesst spaetere Persistenz in eigene Tabellen offen, falls Performance oder Auditierbarkeit es verlangt

## Offene Restunsicherheiten

- Die Schwelle fuer `differential_motion_flag` ist fuer `P1` absichtlich konservativ und muss an Mirabell, Moosstrasse und dem Osthang-Stressbereich geprueft werden.
- Der Rooftop-Prior (`median_height_rank desc`) ist fachlich plausibel, aber noch nicht gegen alle Salzburg-Faelle validiert.
- `eff_area` ist in den Salzburg-Notizen als schwach beschrieben; fuer `P1` sollte es nicht zum primaeren `main_cluster`-Tiebreak werden.
- Ob derive-first fuer Building-/Cluster-Rollups performance-seitig reicht, muss mit realen AOI-Abfragen beobachtet werden.
- Clusterweises Cross-Track-Matching bleibt in `P1` bewusst minimal; feinere Paarung oder Nachbarschaftskontext gehoeren in spaetere Phasen.
