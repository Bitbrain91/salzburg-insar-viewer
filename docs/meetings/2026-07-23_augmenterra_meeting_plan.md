# Meeting-Plan: AUGMENTERRA-Jour-fixe (2026-07-23)

**Stand:** 2026-07-23
**Status:** eingefroren (durchgefuehrt); Ergebnisse: [`2026-07-23_augmenterra_meeting_notes.md`](2026-07-23_augmenterra_meeting_notes.md)
**Meeting:** 2026-07-23 (Dauer flexibel)
**Teilnehmerkreis:** Projektteam SP-AI + AUGMENTERRA
**Nachdokumentation:** `2026-07-23_augmenterra_meeting_notes.md` (nach dem Meeting)

Hinweis: Alle Links (Beispiel-Gebaeude und One-Pager) laufen ueber den lokal
laufenden Viewer (`http://127.0.0.1:3000`, vorher per `start.sh` starten).
Die Gebaeude-Links zoomen direkt auf das Gebaeude und oeffnen den Befund im
Inspektor; der passende Auswertungslauf ist mitaktiviert.

## Ziel des Meetings

1. Zeigen, was seit Juni passiert ist: BEV-Gebaeudedaten integriert, neues
   Viewer-UI, zwei Validierungs-Auswertungen abgeschlossen.
2. Fachliche Entscheidungen vorbereiten: Wie teilen wir Gebaeude? Wie
   kommen wir zu Expertenlabels? Wie loesen wir Hanglagen?
3. Zusagen holen: laengere SNT/TSX-Ueberlappung, Label-Stichprobe, Hosting.

## Thema 1: Gebaeudedaten — was ist die richtige Bewertungseinheit?

Seit Juni sind die amtlichen BEV-Gebaeudedaten unser Standard. Ihre Hoehen
sind sehr genau (Laserscan). Aber: Die BEV-Grundrisse folgen dem
Adressregister, nicht der sichtbaren Baustruktur — und sind pro Gebaeude
unzuverlaessig, genau wie OSM/GBA, nur mit jeweils anderen Fehlern. Auch die
BEV-Traufhoehe ist mit Vorsicht zu lesen: Niedrige Vordaecher ziehen den
Wert rechnerisch nach unten.

Vier Beispiele (Klick oeffnet den Viewer):

1. **Reihenhaus-Paar:**
   [Teil A (rotes Haus)](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{15060234-4C93-47AC-A07C-27DDCF8AB7A5})
   und [Teil B (dunkles Haus)](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{90466D84-389B-4B0C-868B-8C18FE34D113}) —
   zwei fast gleich hohe, aneinandergebaute Haeuser. Getrennt bewertet hat
   Teil B zu wenige Messpunkte; die Bewegungsdifferenz (~1,7 mm/a) ist
   ohnehin nicht signifikant.
2. **Falsch geteiltes Gebaeude:**
   [BEV-Teil 1](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{6B9EFA6D-5F9D-44E8-AC58-C617BF124298}),
   [BEV-Teil 2](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{6FC09F2D-4091-400D-B184-B22E493E68A5}),
   [dasselbe Gebaeude in OSM](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=osm:879376606) —
   laut Luftbild EIN Gebaeude; BEV macht zwei unpassende Teile daraus
   (nur 42 % Ueberdeckung mit dem OSM-Umriss).
3. **Zerteilter Anbau und Geistergebaeude:**
   [Gebaeude 1](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{8D2CA0E1-EC5E-4D85-9F84-9C03D2C6B521}),
   [Gebaeude 2](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{FFBB28A8-F59A-48E1-A779-A4248C5153A6}) —
   der echte niedrige Anbau ist auf beide Teile aufgeteilt, seine Hoehe und
   Lage gehen verloren. Direkt davor ein
   [Geistergebaeude](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{1488F6ED-A7E8-4548-96BB-1C5E46820EEA}),
   das real nicht existiert — BEVs eigene Qualitaetsflags warnen hier sogar.
4. **BEV korrekt, OSM lueckenhaft:**
   [Hauptgebaeude](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{7F5A4F1F-5CB6-41DD-B4D9-3EEB1652637D})
   mit [eigenem Anbau-Grundriss](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{245DEF4E-77BC-4540-A5DD-A4CAD3DA3900}) —
   hier fuehrt NUR BEV den kleinen Anbau richtig; in OSM fehlt er komplett.

Unser Vorschlag (zur Diskussion, Details in
[`OBS-2026-001`](../research/observations/OBS-2026-001_bev-bauwerkskomplexe.md)):
Keine Quelle "gewinnt" — also die Unsicherheit selbst modellieren:

- **Zwei Ebenen:** Der zusammenhaengende Gebaeudeblock ist die robuste
  Haupteinheit; die Teilgebaeude bleiben als Hypothesen darunter sichtbar.
- **Vertrauenswert je Grundriss:** Stimmen BEV und OSM ueberein, gilt der
  Grundriss als verlaesslich; widersprechen sie sich, greifen vorsichtigere
  Regeln und eine sichtbare Kennzeichnung. Konflikte prueft eine kleine
  Handstichprobe (20-30 Faelle in Google Earth), keine Vollpruefung.
- **Spaeter:** Das 1-m-Oberflaechenmodell (zeigt Dachhoehen pro
  Quadratmeter) prueft flaechig, wo Anbauten, Geister und falsche
  Teilungen wirklich sind.

Fragen an AUGMENTERRA: Sinken aneinandergebaute Haeuser gemeinsam? (Unsere
Einschaetzung: nein — getrennte Fundamente sind der Regelfall; die Differenz
ist das interessante Signal.) Traegt das Zwei-Ebenen-Modell fachlich? Wie
geht ihr selbst mit widerspruechlichen Gebaeudequellen um?

## Thema 2: Referenzdaten und die Klassen Haupt / Anbau / Fremd

- Interner Referenz-Korpus: 10 Gebaeude, 46 Punkte, jedes Label mit Beleg.
  Ziel: 20-40 Gebaeude plus unabhaengige Expertenpruefung.
- Die Pipeline trennt Messpunkte seit Juni in Hauptgebaeude, Anbau und
  Fremdreflektor. Die **Fremd-Erkennung ist robust** (reine Radar-Geometrie:
  auf der sensorabgewandten Seite kann kein Dachpunkt liegen). Die
  **Anbau-Erkennung ist wackliger**: Ihr Einstieg haengt an der Punkthoehe —
  und die ist bei Sentinel nur auf +/-8 m genau (in beiden Handbuechern
  bestaetigt).
- **Vorschlag zur Diskussion — Logik umdrehen:** Ein Anbau, der sich gleich
  bewegt wie das Hauptgebaeude, stoert den Befund nicht und muss nicht
  erkannt werden. Entscheidend ist, **unterschiedliche Bewegung** zu finden
  (kann die Pipeline heute gut: Clustering + Signifikanztest) — und dann
  einzuordnen, zwischen was die Differenz besteht: (1) Fremdobjekt ->
  Alarm verwerfen; (2) getrennter Baukoerper/Anbau -> Bewegung an der
  Fuge, plausibel; (3) EIN Baukoerper mit innerer Differenzbewegung ->
  wichtigster Fall, hier drohen Schaeden. Hoehe und Geometrie dienen nur
  noch dieser Einordnung (spaeter gestuetzt durchs 1-m-Oberflaechenmodell),
  nicht mehr als Einstiegskriterium. Die bisherige geometrische
  Vor-Trennung bleibt als stiller Schutz fuer Kleinstgruppen erhalten.
- Merkzettel Messgenauigkeit: Jahresrate <1 mm/a genau; Unterschiede
  zwischen zwei Gebaeuden erst ab ~3 mm/a belastbar; Punktposition SNT
  +/-8-12 m, TSX +/-1-3 m (betrifft auch die Gebaeude-Zuordnung; starkes
  Argument fuer TSX als Referenz).

Fragen: Koennt ihr eine kleine Label-Stichprobe (10-15 Gebaeude) unabhaengig
pruefen? Gibt es Vor-Ort-Wissen zu unserem offenen Differentialfall
(siehe Themenspeicher)?

## Thema 3: Validierung — messen wir das Richtige?

Zwei Auswertungen sind fertig und eingefroren; alle Zahlen und Grafiken
buendelt der
[One-Pager](http://127.0.0.1:3000/stakeholder_onepager_2026-07.html).

- **Blickrichtungs-Vergleich:** Dasselbe Gebaeude von zwei Seiten gemessen
  (auf- vs. absteigende Satellitenbahn); 1858 gekoppelte Gebaeude in
  Salzburg und Bad Gastein, nach Hangneigung gruppiert.
- **Sensor-Vergleich SNT vs. TSX/PAZ:** rund 600 gekoppelte Gebaeude je
  Track-Paar in Bad Gastein, im einzigen gemeinsamen Zeitfenster
  (8 Monate, ein Winter).

**Ergebnis in Kuerze:**

- **Blickrichtungs-Vergleich:** In der Ebene stimmen auf- und absteigende
  Bahn gut ueberein (Median der Abweichung 0,7 mm/a — innerhalb des
  Messrauschens). Am Hang widersprechen sie sich systematisch; die
  Blickrichtungen ordnen die Gebaeude tendenziell gegenlaeufig
  (Korrelation -0,3 — schwach, aber statistisch eindeutig kein Zufall).
- **Sensor-Vergleich:** SNT und TSX/PAZ messen am Hang dasselbe Signal
  (Rangfolge-Korrelation 0,6 im gemeinsamen 8-Monats-Fenster, absteigende
  Blickrichtung). In der Ebene zeigt der Vergleich nur Rauschen um
  Null — kein Widerspruch zum ersten Punkt: Dort bewegt sich schlicht
  wenig, es gibt also kaum Signal, dessen Rangfolge zwei Sensoren
  gemeinsam ordnen koennten.
- **Grenze (gilt fuer den Sensor-Vergleich):** Er belegt die Konsistenz
  der Sensoren, KEINE absoluten Jahresraten — dafuer ist das Fenster zu
  kurz (ein Winter, Saisoneffekte nicht ausgemittelt).

**Beispiele im Viewer (Klick oeffnet Gebaeude samt Auswertungslauf):**

- [Ebene: beide Blickrichtungen einig](http://127.0.0.1:3000/?area=salzburg&run=d1a5e56c-9962-4bb8-a536-210dec41882d&building=bev:{CE2A0E57-70A2-426E-99BD-4A4C731E23B5}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1#18/47.790403/13.024313)
  — Salzburg, T44 -1,0 / T95 -1,0 mm/a, Differenz praktisch null.
- [Hang 32 Grad: Blickrichtungen gegenlaeufig](http://127.0.0.1:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{6D7ECD8C-AA71-46A6-A917-E252C1AD7923}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1#18/47.114955/13.138185)
  — Bad Gastein, T44 +8,4 vs. T95 -14,2 mm/a: das Kernbeispiel fuer die
  horizontale Bewegungskomponente.
- Prueflisten-Fall Talboden Bad Gastein:
  [im Sentinel-Lauf](http://127.0.0.1:3000/?area=bad_gastein&run=f3d22d72-8fa8-4551-96c5-273d84bc8d7a&building=bev:{0726CA74-6A0B-48F4-89B2-84EF50B84709}&mlview=cross-track&mlbuildings=1&mlpoints=1&hulls=1#19/47.113051/13.135649)
  vs. [derselbe im TSX/PAZ-Lauf](http://127.0.0.1:3000/?area=bad_gastein&run=533f3ec1-1c4c-4be5-9cf7-7050c06de0bc&building=bev:{0726CA74-6A0B-48F4-89B2-84EF50B84709}&mlview=cross-track&mlbuildings=1)
  — SNT -22,4 vs. TSX +0,2 mm/a im gemeinsamen Fenster: so entsteht die
  manuelle Pruefliste.

**Was sich daraus ableiten laesst:**

- Die Methodik misst echtes Signal, nicht Rauschen: Wo Bewegung ist,
  stimmen unabhaengige Blickrichtungen und unabhaengige Sensoren ueberein.
- Der Hang-Widerspruch ist KEIN Sensorfehler — die Sensoren stimmen ja
  gerade am Hang ueberein. Er ist ein Methodikproblem: Die Annahme
  "Bewegung ist vertikal" bricht am Hang. Das ist die direkte Begruendung
  fuer die 2D-Zerlegung in Thema 4.
- Absolute Jahresraten bleiben offen, bis eine mehrjaehrige Ueberlappung
  vorliegt.

Bitte an AUGMENTERRA: eine mehrjaehrige SNT/TSX-Ueberlappung liefern —
unsere wichtigste externe Abhaengigkeit.

## Thema 4: Hanglage — Gelaendemodell und 2D-Zerlegung

Am Hang bewegt sich ein Gebaeude nicht nur senkrecht — die bisherige
Vertikal-Annahme bricht dort (siehe Thema 3). Plan in drei Schritten:

1. Das beschaffte 1-m-Gelaendemodell (Land Salzburg) kontrolliert einbauen
   (bisher rechnen wir mit grobem Satelliten-Gelaende).
2. Hangneigung und Ausrichtung je Gebaeude in die Pipeline aufnehmen.
3. Eine saubere 2D-Zerlegung der Bewegung entwickeln (senkrecht + Ost-West;
   Nord-Sued kann Radar prinzipbedingt kaum messen).

**Was die Zerlegung konkret bringt:**

- **Die Vertikalwerte stimmen am Hang erst dann.** Seitliche Bewegung
  verfaelscht heute beide Blickrichtungs-Werte (Kernbeispiel in Thema 3:
  +8,4 vs. -14,2 mm/a — keiner der beiden stimmt).
- **Zuverlaessigkeit wird fair:** Track-Widerspruch am Hang ist dann
  erklaertes Signal (seitliche Bewegung), kein Messfehler mehr. Die
  Metrik bewertet nur noch den Rest-Widerspruch nach der Zerlegung —
  Hang-Gebaeude landen nicht mehr automatisch auf "niedrig".
- **Ursachen-Diagnose:** Bewegung hangabwaerts (gegen die Exposition
  pruefbar) deutet auf Hangkriechen (geologisch, grossflaechig); rein
  vertikal eher auf Setzung (Gebaeude/Untergrund) — zwei verschiedene
  Probleme mit verschiedenen Massnahmen.
- Der Gewinn faellt genau dort an, wo das Risiko am hoechsten ist: in
  den Hanglagen (Bad Gastein), heute der Bereich mit den meisten
  "niedrig"-Einstufungen.

**Methodik-Idee (pro Gebaeude):** robuste Rate je Blickrichtung im
gemeinsamen Zeitfenster (wie im Sensor-Vergleich) + bekannte
Blickgeometrie je Punkt -> einfaches lineares Gleichungssystem (zwei
Messungen, zwei Unbekannte), Unsicherheits-Band wird mitgefuehrt.
Gebaeude mit nur einer Blickrichtung: ehrlich "nicht zerlegbar", dazu
zwei Szenario-Werte ("falls Setzung: X, falls Hangkriechen: Y" —
Standardpraxis der Rutschungs-InSAR). Das Hang-Bewegungsmodell
(hangparallel, aus Neigung + Exposition) dient nur als
Erwartungs-Schablone fuer Diagnose und Szenarien — bewusst NICHT als
Zwangsbedingung in der Rechnung, sonst faenden wir Hangkriechen, weil
wir es angenommen haben.

**Ergebnis-Kontrolle (vom guenstigsten zum haertesten Test):**

1. Synthetischer Vorzeichen-Test: bekannte Bewegung durchrechnen, muss
   exakt wieder herauskommen (faengt Vorzeichen-/Konventionsfehler).
2. Nullprobe Ebene: Die Ost-West-Komponente muss in flachen Gebieten im
   Mittel ~0 sein; ihre Streuung dort ist unser Grundrauschen.
3. Haertester Test: dieselbe Zerlegung unabhaengig mit TSX/PAZ rechnen
   und die Komponenten vergleichen (direkte Fortsetzung des
   Sensor-Vergleichs). T22 taugt NICHT als Blindprobe (fast gleiche
   Blickrichtung wie T95, nur anderer Einfallswinkel), bleibt aber als
   Wiederholbarkeits-Check nuetzlich.
4. Plausibilitaet: An Ost-/Westhaengen sollte die Ost-West-Komponente
   ueberwiegend hangabwaerts zeigen; das Kernbeispiel aus Thema 3 muss
   nach der Zerlegung eine konsistente Geschichte erzaehlen, und in der
   Ebene darf sich an der Zuverlaessigkeitsverteilung nichts aendern.

**Grenze:** 2D, nicht 3D. Bei Nord-/Suedhaengen zeigt "hangabwaerts" in
die radar-blinde Richtung — dort weisen wir "eingeschraenkt pruefbar"
aus, statt faelschlich "keine Bewegung" zu melden.

Fragen: Erfahrungswerte zur 2D-Zerlegung auf Gebaeudeebene? Auf welches
Hoehensystem beziehen sich die gelieferten Punkthoehen?

## Thema 5: Tool fuer AUGMENTERRA bereitstellen

- Zugang zum Viewer zum Testen (bleibt Forschungswerkzeug, kein Produkt).
- Ausbau-Idee: Expertenlabels direkt im Tool erfassen — inklusive
  Korrekturen an Gebaeudegrundrissen ("gehoert zusammen / existiert nicht").
  Das fuellt Thema 2 direkt.
- Zu klaeren: Server/Hosting, Zugriffsschutz, Datenlizenzen (BEV/TSX in
  einer extern erreichbaren Instanz), Aufwand und Zeitpunkt.

## Ablauf (Reihenfolge, ohne Zeitbindung)

1. Kurzer Stand seit Juni.
2. Thema 1 Gebaeudedaten — interaktiv anhand der vier Viewer-Beispiele.
3. Thema 2 Referenzdaten und Klassen.
4. Thema 3 Validierung — am One-Pager.
5. Thema 4 Hanglage inkl. Zerlegungs-Konzept.
6. Thema 5 Tool und Hosting.
7. Zusagen, Verantwortliche, naechster Termin.

## Mitbringsel

- [One-Pager](http://127.0.0.1:3000/stakeholder_onepager_2026-07.html)
  (buendelt beide Validierungs-Auswertungen mit Grafiken; offline-faehige
  Datei: `docs/pipelines/anomaly_local_v1/artifacts/stakeholder_onepager_2026-07.html`).
- [Vertrauens- und Ergebnis-Uebersicht](http://127.0.0.1:3000/trust_onepager_2026-07.html)
  (interaktiv: alle 5.500 Gebaeude-Befunde der fuenf Sentinel-Laeufe, filterbar
  nach Gebiet, Hanglage, Status, Zuverlaessigkeit und Blickrichtung; Datei:
  `docs/pipelines/anomaly_local_v1/artifacts/trust_onepager_2026-07.html`).
- Live-Demo im Viewer ueber die Beispiel-Links in Thema 1.
- Optional die [Erklaer-App](../../explainers/) fuer den Methodik-Ueberblick.

## Themenspeicher

Kandidaten fuer Zeitreserve oder das naechste Meeting:

- v4-Release-Pruefung endete "geprueft, nicht akzeptiert": offener
  Differentialfall `96637447` (+2,7 mm/a ohne sichtbare Ursache) und ein
  verlorener Dachpunkt in der BEV-Variante.
- Track 22 Ost: bekanntes Datenabdeckungsproblem — gibt es Lieferoptionen?

## Quellen und Details

- Validierungs-Auswertungen: [`Execution Plan`](../pipelines/anomaly_local_v1/cross_track_validation_execution_plan.md),
  [`Blickrichtungs-Vergleich`](../pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4.md),
  [`Sensor-Vergleich`](../pipelines/anomaly_local_v1/artifacts/bad_gastein_snt_tsx_motion_comparison_v4.md)
- Gebaeudequellen-Beobachtung inkl. aller Referenzfaelle:
  [`OBS-2026-001`](../research/observations/OBS-2026-001_bev-bauwerkskomplexe.md)
- Messgenauigkeiten: `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`
  (S. 15-16), `TREALTAMIRA_handbook_2.2_20180604.pdf` (S. 14-16)
- BEV-Traufhoehen-Methodik: [BEV-Datenbeschreibung DLM_8000_BAUWERK](https://www.bev.gv.at/dam/jcr:dfa0538a-7321-4f84-bc04-a9e8d30d9dce/Datenbeschreibung_gpkg_DLM_8000_BAUWERK.pdf)
- Offene Forschung: [`next_steps.md`](../pipelines/anomaly_local_v1/next_steps.md);
  Release-Pruefung: [`RC-Gate-Ergebnis`](../pipelines/anomaly_local_v1/artifacts/phase8_v4_rc_gate_results.md);
  Referenzlabels: [`reference_labels.md`](../pipelines/anomaly_local_v1/reference_labels.md)
