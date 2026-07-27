# `anomaly_local_v1`: priorisierte naechste Schritte

**Stand:** 2026-07-27

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

**Roadmap-Umbau 2026-07-27** nach dem AUGMENTERRA-Meeting vom 23.07.
([`Notes`](../../meetings/2026-07-23_augmenterra_meeting_notes.md)):
Wien wird die zentrale Validierungs-Datenbasis (Lieferung ~Ende August);
neue Top-Punkte sind die Gebaeudedatenfusion (P1-11) und der
Bewertungsreview (P1-12); Expertenlabels (P1-2) sind zurueckgestellt;
Hanglagen- (P1-8) und Feature-Details (P1-4) warten bewusst auf den Input
des Meetings am 24.09.

## Rote RC-Befunde (Status 2026-07-27 angepasst)

### P0-1 Differentialfall `96637447` (zurueckgestellt 2026-07-27)

Der Fall bleibt im reproduzierten v4-Stand `candidate`, obwohl ohne neue
visuelle Evidenz `none` erwartet war. Fachlich klaeren und die begruendete
Erwartung maschinell pinnen; keine Schwelle nur fuer ein gruenes Gate aendern.

**Zurueckgestellt:** Gebaeudedatenfusion (P1-11) und Bewertungsreview
(P1-12) werden Bewertungseinheit und Bewertungslogik veraendern; der Fall
wird danach auf dem neuen Stand neu bewertet statt jetzt auf einem Stand
geklaert, der sich ohnehin aendert.

### P0-2 Quellenspezifische Referenzlabels (R9) (zurueckgestellt 2026-07-27)

`NSVF80S01` loest in `moosstrasse_bev` das absolute Roof-Loss-Gate aus. Der
bekannte GBA/BEV-Quell-Mismatch erklaert den Befund, hebt das rote Gate aber
nicht auf. Label-Grading und Punkt-Pins muessen `building_source` explizit
beruecksichtigen.

**Zurueckgestellt:** wie P0-1; der Labelvertrag wird im Zuge von P1-11
ohnehin ueberarbeitet (Klassen-/Labelpruefung ist dort Teil des Umfangs).
Bis zur Neubewertung gilt der v4-RC-Status unveraendert als
"geprueft, nicht akzeptiert" und wird nicht als akzeptiert kommuniziert.

### P0-3 Point-MVT-Performance

Der RC-Smoke (2026-07-10, vor den Tile-Optimierungen vom selben Tag) mass
rund 57,6 s. **Nachmessung 2026-07-27** (Run `moosstrasse_ext`, 22.480
Punkte, warmes Backend): z13 ~13-15 s bei 4,3 MB Tile, z14 ~9 s, z15
~6-7 s. Der Altbefund ist damit ueberholt, das Problem aber nicht geloest:
fuer interaktive Kartennutzung weiterhin ein bis zwei Groessenordnungen zu
langsam. Queryplan, Tile-Groesse (Attribut-Umfang) und Cache-Verhalten
profilieren und einen reproduzierbaren Latenz-Grenzwert festlegen; mit
externem Hosting (P1-14) und Wien-Groessenordnung (P1-13) steigt die
Relevanz.

## Prioritaet P1: Gebaeudedatenfusion und Bewertungsreview (neu 2026-07-27)

### P1-11 Fusionierter Gebaeudelayer ("das Beste aus allen Welten")

Arbeitsauftrag aus dem Meeting 2026-07-23 (Beschluss 5, Zustimmung
AUGMENTERRA), Weiterleitung von
[`OBS-2026-001`](../../research/observations/OBS-2026-001_bev-bauwerkskomplexe.md):
Keine Gebaeudequelle ist pro Gebaeude verlaesslich, und hinter der
BEV-Aufteilung ist keine verlaessliche Logik erkennbar - eine regelbasierte
Rekonstruktion scheidet aus. Stattdessen einen fusionierten Gebaeudelayer
aufbauen:

- Grundrisse und Hoehen der Quellen BEV/OSM/GBA vergleichen und je Grundriss
  einen Vertrauenswert (`footprint_confidence`) ableiten; BEV-Qualitaetsflags
  (`VERIFIKATION_LB`, `AGWR_TYP`) als Zusatzsignal.
- Abgleich mit dem 1-m-Oberflaechen-/Gelaendemodell (DOM/DGM): Geisterobjekte,
  fehlende Gebaeude und niedrige Anbauten flaechig gegenpruefen. Hypothese
  pruefen, ob die BEV-Bauwerkshoehen selbst daraus abgeleitet sind.
- Vorab das Ziel der Fusion definieren: Was ist die Bewertungseinheit, wie
  werden die Fusionsergebnisse in Zuordnung und Rollup verwendet?
  Aneinandergebaute Gebaeude bleiben getrennte Einheiten
  (Bodenplatten-Argument, Meeting-Beschluss 4).
- Im selben Schritt pruefen, ob die bestehenden Ergebnisklassen und Labels
  (Status, `cluster_kind`, Zuverlaessigkeitsbaender) zum Ziel passen oder
  ob weniger/andere Klassen noetig sind - inklusive der Auswirkungen auf
  Referenzlabels und Harness.

**Zielmetrik:** Der Anteil `insufficient_support` (Stand 2026-07-23: 36,2 %
der 5.500 Gebaeude der fuenf Extended-Runs, davon 1.303 in der Ebene;
[`trust_overview_2026-07.json`](artifacts/trust_overview_2026-07.json))
soll messbar sinken, und die nachfolgende ML-Bewertung soll Anbauten
verlaesslicher einordnen koennen.

### P1-12 Status- und Zuverlaessigkeitsbewertung reviewen

Baut auf P1-11 auf. Eigenbefund aus der Meeting-Demo: Die
Blickrichtungsuebereinstimmung geht doppelt ein (einmal im Status, einmal
in der Zuverlaessigkeit); ausserdem viele mittlere Zuverlaessigkeiten ohne
Treiberanalyse (Stand 2026-07-23: bei `status=ok` 62,1 % hoch, 33,6 %
mittel, 4,2 % niedrig). Zu klaeren:

- Redundanz zwischen Status und Zuverlaessigkeit aufloesen oder bewusst
  dokumentieren;
- Treiberanalyse der mittleren Zuverlaessigkeiten;
- pruefen, ob einzelne Regeln zu hart oder zu weich sind - Aenderungen nur
  ueber die bestehenden Gates (No-op, Labels, Visual Audit).

## Prioritaet P1: Wien-Onboarding (Startbedingung: Datenlieferung)

### P1-13 Wien-Datensatz integrieren und als Holdout nutzen

Startbedingung: Wien-Lieferung (~Ende August) und Integrationsdetails aus
dem Meeting 2026-09-24. Umfang laut Zusage: ganz Wien 2019-heute, Sentinel-1
ASC+DSC plus COSMO-SkyMed DSC, In-situ-/Korrekturdaten (Anfrage laeuft),
3D-Gebaeudemodell der Stadt Wien in Aussicht. Details (Datenmodell,
3D-Modell-Integration, Ground-Truth-Verwendung, Hosting) werden bewusst
erst nach dem Meeting geplant; dann eigener Execution Plan. Fest steht die
Holdout-Disziplin (vgl. P1-10): Erfolgskriterien vor dem ersten Lauf
festlegen, keine gebiets- oder sensorspezifischen Schwellen still
nachziehen.

### P1-14 Hosting/Server fuer Viewer-Zugang und grosse Laeufe

Aus dem Meeting 2026-07-23 (Thema 5, im Meeting nur angerissen; wird nicht
vor dem Meeting am 24.09. umgesetzt): eine gehostete Instanz, damit
AUGMENTERRA den Viewer testen kann (bleibt Forschungswerkzeug, kein
Produkt), und ausreichend Rechenkapazitaet fuer Laeufe in
Wien-Groessenordnung.

- Optionen: AUGMENTERRA-Server (Rueckmeldung des Entwicklers zugesagt),
  FH-Server (SP-AI prueft), eigener gemieteter Server.
- Randbedingungen aus dem Meeting: voller Admin-Zugriff (ohne den ist die
  Option unbrauchbar), grob 16+ GB RAM, ~60 GB+ Speicher fuer den aktuellen
  Bestand; Wien deutlich mehr (3D-Stadtmodell, CSK-Punktdichte).
- Zu klaeren vor Betrieb: Zugriffsschutz und Datenlizenzen (BEV/TSX in
  einer extern erreichbaren Instanz).
- Abhaengigkeit: P0-3 (Point-MVT-Latenz) wird mit externem Zugriff
  wichtiger.

Entscheidung beim Meeting 2026-09-24.

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

### P1-2 Unabhaengige Gegenpruefung (zurueckgestellt 2026-07-27)

**Zurueckgestellt:** Mit dem Wien-Datensatz (P1-13) steht eine echte
Ground Truth (In-situ-Messungen, bekannte Setzungen, ggf.
Schadensereignisse) in Aussicht; die Validierung fixiert sich vorerst
darauf. Expertenlabels bleiben fuer die Label-Zuordnung interessant,
sind aber kein direkter naechster Schritt.

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

**Timing (2026-07-27):** nicht vor dem Meeting am 24.09. Danach entscheiden,
ob die Ablation auf den Salzburg-Daten oder erst auf den Wien-Daten (bessere
Ground Truth, P1-13) laeuft.

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

**Stand Vertikaldatum (2026-07-27):** Beide Handbuecher legen die
Punkthoehen auf das WGS-84-Ellipsoid fest (AUGMENTERRA v1.3 S. 23; TRE
Altamira 2.2 S. 28/36). Die empirische Pruefung gegen den
SRTM-Terrainkontext bestaetigt das fuer alle SNT-Lieferungen und die
Bad-Gastein-TSX/PAZ-Lieferung (Median-Differenz +46 bis +52 m =
Geoid-Undulation), **widerlegt es aber fuer die Salzburg-TSX-Lieferung
2020** (`salzburg_tsx_t93_d`: Median-Differenz -0,4 m, also orthometrisch/
gelaendebezogen) - der Hoehenbezug ist damit **lieferungsspezifisch**;
Evidenz und offene Fragen in
[`OBS-2026-003`](../../research/observations/OBS-2026-003_tsx_salzburg_hoehenbezug.md).
Klaerung mit AUGMENTERRA im Themenspeicher des Meetings am 24.09. Fuer den
DGM/DOM-Abgleich heisst das: Vertikaldatum je Lieferung explizit behandeln
(ggf. `height_datum`-Vermerk je Dataset) und Geoid-Harmonisierung
einplanen - die Landesmodelle sind Gebrauchshoehen, Ellipsoidhoehen liegen
im Raum Salzburg rund 47 m darueber (BEV-Geoidmodell, Standardwissen; vgl.
`explainers/src/content/insarFacts.ts`).

### P1-8 Hanglagenmethodik

Aspect/Exposition und sichtgeometrische Effekte gegen die neuen Terrain-Daten
bewerten. Cross-Track bleibt bis zu einer belastbaren 2D-Dekomposition ein
Plausibilitaetsmass. Hangregeln duerfen nicht aus wenigen Salzburg-/Bad-Gastein-
Einzelfaellen globalisiert werden.

**Stand 2026-07-27 (Meeting 23.07.):** Ziel ist, dass die Methodik auch in
Hanglage eine zuverlaessige Aussage traegt; **Bad Gastein bleibt das
primaere Hanglagen-Testgebiet**. Die Aufstockung des SNT/TSX-Vergleichs mit
alten Sentinel-Bestaenden wurde verworfen (alter Prozessierungsstand, keine
Bauwerkszuordnung). Offen ist die Pruefstrategie ohne lange
hochaufloesende Referenz; Kandidaten: freie 2D-Zerlegung aus beiden
Blickrichtungen plus Erwartungsmodell als Falsifikation (Nullprobe Ebene
als Grundrauschen, Nord-/Suedhaenge als "nicht pruefbar" ausweisen) sowie
Verfahrensvalidierung ueber Wien (P1-13). AUGMENTERRA entwickelt parallel
eine Zerlegung unter Hangabwaerts-Hypothese; Detailplanung bewusst erst
nach dem Abgleich beim Meeting am 24.09.
([`Notes`](../../meetings/2026-07-23_augmenterra_meeting_notes.md),
Beschluesse 2 und 7).

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

**Offen bleibt:** (1) eine belastbare Jahresraten-/Motion-Ablation; (2) die
Generalisierung des Toolings auf beliebige kompatible Gebiets-/Dataset-Paare
ueber das Bad-Gastein-Paar hinaus. Zielmetriken bleiben
Overlap-Fenster-Slopes, Bias/MAE, Vorzeichenuebereinstimmung und
Filtergruppen nach Support, Zuverlaessigkeit und Clusterart. Nicht
ueberlappende Zeitraeume duerfen weiterhin nur als qualitative
Strukturreferenz verwendet werden.

**Neuer Pfad (2026-07-27, Meeting 23.07.):** Eine laengere
SNT/TSX-Ueberlappung fuer Salzburg/Bad Gastein wird es nicht geben - fuer
Salzburg existiert nur eine TSX-Geometrie ohne Zeitueberlappung, und alte
Sentinel-Bestaende wurden als Referenz verworfen (Beschluss 2). Der Weg zur
belastbaren Motion-Referenz laeuft stattdessen ueber den Wien-Datensatz
(P1-13): dieselbe Zeitreihe 2019-heute mit Sentinel ASC+DSC und
COSMO-SkyMed DSC plus In-situ-Ground-Truth.

### P1-10 Gebiets- und Sensor-Holdouts

Nach Stabilisierung der v4-Gates einen unveraenderten Modellstand auf neuen
Gebieten und Sensorkonfigurationen testen. Erfolgskriterien vor dem Lauf
festlegen; keine gebietsspezifischen Schwellen still nachziehen. Track 22 Ost
bleibt ein Datenabdeckungsproblem, kein Algorithmusfehler.

**Konkretisierung (2026-07-27):** Wien (P1-13) ist der vorgesehene
Gebiets- **und** Sensor-Holdout: anderes Gebiet, anderer Gebaeudebestand
und mit COSMO-SkyMed ein der Pipeline unbekannter Sensor. Der Holdout ist
nur dann einer, wenn die Erfolgskriterien vor dem ersten Wien-Lauf im
Execution Plan stehen.

## Prioritaet P2: Alternative Modellfamilien

Andere Clusterer oder regime-konditionale High-N-Strategien erst untersuchen,
wenn ein konkreter, durch Labels/Audit benannter v4-Schwachpunkt vorliegt.
Fruehere HDBSCAN-Sweeps und OPTICS-Varianten zeigten, dass Parameteroptimierung
allein nicht der zentrale Engpass war. Eine Alternative braucht deshalb vorab
Hypothese, Zielmetrik und Gegenbeispiel.

## Priorisierung

| Reihenfolge | Arbeit | Startbedingung | Erfolgssignal |
|---|---|---|---|
| 1 | P1-11 Gebaeudedatenfusion (inkl. DOM/DGM-Teil von P1-7) | sofort; Fusionsziel vorab definiert | `insufficient_support`-Anteil sinkt messbar; Anbauten verlaesslicher eingeordnet |
| 2 | P1-12 Status-/Zuverlaessigkeitsreview | baut auf P1-11 | Redundanz aufgeloest, Treiber der mittleren Zuverlaessigkeit benannt |
| 3 | P0-3 Point-MVT-Profiling (Ist-Stand 2026-07-27: 6-15 s je Zoom) | parallel | reproduzierbarer Latenzbefund und Zielwert |
| 4 | P1-13 Wien-Onboarding | Datenlieferung + Meeting-Input 24.09. | eigener Execution Plan mit vorab fixierten Holdout-Kriterien |
| 5 | P1-14 Hosting/Server | Entscheidung beim Meeting 24.09. | betriebsfaehige Instanz mit geklaertem Zugriff und Lizenzen |
| 6 | P1-8 Hanglagenmethodik/2D-Zerlegung | Abgleich mit AUGMENTERRA am 24.09. | Pruefstrategie ohne lange HR-Referenz beschlossen |
| 7 | P1-4/P1-5 Feature-/Geometrieablation | nach Meeting 24.09.; Gebiet (Salzburg vs. Wien) entschieden | Verbesserung ohne Reinheits-/Roof-Regression |
| 8 | P1-9 Motion-Ablation (Jahresraten) | Wien-Daten integriert (P1-13) | belastbare absolute Jahresraten ueber beide Geometrien |
| 9 | P1-10 Generalisierung (Wien als Holdout) | Methodik und Gates stabil | Holdout-Ergebnis ohne stilles Retuning |
| 10 | P0-1/P0-2 Neubewertung der roten RC-Befunde (zurueckgestellt) | nach P1-11/P1-12 | Befunde auf neuem Stand geklaert oder gegenstandslos; RC-Status neu entschieden |
| 11 | P1-1/P1-2 Labels und Gegenpruefung (zurueckgestellt) | Wien-Ground-Truth ausgeschoepft oder Bedarf belegt | stratifizierter Korpus und unabhaengige Expertenpruefung |
| 12 | P2 Alternativmodelle | konkreter v4-Fehler belegt | hypothesengeleitete Verbesserung |

Abgeschlossene Punkte werden aus dieser Liste entfernt und in
[`iterations.md`](iterations.md) beziehungsweise einem phasenspezifischen
Integrationsreport mit Evidenz festgehalten.
