# `anomaly_local_v1`: aktive Methodik

**Stand:** 2026-07-10

**Status:** aktive Methodik, Modellset `local_hdbscan_rulegate_v4_k2xhf_diffv2`

**Autoritativ fuer:** fachliche Logik, Ergebnissemantik und aktive Datenquellen der Pipeline

**Aktualisieren wenn:** Features, Regeln, Schwellen, Quellenvertrag, Modellversion oder Ergebnissemantik aendert sich

## Zweck und Einordnung

`anomaly_local_v1` analysiert InSAR-Punkte lokal je `Gebaeude x Track`. Die
Kernfrage lautet:

> Passt ein Punkt geometrisch, signaltechnisch und zeitlich zu diesem Gebaeude
> und zu dessen anderen Punkten?

Die Pipeline ist Teil einer validierbaren Building-Intelligence-Methodik. Sie
liefert Forschungsbefunde zur Zuordnung, Clusterstruktur, LOS-Bewegung und
Evidenz. Sie diagnostiziert keine Gebaeudeschäden. Projektziel und
Aussagegrenzen stehen im
[`Projektziel`](../../project/Projektziel_InSAR_Building_Intelligence.md).

## Aktiver Daten- und Modellvertrag

- **Modellset:** `local_hdbscan_rulegate_v4_k2xhf_diffv2`
- **Standard-Gebaeudequelle:** BEV (`bev_buildings`)
- **Vergleichs-/Kontextquellen:** GBA und OSM; ein Run speichert seine
  tatsaechliche `building_source`.
- **Gebiete:** Salzburg und Bad Gastein.
- **Salzburg:** SNT Tracks 44 (ASC) und 95 (DSC), inklusive
  Amplitudenzeitreihen.
- **Bad Gastein:** SNT Tracks 22/44/95 und TSX/PAZ Tracks 70/93;
  Amplitudenzeitreihen liegen nur fuer SNT 44/95 und nur im abgedeckten
  Talkorridor vor.
- **Terrain:** aktiver Bestand ist SRTM-Kontext. 1-m-DGM/DOM ist beschafft und
  pipeline-seitig vorbereitet, aber noch nicht als aktiver Datenstand geladen
  und re-baselined.

Quellenspezifische Gebaeudehoehen:

- BEV: `height_max_m` (Fallback `height_m`) fuer Candidate Area und
  Layover-Reichweite; `height_median_m` (Fallback `height_m`) fuer
  Plausibilitaetschecks.
- GBA: `height` fuer beide Zwecke, mit dokumentierter
  Saturierungskorrektur in der Reichweitenpruefung.
- OSM: keine belastbare Standardhoehe; konfigurierter Fallback.

## Physikalische Leitplanken

- InSAR misst Bewegung in Radar-Blickrichtung (LOS), nicht direkt vertikal.
- Negative Geschwindigkeiten/Verschiebungen bedeuten Bewegung vom Satelliten
  weg, positive zum Satelliten hin.
- ASC und DSC sehen ein Objekt aus verschiedenen Richtungen; seitlicher
  Punktversatz ist deshalb erwartbar.
- `vertical_proxy = velocity / cos(incidence_angle)` ist nur eine robuste
  Naeherung bei dominant vertikaler Bewegung, keine 3D-Dekomposition.
- Punkt-Hoehen sind ellipsoidisch; Terrainhoehen duerfen ohne harmonisiertes
  Vertikaldatum nicht als harte absolute Hoehendifferenz verwendet werden.
- Hang, Vegetation, Layover, Abschattung, Mehrwegeffekte und wechselnde
  Phasenzentren bleiben relevante Failure Modes.

## Pipelineablauf

### 1. Lokale Punktzuordnung

Fuer jedes Gebaeude erzeugt die Pipeline pro Track eine richtungssensitive
Candidate Area:

`range_offset = clamp(height * tan(incidence_angle) * buffer_multiplier, min_buffer, max_buffer)`

Das Gebaeudepolygon wird entlang des aus der Track-Geometrie abgeleiteten
Sensorseitenvektors verschoben, mit dem Original vereinigt und um einen kleinen
lateralen Slack erweitert. Die Zuordnungsart bleibt am Punkt sichtbar:

1. `within`
2. `directional_buffer`
3. `nearest` bis maximal 15 m als Fallback

`nearest`-Punkte tragen nur zum Clustering und Motion-Score bei, wenn ihr
Quer-Versatz zur Blickrichtung plausibel ist. Die selbstkalibrierte Toleranz
wird aus Median und MAD der `within`-/`directional_buffer`-Anker plus
Geocoding- und Punktflaechenmarge gebildet. Fehlen geometrische Anker, werden
`nearest`-Punkte konservativ demotiert. Die Gate-Gruende bleiben sichtbar.

### 2. Punktfeatures

Clustering-Features:

- `along_look_offset_m`, `cross_look_offset_m`
- `height_rank_in_building`
- `velocity`, `acceleration`
- `coherence_penalty`

Diagnose- und Scoring-Features umfassen insbesondere Zeitreihenstabilitaet,
Geschwindigkeitsunsicherheit, Saisonalitaet, Amplitudenstabilitaet,
Gebaeudehoehe, lokale Dichte sowie Hang- und Reliefkontext. Fehlende
Amplitudendaten sind zulaessig und werden nicht durch erfundene Werte ersetzt.

### 3. Qualitaetsgates

Aktive harte Grundregeln:

- keine Gebaeudezuordnung;
- weniger als 24 gueltige Displacement-Epochen;
- weniger als 50 % der erwarteten Track-Epochen;
- `coherence < max(0.45, track_p05)`.

Ausgeschlossene Punkte bleiben als `gate_excluded` mit `gate_reasons` in
Persistenz und Viewer nachvollziehbar.

### 4. Lokales Clustering und Small-N

- Ab sechs behaltenen Punkten: HDBSCAN mit `allow_single_cluster=True`,
  `cluster_selection_method="eom"`, adaptiver `min_cluster_size` und
  `min_samples`.
- Drei bis fuenf Punkte: konservativer Small-N-Fallback mit robustem
  Raum-/Bewegungs-/Kohaerenzscore. Ein Pseudo-Core erfordert mindestens zwei
  velocity-konsistente Punkte; andernfalls `weak_support`.
- Weniger als drei Punkte: kein Clustering, Status `insufficient_support`.

HDBSCAN ist Pflichtdependency. Einen stillen Algorithmus-Fallback gibt es nicht;
alternative Clusterer werden nur als explizite Harness-Varianten untersucht.

### 5. v4-Bauteil- und Fremdreflektortrennung

Nach der Grundzuordnung prueft der Component Separator unabhaengig von der
Zuordnungsmethode:

- Quer-Versatz-Plausibilitaet (`a5_crosslook`),
- Anti-Layover-Richtung (`a6_antilayover`),
- physikalisch plausible Layover-Reichweite (`a7_reach`),
- relatives Hoehenprofil (`a8_heightprofile`).

v4 routet Evidenzklassen getrennt:

- strukturell plausibler, kinematisch gestuetzter Gebaeudeteil -> `annex`;
- Anti-Layover und im BEV-Kontext unplausible Reichweite -> `foreign`;
- keine solche Seitenevidenz -> `standard`.

Das oeffentliche Feld lautet:

`cluster_kind = standard | annex | foreign`

`cluster_kind` beschreibt die semantische Art und ist nicht mit
`cluster_role` (`core`, `noise`, `weak_support`, `excluded`,
`insufficient_support`) zu verwechseln. Es wird zentral aus der Clusterkennung
abgeleitet; bei widerspruechlicher Kennung hat `foreign` Prioritaet.

- `standard` kann Main-Cluster sein.
- `annex` bleibt vom Main-Cluster ausgeschlossen, kann bei ausreichender
  Stuetzung aber eine Differentialaussage tragen.
- `foreign` ist nie Main-Cluster, nie verlaesslicher Gebaeudecluster und nie
  Quelle einer Differentialaussage; es erhaelt keine Clusterhuelle.

Fuer historische v3-Runs ist eine damalige `annex`-Klassifikation nur Aussage
des damaligen Modells und keine rueckwirkende v4-Bestaetigung.

### 6. Punkt- und Clusterbewertung

Punkt-Anomalie:

`anomaly_score = 0.60 * cluster_outlier + 0.25 * local_deviation + 0.15 * rule_penalty`

Punktqualitaet:

`quality_score = 0.45 * (1-anomaly) + 0.25 * cross_track + 0.20 * support + 0.10 * signal`

Labels:

- `normal`: `quality_score >= 0.70`
- `suspect`: `0.40 <= quality_score < 0.70`
- `outlier`: `quality_score < 0.40` oder harter Gate-Ausschluss

Cluster-Rollups enthalten unter anderem Track, Punktzahl, Rolle, Art,
Medianbewegung, Median-Kohaerenz, Hoehenrang, Zuverlaessigkeit und Delta zum
Main-Cluster. Der Main-Cluster wird deterministisch unter zulaessigen
Core-Clustern nach Stuetzung, Kohaerenz, Hoehenrang und Cluster-ID gewaehlt.

### 7. Gebaeudebewegung und Cross-Track-Plausibilisierung

Pro Track traegt der Main-Cluster die robuste Bewegungsbewertung. Fuer Tracks
44/95 wird die Differenz ihrer vertikalen Proxies gegen eine hangabhaengige
Toleranz geprueft:

`allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg`

Der Vergleich ist ein Plausibilitaetsindikator, kein Ground Truth. Das
Gebaeuderollup enthaelt Bewegung, Trackwerte, Status, Support,
`track_agreement_score`, Zuverlaessigkeit und Main-Cluster-IDs.

Moegliche Statuswerte sind `ok`, `single_track_only`, `small_n`,
`noise_dominated` und `insufficient_support`.

### 8. Differenzielle Bewegung

Die einzige aktuelle Schnittstelle ist:

`differential_motion_level = none | candidate | significant | confirmed`

Die Pipeline berechnet je zulaessigem Sekundaercluster das **signierte** Delta
zum Main-Cluster genau einmal und leitet daraus Betrag, Level und Evidenz ab.
Die Kandidatenschwelle ist:

`max(1.5, allowed_diff_mm_a)`

- `none`: kein zulaessiges Sekundaercluster ueberschreitet die Schwelle.
- `candidate`: Schwelle ueberschritten, aber Signifikanz oder Stuetzung reicht
  nicht weiter.
- `significant`: zusaetzlich `abs(delta) >= 2 * sigma_delta` und mindestens
  drei Punkte in Main- und Sekundaercluster.
- `confirmed`: ein signifikantes Ergebnis wird durch eine zweite Geometrie mit
  gleichgerichtetem signiertem Delta bestaetigt.

Plausibilitaets-Downgrades fuer stark verschiedene saisonale Amplitude oder
instabile Amplitude koennen das Level reduzieren, aber einen gueltigen Kandidaten
nicht unter `candidate` druecken. `differential_motion_evidence` nennt Track,
Cluster, signiertes Delta, Unsicherheit, Schwelle, Downgrades und gegebenenfalls
bestaetigenden Track.

Ein Zuverlaessigkeitsabzug von `0.15` greift erst bei `significant` oder
`confirmed`. Fuer historische Runs vor Einfuehrung des Levels ist der Wert
`null`; aktuelle Oberflaechen kennzeichnen ihn als historischen Modellstand
ohne Differential-Level.

### 9. Nachbarschaftskontext

Bis zu acht Nachbargebaeude innerhalb von 25 m werden als Diagnosekontext
betrachtet. Clusterprofile vergleichen Bewegung, Along-/Cross-Look-Lage,
Hoehenrang und Zeitreihenschritt. Daraus koennen Hinweise auf moegliche
Fehlzuordnung oder ein gemeinsam gestuetztes Nachbarschaftsereignis entstehen.
Diese Hinweise schreiben die Punktzuordnung nicht automatisch um.

## Persistenz und Viewer-Vertrag

`ml_point_results` speichert numerische Kernwerte und ein breites `meta`-Objekt
mit Feature-Flags, Building Context, Cross-Track-, Cluster-, Gebaeude- und
Nachbarschaftsrollups sowie Erklaergruenden. API, MVT und Frontend stellen
`cluster_kind` und `differential_motion_level` konsistent bereit.

Die Gebaeudeansicht zeigt Originalpolygon, track-spezifische Candidate Areas,
Clusterhuellen, Main-/Annex-/Foreign-/Noise-/Weak-Support-Kontext und
Gate-Ausschluesse. Die visuelle Pruefung ist Teil der Methode, nicht nur UI.

## Verifikation und Aenderungsregeln

Jede fachliche Modelländerung wird gegen die im
[`runbook.md`](runbook.md) definierten Pflicht-AOIs geprueft:

- eingefrorener No-op-Vergleich;
- Referenzfaelle und maschinelle Punkt-Pins;
- Label- und Reinheitsmetriken, insbesondere `foreign_in_annex=0` und
  `annex_in_foreign=0`;
- Visual Audit einschliesslich Survivors-Pass auf akzeptierte Main-Punkte;
- dokumentierte Entscheidung und Eintrag in [`iterations.md`](iterations.md).

Eine neue semantische Ergebnisart benoetigt ab ihrer Einfuehrung
Kompositionsstatistik, explizite Fehlablage-Gates und maschinell gepinnte
Gegenbeispiele. Baselines duerfen nicht neu geschrieben werden, um eine
Regression zu verdecken.

## Bekannte Grenzen

- kleine oder eintrackige Punktmengen;
- Hanglagen und fehlende echte 2D-/3D-Dekomposition;
- nicht harmonisierte Hoehenbezuege;
- teilweise fehlende Amplitudenzeitreihen;
- unkartierte oder topologisch verschmolzene Bauwerke;
- kleiner interner Label-Korpus und keine unabhaengige Ground Truth;
- keine nachgewiesene Generalisierung ueber die untersuchten Gebiete hinaus.

Die priorisierte offene Forschung steht ausschliesslich in
[`next_steps.md`](next_steps.md); historische Integrationsentscheidungen in
[`artifacts/phase8_integration_report.md`](artifacts/phase8_integration_report.md).
