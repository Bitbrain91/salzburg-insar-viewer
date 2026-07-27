# OBS-2026-001: BEV-Bauwerkskomplex aus mehreren angrenzenden Objekten

**Beobachtet:** 2026-07-15

**Ergaenzt:** 2026-07-22 (Referenzfaelle Quellenvergleich BEV/OSM/GBA); 2026-07-27 (Meeting-Befund 23.07. und Weiterleitung)

**Status:** weitergeleitet (an [`next_steps.md`](../../pipelines/anomaly_local_v1/next_steps.md) P1-11, Gebaeudedatenfusion)

**Entscheidungsstand:** Richtungsentscheidung getroffen (Meeting 2026-07-23): empirische Fusion mit `footprint_confidence` statt Regelnachbau; aneinandergebaute Gebaeude bleiben getrennte Bewertungseinheiten

**Bereich:** Datenquelle / Gebaeudezuordnung / Viewer

**Ursprung:** Nutzeranalyse im InSAR Viewer mit anschliessender gemeinsamer Code-, API- und PostGIS-Pruefung mit Codex

**Evidenzstaerke:** stark fuer die technische Aufteilung; fachliche Semantik der Teilobjekte offen

**Dringlichkeit:** noch nicht bewertet

## Beobachtung

In der orthogonalen Vieweransicht erscheint die transparente gruene
BEV-Darstellung groesser und baulich vollstaendiger als der schwarze
Fokusumriss des ausgewaehlten Gebaeudes. Die gruene Kontur passt nach visueller
Nutzerpruefung besser zum realen Dach- beziehungsweise Baukoerperbild. Der
schwarze Umriss deckt nur einen Teil dieses sichtbaren Komplexes ab.

Die anschliessende Pruefung zeigte: Es ist weder ein alter GBA-Datensatz noch
eine zweite raeumliche BEV-Ebene aktiv. Der BEV-Layer
`BWK_8100_BAUWERK_F` enthaelt an derselben Stelle mehrere eigenstaendige,
unmittelbar aneinandergrenzende Objekte. Der gruene Layer zeichnet sie
gleichzeitig; der schwarze Fokusumriss zeichnet nur die ausgewaehlte
`building_id`.

## Konkreter Fall

- Gebiet: Salzburg
- Dataset: `salzburg_snt`
- Gebaeudequelle: `bev`
- untersuchter Run: `b55c8728-7d4d-4496-b254-e9c868b4c0d7`
- Run-Datum: 2026-07-14
- Modellset: `local_hdbscan_rulegate_v4_k2xhf_diffv2`
- ausgewaehltes Hauptobjekt:
  `{DBD078F7-3A17-4887-AFCA-F6EE43E24D8C}`

### Raeumlich verbundene BEV-Objekte

| BEV-ID | Flaeche | Hoehe Median / Maximum | AGWR-Typ | Beziehung zum Hauptobjekt | Punkte im untersuchten Run |
|---|---:|---:|---|---|---:|
| `{DBD078F7-3A17-4887-AFCA-F6EE43E24D8C}` | 216,64 m2 | 5,5 / 8,1 m | AGWR Aktiv | ausgewaehltes Objekt | 12 |
| `{7066A591-8B10-4FEB-9E78-BC45E00D6A1B}` | 24,93 m2 | 7,2 / 8,1 m | Keine eindeutige Zuordnung | beruehrt das Hauptobjekt, keine Flaechenueberlappung | 3 |
| `{805A0D4E-DB21-491C-BE9F-0EBFE1A3984C}` | 27,47 m2 | 3,3 / 3,5 m | Keine eindeutige Zuordnung | beruehrt das Hauptobjekt, keine Flaechenueberlappung | 0 |

Alle drei Objekte tragen als Erfassungsangabe
`Stadt Salzburg - MA 6/03-Vermessung und Geoinformation`.

## Verifizierte Fakten

1. Alle drei Geometrien stammen aus demselben BEV-GPKG-Layer
   `BWK_8100_BAUWERK_F`.
2. Die zwei kleineren Polygone beruehren das ausgewaehlte Hauptpolygon, ohne es
   flaechenhaft zu ueberlappen.
3. Die normale gruene BEV-Darstellung rendert alle sichtbaren Objekte des
   Layers. Gleich eingefaerbte, beruehrende Polygone wirken dadurch wie ein
   gemeinsamer Umriss.
4. Der schwarze Fokusumriss wird fuer genau die ausgewaehlte BEV-ID aus
   `bev_buildings.geom` geladen.
5. Die blauen/orangen Candidate Areas werden ebenfalls nur aus dieser einen
   ausgewaehlten Geometrie erzeugt.
6. Die ML-Pipeline behandelt die IDs als getrennte Gebaeude. Im untersuchten
   Run erhielten Hauptobjekt und erstes Teilobjekt getrennte Punktmengen.
7. PostGIS-Geometrie und vorbereitete BEV-Parquet-Geometrie des Hauptobjekts
   stimmen bis auf normale GeoJSON-Rundung ueberein. Ein alter, abweichender
   Export wurde fuer den schwarzen Umriss nicht gefunden.

## Hypothesen und noch nicht entschiedene Interpretation

- Das grosse Polygon koennte den primaeren Baukoerper beziehungsweise dessen
  Grundflaeche repraesentieren.
- Die kleineren Objekte koennten getrennt erfasste Gebaeudeteile,
  Ueberbauungen, Dachbereiche oder eine Garage repraesentieren.
- Die schwarze Geometrie koennte in diesem Fall naeher an Fundament oder
  Erdgeschoss liegen, waehrend die gruene Gesamtkontur den sichtbaren oberen
  Baukoerper besser abbildet.
- Eine Analyse strikt pro BEV-ID koennte Evidenz eines physisch
  zusammengehoerigen Gebaeudes auf mehrere Rollups verteilen.

Diese Interpretationen sind durch die vorhandenen Attribute und die technische
Geometriepruefung noch nicht abschliessend belegt. Insbesondere ist nicht
entschieden, ob beruehrende BEV-Objekte fachlich als ein Bauwerkskomplex
zusammengefuehrt werden sollen.

## Ergaenzung 2026-07-22: Referenzfaelle Quellenvergleich BEV/OSM/GBA

Nutzerbefund (Google-Earth-3D/Luftbild) mit PostGIS-Pruefung vom 2026-07-22.
Die Faelle zeigen, dass die Fehler pro Gebaeude in beide Richtungen gehen
und keine Gebaeudequelle pauschal verlaesslich ist:

1. **Unterteilung fehlt (BEV verschmilzt):**
   `{A9A7E442-BA31-41D0-8949-A120CB660943}` (96959851, P8-Flaggschiff) —
   BEV fuehrt Haupt- und Nebengebaeude als EIN Polygon (323 m2);
   OSM und GBA kennen nur das Hauptgebaeude.
2. **Falsche Teilung und Geometrie (BEV ueber-teilt):**
   `{6B9EFA6D-5F9D-44E8-AC58-C617BF124298}` +
   `{6FC09F2D-4091-400D-B184-B22E493E68A5}` vs. OSM `879376606` —
   BEV teilt ein laut Luftbild einheitliches Gebaeude in zwei
   verschachtelte Teile (155+162 m2), Ueberdeckung BEV-Union/OSM nur
   IoU 0,42; ein Teil ohne eindeutige AGWR-Zuordnung.
3. **Anbau zerteilt plus Geisterobjekt:**
   `{8D2CA0E1-EC5E-4D85-9F84-9C03D2C6B521}` +
   `{FFBB28A8-F59A-48E1-A779-A4248C5153A6}` (OSM `96959857`) — die
   Teilung in zwei real aneinandergebaute Gebaeude ist vertretbar; der
   real existierende niedrige Anbau vorne ist aber KEIN eigenes Objekt,
   sondern auf beide Teile aufgeteilt (Hoehe und Lage des Anbaus damit
   nicht ablesbar). Direkt davor fuehrt BEV
   `{1488F6ED-A7E8-4548-96BB-1C5E46820EEA}` (84 m2), das real nicht
   existiert (Geisterobjekt); es traegt `VERIFIKATION_LB=Nein` und
   `AGWR_TYP=Keine eindeutige Zuordnung` — die BEV-Qualitaetsflags
   markieren diesen Fall selbst.
4. **BEV korrekt, OSM/GBF-Luecke:**
   `{7F5A4F1F-5CB6-41DD-B4D9-3EEB1652637D}` +
   `{245DEF4E-77BC-4540-A5DD-A4CAD3DA3900}` (OSM `98698988`) — BEV
   fuehrt Hauptgebaeude und niedrigen Anbau (22 m2, h_median 3,8 m)
   korrekt getrennt; in OSM und Global Building Footprints fehlt der
   Anbau komplett.

Zusaetzlich betroffen: die P8-F-Routing-Annahme "im BEV-Kontext ist ein
reach-Kandidat eher fremd, weil BEV echte Nebengebaeude als eigene
Footprints kartiert" (`anomaly_local_v1.py`, `_assign_side_group`,
`separation_classes=anti_foreign`) gilt laut Fall 1 und 3 nicht
universell.

## Ergaenzung 2026-07-27: Meeting-Befund AUGMENTERRA (2026-07-23)

Gemeinsame Live-Pruefung im Meeting
([`Notes`](../../meetings/2026-07-23_augmenterra_meeting_notes.md)):

1. In einem verifizierten Fall (Bereich Nikolaus-Kronser-/Nussdorfer
   Strasse) verlaeuft die Grundstuecksgrenze mitten durch das Gebaeude und
   faellt mit der BEV-Teilung zusammen. Bei weiteren geprueften Gebaeuden
   trifft das jedoch **nicht** zu; eine verlaessliche generelle Logik hinter
   der BEV-Aufteilung wurde nicht erkannt. Damit ist die offene Frage 2
   (belastbarer Schluessel fuer Bauwerkskomplexe) nach aktuellem
   Kenntnisstand mit **nein** zu beantworten.
2. Weitere im Gespraech belegte Muster: ein Dachvorsprung im ersten Stock
   als eigenes BEV-Objekt; Geisterobjekt; ein fehlender Neubau; durch
   Vordaecher verfaelschte Traufhoehen.
3. AUGMENTERRA-Position zur Bewertungseinheit: aneinandergebaute Gebaeude
   getrennt bewerten (ob dieselbe Bodenplatte vorliegt, ist nicht
   feststellbar; die Bewegungsdifferenz ist das interessante Signal).
4. Beidseitiges Fazit und Arbeitsauftrag: Die BEV-Granularitaet ist fuer
   die Bewertungseinheit teilweise zu fein, ohne dass eine regelbasierte
   Rekonstruktion moeglich waere. Konsequenz ist die empirische
   Gebaeudedatenfusion mit `footprint_confidence` und DOM/DGM-Abgleich -
   priorisiert als P1-11 in `next_steps.md`.

## Warum relevant?

- Punktzuordnung, Candidate Areas und Gebaeuderollups arbeiten derzeit pro
  einzelner `building_id`.
- Ein fuer Menschen zusammengehoeriger Gebaeudekomplex kann dadurch in mehrere
  Analyseobjekte zerfallen.
- Bewegungs-, Support- und Differentialevidenz kann auf getrennte IDs verteilt
  werden.
- Die Viewer-Darstellung kann den Eindruck erzeugen, der schwarze Umriss sei
  ein anderer oder veralteter Datensatz.
- Eine pauschale Zusammenfuehrung waere ebenfalls riskant, weil bloss
  beruehrende Objekte nicht zwingend dasselbe statische oder kinematische
  Bauwerk darstellen.

## Offene Fragen

1. Welche fachliche Semantik haben getrennte, beruehrende Polygone in
   `BWK_8100_BAUWERK_F`?
2. Gibt es in den BEV- oder AGWR-Attributen einen belastbaren Schluessel fuer
   Bauwerkskomplexe oder Teilbauwerke?
3. Wie haeufig tritt dieses Muster in Salzburg und Bad Gastein auf?
4. Wie oft werden InSAR-Punkte eines visuell zusammengehoerigen Bauwerks auf
   mehrere BEV-IDs verteilt?
5. Soll der Viewer angrenzende Teilobjekte sichtbar als Bauwerkskomplex
   kennzeichnen, ohne sie fachlich bereits zusammenzufuehren?
6. Soll die Pipeline pro BEV-ID, pro AGWR-Objekt oder pro kontrolliert
   konstruiertem Bauwerkskomplex auswerten?
7. Welche bestehenden Referenzfaelle und Baselines wuerden durch eine solche
   Aenderung beruehrt?
8. Koennen `VERIFIKATION_LB` und `AGWR_TYP` als Eingaenge einer
   `footprint_confidence` je Gebaeude dienen, und wie oft markieren sie
   problematische Objekte (Geister, unklare Teilung) in einem
   systematischen Audit?

## Naechster sinnvoller Klaerungsschritt

Noch keine Implementierung und keine Aufnahme in `next_steps.md`.

Zunaechst sollte ein begrenztes Research-/Triage-Paket:

1. beruehrende und sehr nahe BEV-Objektgruppen statistisch erfassen;
2. 10 bis 20 repraesentative Komplexe in Orthofoto/3D und Viewer pruefen;
3. die BEV-/AGWR-Semantik mit Datenanbieter oder Domaenenexperten klaeren;
4. fuer bestehende Runs messen, wie oft Punkte und Rollups auf Teilobjekte
   verteilt werden;
5. danach bewusst zwischen `erklaert`, Research-Aufgabe, Decision Record oder
   priorisiertem Next Step entscheiden.

## Evidenz und Reproduktion

- Viewer-/API-Gebaeude-ID:
  `{DBD078F7-3A17-4887-AFCA-F6EE43E24D8C}`
- Backendpfad fuer den schwarzen Fokusumriss:
  `backend/app/routers/ml.py`, Funktion
  `ml_building_context_visualization`
- Backendpfad fuer den gruenen ML-Gebaeudelayer:
  `backend/app/routers/ml.py`, Funktion `ml_buildings_tiles`
- statischer gruener BEV-Layer:
  `frontend/src/components/MapView.tsx`, Layer `bev`
- Fokusumriss und Candidate Areas:
  `frontend/src/components/MapView.tsx`, Layer
  `ml_focus_building_outline`, `ml_focus_candidate_fill` und
  `ml_focus_candidate_line`
- Datenaufbereitung:
  `pipeline/prepare_buildings.py`, BEV-Layer `BWK_8100_BAUWERK_F`
- PostGIS-Raumpruefung vom 2026-07-15: beide kleineren Objekte
  `ST_Touches=true`, `ST_Overlaps=false`; Punktzahlen im angegebenen Run
  separat nach `building_id` geprueft.

Die im Chat referenzierten Temp-Screenshots waren nach der Uebergabe nicht mehr
als Dateien verfuegbar und sind deshalb nicht als dauerhafte Evidenz im
Repository abgelegt. Bei einer spaeteren Triage sollen neue Screenshots unter
`assets/OBS-2026-001/` gesichert werden.

## Triage und Weiterleitung

- Triage: erfolgt 2026-07-23/27 (Meeting AUGMENTERRA + Nachdokumentation)
- `next_steps.md`: aufgenommen als P1-11 (Gebaeudedatenfusion) am 2026-07-27
- Research-Dokument: noch keines
- Decision Record: Richtungsentscheidung in den
  [`Meeting-Notes 2026-07-23`](../../meetings/2026-07-23_augmenterra_meeting_notes.md)
  (Beschluesse 4 und 5) festgehalten
- Execution Plan: noch keiner (folgt mit P1-11)
- aktive Methodik: unveraendert
