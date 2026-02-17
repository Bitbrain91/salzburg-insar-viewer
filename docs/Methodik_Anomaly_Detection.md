# Methodik: Anomaly Detection für InSAR-Messpunkte Salzburg

**Stand:** Februar 2026
**Kontext:** ~550.000 PSI-Messpunkte (Sentinel-1, Tracks 44/95, April 2022 - März 2025), keine Ground-Truth-Labels verfügbar.

---

## Ausgangslage und Kernproblem

Die InSAR-Daten der Stadt Salzburg umfassen rund 550.000 Messpunkte aus zwei Satellitenüberflügen (Ascending Track 44, Descending Track 95). Jeder Punkt trägt eine Reihe von Attributen: mittlere Geschwindigkeit, Kohärenz, Beschleunigung, saisonale Amplitude, Höhe, Einfallswinkel sowie jeweils ~90 Verschiebungszeitreihenwerte und für einen großen Teil der Punkte Amplituden-Zeitreihenwerte über drei Jahre.

Etwa 84% der Punkte sind stabil (|Geschwindigkeit| <= 2 mm/Jahr). Die verbleibenden 16% zeigen Bewegung, doch nicht jede Bewegung ist eine echte Anomalie -- und nicht jeder stabil erscheinende Punkt ist tatsächlich zuverlässig. Die zentrale Frage lautet: **Welche Punkte verhalten sich inkonsistent zu ihrer Nachbarschaft, ihrem Gebäude oder dem gegenüberliegenden Track?**

Da keine gelabelten Trainingsdaten existieren, setzen wir konsequent auf unüberwachte Verfahren. Die Validierung erfolgt über physikalische Konsistenzprüfungen (Ascending vs. Descending), synthetische Anomalie-Injektion und Reproduzierbarkeitsanalysen.

---

## Methodische Leitidee

Ein einzelner Messpunkt ist nie isoliert zu bewerten. Seine Qualität ergibt sich aus dem Zusammenspiel mehrerer Perspektiven:

1. **Statistische Perspektive:** Weichen die Punktattribute signifikant von der Verteilung aller Punkte im selben Track ab?
2. **Zeitliche Perspektive:** Zeigt die Verschiebungs- oder Amplitudenzeitreihe Brüche, Rauschen oder Trends, die physikalisch unplausibel sind?
3. **Räumliche Perspektive:** Verhält sich der Punkt konsistent zu seinen Nachbarn (gleiche Geschwindigkeit, ähnliche Kohärenz)?
4. **Cross-Track-Perspektive:** Stimmen Ascending und Descending überein, wenn man die Blickrichtungsdifferenz herausrechnet?
5. **Domänenwissen:** Verstoßen harte physikalische Grenzen (z.B. extrem niedrige Kohärenz), die ein statistisches Modell allein nicht kennt?

Jede Phase des Projekts erweitert die Abdeckung dieser Perspektiven.

---

## Phase 1: Robuste tabellarische Detektion

### Ziel

Ein produktionsfähiges Anomaly-Scoring auf Basis bewährter, interpretierbarer Methoden. Der Output ist ein kontinuierlicher Anomaly Score pro Punkt, ein Quality Score, ein Label (normal / suspect / outlier) sowie run-level Evaluationsmetriken.

### Feature Engineering

Bevor ein Modell trainiert wird, werden die Rohdaten in informative Features überführt. Fünf Feature-Provider liefern jeweils eine spezifische Perspektive:

**Point Static** -- extrahiert die direkt verfügbaren Punktattribute (velocity, velocity_std, coherence, acceleration, season_amp, incidence_angle, eff_area, amp_mean, amp_std, height). Diese Werte liegen bereits vor und erfordern nur Normalisierung. Sie beschreiben den Punkt in seiner Grundcharakteristik.

**Timeseries** -- aggregiert die ~90 Verschiebungswerte pro Punkt zu fünf statistischen Kennzahlen:

| Feature | Beschreibung | Anomalie-Signal |
|---------|-------------|-----------------|
| ts_slope | Linearer Trend der Zeitreihe | Beschleunigung / Verlangsamung über die Beobachtungsperiode |
| ts_residual_std | Streuung der Residuen nach Trendabzug | Hohes Rauschen = instabiler Streuer |
| ts_max_abs_delta | Maximale Einzelschrittänderung | Plötzlicher Sprung = möglicher Phasenfehler |
| ts_roughness | Mittlere absolute Differenz aufeinanderfolgender Werte | Unruhige Zeitreihe ohne klaren Trend |
| ts_missing_rate | Anteil fehlender Messpunkte | Lückenhafte Beobachtung = geringere Verlässlichkeit |

Diese Features komprimieren die temporale Komplexität auf tabellarische Werte, die von klassischen ML-Verfahren verarbeitet werden können.

**Amplitude** -- analog zur Verschiebungszeitreihe, aber auf Basis der SAR-Signalstärke:

| Feature | Beschreibung | Anomalie-Signal |
|---------|-------------|-----------------|
| amp_ts_mean | Mittlere Amplitude über die Zeit | Generelle Reflektivität des Streuers |
| amp_ts_std | Streuung der Amplitudenwerte | Instabiler Reflektor (z.B. Vegetation, temporäres Objekt) |
| amp_ts_cv | Variationskoeffizient (std/mean) | Normiertes Maß für Signalinstabilität |
| amp_ts_spike_rate | Anteil der Werte > 2 Standardabweichungen | Vereinzelte starke Reflexionsänderungen |

Amplitude ist kein Bewegungssignal, sondern ein Qualitätsindikator. Ein Punkt mit stark schwankender Amplitude reflektiert das Radarsignal unzuverlässig -- die daraus abgeleitete Verschiebung ist dann ebenfalls fragwürdig.

**Spatial Context** -- vergleicht jeden Punkt mit seinen k nächsten Nachbarn:

| Feature | Beschreibung | Anomalie-Signal |
|---------|-------------|-----------------|
| local_density | Anzahl Nachbarn in definiertem Radius | Isolierte Punkte haben weniger Kontext-Validierung |
| local_vel_median | Mediangeschwindigkeit der Nachbarschaft | Referenzwert für den lokalen Bewegungstrend |
| local_vel_mad | Median Absolute Deviation der Nachbar-Geschwindigkeiten | Streuung im lokalen Kontext |
| local_vel_robust_z | Robuster Z-Score des Punkts vs. Nachbarschaft | Kern-Anomalie-Feature: wie stark weicht der Punkt ab? |
| local_coh_median | Mediankohärenz der Nachbarschaft | Kontext für die eigene Kohärenz |

Der räumliche Kontext ist methodisch entscheidend: Ein Punkt mit -10 mm/Jahr Geschwindigkeit in einem Gebiet, das sich homogen mit -9 mm/Jahr senkt, ist unauffällig. Derselbe Punkt in einem stabilen Gebiet ist hochverdächtig.

**Cross-Track Consistency** -- vergleicht Ascending- und Descending-Messungen am selben Ort:

| Feature | Beschreibung | Anomalie-Signal |
|---------|-------------|-----------------|
| counterpart_found | Existiert ein Gegenpart im anderen Track? | Fehlender Gegenpart = keine Cross-Validierung möglich |
| cross_track_vel_diff_norm | Normierte Geschwindigkeitsdifferenz nach LOS-Korrektur | Hohe Differenz = physikalische Inkonsistenz |
| cross_track_consistency_score | Gesamtscore der Übereinstimmung | Zusammenfassung der Cross-Track-Plausibilität |

Dieses Feature nutzt eine physikalische Grundeigenschaft: Dasselbe Gebäude wird aus zwei Blickrichtungen beobachtet. Nach Berücksichtigung der LOS-Geometrie sollten die Messungen innerhalb eines physikalisch plausiblen Rahmens konsistent sein. Vollständige Übereinstimmung ist nicht immer zu erwarten (z.B. horizontale Bewegungsanteile, unterschiedliche Scatterer-Geometrie, unvollständige Paarung). Tun sie das nicht, liegt ein Qualitätsproblem an mindestens einem der beiden Punkte vor.
Cross-Track-Konsistenz wird als probabilistisches Qualitätsmerkmal verwendet, nicht als harte Wahr/Falsch-Bedingung.

### Detektoren

Drei Detektoren verarbeiten die Feature-Matrix unabhängig voneinander. Sie sind bewusst methodisch divers gewählt, um verschiedene Anomalie-Typen abzudecken:

**Isolation Forest** ist das Kernmodell. Das Verfahren isoliert Datenpunkte durch zufällige Partitionen im Feature-Raum. Anomalien lassen sich schneller isolieren als normale Punkte, weil sie in dünn besetzten Regionen liegen. Die Methode ist nativ unüberwacht, skaliert linear mit der Datenmenge, braucht keine Verteilungsannahmen und hat sich in der Literatur als Standardverfahren für tabellarische Anomaliedetektion etabliert. Mit ~550.000 Punkten und ~25 Features bewegt sich der Datensatz im idealen Anwendungsbereich.

**Local Outlier Factor (LOF)** ergänzt den Isolation Forest um eine dichtebasierte Perspektive. LOF vergleicht die lokale Dichte eines Punkts mit der seiner Nachbarn im Feature-Raum. Punkte in normalen Clustern haben ähnliche Dichte wie ihre Nachbarn; Anomalien liegen in Regionen mit deutlich geringerer Dichte. LOF ist optional aktivierbar, da die Laufzeit bei großen Datensätzen deutlich höher als beim Isolation Forest ausfallen kann und stark von der kNN-Implementierung abhängt.

**Rule Gate** ist ein deterministischer Scorekanal, der harte Domänenregeln als Anomalie-Boost codiert:

- Kohärenz < 0.30 (unterhalb der PSI-Zuverlässigkeitsgrenze)
- velocity_std > 95. Perzentil des Tracks (ungewöhnlich hohe Messunsicherheit)
- ts_max_abs_delta > 99. Perzentil des Tracks (extremer Zeitreihensprung)
- amp_ts_cv > 95. Perzentil des Tracks (instabiler Reflektor)
- Vorhandener Cross-Track-Partner mit hoher Geschwindigkeitsdifferenz

Diese Regeln fangen Fälle ab, die statistische Modelle unter Umständen nicht priorisieren, weil sie im hochdimensionalen Feature-Raum nicht extrem erscheinen, aber fachlich klar als problematisch gelten. Der Rule Gate liefert einen eigenen Score-Kanal und keine harte Ausschlusslogik -- seine Bewertung fließt gewichtet in die Fusion ein.

### Score-Kalibrierung und Fusion

Jeder Detektor liefert einen Rohscore auf einer willkürlichen Skala. Die Kalibrierung transformiert diese Scores per robuster Quantilskalierung auf den Bereich [0, 1], sodass sie vergleichbar und kombinierbar werden.

Das Ensemble fusioniert die kalibrierten Scores per gewichteter Summe. Die Gewichte sind konfigurierbar, der Default priorisiert Isolation Forest als Kernsignal, ergänzt um LOF und Rule Gate.

Der finale **Quality Score** entsteht durch Verschneidung von Anomaly Score, Cross-Track Consistency und Signalqualität (Kohärenz, Amplitudenstabilität). Die Label-Vergabe (normal / suspect / outlier) erfolgt über konfigurierbare Schwellwerte auf diesem Score.

### Evaluation ohne Ground Truth

Da keine Labels existieren, nutzen wir drei komplementäre Validierungsstrategien:

**Ascending/Descending-Konsistenz** prüft auf Run-Ebene, ob die Anomalie-Scores beider Tracks im selben Gebiet korrelieren. Wenn ein Punkt im Ascending Track als anomal erkannt wird, sollte ein räumlich gepaarter Gegenpart im Descending Track eine kompatible Auffälligkeit oder zumindest ein konsistentes physikalisches Muster zeigen. Fehlt ein valider Gegenpart, wird dies als geringere Evidenz gewertet, nicht als Widerspruch. Metriken: Übereinstimmungsrate, mediane Score-Differenz, gepaarte Abdeckung.

**Synthetische Anomalie-Injektion** pflanzt kontrollierte Störungen in die Daten ein (Sprünge, Rauscherhöhung, Trendbrüche) und prüft, ob die Pipeline sie wiederfindet. Das gibt eine untere Schranke für die Detektionsfähigkeit bei bekannten Anomalie-Typen.

**Stabilitätsanalyse** prüft, ob die Ergebnisse bei leichten Parameteränderungen oder auf verschiedenen BBox-Ausschnitten stabil bleiben. Ein gutes Modell sollte keine dramatisch unterschiedlichen Ergebnisse liefern, wenn der Ausschnitt leicht verschoben wird.

### Erwartungen Phase 1

- Jeder Punkt erhält einen Score, der fachlich interpretierbar ist (welche Features treiben den Score?).
- Die synthetische Injektion wird signifikant besser als zufälliges Raten erkannt.
- Die Asc/Desc-Konsistenzrate liegt spürbar über dem Ausgangswert ohne Anomaly-Filtering.
- Das System läuft stabil auf beliebigen BBox-Ausschnitten des Salzburg-Datensatzes.

---

## Phase 2: Temporale Tiefe und Gebäudeaggregation

### Ziel

Die tabellarischen Features aus Phase 1 komprimieren Zeitreihen auf wenige Kennzahlen -- dabei gehen nichtlineare und temporale Muster verloren. Phase 2 ergänzt einen lernenden Zeitreihen-Kanal, der solche Muster direkt aus den Rohdaten extrahiert, und aggregiert die Punkt-Scores auf Gebäudeebene.

### LSTM Autoencoder

Ein Long Short-Term Memory Autoencoder lernt, die normierte Verschiebungszeitreihe eines Punkts zu rekonstruieren. Das Modell wird ausschließlich auf dem Gesamtdatensatz trainiert (self-supervised: die Zeitreihe selbst ist Label und Input). Da ~84% der Punkte stabil sind, lernt der Autoencoder primär das "normale" temporale Verhalten. Punkte, deren Zeitreihe schlecht rekonstruiert wird (hoher Rekonstruktionsfehler), weichen von diesem Normalverhalten ab.

Warum LSTM statt einfacherem Ansatz? Die Verschiebungszeitreihen haben ~90 Zeitschritte mit potentiell saisonalen Mustern, Trends und abrupten Änderungen. Ein LSTM kann diese zeitlichen Abhängigkeiten modellieren, die ein tabellarisches Feature wie ts_roughness nur summarisch erfasst. Insbesondere Muster wie "langsame Beschleunigung gefolgt von plötzlichem Stillstand" oder "schleichender Trendwechsel" sind aus aggregierten Statistiken schwer zu extrahieren.

Der Rekonstruktionsfehler wird als zusätzlicher Scorekanal in das Ensemble eingespeist. Die Fusion-Gewichte werden erweitert, sodass der AE-Kanal das tabellarische Ensemble ergänzt, aber nicht dominiert.

### Erweiterte Fusion

Die Ensemble-Gewichte werden dynamisch gestaltet: Wenn für einen Punkt kein Cross-Track-Partner existiert, wird das Cross-Track-Signal heruntergewichtet statt als Nullwert eingespeist. Wenn der AE-Kanal für einen Punkt keine Zeitreihe hat (fehlende Daten), greift ein Fallback auf das rein tabellarische Scoring.

### Gebäude-Risikoklassen

Die punktweisen Anomaly Scores werden auf Gebäudeebene aggregiert. Für jedes Gebäude mit zugeordneten InSAR-Punkten entsteht ein Risikoprofil:

| Aggregat | Beschreibung |
|----------|-------------|
| n_points | Anzahl zugeordneter Messpunkte (Datenbasis) |
| outlier_ratio | Anteil der Punkte mit Label "outlier" |
| median_quality | Medianer Quality Score aller zugeordneten Punkte |
| max_abs_vel | Maximale Absolutgeschwindigkeit am Gebäude |
| intra_building_variance | Streuung der Geschwindigkeiten innerhalb des Gebäudes |

Aus diesen Werten wird eine Risikoklasse A-E abgeleitet (A = unauffällig, E = hoher Handlungsbedarf). Die Klassengrenzen sind konfigurierbar und orientieren sich an den Verteilungen im Gesamtdatensatz.

### Erwartungen Phase 2

- Der AE-Kanal verbessert die Erkennung temporaler Anomalien (Trendbrüche, schleichende Drifts), die mit rein tabellarischen Features nicht zuverlässig erfasst werden.
- Mindestens eine Kernmetrik (Injektions-Recall oder Asc/Desc-Konsistenz) verbessert sich messbar gegenüber Phase 1.
- Die Gebäude-Risikoklassen sind fachlich plausibel und reproduzierbar.

---

## Phase 3: Repräsentationslernen und Graph-Kontext

### Ziel

Bisher werden räumliche Beziehungen zwischen Punkten nur über aggregierte Nachbarschaftsstatistiken erfasst (Phase 1, spatial_context). Phase 3 modelliert diese Beziehungen direkt: durch gelernte Zeitreihen-Repräsentationen und Graph-basierte Kontextvalidierung.

### Self-Supervised Embeddings

Statt handgefertigter Zeitreihen-Features (ts_slope, ts_roughness, ...) lernt ein Self-Supervised-Modell (z.B. TS2Vec) kompakte Vektorrepräsentationen der Verschiebungszeitreihen. Diese Embeddings fangen sowohl bekannte als auch bisher unerkannte temporale Muster ein. Auf den Embeddings wird ein leichter Anomalie-Detektor trainiert (Isolation Forest oder One-Class SVM), der Punkte mit ungewöhnlichen Zeitreihen-Repräsentationen identifiziert.

Der Vorteil gegenüber den handgefertigten Features: Das Modell muss nicht wissen, welche temporalen Muster relevant sind -- es lernt die relevante Repräsentation selbst. Der Nachteil: geringere Interpretierbarkeit. Daher wird dieser Kanal als Ergänzung, nicht als Ersatz für die tabellarischen Features eingesetzt.

### Graph Neural Networks

Die InSAR-Punkte bilden eine natürliche räumliche Struktur: benachbarte Punkte auf demselben Gebäude oder im selben Gebiet sollten ähnliches Bewegungsverhalten zeigen. Ein Graph Neural Network modelliert diese Beziehung direkt.

Konstruktion: Jeder Punkt wird zum Knoten. Kanten entstehen durch k-Nearest-Neighbors im geographischen Raum oder durch gemeinsame Gebäudezuordnung. Die Knotenfeatures sind die bestehenden Feature-Vektoren. Ein Graph Autoencoder lernt, diese Struktur zu rekonstruieren -- Punkte, die schlecht in ihren lokalen Graph-Kontext passen, erhalten hohe Rekonstruktionsfehler.

Dies ist methodisch die konsequente Weiterentwicklung des spatial_context-Providers aus Phase 1: Statt fester Statistiken (Median, MAD) lernt das GNN, welche räumlichen Beziehungen relevant sind.

### Multi-Model Governance

Mit drei Modellgenerationen (tabellarisch, AE, GNN/SSL) im System braucht es eine systematische Vergleichsstruktur. Separate Pipeline-Runs mit unterschiedlichen Modellkonfigurationen werden über standardisierte Metriken verglichen. Nur Modelle, die einen nachweisbaren Mehrwert gegenüber der vorherigen Phase zeigen, werden in den Default-Modellsatz übernommen. Ein Fallback auf Phase-2-Modelle bleibt jederzeit möglich.

### Erwartungen Phase 3

- Die gelernten Repräsentationen finden Anomalietypen, die handgefertigte Features nicht abdecken.
- Das GNN verbessert die räumliche Konsistenz der Anomalie-Scores (benachbarte Punkte werden kohärenter bewertet).
- Der Mehrwert gegenüber Phase 2 ist messbar, aber möglicherweise geringer als der Sprung von Phase 1 zu Phase 2 -- die Basisarbeit ist dort bereits geleistet.
- Die zusätzliche Komplexität (PyTorch-Dependency, längere Trainingszeiten) muss den Mehrwert rechtfertigen. Phase 3 bleibt optional aktivierbar.

---

## Zusammenspiel der Phasen

```
Phase 1                          Phase 2                    Phase 3
  Tabellarische Features    ──>    + LSTM-AE Kanal     ──>    + SSL Embeddings
  IF + LOF + Rule Gate      ──>    + AE Reconstruction ──>    + Graph Autoencoder
  Gewichtetes Ensemble      ──>    + Dynamische Fusion  ──>    + Multi-Model Governance
  Punkt-Scores              ──>    + Gebäude-Risiko     ──>    + Gelernte Repräsentationen
  Asc/Desc + Injection      ──>    + Phase-Vergleich    ──>    + Drift/Robustheit
```

Jede Phase erweitert das System, ohne die vorherige zu ersetzen. Die tabellarischen Detektoren aus Phase 1 bleiben auch in Phase 3 aktiv -- sie werden durch lernende Kanäle ergänzt, nicht abgelöst. Der Ensemble-Ansatz stellt sicher, dass ein schlecht performender neuer Kanal das Gesamtergebnis nicht verschlechtert, solange die Fusion-Gewichte korrekt kalibriert sind.

---

## Warum diese Methoden?

| Entscheidung | Begründung |
|---|---|
| Isolation Forest als Kernmodell | Nativ unüberwacht, skaliert auf 550k Punkte, robust ohne Verteilungsannahmen, mit gut integrierbarer Explainability (z.B. Feature-Importance; SHAP optional je nach finalem Modellset) |
| Rule Gate als eigener Kanal | Domänenwissen ist zu wertvoll, um es nur als Feature zu codieren -- explizite Regeln fangen bekannte Problemmuster zuverlässig ab |
| Cross-Track als Feature UND Evaluation | Auf Punktebene ein wertvolles Modellsignal; auf Run-Ebene die stärkste verfügbare Validierung ohne Ground Truth |
| LSTM-AE erst in Phase 2 | Braucht PyTorch als Dependency und sorgfältige Hyperparameter-Abstimmung; die tabellarischen Features decken den Großteil ab |
| GNN erst in Phase 3 | Hohe Implementierungskomplexität, Graphkonstruktion ist kritischer Designparameter, Mehrwert muss gegen Phase 2 nachgewiesen werden |
| Ensemble statt Einzelmodell | Kein einzelnes Verfahren deckt alle Anomalietypen ab; die Fusion verschiedener Perspektiven ist robuster als jeder Einzeldetektor |
| Kein supervised Ansatz | Keine Labels vorhanden; Pseudo-Labeling über Asc/Desc-Konsistenz ist ein Proxy, ersetzt aber kein vollständiges Ground-Truth-Set |
