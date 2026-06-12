# Next Steps: anomaly_local_v1 → Phase 2+

**Stand:** März 2026
**Basis:** Laufende Phase-1-Pipeline `anomaly_local_v1`

---

## 1. Gebäude-Scoring mit Track-übergreifender Konfidenz

### Status quo
Die Cross-Validation beeinflusst aktuell nur den Qualitätsscore und das Label einzelner InSAR-Punkte. Es gibt kein aggregiertes Gebäudeergebnis.

### Ziel
Ein Gebäude-Level-Ergebnis der Form: **„Gebäude X hat eine Senkung von Y mm/a, Konfidenz Z%."**

### Ansatz
Die Konfidenz soll sich aus dem Track-übergreifenden Vergleich ableiten: Für jedes Gebäude werden die bereinigten Punkte (nach Outlier-Entfernung) pro Track separat aggregiert (z.B. robuster Median der vertikalen Proxies). Dann wird geprüft, wie gut ASC und DSC übereinstimmen. Hohe Übereinstimmung → hohe Konfidenz. Starke Abweichung → niedrige Konfidenz oder Warnung. Das Endergebnis ist ein einziger Bewegungswert pro Gebäude mit Konfidenzintervall, nicht mehr nur ein Punkt-Level-Label.

### Offene Fragen
- Welche Aggregationsstrategie pro Track (Median, gewichteter Mittelwert nach Kohärenz, inverser Varianz)?
- Wie wird das Konfidenzintervall formal berechnet (Bootstrap, Bayes, propagierte Standardfehler)?
- Ab wie vielen bereinigten Punkten pro Track ist eine Aussage belastbar?

---

## 2. Multi-Cluster-Handling und differenzielle Bewegung

### Problem
Ein Gebäude kann mehrere legitime Cluster haben, die sich auf unterschiedlichen Höhenebenen oder Gebäudeteilen befinden – z.B. Dach, Balkon, Vorgarten, Wintergarten oder ein kleiner Anbau. Diese Cluster können deutlich unterschiedliche Absenkungswerte zeigen.

Das ist kein Fehler, sondern ein fachlich wichtiger Befund: Differenzielle Bewegung innerhalb eines Gebäudes ist oft genau der Problemfall, der zu Rissen und Schäden führt.

### Ziel
- **Erkennung** von Multi-Cluster-Situationen mit unterschiedlichem Bewegungsverhalten.
- **Flagging**: Wenn zwei oder mehr zuverlässige Cluster existieren, aber signifikant unterschiedliche Absenkungen zeigen, soll das explizit markiert werden (z.B. `differential_motion_flag`).
- **Entscheidungslogik** für die Cross-Validation: Welche Cluster fließen in das Gebäude-Scoring ein? Sollen alle Cluster gleich behandelt werden, oder wird der „Hauptcluster" (z.B. Dachcluster mit den meisten Punkten und höchster Kohärenz) bevorzugt? Cluster, die offensichtlich von Nebengebäuden oder Anbauten stammen, sollten möglicherweise separat bewertet oder aus dem Hauptscoring ausgeschlossen werden.
- **Visualisierung**: In der UI sollte erkennbar sein, welche Cluster einem Gebäude zugeordnet sind, welche als Hauptcluster gelten und wo differenzielle Bewegung vorliegt.

### Offene Fragen
- Ab welcher Differenz zwischen Clustern wird `differential_motion_flag` gesetzt?
- Wie trennt man „Dach vs. Balkon desselben Gebäudes" von „Gebäude vs. angrenzender Wintergarten mit eigenem Fundament"?
- Sollen Cluster nach Höhenebene, räumlicher Position oder Bewegungsverhalten hierarchisch gruppiert werden?

---

## 3. Hangexposition und Aspect-Berücksichtigung

### Problem
Aktuell wird die Geländeneigung (slope) berücksichtigt, aber nicht die Ausrichtung des Hangs (Aspect / Exposition). Für InSAR macht es einen wesentlichen Unterschied, ob ein Hang nach Norden, Süden, Osten oder Westen ausgerichtet ist, weil der Satellit in ASC-Geometrie nach Osten und in DSC-Geometrie nach Westen blickt.

Ein Südhang und ein Nordhang mit gleicher Neigung erzeugen unterschiedliche Sichtbarkeiten, Abschattungseffekte und LOS-Projektionen. Das beeinflusst sowohl die Messpunktdichte als auch die Zuverlässigkeit der Messungen.

### Ziel
- Aspect/Exposition aus dem Terrain-Kontext in die Pipeline einbeziehen – nicht nur als Feature, sondern als Kontextinformation für die Interpretation der Cross-Track-Toleranz und der erwarteten Messpunktdichte.
- Prüfen, ob die bestehenden Terrain-Daten (SRTM, 25m Auflösung) Aspect ausreichend genau liefern oder ob ein feineres DEM benötigt wird.

---

## 4. Dokumentation des AUGMENTERRA MatchSAR®-Algorithmus

### Bedarf
Für die weitere Entwicklung der Pipeline wird eine genaue Beschreibung benötigt, wie der MatchSAR®-Algorithmus bei AUGMENTERRA die Zuordnung von InSAR-Messpunkten zu physischen Objekten (insbesondere Gebäuden) durchführt.

### Konkret benötigt
- Welche Buffer-Strategie verwendet MatchSAR® (isotrop, richtungsabhängig, höhenabhängig)?
- Welche Qualitätskriterien werden bei der Zuordnung angewendet?
- Wie werden Konflikte gelöst (Punkt liegt im Überlappungsbereich zweier Gebäude)?
- Welche Rolle spielen Gebäudehöhe, Einfallswinkel und Geländemodell in der Zuordnung?
- In welchem Umfang ist MatchSAR® an OSM-Polygone vs. andere Gebäudequellen gebunden?

Diese Information hilft, die eigene Pipeline-Zuordnung mit dem Produktionsalgorithmus von AUGMENTERRA abzugleichen und systematische Unterschiede zu verstehen.

**Aktion:** Detaillierte Beschreibung bei AUGMENTERRA anfordern.

---

## 5. Vergleich mit autonomem KI-Agenten

### Idee
Einen autonomen KI-Agenten (z.B. Claude, GPT-4 mit Vision, oder ein spezialisiertes Modell) auf die gleichen Gebäude-Daten ansetzen und unabhängig eine Cluster- und Outlier-Klassifizierung durchführen lassen. Die Ergebnisse werden dann systematisch mit der Pipeline verglichen.

### Zweck
- **Unabhängige Zweitmeinung**: Erkennt der Agent Outlier oder Cluster, die die Pipeline übersieht – oder umgekehrt?
- **Schwachstellen-Analyse**: Wo stimmen Pipeline und Agent überein (hohe Konfidenz), wo divergieren sie (genauer hinschauen)?
- **Skalierungstest**: Kann ein LLM-basierter Ansatz als ergänzende Qualitätssicherung für Grenzfälle dienen, die regelbasiert schwer zu lösen sind?

### Umsetzung
- Ausgewählte Gebäude mit verschiedenen Schwierigkeitsgraden (wenige Punkte, viele Punkte, Multi-Cluster, klare Outlier, Grenzfälle).
- Dem Agenten die gleichen Rohdaten bereitstellen (Punktliste mit Attributen, Gebäudepolygon, Zeitreihen).
- Ergebnisse strukturiert vergleichen: Übereinstimmungsrate, Kappa-Score, qualitative Analyse der Divergenzen.

---

## 6. Experten-Referenzklassifizierung (Ground Truth)

### Bedarf
Die Pipeline arbeitet unsupervised – es gibt aktuell keine Ground-Truth-Labels, gegen die man die Ergebnisse objektiv messen kann. Für eine belastbare Evaluierung wäre eine Soll-Klassifizierung durch Domänenexperten von AUGMENTERRA sehr hilfreich.

### Konkret angefragt
Eine Auswahl von Gebäuden (z.B. 50–100), bei denen AUGMENTERRA-Experten manuell klassifizieren:
- Welche InSAR-Punkte sind diesem Gebäude zuverlässig zuordenbar?
- Welche Punkte sind Outlier (Nachbargebäude, Reflexionsfehler, instabile Signale)?
- Welche Cluster sind fachlich plausibel?
- Wie ist die Gesamtbewertung des Gebäudes (Senkung ja/nein, ungefähre Größenordnung)?

### Zweck
- **Quantitative Evaluierung** der Pipeline (Precision, Recall, F1 für Outlier-Erkennung).
- **Iterationsgrundlage**: Gezieltes Nachsteuern von Parametern und Rules basierend auf konkreten Fehlklassifizierungen.
- **Benchmarking**: Vergleich Pipeline vs. KI-Agent vs. Experte.

### Ideale Zusammensetzung der Stichprobe
- Gebäude mit vielen Punkten (≥20) und wenigen Punkten (3–10).
- Gebäude mit bekannter Bewegung und stabile Gebäude.
- Gebäude in ebenem Gelände und in Hanglage.
- Gebäude mit bekannten Problemfällen (Wintergarten, Anbau, Nachbarreflexion).

**Aktion:** Stichprobe definieren und bei AUGMENTERRA anfragen.

---

## 7. Abgleich der Pipeline mit dem Deep-Research-Report

### Hintergrund
Parallel zur Implementierung der Phase-1-Pipeline wurde ein umfassender Deep Research durchgeführt, der die aktuelle Literatur zu InSAR-Gebäude-Clustering, Outlier Detection, Feature-Engineering, Cross-Track-Validierung und Scoring-Methoden systematisch aufgearbeitet hat.

### Ziel
Ein strukturierter Vergleich zwischen dem, was die Pipeline aktuell tut, und dem, was der Research als State of the Art empfiehlt. Konkret:

- **Algorithmenwahl:** Bestätigt die Literatur HDBSCAN als geeignetste Methode für unsere Randbedingungen (wenige Punkte, unbekannte Clusterzahl, simultane Outlier-Erkennung)? Gibt es Alternativen, die der Research als überlegen bewertet, die wir noch nicht getestet haben?
- **Feature-Set:** Verwendet die Pipeline die richtigen Features? Gibt es aus der Literatur Features, die wir übersehen haben, oder solche, die wir verwenden, aber die laut Research wenig Informationsgehalt haben?
- **Buffer-Strategie:** Wie vergleicht sich unser richtungsabhängiger Buffer mit den Ansätzen in der Literatur? Gibt es bessere Modelle für die Punkt-Gebäude-Zuordnung?
- **Scoring und Konfidenz:** Schlägt der Research andere Aggregations- oder Konfidenz-Methoden vor als das, was wir für Phase 2 geplant haben?
- **Gate-Rules:** Sind unsere harten Schwellwerte (Kohärenz, Epochenzahl) durch die Literatur gestützt? Gibt es datengetriebene Alternativen, die wir früher einführen sollten als geplant?
- **Validierungsstrategie:** Gibt es in der Literatur Ansätze zum ASC/DSC-Vergleich, die über unseren vertikalen Proxy hinausgehen?

### Erwartetes Ergebnis
Ein Dokument, das Punkt für Punkt festhält: Was macht die Pipeline, was empfiehlt der Research, wo gibt es Übereinstimmung, wo Abweichungen, und welche konkreten Änderungen oder Ergänzungen sich daraus für Phase 2+ ableiten lassen.

### Aktion
Nach Abschluss des Deep Research: Ergebnisse systematisch gegen die aktuelle `anomaly_local_v1`-Methodik legen und Handlungsempfehlungen ableiten.

---

## 8. Nachbargebäude-Kontext in die Pipeline einbeziehen

### Problem
Die Pipeline analysiert aktuell jedes Gebäude isoliert. Dabei gehen zwei wichtige Informationsquellen verloren:

**Fehlzuordnungen erkennen:** Ein InSAR-Punkt, der im Polygon von Gebäude A liegt, kann in Wirklichkeit eine Reflexion von Gebäude B nebenan sein – er „passt" geometrisch und kinematisch besser zu einem Cluster des Nachbargebäudes als zu Gebäude A. Ohne den Nachbar-Kontext wird dieser Punkt entweder fälschlich als Outlier markiert oder verzerrt das Ergebnis von Gebäude A.

**Nachbarschafts-Konsistenz prüfen:** Wenn ein Punkt am betrachteten Gebäude einen abrupten Sprung in der Zeitreihe zeigt, sieht das zunächst nach einem Outlier aus. Wenn aber Punkte an den Nachbargebäuden den gleichen Sprung zur gleichen Zeit zeigen, ist es kein Punktfehler, sondern ein reales lokales Ereignis (z.B. Bauarbeiten, Grundwasserentnahme, U-Bahn-Vortrieb). Der Punkt „passt ins Bild" und sollte nicht entfernt werden.

### Ziel
- **Cluster-Zugehörigkeitsvergleich:** Für jeden Punkt am Gebäude prüfen, ob er möglicherweise besser zu einem Cluster eines direkten Nachbargebäudes passt (ähnliche Höhe, ähnliche Geschwindigkeit, räumliche Nähe zum Nachbar-Cluster). Wenn ja, den Punkt als potenzielle Fehlzuordnung flaggen.
- **Zeitreihen-Konsistenz im Nachbarschaftskontext:** Wenn auffällige Muster (Sprünge, abrupte Trendwechsel) in den Zeitreihen eines Gebäudes auftreten, prüfen, ob diese Muster auch bei benachbarten Gebäuden vorhanden sind. Wenn ja: kein lokaler Outlier, sondern ein Nachbarschafts-Event – als solches kennzeichnen statt entfernen.
- **Nachbarschafts-Scoring:** Optional ein Nachbarschafts-Konsistenz-Score, der angibt, wie gut das Bewegungsverhalten eines Gebäudes zu seiner unmittelbaren Umgebung passt. Starke Abweichungen von der Nachbarschaft können entweder auf ein echtes Gebäudeproblem hindeuten – oder auf systematische Zuordnungsfehler.

### Umsetzung
- Definition des Nachbarschaftsradius (z.B. direkt angrenzende Gebäude oder alle Gebäude innerhalb eines bestimmten Abstands).
- Zugriff auf die Cluster-Ergebnisse der Nachbargebäude, nachdem deren lokale Analyse abgeschlossen ist (erfordert einen zweiten Pass oder eine Nachverarbeitungsstufe).
- Zeitreihen-Vergleich über Korrelation, Sprung-Koinzidenz oder ähnliche Metriken.

### Offene Fragen
- Wie groß soll der Nachbarschaftsradius sein? Direkte Polygon-Nachbarn oder Meter-basiert?
- Wird der Nachbarschafts-Kontext als zusätzlicher Postprocessing-Schritt nach der Gebäude-Level-Analyse eingeführt, oder soll er in die Hauptpipeline integriert werden?
- Wie verhindert man, dass zirkuläre Abhängigkeiten entstehen (Gebäude A beeinflusst Gebäude B beeinflusst Gebäude A)?

---

## 9. Geländemodell-Evaluation: DTM vs. DSM vs. nDSM

### Status quo
Die Pipeline verwendet aktuell SRTM-Daten mit 25m Auflösung als Terrain-Kontext. SRTM ist ein Digital Surface Model (DSM) – es bildet die sichtbare Oberfläche ab, also inklusive Gebäude und Vegetation. Für die Pipeline wird daraus bisher nur slope, aspect und relief abgeleitet, keine absolute Höhendifferenz Punkt vs. Gelände (weil das Vertikaldatum nicht harmonisiert ist).

### Problem
Je nachdem, welches Höhenmodell man verwendet, ergeben sich unterschiedliche Aussagen:

**DTM (Digital Terrain Model / Geländemodell):** Bildet die nackte Geländeoberfläche ab, ohne Gebäude und Vegetation. Vorteil: Wenn man die Höhe eines InSAR-Punktes gegen das DTM rechnet, erhält man die Höhe über Grund – also ob der Punkt vom Dach, vom Erdgeschoss oder vom Gelände vor dem Gebäude stammt. Nachteil: Gute DTMs sind nicht überall frei verfügbar.

**DSM (Digital Surface Model / Oberflächenmodell):** Bildet die sichtbare Oberfläche ab, inklusive Gebäude und Vegetation. SRTM ist ein DSM. Vorteil: Global verfügbar. Nachteil: In bebauten Gebieten liegt die DSM-Oberfläche auf Dachniveau – die Differenz InSAR-Punkt vs. DSM sagt dann wenig über die Reflexionsposition am Gebäude aus.

**nDSM (normalisiertes DSM):** Die Differenz DSM minus DTM, also die Höhe der Objekte über Grund (Gebäude, Bäume). Nützlich, um Gebäudehöhen zu validieren oder Vegetationsbereiche zu identifizieren.

### Zu klären
- Welches Modell ist für die Pipeline am nützlichsten? Für die Höhenschichtung von InSAR-Punkten innerhalb eines Gebäudes (Dach vs. Boden) wäre ein DTM ideal, weil man dann die Höhe über Grund berechnen kann. Für die Identifikation von Vegetationsflächen oder die Validierung von Gebäudehöhen wäre ein nDSM besser.
- Welche Auflösung wird benötigt? SRTM mit 25m ist für gebäudescharfe Analyse zu grob. Alternativen wie Copernicus DEM (GLO-30, 30m), ALOS World 3D (AW3D30, 30m) oder hochauflösende nationale Modelle (z.B. ALS-basierte Geländemodelle mit 1m Auflösung, in Österreich über Open Data verfügbar) bieten deutlich mehr Detail.
- Gibt es für Salzburg oder Österreich ein freies, hochauflösendes DTM, das als Upgrade zum SRTM dienen kann?
- Ist das Vertikaldatum-Problem lösbar? SRTM und die InSAR-Punkthöhen liegen in unterschiedlichen Bezugssystemen (EGM96 vs. WGS84 ellipsoidisch). Für eine sinnvolle absolute Höhendifferenz muss eine Geoid-Korrektur angewendet werden.
- Welches Modell verwendet AUGMENTERRA intern für die SqueeSAR®-Prozessierung? Falls bekannt, sollte idealerweise dasselbe oder ein kompatibles Modell in der Pipeline verwendet werden.

### Aktion
- Verfügbare Höhenmodelle für Salzburg recherchieren (insbesondere Open-Data-Quellen aus Österreich).
- Testweise ein hochauflösendes DTM einbinden und prüfen, ob die Höhenschichtung der InSAR-Punkte damit plausiblere Ergebnisse liefert als mit SRTM.
- Bei AUGMENTERRA nachfragen, welches Geländemodell in der InSAR-Prozessierung verwendet wird.

---

## Priorisierung

| Nr. | Thema | Abhängigkeit | Priorität |
|-----|-------|-------------|-----------|
| 1 | Gebäude-Scoring mit Konfidenz | Phase-1-Pipeline stabil | Hoch |
| 2 | Multi-Cluster-Handling | Phase-1-Clustering läuft | Hoch |
| 3 | Hangexposition / Aspect | Terrain-Daten vorhanden | Mittel |
| 4 | MatchSAR®-Dokumentation | AUGMENTERRA-Input nötig | Mittel |
| 5 | KI-Agenten-Vergleich | Pipeline + Testgebäude definiert | Mittel |
| 6 | Experten-Referenzlabels | AUGMENTERRA-Input nötig | Hoch |
| 7 | Abgleich Pipeline vs. Deep Research | Deep Research abgeschlossen | Hoch |
| 8 | Nachbargebäude-Kontext | Phase-1-Clustering pro Gebäude stabil | Mittel |
| 9 | Geländemodell-Evaluation (DTM/DSM) | Recherche + ggf. AUGMENTERRA-Input | Mittel |

---

# Phase-7-Folgepunkte (Stand 2026-06-10, nach Integration k2x)

Phase 7 / Optimierungsphase 1 ist abgeschlossen: Kandidat `k2x`
(Quer-Versatz-Politik fuer nearest + striktes Small-N) ist produktiv
integriert (`MODEL_SET_VERSION local_hdbscan_rulegate_v2_k2x`,
Evidenz: `phase7_clustering_optimization_report.md`). Daraus ergeben
sich folgende, bewusst NICHT in Phase 7 umgesetzte Punkte:

## P7-N1: Weitere Clustering-Algorithmen (per User-Entscheidung 2026-06-10 verschoben)

`P7-C-W2-T3` (GMM, PAM/k-Medoids, robuste/Constraint-Clusterer) wurde
auf User-Wunsch in eine eigene spaetere Optimierungsphase verschoben.
Startpunkt dann: HDBSCAN-Sweep- und OPTICS-Befunde (alle Varianten
candidate_red; "Parameter sind nicht der Engpass") - ein neuer
Algorithmus muss einen konkreten, benannten Schwachpunkt adressieren.

## P7-N2: Regime-konditionale High-N-/TSX-Strategie

`leaf` reduziert TSX-Noise um ~86% und verbessert TSX-Cross-Track,
degradiert aber SNT und loescht die noise_dominated-Diagnoseklasse
pauschal (S5-T2). Eine leaf-Strategie NUR fuer >50-Punkt-Gruppen waere
ein struktureller Eingriff (regime-konditionale Konfiguration) und
braucht die feinere HR-Verifikation (P7-N3).

## P7-N3: Feinere HR-Pseudo-Referenz

Das Struktur-Matching auf Gebaeudeebene saettigt bei match_rate 1.0
und diskriminiert Kandidaten nicht mehr. Naechste Stufe:
Cluster-/Patch-Ebene (TSX-Clusterzentren vs SNT-Cluster-Footprints),
optional Bewegungs-Rangkorrelation (weiterhin qualitativ wegen
temporal_overlap_days=232).

## P7-N4: Watch-Item 113309836 + TSX-Aufwertungs-Review

Unter k2x kippen vereinzelt TSX-Gebaeude von noise_dominated auf ok;
227901743 ist als legitime Dekontamination auditiert (Motion
unveraendert), 113309836 zeigt einen Vorzeichenwechsel (+1.00 ->
-0.27 mm/a, Band medium) und braucht menschliche Pruefung. Die
Scorecard zaehlt solche Aufwertungen jetzt maschinell
(status_upgrades_vs_baseline) - bei kuenftigen Kandidaten Pflichtblick.

## P7-N5: Assignment-Hygiene 2 - along-look, Hoehe, unkartierte Strukturen (erweitert 2026-06-12)

**Neue Fehlerklasse (User-Befund 2026-06-11, Fall 96959851): Fremdpunkte
unkartierter Strukturen.** Ein Nebengebaeude mit Blechdach, das weder in
GBA noch in OSM existiert, traegt 3 stabile PS-Punkte, von denen 2 als
t95-Cores den Motion-Score praegen (Blechdaecher = starke Reflektoren).
Footprint-/OSM-basierte Fremdobjekt-Checks (a4) koennen diese Klasse
PRINZIPIELL nie fangen - das Objekt fehlt in den Daten. Die produktive
a5-Politik ist zusaetzlich strukturell blind, weil sie nur die QUER-Achse
prueft und die Struktur fuer beide Tracks laengs der Blickachse liegt.
Evidenz: `artifacts/phase7_reference_cases.json` (residual_contamination),
`artifacts/phase7_survivors_scan_s6.md`, Visual-Audit-Report v2.

Drei generische, kartierungsfreie Check-Kandidaten (alle selbstkalibrierend,
keine Gebietskonstanten; Vorsortier-Versionen existieren bereits im
Survivors-Scan-Tooling und sind dort am Fall validiert):

1. **Anti-Layover-Vorzeichen-Check (hart, physikalisch):** Punkte ausserhalb
   des Footprints, deren Versatz ENTGEGEN der Range-Verschiebungsrichtung
   (range_dx/dy) liegt (Anti-Komponente > Geocoding-Toleranz), sind als
   Dachpunkte nicht erklaerbar -> demote. Faengt O2HC2XV01-Typ; null Risiko
   fuer echte Dachpunkte. Survivors-Scan-Beifang: auch Fall 96637447
   (4 anti-layover-t44-Cores am Differential-Anker).
2. **Layover-Reichweiten-Check:** implizite Reflektorhoehe d_fp/tan(inc)
   gegen plausible Gebaeudehoehe (GBA/0.735 + Marge; Saturierungs-Ratio aus
   P7-A-W1-T6). Faengt NTC3CYZ01-Typ (10.2 m noetig bei 3.6-m-Haus) und
   96856632 (12.5-16.6 m). VORSICHT: bei stark gesaettigten Hoehen grosser
   Gebaeude (105022686) ist der Check Hoehenfehler-Diagnostik - Kopplung an
   die Hoehenoptionen O1-O4 des Hoehen-Audits noetig.
3. **Anker-Plausibilisierung auf directional ausweiten + Hoehenprofil:**
   gleiche MAD-Logik wie a5 auf directional-Punkte (NTDA86J01-Typ ist
   geometrisch unentscheidbar, faellt aber im Hoehenprofil auf: -3.6 m
   unter Dach-Anker als staerkster Beweger). Das nie getestete Komposit
   **k2xh = a5_crosslook + a3_height + smalln_strict** ist der natuerliche
   naechste Harness-Kandidat, erweitert um Checks 1-2 als eigene Varianten.

**Pruefstein fuer jeden Kandidaten:** Fall 96959851 - NTC3CYZ01 und
NTDA86J01 muessen demotiert werden, OHNE NTF2IZV01/NTG9E7F01 zu verlieren;
O2HC2XV01 darf nicht zugeordnet bleiben (residual_contamination-Block).
Zweitpruefstein 96637447 (anti-layover-Cores raus, Differential-Semantik
und echte Dachkerne unveraendert). Watch-Item 113309836 (P7-N4) mitziehen:
die 3 ueber-Anker-Cores (+13.7-15 m) erklaeren moeglicherweise den
Vorzeichenwechsel.

Hinweis Amplituden (siehe P7-N6): hohe, stabile Amplitude koennte die
Blechdach-/Fremdstruktur-Hypothese als ZUSATZSIGNAL stuetzen - als
Feature-Experiment in derselben Mini-Phase pruefbar.

## P7-N6: Track-22-Ost-Diagnose + Bad-Gastein-Amplituden (aktualisiert 2026-06-12)

**Bad-Gastein-Amplituden: ERLEDIGT (Datenbeschaffung).** Integration durch
parallele Session (areas_manifest amplitude_path + prepare_insar +
PostGIS-Load), verifiziert 2026-06-12: `insar_amplitude_timeseries` hat
fuer bad_gastein_snt t44 17.0 Mio Zeilen (185 283 Punkte) und t95 13.5 Mio
(149 861); `insar_points.amp_mean` ist zu 63.0 % (t44) bzw. 53.4 % (t95)
befuellt - die Amplituden-Exports decken den Talkorridor ab, Teilabdeckung
ist erwartet. Track 22 und TSX/PAZ weiterhin ohne Amplituden.

Konsequenzen fuer die naechste Mini-Phase:

- **Re-Baseline der BG-AOIs als Pflicht-Erstschritt:** Die Pipeline nutzt
  Amplituden-Features produktiv (amp_ts_cv-Gate `unstable_amplitude`,
  amp_quality im Scoring). Die persistierten v2_k2x-Baselines der BG-AOIs
  entstanden OHNE Amplituden-Input; frische BG-Laeufe weichen jetzt ab ->
  `--verify-noop` bricht auf bg_* erwartungsgemaess, bis neue Baselines
  persistiert sind (Datenstands-Wechsel dokumentieren, alte Baselines als
  legacy behalten). Salzburg ist unbetroffen (Amplituden seit Januar).
- **Amplituden-Feature-Kandidaten fuer den Harness:** amp_ts_* wirken
  bisher nur als Qualitaets-Gate/-Score, nie als Hygiene-Signal. Hypothese
  "hohe + stabile Amplitude ausserhalb des Footprints = Blechdach-/
  Fremdstruktur-Indikator" (Fall 96959851); Erstbefund siehe
  `artifacts/phase7_amplitude_recon.md`. Moegliche Achsen: amp_mean-Rang
  im Gebaeudekontext, amp_ts_cv als Anker-Gewicht, Amplituden-Konsistenz
  pro Cluster.

**Track-22-Ost-Diagnose: unveraendert offen** (Track 22 deckt die Ost-AOIs
nicht; reines Datenthema, kein Algorithmus-Blocker).

## P7-N7: UI-Kennzeichnung demotierter Punkte

Demotierte nearest-Punkte tragen gate_reasons
(`nearest_crosslook_outlier` etc.) und sind im Inspector sichtbar;
eine eigene Kartensignatur (z. B. eigene Form statt nur grau) wuerde
die Forschungs-Lesbarkeit weiter erhoehen. Klein, additiv.
