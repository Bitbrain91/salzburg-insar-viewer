# Projektziel: InSAR Building Intelligence

**Stand:** 2026-07-10

**Status:** aktives Living Document

**Autoritativ fuer:** Projektziel, Rolle des Viewers, aktueller Reifegrad, fachliche Aussagegrenzen und offene Forschung

**Aktualisieren wenn:** sich Zielbild, aktiver Modell-/Datenstand, Reifegrad oder priorisierte offene Forschung aendert

## Zentrales Projektergebnis

Das zentrale Projektergebnis ist eine **validierbare
Building-Intelligence-Methodik**, die InSAR-Messpunkte zuverlaessig Gebaeuden
und Gebaeudeteilen zuordnet, Fremdreflektoren erkennt und nachvollziehbare
Bewegungsbewertungen erzeugt.

Die Methodik soll fuer ein betrachtetes Gebaeude vier Fragen beantworten:

1. Welche Messpunkte sind diesem Gebaeude plausibel zuzuordnen?
2. Welche Punkte bilden Hauptbau, baulich plausiblen Anbau oder Fremdreflektor?
3. Welche Bewegung wird von den belastbaren Punkten beziehungsweise
   Gebaeudeteilen getragen?
4. Wie stark ist die Evidenz, und welche Unsicherheiten oder widerspruechlichen
   Tracks bleiben sichtbar?

## Rolle des InSAR Viewers

Der InSAR Viewer ist ein **internes Forschungswerkzeug**, kein vorgesehenes
Endkundenprodukt. Er dient dazu, Daten, Modellentscheidungen und Grenzfaelle zu
entwickeln, zu visualisieren, zu vergleichen und fachlich zu validieren.

Ob und welche validierten Ergebnisse spaeter in ein AUGMENTERRA-Produkt
uebernommen werden, wird erst anhand der Forschungsergebnisse entschieden.
Produkttransfer ist derzeit kein eigener Arbeitsstrang dieses Repositories.

## Projektkontext

Ausgangspunkt war die im SP-AI-Forschungsantrag formulierte Idee, InSAR-Daten
mit raeumlichen, visuellen und semantischen Informationen zu verbinden und die
Punkt-zu-Objekt-Zuordnung zu verbessern. Diese erste Idee wurde im Projekt durch
Code, Datenanalysen, Experimente und visuelle Befunde zur heutigen
Building-Intelligence-Methodik konkretisiert. Fuer die laufende Arbeit sind der
tatsaechliche Implementierungsstand und die aktuelle Methodik massgeblich; der
Antrag ist historischer Ursprung, kein operatives Pflichtenheft.

## Aktueller Reifegrad

Aktiver Forschungsstand ist `anomaly_local_v1` mit dem Modellset
`local_hdbscan_rulegate_v4_k2xhf_diffv2`. BEV ist die Standard-Gebaeudequelle;
GBA und OSM bleiben Vergleichs- beziehungsweise Kontextquellen. Der Viewer und
die Pipeline unterstuetzen Salzburg sowie Bad Gastein mit den jeweils
verfuegbaren Sensoren und Tracks.

Der Stand ist ein fortgeschrittener, end-to-end integrierter
Forschungsprototyp. Er ist nicht gleichbedeutend mit einer extern validierten,
allgemein uebertragbaren oder produktreifen Methode. Das laufende
Release-Candidate-Gate ist im
[`P0 Execution Plan`](p0_documentation_v4_rc_execution_plan.md) definiert; nach
Abschluss verweist die Dokumentations-Routingseite auf den zugehoerigen
RC-Bericht.

### Umgesetzt

- Datenaufbereitung, PostGIS-Persistenz, API und kartenbasierte Inspektion fuer
  InSAR-, Gebaeude-, Zeitreihen-, Amplituden- und Terrain-Kontextdaten.
- Richtungs- und hoehenabhaengige lokale Punktzuordnung je Gebaeude und Track.
- Lokale Clusterbildung, Small-N-Behandlung, Qualitaetsgates, Punkt- und
  Gebaeuderollups sowie Cross-Track-Plausibilisierung.
- v4-Trennung der semantischen Clusterarten `standard`, `annex` und `foreign`;
  Fremdcluster beeinflussen weder Hauptbewegung noch Differentialaussage.
- Differenzielle Bewegung als Stufenmodell `none`, `candidate`, `significant`
  und `confirmed`, inklusive Evidenz- und Plausibilitaetsinformationen.
- Forschungs-Harness mit festen AOIs, Referenzfaellen, Label-Korpus,
  Scorecards, No-op-Baselines, Visual Audits und Survivors-Pass.
- Vergleichsgebiete und -daten in Salzburg und Bad Gastein; BEV-, GBA- und
  OSM-Gebaeudekontext sowie SNT- und TSX/PAZ-Daten, soweit je Gebiet vorhanden.

### Intern geprueft

- Zehn v4-Baseline-AOIs (sieben GBA-, drei BEV-Konfigurationen) wurden beim
  v4-Integrationsstand per No-op-Vergleich reproduziert.
- Der interne v4-Label-Korpus umfasst zehn Gebaeude und 46 Punkte; die
  dokumentierten v4-Reinheitsgates ergaben `foreign_in_annex=0` und
  `annex_in_foreign=0`.
- Referenzfaelle, automatische Scorecards und wiederholte visuelle Audits
  pruefen unter anderem Small-N, Multi-Cluster, Fremdreflektoren, Hanglagen und
  Main-Cluster-Kontamination.
- Die v4-Korrektur wurde durch einen visuellen Nutzerbefund ausgeloest: technisch
  erkannte Fremdpunkte duerfen nicht als Anbau klassifiziert und dadurch als
  differenzielle Gebaeudebewegung interpretiert werden.

Diese Pruefungen sind interne Silver-Ground-Truth-Evidenz. Sie ersetzen keine
unabhaengige fachliche Ground Truth.

### Offen

- P0-v4-Release-Candidate-Gate einschliesslich Watch-Items, Visual Audit und
  Survivors-Pass abschliessen und nachvollziehbar protokollieren.
- Label-Korpus stratifiziert erweitern und unabhaengige Expertenlabels sowie
  echte Holdout-Faelle aufbauen.
- Zuverlaessigkeits- und Unsicherheitsmasse empirisch kalibrieren.
- Generalisierung auf weitere Gebiete, Sensorkonfigurationen und
  Gebaeuderegime testen.
- 1-m-DGM/DOM kontrolliert ableiten, laden und als eigenen Datenstandswechsel
  re-baselinen; das vorhandene SRTM bleibt bis dahin aktiver Terrain-Stand.
- Motion-Ablation mit zeitlich ueberlappender Referenzdatenbasis durchfuehren;
  die benoetigte SNT/TSX-Ueberlappung liegt noch nicht vor.
- Offene Phase-8-Feature-, Label- und Terrain-Arbeiten nach dem aktuellen
  [`next_steps.md`](../pipelines/anomaly_local_v1/next_steps.md) priorisieren.

## Fachliche Aussagegrenzen

### Was die Plattform heute aussagen kann

Die Plattform kann fuer den aktiven Modell- und Datenstand nachvollziehbar
ausweisen:

- warum ein Punkt einem Gebaeude zugeordnet, ausgeschlossen oder als
  Fremdreflektor behandelt wurde;
- welche Punkte einen Haupt-, Anbau-, Fremd-, Noise- oder Weak-Support-Kontext
  bilden;
- welche robuste LOS-Bewegung die akzeptierten Hauptcluster tragen;
- ob Evidenz fuer eine `candidate`, `significant` oder `confirmed`
  differenzielle Bewegung vorliegt;
- wie Tracks, Signalqualitaet, Punktstuetzung und Zuordnungsart die
  Zuverlaessigkeit der Bewertung beeinflussen.

Diese Aussagen gelten fuer den konkreten Run, Modellstand, Datenstand und die
angezeigte Evidenz. Sie sind Forschungsbefunde, keine allgemeingueltige
Tatsachenbehauptung ueber das Bauwerk.

### Was die Plattform heute nicht aussagen darf

- keine Diagnose eines Gebaeudeschadens oder Risses;
- keine statische oder bautechnische Begutachtung;
- keine empirisch kalibrierte Schadenswahrscheinlichkeit;
- keine garantierte Prognose kuenftiger Bewegung;
- keine ungepruefte Uebertragbarkeit auf beliebige Gebiete oder Sensoren.

Insbesondere ist `building_reliability_score` ein internes Evidenz- und
Zuverlaessigkeitsmass, keine prozentuale Schadenswahrscheinlichkeit.

## Aktuelle Erfolgskriterien

Die Forschung macht belastbaren Fortschritt, wenn:

- Punkt- und Clusterentscheidungen in festen Kontroll- und Problemfaellen
  fachlich nachvollziehbar bleiben;
- Fremdreflektoren Hauptbewegung und Differentialbewertung nicht kontaminieren;
- legitime Dach- und Anbaupunkte nicht durch Hygiene-Regeln verloren gehen;
- Änderungen gegen eingefrorene Baselines, Referenzfaelle, Labels und Visual
  Audits reproduzierbar geprueft werden;
- Unsicherheit, fehlender Support und inkonklusive Faelle sichtbar bleiben;
- neue Gebiete und Datenstaende ohne stilles Nachjustieren der Erfolgskriterien
  getestet werden koennen.

## Verweise auf die operativen Sources of Truth

- Aktive Modelllogik: [`methodik.md`](../pipelines/anomaly_local_v1/methodik.md)
- Verifikation und Pflicht-AOIs: [`runbook.md`](../pipelines/anomaly_local_v1/runbook.md)
- Aktuelle offene Forschung: [`next_steps.md`](../pipelines/anomaly_local_v1/next_steps.md)
- Phase-8-Status und Historie:
  [`phase8_bev_hygiene_plan.md`](../pipelines/anomaly_local_v1/phase8_bev_hygiene_plan.md)
  und
  [`phase8_integration_report.md`](../pipelines/anomaly_local_v1/artifacts/phase8_integration_report.md)
- Chronologische Modelliterationen:
  [`iterations.md`](../pipelines/anomaly_local_v1/iterations.md)
- Dokumentrouting und Pflegeverantwortung: [`docs/README.md`](../README.md)
