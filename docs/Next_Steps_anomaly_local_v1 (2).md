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
