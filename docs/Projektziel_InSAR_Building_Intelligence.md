# Projektziel: InSAR Building Intelligence Pipeline

**Projekt:** Co-Innovation Stadt Salzburg – InSAR-basierte Gebäudebewegungsanalyse
**Partner:** AUGMENTERRA GmbH, FH Salzburg
**Stand:** März 2026

---

## Ausgangslage

AUGMENTERRA betreibt eine InSAR-basierte Plattform (AUGMENTERRA Observer), die Bauwerks- und Bodenbewegungen satellitengestützt erfasst. Der Sentinel-1-Satellit liefert alle 12 Tage Radaraufnahmen, aus denen über den SqueeSAR®-Algorithmus millimetergenaue Verschiebungsmessungen gewonnen werden. Über den MatchSAR®-Algorithmus werden diese Messpunkte physischen Objekten – insbesondere Gebäuden – zugeordnet.

Für die Stadt Salzburg liegen aktuell rund 550.000 InSAR-Messpunkte vor, die sich auf zwei unabhängige Satellitengeometrien verteilen (Ascending Track 44 und Descending Track 95). Über Gebäudepolygone (OSM und Global Building Atlas) sind diese Punkte mit ca. 31.000 Gebäuden verknüpft.

### Das Problem

Die bisherige Bewertung von Gebäudebewegungen beruht auf einfachen Filtern (z.B. Kohärenz > 0.7) und einer globalen Aggregation aller einem Gebäude zugeordneten Messpunkte. Dieser Ansatz hat wesentliche Schwächen:

**Fehlende Outlier-Erkennung.** Messpunkte, die nicht vom Gebäude selbst stammen (z.B. von Terrassen, Wintergärten, parkenden Autos oder Nachbargebäuden), fließen ungefiltert in die Gebäudebewertung ein und verzerren das Ergebnis.

**Keine Berücksichtigung des lokalen Kontexts.** Jedes Gebäude hat eigene Reflexionseigenschaften, eine individuelle Umgebung und unterschiedlich viele Messpunkte. Ein globales Modell über alle Punkte einer Stadt kann diese lokale Vielfalt nicht abbilden. Ein erster Versuch mit einem global trainierten Isolation Forest hat dies bestätigt.

**Besonders kritisch bei kleinen Gebäuden.** Einfamilienhäuser haben oft nur 2–5 Messpunkte. Wenn davon einer ein Outlier ist, kippt die gesamte Gebäudebewertung – ein Hausbesitzer erhält möglicherweise eine falsche Risikoeinschätzung.

**Keine unabhängige Validierung.** Die beiden Satellitengeometrien (Ascending und Descending) bieten grundsätzlich eine Möglichkeit zur Kreuzvalidierung: Bei rein vertikaler Senkung sollten beide Tracks konsistente Ergebnisse liefern. Dieses Potenzial wird bisher nicht genutzt.

---

## Ziel

Entwicklung einer **Machine-Learning-Pipeline**, die InSAR-Messpunkte auf Gebäudeebene analysiert und für jedes Gebäude eine fundierte, datengestützte Bewegungsbewertung liefert.

Im Kern geht es darum, für ein beliebiges Gebäude folgende Fragen beantworten zu können:

1. **Welche Messpunkte gehören zuverlässig zu diesem Gebäude?** Zuordnung über adaptiven Buffer und räumlich-geometrische Analyse, um Punkte von Nachbarobjekten oder unzuverlässige Reflexionen auszuschließen.

2. **Welche Struktur haben die Messpunkte dieses Gebäudes?** Lokales Clustering, das verschiedene Reflexionszonen erkennt (z.B. Dach, Fassade, Balkon) – und Outlier identifiziert, die keinem Cluster zuordenbar sind.

3. **Wie bewegt sich dieses Gebäude?** Ein Bewegungs-Score pro Gebäude, der auf den zuverlässigen Messpunkten basiert und eine Konfidenzaussage ermöglicht.

4. **Ist diese Bewertung konsistent?** Kreuzvalidierung zwischen Ascending- und Descending-Track als unabhängige Qualitätskontrolle.

---

## Phasenplanung

### Phase 1 – Fundament (aktuell)

Eine funktionsfähige Python-Pipeline, die für den Raum Salzburg das lokale Gebäude-Clustering mit Outlier-Erkennung umsetzt.

Erwartetes Ergebnis: Für ein Gebäude können die zugeordneten InSAR-Punkte geladen, in Cluster eingeteilt und Outlier markiert werden. Die Ergebnisse sind visuell überprüfbar und plausibel. Der ASC/DSC-Track-Vergleich dient als erste Validierungsschicht. Es existiert ein dokumentiertes Iterationsprotokoll über Modellentscheidungen und Parameteranpassungen.

Phase 1 darf pragmatisch mit harten Regeln (z.B. Kohärenz-Schwellwerten) arbeiten, um die Zusammenhänge in den Daten zu verstehen – aber diese müssen klar isoliert und dokumentiert sein.

### Phase 2 – Scoring und Konfidenz

Aggregation der Clustering-Ergebnisse zu einem Gebäude-Bewegungs-Score mit Konfidenzintervall. Zielaussage: „Gebäude X hat eine Senkung von Y mm/a mit Z% Konfidenz." Integration der 2D-Dekomposition (Zerlegung der LOS-Messungen in vertikale und horizontale Komponenten) für Gebäude, bei denen beide Tracks verfügbar sind. Differenzielle Bewegungsanalyse innerhalb eines Gebäudes (z.B. eine Seite senkt sich, die andere ist stabil – ein typischer Rissindikator).

### Phase 3 – Skalierung und Generalisierung

Überführung der Pipeline von Salzburg auf weltweite Anwendbarkeit. Systematische Ablösung harter Regeln durch datengetriebene, adaptive Mechanismen. Ziel: Die Pipeline funktioniert auf einem neuen Gebiet ohne manuelle Schwellwert-Anpassung. Integration zusätzlicher Datenquellen (ältere Prozessierungszeiträume für längere Zeitreihen, Terrain-Modelle, ggf. In-situ-Referenzdaten wo verfügbar).

---

## Datenbasis

Die Pipeline arbeitet auf folgender Datenbasis (vollständig im Repository vorhanden):

**InSAR-Bewegungsdaten:** ~550.000 Messpunkte über Stadt Salzburg, zwei unabhängige Tracks (ASC/DSC), jeweils ~90 Zeitschritte über 3 Jahre (April 2022 – März 2025). Pro Punkt: Geschwindigkeit, Beschleunigung, Kohärenz, Höhe, saisonale Parameter, Einfallswinkel, vollständige Verschiebungszeitreihe.

**InSAR-Amplitudendaten:** Rückstreuintensitäten für beide Tracks, als Indikator für Reflexionsstabilität nutzbar.

**Gebäudedaten:** ~57.000 GBA-Gebäude und ~49.000 OSM-Gebäude, jeweils mit Polygon-Geometrie. Zusätzlich der Global Building Atlas (TU München) mit weltweiten Gebäudehöhen.

**Verknüpfungen:** InSAR-Punkte sind zu ~87% mit Gebäuden verknüpft (via spatial matching). Terrain-Kontext (SRTM, 25m Auflösung) liegt für alle Punkte und Gebäude vor.

---

## Erfolgskriterien

Die Pipeline ist erfolgreich, wenn:

**Plausibilität:** Bei manueller Inspektion von Gebäuden mit bekanntem Verhalten (z.B. Riedenburg, U-Bahn-Baugebiete Wien) liefert das Clustering nachvollziehbare Ergebnisse – Outlier werden erkannt, Cluster entsprechen physikalisch sinnvollen Gebäudezonen.

**ASC/DSC-Konsistenz:** Bei stabilen Gebäuden in ebenem Gelände liegt die Differenz zwischen Ascending- und Descending-Bewertung im Bereich von unter 1 mm/a (Referenz: Schloss Mirabell im Meeting mit 0.6 mm/a Differenz).

**Robustheit bei wenigen Punkten:** Auch bei Gebäuden mit nur 5–10 Messpunkten liefert die Pipeline sinnvolle Ergebnisse (kein Kollabieren des Clustering, keine Übersensitivität).

**Nachvollziehbarkeit:** Jede Designentscheidung, jeder Parameterwechsel und jede Iteration ist dokumentiert und begründet.

---

## Einordnung und Mehrwert

AUGMENTERRA verarbeitet bereits heute hunderte Millionen InSAR-Messpunkte und ordnet sie Bauwerken zu. Die Qualität dieser Zuordnung und die Zuverlässigkeit der daraus abgeleiteten Bewegungsbewertungen ist der zentrale Differenzierungsfaktor am Markt.

Dieses Projekt adressiert die „letzten fünf Prozent" – die systematische Trennung zuverlässiger von unzuverlässigen Messpunkten, die bisher manuell oder über einfache Filter erfolgt. Eine funktionierende ML-Pipeline hierfür hat direkten Einfluss auf die Qualität des AUGMENTERRA Observer und damit auf die Entscheidungsgrundlagen, die Gebäudeeigentümer, Kommunen und Versicherungen erhalten.
