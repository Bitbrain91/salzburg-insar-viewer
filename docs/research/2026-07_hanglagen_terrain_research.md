# Research: Hochaufloesende Gelaendemodelle + Hanglagen-Methodik

Stand: 2026-07-07
Anlass: Meeting-Beschluss 2026-06-19 ("Problem Hanglage" + Research-Task),
`../meetings/2026-06-19_ml_pipeline_meeting_notes.md` §6,
`../pipelines/anomaly_local_v1/next_steps.md` §3/§9.

## Methodik und Verlaesslichkeit

Deep-Research-Workflow (5 Suchwinkel, Quellen-Fetch, adversariale
3-Voter-Verifikation pro Claim). **Einschraenkung:** Der Lauf wurde durch
ein Nutzungslimit teilweise abgebrochen; der Synthese-Schritt und ein Teil
der Verifikationen fehlen. Kennzeichnung daher pro Aussage:

- **[V]** adversarial verifiziert (2-3 von 3 Voter, keine Refutation)
- **[U]** aus der Quelle extrahiert, aber NICHT fertig verifiziert

Der Methodik-Teil (Frage 3, LOS-Dekomposition/Hanglagen-Interpretation)
wurde vom Abbruch am staerksten getroffen — siehe Abschnitt 4 (Luecke).

## 1. Datenquellen-Befund: Oesterreich hat alles, was wir brauchen

### Land Salzburg (deckt Stadt Salzburg UND Bad Gastein ab)

- **[V]** Flaechendeckendes **DGM (DTM) 1 m** als Open Data, aus den jeweils
  aktuellsten ALS-Befliegungen; Lizenz **CC BY 4.0** (Land Salzburg,
  Referat Geodateninfrastruktur).
  Quelle: https://www.data.gv.at/datasets/093d4dec-8397-4faf-b690-b8cbe9a9dc31?locale=de
- **[V]** Ebenso **DOM (DSM) 1 m** als Open Data (CC BY 4.0) — damit ist ein
  **nDSM = DOM - DGM** direkt ableitbar (Dach-vs-Boden-Frage, Vegetation).
  Quelle: https://www.data.gv.at/katalog/dataset/e4198c21-673f-4d25-8dd2-b75fc847119e
- **[V]** ALS-Produkte in 0,5 m und 1 m mit **Hoehengenauigkeit 15 cm**;
  landesweit seit 2014, Befliegungen seit 2006; Download gemeindeweise
  ueber das OGD-Portal (DGM, DOM, Schummerung, Hoehenlinien, Rasterpunkte,
  Originalpunkte).
  Quelle: https://www.salzburg.gv.at/themen/salzburg/sagis/als-befliegungen
- **[U]** Download gemeindeweise als GeoTIFF+TFW und ASCII-Grid.

### BEV (oesterreichweit, konsistent fuer beide AOIs aus einer Hand)

- **[V]** **ALS-DTM 1 m oesterreichweit** (Serie Stichtag 15.09.2023,
  55 Kacheln), gemeinsames Produkt von Bund/Laendern; **CC-BY 4.0**,
  unentgeltlich; Hoehengenauigkeit generell **+/- 0,50 m**, im alpinen
  Gelaende groessere Abweichungen moeglich.
  Quellen: https://data.bev.gv.at/geonetwork/srv/api/records/5b510b4a-f592-4c02-991f-012cb1a65ea9 ,
  https://www.bev.gv.at/Services/Produkte/Digitales-Gelaendehoehenmodell/ALS-Hoehenraster.html
- **[V]** **Vertikaldatum-Falle:** BEV-ALS-Raster sind grundsaetzlich
  **EVRF2000 Austria, orthometrisch (EPSG:9274)** — AUSSER alle Kacheln der
  Serie Stichtag 15.09.2021: **Adria/Triest Gebrauchshoehen (EPSG:5778)**.
  Heterogene Datums je Serie; vor Nutzung pro Kachel pruefen.

### Globale Fallbacks (fuer Phase 3 / Gebiete ohne ALS)

- **[V]** In einem Vergleich von 5 freien globalen DEMs gegen 65
  LiDAR-Referenz-DTMs rangiert **FABDEM konstant auf Platz 1** (vor
  Copernicus GLO-30); in **bebautem Gebiet: FABDEM LE95 2,61 m** vs.
  AW3D30 7,42 m. **Vertikalfehler waechst ~linear mit der Hangneigung bis
  ~30-35 Grad, danach schneller** — globale 30-m-DEMs degradieren genau in
  unseren Hang-Settings.
  Quelle: https://www.tandfonline.com/doi/full/10.1080/17538947.2024.2308734
- **[U]** FABDEM = GLO-30 mit ML-entferntem Gebaeude-/Baum-Bias (globales
  Quasi-DTM, ~30 m); **Lizenz nur non-commercial** — fuer AUGMENTERRA-
  Produktnutzung relevant! Copernicus GLO-30 ist ein **DSM** (kein DTM),
  Vertikaldatum **EGM2008 (EPSG:3855)**, absolute vertikale Genauigkeit
  <4 m (LE90), relativ <2 m bei Hangneigung <=20 %, <4 m darueber.
  Quellen: https://iopscience.iop.org/article/10.1088/1748-9326/ac4d4f ,
  Copernicus DEM Product Handbook (dataspace.copernicus.eu).

### Konsequenz Datenwahl

| Zweck | Empfehlung |
| --- | --- |
| Slope/Aspect/Relief (Ersatz SRTM 25 m) | Land-Salzburg-DGM 1 m (15 cm Genauigkeit) |
| `height_above_ground_m` (Dach vs. Boden) | DGM 1 m + nDSM (DOM-DGM); BEV `ground_*_m` als Kreuzcheck |
| Oesterreich-Rollout | BEV ALS-DTM 1 m (ein Datum, eine Lizenz) |
| Global (Phase 3) | FABDEM (Lizenz pruefen!) sonst GLO-30 mit Slope-Fehlermodell |

## 2. Vertikaldatum-Harmonisierung (InSAR ellipsoidisch vs. DTM orthometrisch)

Befund aus den Quellen [V/U] + Handbuch-Kontext (AUGMENTERRA-Attribute:
`height` ist WGS84-ellipsoidisch):

1. Oesterreichische ALS-Modelle: orthometrisch **EVRF2000 (EPSG:9274)**
   bzw. teils **Adria/Triest (EPSG:5778)** — je Serie pruefen.
2. Globale Modelle: **EGM2008-Geoid** (GLO-30, FABDEM).
3. Harmonisierung: InSAR-Hoehe(ellipsoidisch) - Geoid-Undulation N =
   orthometrische Hoehe. Fuer Oesterreich die amtliche
   Geoid-/Hoehentransformation (BEV-Transformationsdienste) verwenden;
   fuer globale Modelle EGM2008-N. Differenzen EVRF2000 vs. Adria/Triest
   sind dm-Bereich und NICHT vernachlaessigbar fuer `height_above_ground_m`.
4. Empfehlung: EIN Ziel-Datum je Gebiet festlegen (EVRF2000), alle Quellen
   dorthin transformieren, `height_datum`-Metadatum mitfuehren (passt in
   das normalisierte Quellen-Schema aus
   `../pipelines/anomaly_local_v1/bev_building_source_concept.md` §4).

## 3. Erste Methoden-Anker fuer Hanglagen (aus Nachbar-Research)

Aus dem parallelen Feature-Research (siehe
`2026-07_feature_zeitreihen_research.md`) einschlaegig:

- **[U]** SARClust clustert Verschiebungs-Zeitreihen multivariat auf
  **(vertikal + Ost-West)-dekomponierten** Serien — d. h. die Literatur
  arbeitet nach 2D-Dekomposition weiter, nicht auf rohen LOS-Serien.
  Quelle: https://www.mdpi.com/2071-1050/15/4/3728
- **[U]** Cross-Geometrie-/Cross-Sensor-Konsistenz (Sentinel-1, TSX,
  ALOS-2) ist ein etabliertes No-Ground-Truth-Validierungsmuster.
  Quelle: https://doi.org/10.3390/rs16081375
- Handbuch-Basis (verifiziert im Repo, TRE §2.1.2): 2D-Dekomposition
  liefert vertikal + Ost-West, **Nord-Sued ist nicht beobachtbar**;
  Dekomposition erzeugt Pseudo-MPs auf Rasterzellen mit reduzierter
  Lagegenauigkeit — fuer Gebaeude-Ebene nur mit Vorsicht.

## 4. Abdeckungsluecke und Follow-up

Der Teil "State of the Art Hanglagen-Interpretation" (Downslope-/
Falllinien-Projektion, aspect-abhaengige Toleranz-/Konfidenzmodelle,
Landslide-InSAR-Uebertragbarkeit auf Gebaeude) wurde durch den
Workflow-Abbruch nicht belastbar abgedeckt. Follow-up-Task (phase8,
klein): gezielte Literatur-Runde NUR zu diesen drei Methodenfragen;
bis dahin gilt die konservative Linie aus dem Decision-Kontext:
**Hang-Uneinigkeit nicht wegoptimieren, sondern slope-/aspect-abhaengig
in die Konfidenz einpreisen** (Cross-Track-Toleranz ist bereits
slope-abhaengig: `allowed_diff = 1.0 + 0.15 * slope_mean_deg`).

## 5. Konkrete Empfehlungen fuer `anomaly_local_v1`

1. **DTM-Upgrade jetzt planbar:** Land-Salzburg-DGM/DOM 1 m (CC BY 4.0)
   als Terrain-Quelle statt SRTM 25 m; nDSM ableiten. Aufwand liegt im
   Pipeline-Prepare (Mosaik, Resampling, Datum), nicht in der Beschaffung.
2. **Vertikaldatum-Konzept vor `height_above_ground_m`:** ohne saubere
   EVRF2000-Harmonisierung bleibt das Feature riskant (so schon
   `next_steps.md` §9 vermutet — jetzt mit konkreten Datums belegt).
3. **Aspect aus 1-m-DGM** statt SRTM fuer die geplante aspect-abhaengige
   Cross-Track-Toleranz/Konfidenz.
4. **FABDEM-Lizenz klaeren**, bevor es in Produktnaehe kommt
   (non-commercial); GLO-30 als unkritischer globaler Fallback.
5. Follow-up-Research (Abschnitt 4) als kleines phase8-Ticket.
