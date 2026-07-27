# `anomaly_local_v1`: priorisierte naechste Schritte

**Stand:** 2026-07-15

**Status:** aktive Forschungs-Backlog-Uebersicht

**Autoritativ fuer:** priorisierte offene Forschung nach dem integrierten v4-Stand

**Aktualisieren wenn:** ein Punkt gestartet, abgeschlossen, verworfen, neu priorisiert oder durch neue Evidenz blockiert wird

## Ausgangspunkt

Aktiver Stand ist `local_hdbscan_rulegate_v4_k2xhf_diffv2` mit BEV als
Standard-Gebaeudequelle, getrennten `standard`-/`annex`-/`foreign`-Clustern und
dem Differential-Level `none | candidate | significant | confirmed`.

Bereits umgesetzt und deshalb **nicht** mehr Teil dieser Backlog-Liste sind
Gebaeuderollups, Nachbarschaftskontext, Multi-Cluster-Grundlogik,
Anbau-/Fremdreflektortrennung, Differential Motion v2, BEV-Hoehenmapping,
Bad-Gastein-Grundintegration, Amplituden-Load fuer SNT 44/95 sowie der
Phase-7/8-Harness. Der Ticketstatus von Phase 8 steht in
[`phase8_bev_hygiene_plan.md`](phase8_bev_hygiene_plan.md).

Das v4-Release-Candidate-Gate ist abgeschlossen; Ergebnis:
**v4 RC geprueft, nicht akzeptiert**. Die vollstaendige Evidenz steht in
[`phase8_v4_rc_gate_results.md`](artifacts/phase8_v4_rc_gate_results.md),
[`phase8_v4_rc_gate_results.json`](artifacts/phase8_v4_rc_gate_results.json)
und
[`phase8_v4_rc_visual_audit.md`](artifacts/phase8_v4_rc_visual_audit.md).

## Prioritaet P0: rote RC-Befunde klaeren

### P0-1 Differentialfall `96637447`

Der Fall bleibt im reproduzierten v4-Stand `candidate`, obwohl ohne neue
visuelle Evidenz `none` erwartet war. Fachlich klaeren und die begruendete
Erwartung maschinell pinnen; keine Schwelle nur fuer ein gruenes Gate aendern.

### P0-2 Quellenspezifische Referenzlabels (R9)

`NSVF80S01` loest in `moosstrasse_bev` das absolute Roof-Loss-Gate aus. Der
bekannte GBA/BEV-Quell-Mismatch erklaert den Befund, hebt das rote Gate aber
nicht auf. Label-Grading und Punkt-Pins muessen `building_source` explizit
beruecksichtigen.

### P0-3 Point-MVT-Performance

Der Smoke lieferte den korrekten MVT-Vertrag, benoetigte aber rund 57,6 s.
Queryplan, Tile-Ausschnitt und Cache-Verhalten separat profilieren und einen
reproduzierbaren Latenz-Grenzwert festlegen. Die Harness-BBox-Optimierung
beschleunigt nicht automatisch den Point-MVT-Endpunkt.

## Prioritaet P1: Validierung und Ground Truth

### P1-1 Label-Korpus erweitern

Den internen Stand von zehn Gebaeuden/46 Punkten auf mindestens 20-40
stratifizierte Gebaeude erweitern:

- Salzburg und Bad Gastein;
- flach und Hanglage;
- Small-N und High-N;
- stabile Hauptcluster, Anbau, Fremdreflektor, Noise und Weak Support;
- SNT und TSX/PAZ, soweit fachlich vergleichbar.

Jedes Label braucht Quelle, Evidenz, Datum, Modell-/Datenstand und die Option
`unclear`. BEV- und GBA-Grading derselben Beobachtung muss im Harness
quellenspezifisch gefiltert werden (offener R9-Fall).

### P1-2 Unabhaengige Gegenpruefung

- Domänenexperten fuer eine unabhaengige Teilstichprobe gewinnen.
- Inter-Rater-Abweichungen und unklare Faelle explizit erhalten.
- Echte Holdout-Gebaeude und mindestens ein Holdout-Gebiet definieren, die nicht
  zum Parametertuning verwendet werden.
- Precision/Recall/F1 fuer Foreign-/Annex-Trennung sowie Roof-Loss und
  Main-Cluster-Kontamination berichten.

### P1-3 Zuverlaessigkeit kalibrieren

`building_reliability_score` ist derzeit ein internes Evidenzmass. Zu pruefen
sind Kalibrierung gegen Experten-/Holdout-Evidenz, Konfidenzintervalle der
robusten Clusterbewegung und Mindeststuetzung je Aussageklasse. Bis dahin keine
prozentuale Schadens- oder Trefferwahrscheinlichkeit kommunizieren.

## Prioritaet P1: Feature- und Zuordnungsevidenz

### P1-4 Kontrollierte Feature-Ablation

Die vorhandenen Research-Berichte zu Zeitreihen, Amplitude und Terrain in eine
reproduzierbare Ablationsmatrix ueberfuehren:

- Features einzeln und als Komposit gegen dieselben Baselines/Labels testen;
- synthetische Trend-, Step-, Noise-, Saison- und Fremdreflektor-Injections als
  zusaetzliche kontrollierte Evidenz verwenden;
- keine produktive Integration ohne No-op-, Label-, Reinheits-, Roof-Loss- und
  Visual-Audit-Gates;
- Feature-Pruning erst nach einer belastbaren Motion-Referenz entscheiden.

### P1-5 Polygon-aware Cross-Look-Excess

Die bestehende Zentroid-/Ankerheuristik fuer `nearest`-Punkte gegen die
tatsaechliche Projektion des Gebaeudepolygons auf die Cross-Look-Achse testen.
Pflichtfaelle sind lange, breite und unregelmaessige Footprints. Legitime
Randpunkte duerfen nicht verloren gehen; echte Punkte ausserhalb der
Polygonspanne muessen weiterhin erkannt werden.

### P1-6 Topologie als zusaetzliche Evidenz

Optionalen Nachbar-Footprint-Check untersuchen: Liegt ein vermeintlicher
Gebaeudepunkt in/nahe einem anderen BEV-Footprint, kann das `annex`/`foreign`
stuetzen. Die Evidenz darf kartierungsfreie v4-Checks nur ergaenzen, nicht
ersetzen, und Zuordnungen nicht zirkulaer umschreiben.

## Prioritaet P1: Terrain und Hanglagen

### P1-7 1-m-DGM/DOM-Datenstandswechsel

- DGM/DOM reproduzierbar ableiten und Quelle, Lizenz, CRS, Vertikaldatum und
  Checksums festhalten.
- Terrain-Kontext, PostGIS und Rastertiles kontrolliert laden.
- Vertikaldatum mit InSAR-Punkthoehen klaeren, bevor absolute Hoehendifferenzen
  als harte Regel verwendet werden.
- alle betroffenen AOIs als expliziten Datenstandswechsel re-baselinen und
  flach/Hang getrennt auswerten.

### P1-8 Hanglagenmethodik

Aspect/Exposition und sichtgeometrische Effekte gegen die neuen Terrain-Daten
bewerten. Cross-Track bleibt bis zu einer belastbaren 2D-Dekomposition ein
Plausibilitaetsmass. Hangregeln duerfen nicht aus wenigen Salzburg-/Bad-Gastein-
Einzelfaellen globalisiert werden.

**Evidenz (XTV, 2026-07-15):** Die Cross-Track-Auswertung A zeigt am Hang eine
gegenlaeufige Rangordnung von auf- und absteigender Blickrichtung
(`Spearman -0.31` am Hang gegenueber `+0.17` flach;
[`artifacts/cross_track_consistency_v4.md`](artifacts/cross_track_consistency_v4.md)),
waehrend Auswertung B gerade am Hang echte Sensor-Konsistenz findet
(Rollup `ok_ok` `Spearman bis 0.69`;
[`artifacts/bad_gastein_snt_tsx_motion_comparison_v4.md`](artifacts/bad_gastein_snt_tsx_motion_comparison_v4.md)).
Beides zusammen stuetzt, dass die reine Vertikalproxy-Annahme am Hang nicht
traegt und eine 2D-Dekomposition (Vertikal-/Ost-West-Zerlegung) methodisch
motiviert ist — Evidenz fuer diese offene Hanglagenmethodik, keine bereits
belegte Hangregel.

## Prioritaet P1: Motion-Referenz und Generalisierung

### P1-9 SNT/TSX-Motion-Ablation (teilweise adressiert)

**Teilweise adressiert (Stand 2026-07-15).** Das Bad-Gastein-Vergleichstooling
ist generalisiert: Quelle (`--source bev/gba`), Overlap-Gates, Zeitfenster und
Track-Paar-Labels sind parametrisiert, die Terrain-Stratifikation nutzt die
zentrale `terrain_classes.py`, die Ausgaben sind maschinenlesbar (`--output-json`,
Audit-Sektion). Darauf aufbauend ist eine quantitative Overlap-Auswertung im
Fenster `2022-10-06..2023-05-26` (232 Tage, ein Winter) als
**Sensor-Konsistenz-Validierung** eingefroren
([`artifacts/bad_gastein_snt_tsx_motion_comparison_v4.md`](artifacts/bad_gastein_snt_tsx_motion_comparison_v4.md)):
Sensoren korrelieren dort, wo echtes Signal liegt (Hang/Slope Spearman bis 0.69
im Rollup `ok_ok`, 0.55 im DSC-Overlap), auf flach bleibt Rauschen um Null
(Rang-Korrelation ≈ 0); die verschaerften Gates (8 Epochen / 150 Tage) binden im
Kurzfenster nicht (identische n wie 3/30). Rahmung: validiert Sensor-Konsistenz,
**keine** absoluten Jahresraten.

**Offen bleibt:** (1) eine belastbare Jahresraten-/Motion-Ablation — extern
blockiert, bis zeitlich laenger ueberlappende Referenzdaten geliefert sind (das
232-Tage-Fenster umfasst nur einen Winter, Saisoneffekte sind nicht
ausgemittelt, Kurzfenster-Vertikalproxy-MAE 4-7 mm/a); (2) die Generalisierung
des Toolings auf beliebige kompatible Gebiets-/Dataset-Paare ueber das
Bad-Gastein-Paar hinaus. Zielmetriken bleiben Overlap-Fenster-Slopes, Bias/MAE,
Vorzeichenuebereinstimmung und Filtergruppen nach Support, Zuverlaessigkeit und
Clusterart. Nicht ueberlappende Zeitraeume duerfen weiterhin nur als qualitative
Strukturreferenz verwendet werden.

### P1-10 Gebiets- und Sensor-Holdouts

Nach Stabilisierung der v4-Gates einen unveraenderten Modellstand auf neuen
Gebieten und Sensorkonfigurationen testen. Erfolgskriterien vor dem Lauf
festlegen; keine gebietsspezifischen Schwellen still nachziehen. Track 22 Ost
bleibt ein Datenabdeckungsproblem, kein Algorithmusfehler.

## Prioritaet P2: Alternative Modellfamilien

Andere Clusterer oder regime-konditionale High-N-Strategien erst untersuchen,
wenn ein konkreter, durch Labels/Audit benannter v4-Schwachpunkt vorliegt.
Fruehere HDBSCAN-Sweeps und OPTICS-Varianten zeigten, dass Parameteroptimierung
allein nicht der zentrale Engpass war. Eine Alternative braucht deshalb vorab
Hypothese, Zielmetrik und Gegenbeispiel.

## Priorisierung

| Reihenfolge | Arbeit | Startbedingung | Erfolgssignal |
|---|---|---|---|
| 1 | P0-1 `96637447` klaeren | sofort | fachlich begruendetes Level und gepinnte Erwartung |
| 2 | P0-2 R9/source-aware Labels | sofort | absolutes Roof-Loss-Gate fachlich eindeutig |
| 3 | P0-3 Point-MVT-Profiling | parallel | reproduzierbarer Latenzbefund und Zielwert |
| 4 | P1-1/P1-2 Labels und Gegenpruefung | nach source-aware Labelvertrag | stratifizierter Korpus und echte Holdouts |
| 5 | P1-7/P1-8 Terrain/Hang | Datenprovenienz und Vertikaldatum geklaert | kontrollierter Datenstandsvergleich |
| 6 | P1-4/P1-5 Feature-/Geometrieablation | rote RC-Befunde getrennt verstanden | Verbesserung ohne Reinheits-/Roof-Regression |
| 7 | P1-9 Motion-Ablation (Tooling generalisiert, Sensor-Konsistenz eingefroren; Jahresraten offen) | zeitlich laenger ueberlappende Referenzdaten geliefert | belastbare absolute Jahresraten ueber beide Geometrien |
| 8 | P1-10 Generalisierung | Methodik und Gates stabil | Holdout-Ergebnis ohne stilles Retuning |
| 9 | P2 Alternativmodelle | konkreter v4-Fehler belegt | hypothesengeleitete Verbesserung |

Abgeschlossene Punkte werden aus dieser Liste entfernt und in
[`iterations.md`](iterations.md) beziehungsweise einem phasenspezifischen
Integrationsreport mit Evidenz festgehalten.
