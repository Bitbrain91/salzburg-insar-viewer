# Meeting-Zusammenfassung (19.02.2026)

## Ziele  
- Aufbau eines soliden Frameworks zur Visualisierung und Analyse von InSAR-Datenpunkten.  
- Entwicklung und Validierung von Machine-Learning-Modellen zur Qualitätsbewertung von Bewegungsdaten auf Gebäudeebene.  
- Verbesserung der Datenauswertung durch lokale Clustering- und Outlier-Detektion.  
- Einrichtung eines zentralen Informations- und Dokumentations-Boards (Monday) für Projektressourcen und Daten.  
- Etablierung eines regelmäßigen, monatlichen Meeting-Turnus.

## Fachliche Kernthemen  
- Nutzung des Global Building Atlas (Open Source) mit Gebäudehöhen-Daten zur Verbesserung der Gebäudebasisdaten.  
- Unterschiedliche Verarbeitungswege für S-Sending und D-Sending Satellitendaten und deren Validierung.  
- Lokale Clusterbildung auf Gebäudeebene, um Anomalien (Outlier) in Punktmessungen zu identifizieren und zu filtern.  
- Ziel einer Verlässlichkeitsbewertung ("Reliability Score") neben dem Bewegungsindex (Motion Score) für Endkunden.  
- Nutzung von Boden-In-situ-Messdaten (z.B. Stadt Wien) als Ground Truth zur Kalibrierung und Validierung.  
- Herausforderungen bei der Datengenauigkeit durch heterogene Faktoren wie Geländeneigung, Schneebedeckung, Reflexionen, bauliche Strukturen (z.B. Wintergärten).  
- Statistische Auswertung von Zeitreihen über mehrjährige Zeiträume (3 Jahre Datenstapel) zur Robustheit der Qualitätsparameter.  
- Diskussion möglicher Einflussgrößen wie Höhenunterschiede der Gebäudepunkte und Nutzung von Geländemodellen für bessere Zuordnung.

## Entscheidungen  
- Entwicklung eines besseren React-basierten Tools zur flüssigeren Datenvisualisierung statt Streamlit.  
- Integration des Global Building Atlas-Datensatzes lokal für Salzburg.  
- Einrichtung eines Monday-Boards als zentrales Ablage- und Informationsregister für unsere gemeinsamen Projektdaten und Dokumentationen.  
- Monatliche Meetingserie, erstes Treffen: 19. März 2026, bevorzugter Wochentag Donnerstag.  
- Nutzung von S-Sending und D-Sending-Daten vorerst aus der gleichen Zeitperiode für Validierungen.  
- Fokus auf Gebäudeebene als Basis für Clustering, zunächst mit Mindestanzahl von ca. 5 Messpunkten pro Gebäude-Track.  
- Implementierung von Methoden zur Vergleichsanalyse (Median, Mittelwert, Varianz) und Kombination von Messdaten aus verschiedenen Blickrichtungen.

## Offene Punkte  
- Abklärung der kommerziellen Nutzungsrechte für Global Building Atlas Daten noch offen.  
- Prüfung und Validierung der Hypothese, dass höhergelegene Messpunkte qualitativ besser und aussagekräftiger sind.  
- Konkrete Definition der Filter- und Regelwerke für Outlier-Detektion (Ground Truth-Einsatz).  
- Klärung des Zugangs für Reini und andere Teammitglieder zu vorhandenen Observer-Plattformen.  
- Erarbeitung der Methodik zur Verknüpfung und Gewichtung von S-Sending und D-Sending Messdaten zur Reduktion von Varianz und Ausreißern.  
- Erarbeitung lokaler, gebäudespezifischer Buffergrößen ggf. höhenabhängig.  

## Nächste Schritte  
- Reini richtet das Monday-Board ein, Zugänge werden verteilt und beim nächsten Meeting besprochen.  
- Reini sendet Link und Paper zum Global Building Atlas Datensatz sowie Zugang zur Observer-Plattform für Salzburg.  
- Markus und Team prüfen existierende Regelwerke zur Datenfilterung und stellen relevante In-situ-Daten nach Klärung zur Verfügung.  
- Vorbereitung der ML-Algorithmen für lokale Clusteringaufgaben mit Fokus auf Outlier-Detection auf Gebäudeebene.  
- Planung und Start der monatlichen Meetings ab 19.03.2026.  
- Bei Bedarf kurzfristige Telefonate zur Abstimmung.

---

**Ende der Zusammenfassung**
