# Lokales InSAR‑Clustering auf Gebäudeebene in Salzburg

## Ausgangslage und Randbedingungen aus den Anhängen

Euer Datenbestand ist für „lokales“ (gebäudeweises) Lernen gleichzeitig sehr attraktiv und methodisch tückisch: Ihr habt sehr viele Messpunkte stadtweit, aber pro Gebäude oft nur wenige Punkte. Konkret liegen für die Stadt Salzburg **550.764** InSAR‑Bewegungspunkte vor, aufgeteilt auf **zwei Tracks** (Track 44 als **ASC** und Track 95 als **DSC**) mit je rund **~90 Zeitstempeln über ~3 Jahre** (2022–2025) und sehr ähnlichem Einfallswinkel um ~38,5°. fileciteturn0file2

Die Messpunkt‑Attribute sind (für ML) ungewöhnlich reichhaltig: Neben klassischen Qualitäts‑ und Kinematikparametern (`coherence`, `vel`, `v_stdev`, `acc`, saisonale Parameter …) enthält der Datensatz die **vollständige Verschiebungszeitreihe** als `dYYYYMMDD`‑Felder sowie Geometrieparameter wie `incidence_angle` und die **Reflexionshöhe** `height` inkl. `h_stdev`. fileciteturn0file1 fileciteturn0file2  
Wichtig ist dabei die physikalische Einschränkung: Bewegung wird **nur entlang der Sichtlinie (LOS)** gemessen; Komponenten senkrecht zur LOS sind unsichtbar. fileciteturn0file1

Für Gebäudezuordnung und Kontext stehen mehrere Ebenen zur Verfügung: Die bestehende Verknüpfung (`insar_to_gba`, `insar_to_osm`) erreicht **~87% Abdeckung** der Punkte (Methoden `within` und `nearest`) sowie zehntausende Gebäude aus **GBA** (inkl. Höhen) und **OSM**. Zusätzlich existiert ein flächendeckender **Terrain‑Kontext** (SRTM, ~25,82 m) pro Punkt und pro Gebäude. fileciteturn0file2  
Außerdem sind Amplitudenzeitreihen (AMP‑GPKGs) in der Pipeline bereits so aufbereitet, dass pro Punkt u. a. `amp_mean` und `amp_std` verfügbar sind – wertvoll für Qualitätsbeurteilung jenseits von Kohärenz. fileciteturn0file2

Aus dem AUGMENTERRA‑Meeting ergeben sich klare Zielkriterien und Hypothesen: Das System soll **lokal pro Gebäude** robuste Cluster/„gute Punktmengen“ finden, **Outlier** identifizieren (auch bei nur 2–5 Punkten), eine **Verlässlichkeitskennzahl** ergänzend zum Motion‑Score liefern und ASC/DSC als **unabhängigen Validierungsmechanismus** nutzen (bei vertikaler Senkung in ebener Fläche sollten beide Geometrien konsistent sein). fileciteturn0file0  
Ebenso explizit im Meeting: **Höhen‑Hypothese** (Bodenpunkte potenziell schlechter wegen Störreflektoren), Wunsch nach **Höhenschichtung (Dach/Mitte/Boden)**, und ein **adaptiver Gebäude‑Buffer** abhängig von Gebäudehöhe & Einfallswinkel (Beispiel Strommast 80 m → 40 m Buffer). fileciteturn0file0

## Methoden für Clustering und Outlier Detection bei wenigen Punkten

Eure Kernanforderungen (n pro Gebäude häufig < 20, unbekannte Clusterzahl, gleichzeitige Outlier‑Erkennung, Robustheit ohne „alles ist Outlier“) passen am besten zu **noise‑aware** und/oder **robust‑statistischen** Verfahren. Ein globaler Isolation Forest scheitert konzeptionell oft, weil er lokale, objektgebundene Strukturen (Gebäudegeometrie + Reflexionshöhe + Zeitreihenmuster) nicht modelliert – genau eure Erfahrung. fileciteturn0file0

Für eure Randbedingungen lassen sich in der Literatur vier Familien als besonders relevant ableiten:

**Dichte‑basierte, noise‑aware Clusterer (HDBSCAN)**  
HDBSCAN ist attraktiv, weil es **keine Clusterzahl** vorgibt, „Noise“ explizit zulässt und damit Clustering + Outlier‑Markierung in einem Schritt liefert. Die Library dokumentiert explizit, dass HDBSCAN „noise aware“ ist (Punkte können **keinem Cluster** zugeordnet werden) und zusätzlich Outlier‑Scores unterstützt. citeturn0search14turn0search18  
Grenze: Bei extrem kleinen n (z. B. 2–5 Punkte) kann jede dichtebasierte Methode instabil werden (alles ein Cluster oder alles Noise), daher braucht ihr **Fallback‑Logik** für Kleinstgebäude.

**Modellbasierte Clusterer mit expliziter Outlier/Noise‑Komponente (robuste Mixturen / Trimming)**  
Hier sind besonders „Mixture + Outlier“‑Ansätze passend, weil sie statistisch sauber zwischen „Clusterstruktur“ und „Kontamination“ trennen. Beispiele:

- **OCLUST** („Outliers in Gaussian model‑based clustering“) ist explizit als **Trimming‑Verfahren** formuliert, das beim Clustering Outlier entfernt und die Outlier‑Anzahl nicht zwingend vorgeben muss. citeturn0search0turn9search6turn9search2  
- Mixturmodelle **mit Uniform‑Noise‑Komponente** werden als Klasse explizit für „robust clustering“ und „outlier identification“ diskutiert. citeturn17search2  
- Für „funktionale Daten“ (analog: Zeitreihen als Funktionen) sind **t‑Mixturen** interessant, weil heavy‑tail‑Komponenten Outlier weniger „übergewichten“; es gibt neuere Arbeiten, die Mixtures of multivariate t distributions explizit für funktionale Daten **mit Outliers** einsetzen. citeturn17search1turn17search13  

Stärken: Funktionieren – richtig regularisiert (wenige Features, Shrinkage/priors) – oft gut auch bei n~10–30; liefern probabilistische Zugehörigkeiten und Outlier‑Wahrscheinlichkeiten. Schwächen: In Python ist „OCLUST“ nicht Standard; ihr würdet entweder R‑Implementierungen nutzen oder „GMM + Noise‑Komponente“ selbst bauen (aber technisch gut machbar).

**Robust‑K‑Means‑Derivate mit simultaner Outlier‑Detektion (Trimmed/Robust K‑Means)**  
Robust Trimmed k‑means (RTKM) wird explizit als Methode vorgestellt, die **simultan clustert und Outlier identifiziert**. citeturn21view0  
Haken: k‑means braucht k oder zumindest eine k‑Suche. Für euch kann das trotzdem sinnvoll sein, wenn ihr die Clusterzahl physikalisch einschränkt (typisch 1–3 Cluster: Dach/Fassade/Boden) und k nur in {1,2,3} testet.

**Zeitreihen‑Clustering über Dimensionality Reduction (PCA/Embedding) + Clustering**  
Für InSAR‑Zeitreihen gibt es konkrete aktuelle Ansätze, die Zeitreihen zunächst per PCA reduzieren und dann clustern (z. B. PCA + k‑means für Mustererkennung in InSAR‑Zeitreihen). citeturn6view0turn18search16  
Zusätzlich gibt es gebäudebezogene PSI‑Literatur, die die **Deformationszeitreihen als hochdimensionalen Feature‑Space** interpretiert und dann Dimensionality Reduction + Clustering nutzt, um Gebäudeteile/substructures zu segmentieren. citeturn13view0turn10view0  
Das passt sehr gut zu eurer Datenlage (90 Zeitschritte/Track), weil ihr nicht nur `vel` clustern müsst, sondern „Muster“ (Sprünge, Saisonalität, Nichtlinearität) ausnutzen könnt.

**Konsequenz für eure Pipeline:** Es gibt kein einzelnes Verfahren, das bei n=2 genauso zuverlässig ist wie bei n=100. Die Literatur legt nahe, für Kleinst‑n **regelbasierte/robust‑statistische Fallbacks** zu kombinieren mit einem **noise‑aware Clusterer** (HDBSCAN oder Modell‑Mixturen) ab einer Mindestpunktzahl.

## InSAR‑spezifisches Gebäude‑Clustering: Zuordnung, adaptive Buffer, Höhenebenen

### Punkt‑zu‑Gebäude‑Zuordnung als dominanter Fehlerhebel

Sowohl eure Meeting‑Diskussion als auch die InSAR‑Literatur zeigen: Viele „Outlier“ auf Gebäudeebene sind in Wahrheit **falsch zugeordnete** Punkte (Layover/Geokodierung/Polygonfehler) oder Punkte, deren Reflexion nicht das Gebäude als Ganzes repräsentiert (z. B. Anbau, Terrasse, Straßenobjekte). fileciteturn0file0

Eine sehr relevante, aktuelle Blaupause ist ein Remote‑Sensing‑Paper (2024), das PS‑Punkte mit Gebäudekonturen matcht und explizit **building height + incidence angle → adaptive buffer** verwendet. Dort wird argumentiert, dass Side‑Looking‑Radar zu geometrischen Verzerrungen führt, die von Einfallswinkel und Gebäudehöhe abhängen; eine fixe Bufferdistanz (nur basierend auf SAR‑Auflösung) könne PS‑Punkte systematisch „verlieren“. citeturn4view0  
Der Ansatz nutzt (i) Vereinfachung der Gebäudeumrisse via Convex Hull, (ii) adaptive Buffer‑Formel, (iii) anschließend Nearest Neighbor + Höhendifferenz‑Checks, und (iv) eine Validierung über **ASC vs DSC**. citeturn4view0

Die physikalische Begründung für „Höhe × Einfallswinkel“ findet sich auch in Grundlagenarbeiten zu Building Layover: Layover‑Ausdehnung wächst mit **Gebäudehöhe** und hängt vom **Einfallswinkel** ab; zudem können Dach‑/Fassaden‑/Boden‑Beiträge in einem Pixel überlagern und die Interpretation erschweren. citeturn5view0

### Höhe als Clustering‑Dimension ist fachlich plausibel und implementierbar

Im Meeting wurde die Hypothese formuliert, dass **bodennahe Punkte** (Straße, Autos, Fußgänger) häufiger „schlechte“ Messpunkte liefern und dass die höchste Ebene (Dach) möglicherweise systematisch verlässlicher ist. fileciteturn0file0  
Euer Datensatz hat dafür ein sehr starkes Signal: Ihr habt `height` und `h_stdev` pro Messpunkt. fileciteturn0file1

Wichtig: Layover‑Literatur betont, dass InSAR‑Signale in urbanen Pixeln superponierte Beiträge von Boden/Wand/Dach enthalten können und dadurch „Höhenebenen“ tatsächlich gemischt sein können. citeturn5view0  
Das spricht dafür, Höhe nicht als „nice to have“, sondern als **zentrale Robustheitsachse** zu behandeln:

- **Höhenschichtung als Vor‑Clustering** (z. B. 1–3 Schichten) reduziert die Last der eigentlichen Cluster‑Methode und stabilisiert sie bei kleinen n.
- Kombiniert mit Gebäudehöhe (GBA) könnt ihr **relative Höhe** (z. B. `height_above_ground / building_height`) nutzen, um „Dach vs Fassade vs Boden“ stärker zu entkoppeln.

### Konkrete Buffer‑Strategie als Phase‑1‑Vorschlag

Da ihr bereits Building Heights (GBA) und pro Punkt `incidence_angle` habt fileciteturn0file1 fileciteturn0file2, könnt ihr den Paper‑Gedanken (adaptive Buffer) direkt als produktionsfähige Heuristik übersetzen – ohne aufwändige SAR‑Geometrie‑Reprojektion:

1) **Basis‑Buffer** zur Abdeckung reiner Geokodierungs-/Polygonfehler (Meter‑Bereich).  
2) **Höhen‑Term** proportional zur Gebäudehöhe, skaliert über den Einfallswinkel (weil die horizontale Komponente mit schräger Sicht zunimmt). Die 2024‑Arbeit modelliert genau diesen Zusammenhang in ihrer Buffer‑Formulierung und separiert Beiträge aus Auflösung, Höhenunsicherheit und Einfallswinkelvariation. citeturn4view0  
3) Optional (Phase 2): Look‑Direction‑anisotrope Buffer (Range‑Richtung stärker als Azimut), weil die Verzerrung richtungsabhängig ist; dieser „directionality“‑Aspekt wird im 2024‑Paper als Trennsignal bei überlappenden Buffern diskutiert. citeturn4view0

Das passt exakt zu eurer Meeting‑Anforderung („80 m Mast → 40 m Buffer“) als kalibrierbarer Sonderfall. fileciteturn0file0

## Feature‑Engineering für lokales Gebäude‑Clustering

Eure Attributbasis ist bereits ungewöhnlich ML‑freundlich, weil die SqueeSAR‑Prozessierung und MatchSAR‑Aufbereitung Zeitreihenparameter (Trend, Beschleunigung, Saisonalität) bereits „feature‑ready“ bereitstellt. fileciteturn0file1

### Feature‑Set, das für Phase 1 am informativsten ist

Für lokales Clustering/Outlier‑Filtering würde ich ein „kleines, robustes“ Kern‑Set empfehlen, das (a) Bewegungsverhalten, (b) Messgüte und (c) geometrische Plausibilität abdeckt:

- **Kinematik:** `vel`, `v_stdev`, `acc`, `a_stdev` (Trend, Unsicherheit, Nichtlinearität). fileciteturn0file1  
- **Saisonalität:** `season_amp`, `s_amp_std`, `season_phs`, `s_phs_std` (hilft, saisonale Störer vs. echte Trendbewegung zu trennen; im Handbuch explizit als harmonische Regression beschrieben). fileciteturn0file1  
- **Qualität:** `coherence` (aber nicht als alleinige Wahrheit), plus Scatterer‑Typ‑Proxy `eff_area` (DS‑Gewichtung). fileciteturn0file1  
- **Geometrie:** `height`, `h_stdev`, `incidence_angle` (und daraus abgeleitet: **relative Höhe** zur Gebäudehöhe sowie **height_layer**). fileciteturn0file1  
- **Amplitude‑Stabilität:** `amp_mean`, `amp_std` (oder abgeleitet `ADI = amp_std / amp_mean`) als zusätzlicher Stabilitätsindikator, weil PSI‑Literatur Amplitudenstabilität als PS‑Auswahlkriterium nutzt. fileciteturn0file2 citeturn16search0turn16search5

Was ich in Phase 1 bewusst **nicht** als primäre Clustering‑Features nehmen würde:

- `track`/`los` nicht als Feature, sondern als **Gruppierung** (ASC/DSC getrennt clustern, dann vergleichen), weil ihr ASC/DSC als unabhängige Validierung erhalten wollt. fileciteturn0file0  
- absolute `height` ohne Kontext: besser **relativ** (sonst vermischt ihr Stadtteil‑Topographie mit Gebäudeebenen).

### Zeitreihe direkt nutzen statt nur Aggregaten

Dass Zeitreihen direkt clustern können, ist nicht nur theoretisch möglich, sondern wird in aktueller InSAR‑Downstream‑Literatur als automatisierbarer Ansatz beschrieben: PCA‑basierte Reduktion der Zeitreihen zu wenigen Komponenten und anschließendes Clustering dient der Detektion räumlich‑zeitlich kohärenter Deformationsmuster. citeturn6view0turn18search16  
Für gebäudebezogene PSI‑Analyse wird explizit vorgeschlagen, Deformationszeitreihen als Punkte im hochdimensionalen Raum zu interpretieren und durch Dimensionality Reduction + Clustering „plausible Gebäudeteile“ zu segmentieren; zusätzlich wird „Reverse Geocoding“ in SAR‑Geometrie als Matching‑Verbesserung genannt. citeturn13view0turn10view0

**Praxis‑Empfehlung für euch (skalierbar, lokal, trotzdem stabil):**  
Trainiert **einmal pro Track** eine globale PCA/Autoencoder‑Repräsentation auf vielen Zeitreihen (nur Verschiebung `dYYYYMMDD`, evtl. z‑normalisiert), extrahiert z. B. 3–8 Komponenten pro Punkt, und nutzt diese Komponenten **zusammen mit** `vel/acc/season_*` als Clustering‑Features pro Gebäude. Das stabilisiert lokale Modelle, weil die Darstellung „gleichartig“ ist, aber die eigentliche Segmentierung bleibt lokal.

### Rolle der Amplitudenzeitreihen

Amplitude ist kein Bewegungsmaß, aber ein Qualitäts‑/Stabilitätsindikator: In PSI‑Kontext wird Amplitudenstabilität (z. B. Amplitude Dispersion Index) genutzt, um PS‑Kandidaten zu identifizieren bzw. zu verbessern. citeturn16search0turn16search5  
Eure Pipeline liefert bereits `amp_mean` und `amp_std`; daraus könnt ihr sehr günstig `ADI = amp_std / amp_mean` bilden und als Feature/Weight einsetzen. fileciteturn0file2  
Wichtig ist die korrekte Erwartung: In neueren Monitoring‑Arbeiten wird auch gezeigt, dass amplitude‑basierte Change‑Signale nicht zwingend mit „kohärenter“ Infrastrukturperiode zusammenfallen – d. h. Amplitude ist nützlich, aber muss gegen Phase/Coherence‑Indikatoren gegengeprüft werden. citeturn1search0

### Normalisierung/Standardisierung

Für eure Pipeline ist Feature‑Scaling nicht optional, sondern zentral: scikit‑learn dokumentiert, dass Standardisierung in vielen Estimators „common requirement“ ist und dass unskalierte Features Algorithmen dominieren können; gleichzeitig ist `StandardScaler` sensitiv gegenüber Outliers. citeturn20search0turn20search6  
Für euer Setting (Outlier sind Teil des Problems) spricht viel für:

- **RobustScaler/QuantileTransformer** (robust gegen Ausreißer) in der Feature‑Pipeline, insbesondere vor distanzbasierten Methoden (HDBSCAN, k‑means‑artige Verfahren). citeturn20search6  
- Track‑getrennte Skalierung (weil DSC/ASC leicht unterschiedliche Verteilungen haben können). fileciteturn0file2

## ASC vs. DSC als Validierung, ohne Tracks zu „verschneiden“

### Physikalische Basis und warum das als Qualitätsinstrument funktioniert

ASC und DSC sind unterschiedliche Aufnahmegeometrien; InSAR misst Bewegung in LOS‑Richtung, abhängig von Blickrichtung und Einfallswinkel. fileciteturn0file1  
Wenn ein Gebäude sich in einer ebenen Fläche überwiegend **vertikal** setzt, sollten beide Geometrien – bei ähnlichem Einfallswinkel – sehr ähnliche LOS‑Geschwindigkeiten liefern (Meeting‑Ziel: Differenz < 1 mm/a, Beispiel Schloss Mirabell). fileciteturn0file0  
Wenn dagegen eine starke **horizontale** Komponente vorliegt (z. B. Hangrutschen), kann ASC vs DSC stärker divergieren – was ihr später mit Terrain‑Kontext (Hangneigung/Aspekt) plausibilisieren könnt. fileciteturn0file0 fileciteturn0file2

### Vergleich trotz nicht deckungsgleicher Messpunkte

Ihr habt zu Recht das Problem: ASC/DSC‑Punkte sind nicht pixelgleich und oft nicht am selben Dachpunkt. fileciteturn0file2  
Die InSAR‑Validierungs‑/Intercomparison‑Literatur arbeitet deshalb häufig in **geokodierten Räumen** und vergleicht aggregierte Produkte auf definierten Einheiten oder Rastern. Ein robustes Beispiel ist ein Sentinel‑1‑Intercomparison‑Paper, das eine Methode vorstellt, die Explizit Metriken zu **Punktverteilung, Deformationsrate und Zeitreihen** ableitet; dort werden Standardabweichungen der Geschwindigkeitsdifferenzen im Bereich ~1–2 mm/Jahr berichtet (je nach Polygon/Pair). citeturn19view0  
Das ist sehr nah an eurem Meeting‑Gedanken („Inter‑Observer Variability“): Ihr könnt ASC und DSC als zwei unabhängige Beobachter behandeln und Konsistenzmetriken auf Gebäudeebene definieren.

Ein zweites, extrem passendes InSAR‑Gebäude‑Matching‑Paper (2024) nutzt ASC/DSC‑Vergleich explizit als Verifikation ihres Matchings und berichtet hohe Selbstkonsistenz (Korrelation, RMSE der Differenzen) nach erfolgreichem Matching. citeturn4view0

### 2D‑Dekomposition: Nutzen ja, aber erst nach der Qualitätsprüfung

Die 2D‑Dekomposition (Vertikal + Ost‑West) benötigt beide Geometrien und wird typischerweise auf einem Raster durchgeführt; im AUGMENTERRA‑Handbuch wird explizit darauf hingewiesen, dass dadurch u. a. **Lagegenauigkeit und Messpunktdichte** leiden können, und dass in steilen Lagen oft nur eine Geometrie verfügbar ist. fileciteturn0file1  
Im Meeting wurde außerdem klar ausgesprochen, dass eine Verschneidung ASC/DSC eure unabhängige Validierung „kaputtmacht“. fileciteturn0file0

**Empfehlung:**  
Für Phase 1 nutzt ASC/DSC primär als **Qualitäts‑ und Konsistenzcheck** (zwei unabhängige Gebäude‑Scores vergleichen). Erst **nach** Outlier‑Bereinigung und Gebäude‑Scoring könnt ihr optional eine 2D‑Dekomposition als Zusatzprodukt rechnen (z. B. für Interpretation „vertikal vs. hangparallel“), aber nicht als zentralen Score‑Eingang.

![ASC/DSC‑Geometrie und Blickrichtungen (AUGMENTERRA‑Handbuch, Seite 9)](sandbox:/mnt/data/handbook_page_9.png)

![2D‑Dekomposition (AUGMENTERRA‑Handbuch, Seite 12)](sandbox:/mnt/data/handbook_page_12.png)

## Bewegungs‑Scoring pro Gebäude: robust, probabilistisch, und klein‑n‑tauglich

### Warum klassische Mittelwerte nicht reichen

Im Meeting wurde klar: Bei großen Gebäuden „glättet“ ihr Outlier derzeit durch Mittelung, aber bei kleinen Gebäuden (2–5 Punkte) kann ein einzelner Outlier den Motion‑Score zerstören. fileciteturn0file0  
Gleichzeitig sagt das Handbuch: `coherence` beschreibt zwar Signalstabilität und Modellabbildbarkeit und hohe Werte (z. B. >0,7) stehen für zuverlässige Punkte, aber hohe Kohärenz ist in eurem Praxisbild **nicht hinreichend** für „guter Gebäude‑Messpunkt“. fileciteturn0file1 fileciteturn0file0

### Etablierte Aggregationslogik aus InSAR‑SHM‑Literatur: Muster

Im Infrastruktur‑/SHM‑Kontext werden InSAR‑Zeitreihen zunehmend mit Unsicherheitsbetrachtung verwendet: Es gibt Arbeiten zur strukturellen Überwachung, die Unsicherheiten quantifizieren und betonen, dass Resampling/Zuordnung/Clustering die Unsicherheit dominiert. citeturn7search1turn1search1  
Außerdem gibt es aktuelle Arbeiten, die **Clustering‑Algorithmen** zur automatisierten Klassifikation von PS‑Zeitreihenmustern einsetzen und diese Muster physischen Strukturelementen zuordnen, um „anomalies and distinct behaviours“ zu entdecken. citeturn8view0  
Das ist konzeptionell sehr nahe an eurem Ziel „Gebäudeteile / Outlier“ – nur dass ihr die Einheit „Gebäude“ statt „Brücke“ habt.

### Konkreter probabilistischer Score‑Vorschlag

Für Phase 1 würd’ ich ein Scoring‑Design empfehlen, das zwei getrennte Aussagen produziert:

1) **Bewegungsschätzer pro Track** (ASC und DSC getrennt) als Verteilung: „μ ± Unsicherheit“  
2) **Reliability/Konsistenz‑Index** aus (a) Track‑internem Punktkonsens und (b) ASC‑vs‑DSC‑Konsistenz

Ein technisch sauberer, gut implementierbarer Kern ist ein **gewichtetes, robustes Modell**:

- Nutzt `v_stdev` als direkte Messunsicherheitsinformation (inverse‑Varianz‑Gewichtung). fileciteturn0file1  
- Nutzt `eff_area` als Gewichtung für DS‑Punkte, wie im Handbuch beschrieben. fileciteturn0file1  
- Nutzt zusätzlich Qualitäts‑Gewichte aus `coherence` und Amplitudenstabilität (`ADI`). fileciteturn0file1 citeturn16search0turn16search5

Für die Robustheit gegenüber Outliers (besonders bei n klein) sind zwei Literatur‑kompatible Wege sehr passend:

- **Noise‑aware Clustering + Hauptcluster‑Aggregation** (z. B. HDBSCAN → größter stabiler Cluster wird „building cluster“, Rest Noise). citeturn0search14turn0search18  
- **Robust‑Mixtur/Trimming‑Ansatz** (GMM+Noise oder OCLUST‑ähnliches Trimming), der Outlier als Kontamination behandelt und dann den „clean set“ aggregiert. citeturn0search0turn17search2turn9search6

**Für Kleinstgebäude (2–5 Punkte)** ist die ehrlichste Lösung (und auch produktseitig sinnvoll):  
- liefert **Bewegung ja**, aber Reliability extrem niedrig, außer ASC/DSC stimmen zusätzlich überein. Das passt genau zur Meeting‑Vision eines separaten „Verlässlichkeitsindex“. fileciteturn0file0  
- optional: „borrow strength“ aus direkter Nachbarschaft erst in Phase 2 (z. B. gleiche Blockstruktur), weil ihr sonst neue Fehlkopplungen einführt.

### Zeitreihen‑Sonderfälle: Sprünge, Bauarbeiten, Turning Points

Eure Beispiele (Wien U‑Bahn‑Bau: abrupte Setzungen) zeigen, dass echte Prozesse als Sprünge auftreten können. fileciteturn0file0  
Für solche Fälle kann Change‑Point‑/Turning‑Point‑Detektion als Zusatzfeature helfen, um „Outlier‑Spikes“ vs. „persistente Regimeänderung“ zu trennen. Es gibt neuere robuste Methoden, die Turning Points in InSAR‑Zeitreihen effizient (massenskalierbar) detektieren wollen und explizit auf PS‑InSAR‑Zeitreihen angewendet werden. citeturn7search3

## Synthese: empfohlener Gesamtansatz für Phase 1, Tools, Skalierbarkeit, Risiken

### Empfohlene Phase‑1‑Pipeline als konkrete Algorithmus‑Kombination

Die Literatur + eure konkreten Daten/Anforderungen sprechen für einen **hybriden, aber sehr klaren** Ablauf:

**Datenbasis & Zuordnung**  
Nutzt primär GBA‑Gebäude (wegen Höheninformation) und die existierenden Links als Start, aber baut eine Option für **adaptive Buffer‑Re‑Zuordnung** ein (mindestens für „problematische“ Gebäude). Adaptive Buffer basierend auf Höhe & Einfallswinkel ist sowohl im Meeting gefordert fileciteturn0file0 als auch als publizierter Matching‑Ansatz beschrieben. citeturn4view0  
Eine „Reverse‑Geocoding in Slant‑Range“‑Strategie ist in PSI‑Gebäudesegmentierungsliteratur ebenfalls beschrieben und kann später als Phase‑2‑Verbesserung dienen. citeturn13view0turn10view0

**Vorfilter / Gate‑Rules (ohne harte Gebietsschwellen)**  
Euer Repo empfiehlt aktuell `coherence ≥ 0,7` und `v_stdev ≤ 1,5` als Qualitätsfilter. fileciteturn0file2  
Phase‑1‑Upgrade ohne „hard rules“ wäre: modelliert die „Good‑vs‑Bad“-Qualität als **lokales (pro Track/Region) Gemisch** über (`coherence`, `v_stdev`, `ADI`, `h_stdev`, `eff_area`) statt fixe Cuts. Die Mixtur‑Literatur mit Noise‑Komponente ist genau dafür gedacht. citeturn17search2turn0search0

**Feature‑Engineering (minimal, robust, InSAR‑kompatibel)**  
Setzt auf kleine, erklärbare Feature‑Blöcke: (i) Kinematik, (ii) Saisonalität, (iii) Qualität (coherence + amplitude stability + v_stdev), (iv) Geometrie (height_layer + h_stdev + incidence_angle). fileciteturn0file1 fileciteturn0file2  
Ergänzt optional 3–8 PCA‑Features aus der Zeitreihe (PCA‑Clustering ist für InSAR‑Zeitreihen als Muster‑Detektor publiziert). citeturn6view0turn18search16  
Skaliert robust (RobustScaler/QuantileTransformer), weil Standardisierung Outlier‑sensitiv sein kann. citeturn20search0turn20search6

**Lokales Clustering + Outlier Detection pro Gebäude (Track‑getrennt)**  
- Wenn n ≥ 10: HDBSCAN (allow_single_cluster=true) auf robust skalierten Features → Cluster + Noise/Outlier‑Score. citeturn0search14turn0search18  
- Wenn 6 ≤ n < 10: bevorzugt modellbasiert (GMM+Noise oder leichtes Trimming) mit max. 1–3 Clustern (physikalisch motivierte Obergrenze) → Outlier‑Wahrscheinlichkeiten. citeturn17search2turn0search0  
- Wenn n ≤ 5: kein echtes Clustering; statt dessen „One‑cluster + robust outlier rejection“ (z. B. über Log‑Likelihood oder robusten z‑Score auf `vel` + Zeitreihen‑Konsistenz + height_layer‑Prior). Diese Fallback‑Notwendigkeit folgt direkt aus dem Meeting‑Problem „kleine Gebäude“. fileciteturn0file0

**Gebäude‑Aggregation je Track**  
Aggregiert nur den „best cluster“ (z. B. größter/konfidentester Cluster) und nutzt inverse‑Unsicherheitsgewichte (`v_stdev`) sowie DS‑Gewichtung (`eff_area`). fileciteturn0file1

**ASC/DSC‑Validierung & Reliability Score**  
Für Gebäude mit genügend Punkten in beiden Geometrien: vergleicht Track‑Scores als unabhängige Beobachter – analog zu InSAR‑Intercomparison‑Methodik (Vergleich über Metriken auf geokodierten/aggregierten Einheiten). citeturn19view0  
Gebt einen Reliability‑Index aus, der sinkt bei:
- hoher intra‑Track‑Heterogenität (viele Outlier / mehrere unklare Cluster),
- starker ASC‑vs‑DSC‑Differenz in ebenem Terrain,
- dominanten Boden‑Layern (Höhen‑Hypothese). fileciteturn0file0

### Tool‑Stack für Python

Für eure Aufgaben ist der aktuelle „state of the art“ eher ein Stack als eine einzelne Library:

- **Geodaten:** GeoPandas/Shapely/PyArrow (ihr seid ohnehin in Parquet/GeoParquet), Rasterio für Terrain, Dask für Skalierung. fileciteturn0file2  
- **Clustering/Outlier:** scikit‑learn (GMM, PCA, robuste Preprocessing‑Pipelines), HDBSCAN‑Library (noise‑aware clustering), PyOD als Anomaly‑Detection‑Toolbox/Benchmark‑Ökosystem. citeturn0search14turn3search7turn3search3  
- **Zeitreihen:** tslearn (DTW‑Clustering/KernelKMeans), plus Change‑Point‑Detektion (z. B. STPD‑artige Implementationen als Inspiration). citeturn20search4turn7search3  
- **InSAR‑Open‑Source (wenn ihr später Preprocessing/Alternative Stacks braucht):** MintPy und LiCSBAS sind etablierte Open‑Source‑Toolchains für InSAR‑Zeitreihenanalyse. citeturn3search0turn3search4turn3search2

### Evaluierung ohne Ground Truth: praktikable Best Practices

Ohne flächendeckende Ground‑Truth ist „Evaluation“ in Unsupervised Settings stark auf Surrogate angewiesen. Die Cluster‑Stability‑Literatur argumentiert explizit, dass Stabilität ein nützlicher Surrogat‑Indikator ist, wenn kein Goldstandard existiert, und schlägt Bootstrap‑Stabilitätsbewertung für Cluster und Observations vor. citeturn23view0  
Für euch ist das besonders wertvoll, weil ihr pro Gebäude ohnehin nur kleine Punktmengen habt: Bootstrapping innerhalb eines Gebäudes ist billig und liefert direkt ein „Confidence‑Signal“ pro Clusterlösung.

Zusätzlich habt ihr eine InSAR‑spezifische, sehr starke Surrogat‑Validierung: **ASC/DSC‑Selbstkonsistenz** als unabhängiger Check – genau das wurde im Meeting als zentraler Validierungsmechanismus herausgestellt. fileciteturn0file0  
Das ist methodisch konsistent mit InSAR‑Intercomparison‑Arbeiten, die Konsistenz/Qualitätsbewertung als Grundvoraussetzung für operationelle Ground‑Motion‑Maps beschreiben. citeturn19view0

### Offene Fragen und Risiken

Einige Punkte bleiben – trotz guter Literaturbasis – echte Forschungs‑/Engineering‑Risiken:

- **Zuordnung bleibt der größte Fehlerhebel.** Adaptive Buffer hilft, aber kann auch mehr „falsche Nachbarschaft“ einsammeln (besonders bei dichten Altstadtblöcken). Die 2024‑Matching‑Arbeit selbst nennt Overlap/Repeat‑Point‑Handling als relevantes Problem und nutzt dafür zusätzliche Schritte (Nearest‑Neighbor, elevation continuity, Iteration). citeturn4view0  
- **Höhenqualität/Referenzsysteme:** `height` ist bezogen auf WGS84‑Ellipsoid und Terrain‑Kontext muss konsistent transformiert werden; sonst wird height_layer kaputt. fileciteturn0file1 fileciteturn0file2  
- **DS vs PS Mischung:** `eff_area` ist als DS‑Gewicht gedacht; wenn ihr PS und DS ohne Gewichtung gleich behandelt, kann das die Robustheit reduzieren. fileciteturn0file1  
- **Amplitude‑Join‑Inkonsistenzen:** In eurem Datenbericht wird sichtbar, dass die CODE‑Deckung zwischen AMP und Bewegungsdaten insbesondere für Track 95 nicht vollständig ist; das kann amplitude‑basierte Features selektiv verzerren, wenn ihr nicht sauber joint. fileciteturn0file2  
- **Kleinstgebäude bleiben grundsätzlich „low confidence“.** Die Literatur kann das nicht wegzaubern; statistisch sind 2 Messpunkte keine robuste Schätzung. Die beste produktseitige Lösung ist ein expliziter Reliability‑Mechanismus, wie im Meeting angestrebt. fileciteturn0file0  
- **Generalisierung weltweit:** Domain‑Shift ist real. Für geospatiale ML wird Domain Adaptation/Generalization als zentrales Thema diskutiert (wenn auch oft in Bildsegmentierung). citeturn2search0turn2search1turn2search20  
  Für euch heißt das: weniger harte Schwellen, mehr probabilistische Qualitätsmodelle + kalibrierte Unsicherheit. Conformal Prediction wird in EO‑Kontext explizit als skalierbarer Ansatz zur Unsicherheitsquantifizierung diskutiert. citeturn2search2turn2search10

**Bottom line:** Die Literatur unterstützt sehr klar einen **lokalen, objektzentrierten Ansatz** mit (i) besserer Zuordnung (adaptive Buffer, Höhenkontinuität), (ii) „noise‑aware“ Clustering/Outlier Detection, (iii) expliziter Nutzung von Zeitreihenrepräsentationen, (iv) ASC/DSC‑Konsistenz als Kern‑Validierung, und (v) einem getrennten **Reliability‑Score**, der Kleinst‑n ehrlich abbildet. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2