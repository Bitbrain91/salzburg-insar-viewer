# Analysebericht und Dateninventar: InSAR Stadt Salzburg

**Erstellt:** 27.11.2025
**Aktualisiert:** 18.03.2026
**Pruefstand:** Repository-Inhalt, Pipeline-Skripte, Parquet-/Tile-Artefakte und Backend-Schema wurden gegen den aktuellen Workspace verifiziert.

---

## 1. Kurzfazit

Der aktuelle Datenstand im Repository besteht nicht nur aus den drei InSAR-GeoPackages unter `data/Daten/`, sondern aus einer gesamten Verarbeitungskette:

1. **Quell-GPKGs** mit Bewegungs- und Amplitudendaten
2. **abgeleitete GeoParquet-Dateien** fuer Punkte, Zeitreihen, Verknuepfungen und Terrain-Kontext
3. **GeoJSONL- und MBTiles-Artefakte** fuer die Kartenanzeige
4. **PostGIS-Tabellen** fuer API-Abfragen im Backend

**Wichtige Antwort auf die Provenienzfrage:** Ja, die Zeitreihen stammen aus den GPKG-Dateien, aber nicht alle aus derselben Datei:

- Die **Verschiebungszeitreihen** stammen aus `data/Daten/Stadt_Salzburg.gpkg`
  - Layer `44`: Spalten `d20220405` bis `d20250320`
  - Layer `95`: Spalten `d20220409` bis `d20250324`
- Die **Amplitudenzeitreihen** stammen aus den beiden AMP-GPKGs
  - `data/Daten/ASC_T44_AMP.gpkg`: Spalten `D20220405` bis `D20250320`
  - `data/Daten/ASC_T95_AMP.gpkg`: Spalten `D20220409` bis `D20250324`

Die App arbeitet im laufenden Betrieb jedoch **nicht direkt auf den GPKGs**, sondern auf den daraus abgeleiteten Parquet-Dateien, PostGIS-Tabellen und MBTiles.

---

## 2. Gepruefte Quell-Datensaetze

### 2.1 Originale InSAR-GPKGs in `data/Daten/`

| Datei | Rolle | Layer | Punkte | Zeitliche Abdeckung | Geometrie | Dateigroesse |
|------|-------|-------|-------:|---------------------|-----------|-------------:|
| `ASC_T44_AMP.gpkg` | Rohdaten Amplitude | `AUSTRIA_SNT_T44_A_ES10968A004S_AMP` | 338.728 | 90 Termine, 05.04.2022 bis 20.03.2025 | `POINT`, EPSG:4326 | ca. 290 MB |
| `ASC_T95_AMP.gpkg` | Rohdaten Amplitude | `AUSTRIA_SNT_T95_D_ES10968A003S_4_AMP` | 336.497 | 88 Termine, 09.04.2022 bis 24.03.2025 | `POINT`, EPSG:4326 | ca. 285 MB |
| `Stadt_Salzburg.gpkg` | verarbeitete Bewegungsdaten | `44`, `95` | 247.388 + 303.376 = 550.764 | Track 44: 90 Termine, Track 95: 88 Termine | `POINT`, EPSG:4326 | ca. 540 MB |

### 2.2 Inhaltliche Bedeutung der drei GPKGs

| Datei | Inhalt | Einheit | Bemerkung |
|------|--------|---------|-----------|
| `ASC_T44_AMP.gpkg` | SAR-Amplitude / Rueckstreuintensitaet | dimensionslos | keine Bodenbewegung |
| `ASC_T95_AMP.gpkg` | SAR-Amplitude / Rueckstreuintensitaet | dimensionslos | keine Bodenbewegung |
| `Stadt_Salzburg.gpkg` | LOS-Verschiebung, Geschwindigkeit und Metadaten | mm, mm/Jahr, mm/Jahr^2 | fachlicher Hauptdatensatz fuer Bewegungsanalyse |

### 2.3 Verifizierte Attributstruktur der GPKGs

**AMP-Dateien (`ASC_T44_AMP.gpkg`, `ASC_T95_AMP.gpkg`)**

- `fid`
- `geom`
- `CODE`
- `DYYYYMMDD` fuer jede Amplitudenaufnahme

**Bewegungsdatei (`Stadt_Salzburg.gpkg`, Layer `44` und `95`)**

- `fid`
- `id`
- `file_id`
- `code`
- `track`
- `los`
- `height`
- `h_stdev`
- `vel`
- `v_stdev`
- `acc`
- `a_stdev`
- `season_amp`
- `s_amp_std`
- `season_phs`
- `s_phs_std`
- `coherence`
- `incidence_angle`
- `eff_area`
- `dYYYYMMDD` fuer jede Verschiebungsaufnahme
- `geometry`

---

## 3. Ableitungskette und Provenienz

### 3.1 Was wird aus welchem GPKG erzeugt?

Die Datei `pipeline/prepare_insar.py` verarbeitet die drei GPKGs wie folgt:

1. `Stadt_Salzburg.gpkg`, Layer `44` und `95`
   - werden zu punktbasierten GeoParquet-Dateien normalisiert
   - liefern die **Verschiebungszeitreihen** im Long-Format
2. `ASC_T44_AMP.gpkg` und `ASC_T95_AMP.gpkg`
   - liefern die **Amplitudenzeitreihen** im Long-Format
   - liefern zusaetzlich `amp_mean` und `amp_std` je Punkt
3. Die daraus entstehenden Punktdaten werden weiterverarbeitet zu
   - Gebaeude-Verknuepfungen
   - Terrain-Kontext
   - GeoJSONL
   - MBTiles
   - PostGIS-Tabellen

### 3.2 Fachlich korrekte Herkunft der Zeitreihen

**Verschiebung**

- Quelle: `Stadt_Salzburg.gpkg`
- Feldfamilie: `dYYYYMMDD`
- Exportziel: `data/parquet/insar_timeseries_t44.parquet` und `data/parquet/insar_timeseries_t95.parquet`

**Amplitude**

- Quelle: `ASC_T44_AMP.gpkg` und `ASC_T95_AMP.gpkg`
- Feldfamilie: `DYYYYMMDD`
- Exportziel: `data/parquet/insar_amplitude_timeseries_t44.parquet` und `data/parquet/insar_amplitude_timeseries_t95.parquet`

### 3.3 Wichtige fachliche Abgrenzung

- Die AMP-GPKGs sind **keine Bewegungsdatensaetze**
- `Stadt_Salzburg.gpkg` ist der **verarbeitete Bewegungsdatensatz**
- Im Repository ist **nicht** implementiert, wie `Stadt_Salzburg.gpkg` aus den AMP-Dateien erzeugt wurde
- Im Repository ist aber sehr wohl implementiert, wie **aus den vorhandenen GPKGs** die aktuelle operative Datenbasis fuer App und Backend erzeugt wird

---

## 4. Aktuelle abgeleitete Datensaetze im Repository

### 4.1 InSAR-GeoParquet

| Datei | Quelle | Zeilen | Inhalt |
|------|--------|-------:|--------|
| `data/parquet/insar_points_t44.parquet` | `Stadt_Salzburg.gpkg`, Layer `44` + AMP-Statistik | 247.388 | Punktdaten Track 44 inkl. `amp_mean`, `amp_std` |
| `data/parquet/insar_points_t95.parquet` | `Stadt_Salzburg.gpkg`, Layer `95` + AMP-Statistik | 303.376 | Punktdaten Track 95 inkl. `amp_mean`, `amp_std` |
| `data/parquet/insar_timeseries_t44.parquet` | `Stadt_Salzburg.gpkg`, Layer `44` | 22.264.920 | Verschiebungszeitreihe Track 44 |
| `data/parquet/insar_timeseries_t95.parquet` | `Stadt_Salzburg.gpkg`, Layer `95` | 26.697.088 | Verschiebungszeitreihe Track 95 |
| `data/parquet/insar_amplitude_timeseries_t44.parquet` | `ASC_T44_AMP.gpkg` | 30.485.520 | Amplitudenzeitreihe Track 44 |
| `data/parquet/insar_amplitude_timeseries_t95.parquet` | `ASC_T95_AMP.gpkg` | 29.611.736 | Amplitudenzeitreihe Track 95 |

**Bemerkung zu den Zeilenanzahlen**

- `247.388 x 90 = 22.264.920`
- `303.376 x 88 = 26.697.088`
- `338.728 x 90 = 30.485.520`
- `336.497 x 88 = 29.611.736`

Die Long-Format-Zeitreihen sind damit fuer den aktuellen Datenstand **vollstaendig befuellt**; es gibt keine erkennbaren Luecken nach dem `melt`/`dropna`-Export.

### 4.2 Gebaeude- und Terrain-Datensaetze

| Datei | Zeilen | Inhalt |
|------|-------:|--------|
| `data/parquet/gba_buildings.parquet` | 57.489 | GBA-Gebaeude |
| `data/parquet/osm_buildings.parquet` | 49.240 | OSM-Gebaeude |
| `data/parquet/insar_point_terrain.parquet` | 550.764 | Terrain-Kontext je InSAR-Punkt |
| `data/parquet/building_terrain_context.parquet` | 106.729 | Terrain-Kontext je Gebaeude |

Statische Punkt-Gebaeude-Linktabellen wurden aus dem produktiven Datenvertrag entfernt.
Die fachliche Zuordnung erfolgt dynamisch in den ML-Pipelines mit Track-, Hoehen- und
Einfallswinkelkontext.

**Terrain-Kontext**

- `insar_point_terrain.parquet`
  - deckt **alle 550.764** Bewegungs-Punkte ab
  - `terrain_source = srtm`
  - `terrain_resolution_m = 25.82`
- `building_terrain_context.parquet`
  - deckt **alle 106.729** Gebaeude aus GBA und OSM ab
  - Aufteilung: `gba` 57.489, `osm` 49.240
  - `terrain_source = srtm`
  - `terrain_resolution_m = 25.82`

### 4.3 GeoJSONL- und Tile-Artefakte

Die Datei `pipeline/build_tiles.sh` exportiert die GeoParquets nach GeoJSONL und erzeugt daraus MBTiles.

**GeoJSONL**

| Datei | Features |
|------|---------:|
| `data/geojson/insar_t44.geojsonl` | 247.388 |
| `data/geojson/insar_t95.geojsonl` | 303.376 |
| `data/geojson/gba.geojsonl` | 57.489 |
| `data/geojson/osm.geojsonl` | 49.240 |

**MBTiles in `data/tiles_v2/`**

| Datei | Bounds | Zoom | Tile-Anzahl |
|------|--------|------|------------:|
| `insar_t44.mbtiles` | 12.985767,47.751343,13.123573,47.853511 | 8-16 | 666 |
| `insar_t95.mbtiles` | 12.985729,47.751379,13.119458,47.853543 | 8-16 | 654 |
| `gba.mbtiles` | 12.950006,47.750001,13.149997,47.869998 | 0-15 | 465 |
| `osm.mbtiles` | 12.948391,47.749585,13.150468,47.850321 | 0-15 | 403 |

**Zusatzpfad `data/pmtiles/`**

- Es existiert zusaetzlich ein Verzeichnis `data/pmtiles/` mit gleichnamigen `.mbtiles`-Dateien
- Die aktuelle Backend-Default-Konfiguration zeigt jedoch auf **`data/tiles_v2/`**
- Fuer den laufenden App-Betrieb ist daher `data/tiles_v2/` der primaere Tile-Bestand

---

## 5. Verifizierte Bewegungsstatistik aus `Stadt_Salzburg.gpkg`

### 5.1 Kernstatistik pro Track

| Kennzahl | Track 44 | Track 95 |
|---------|---------:|---------:|
| Punkte | 247.388 | 303.376 |
| LOS | `A` | `D` |
| Datumsanzahl | 90 | 88 |
| Zeitraum | 05.04.2022 bis 20.03.2025 | 09.04.2022 bis 24.03.2025 |
| mittleres Intervall | 12,13 Tage | 12,41 Tage |
| minimales Intervall | 12 Tage | 12 Tage |
| maximales Intervall | 24 Tage | 36 Tage |
| mittlerer Einfallswinkel | 38,7863 Grad | 38,5246 Grad |
| Einfallswinkel min/max | 38,5305 bis 39,1528 | 38,1574 bis 38,7847 |
| Geschwindigkeit min | -17,0 mm/Jahr | -21,9 mm/Jahr |
| Geschwindigkeit max | +17,0 mm/Jahr | +17,9 mm/Jahr |
| Geschwindigkeit Mittelwert | -0,2544 mm/Jahr | +0,2537 mm/Jahr |
| Geschwindigkeit Median | -0,2 mm/Jahr | +0,3 mm/Jahr |
| Geschwindigkeit Std.-Abw. | 2,0288 mm/Jahr | 1,9787 mm/Jahr |
| mittlere `v_stdev` | 1,0381 mm/Jahr | 0,6552 mm/Jahr |
| mittlere Kohaerenz | 0,7211 | 0,7224 |
| mittlere saisonale Amplitude | 1,2627 mm | 1,1688 mm |
| maximale saisonale Amplitude | 13,72 mm | 11,92 mm |
| mittlere Beschleunigung | -0,0343 mm/Jahr^2 | -0,0070 mm/Jahr^2 |
| Beschleunigung min/max | -11,9 bis +11,0 mm/Jahr^2 | -11,6 bis +11,0 mm/Jahr^2 |

### 5.2 Klassifikation der Geschwindigkeiten

| Kategorie | Definition | Track 44 | Track 95 |
|----------|------------|---------:|---------:|
| stabil | -2 bis +2 mm/Jahr | 207.888 (84,0 %) | 254.972 (84,0 %) |
| leichte Senkung | -5 bis < -2 mm/Jahr | 19.976 (8,1 %) | 16.284 (5,4 %) |
| moderate Senkung | -10 bis < -5 mm/Jahr | 3.764 (1,5 %) | 3.458 (1,1 %) |
| starke Senkung | < -10 mm/Jahr | 1.104 (0,4 %) | 1.047 (0,3 %) |
| Hebung | > +2 mm/Jahr | 14.656 (5,9 %) | 27.615 (9,1 %) |

### 5.3 Kohaerenzklassen

| Kohaerenzklasse | Track 44 | Track 95 |
|----------------|---------:|---------:|
| > 0,8 | 87.494 (35,4 %) | 105.479 (34,8 %) |
| 0,6 bis 0,8 | 98.192 (39,7 %) | 124.780 (41,1 %) |
| < 0,6 | 61.702 (24,9 %) | 73.117 (24,1 %) |

### 5.4 CODE-Verknuepfung zwischen Quell- und Bewegungsdaten

| Vergleich | Treffer | Quote |
|----------|--------:|------:|
| AMP T44 `CODE` vs. Bewegungs-Layer `44` `code` | 246.865 von 247.388 | 99,79 % |
| AMP T95 `CODE` vs. Bewegungs-Layer `95` `code` | 242.836 von 303.376 | 80,04 % |

Interpretation:

- Track 44 ist nahezu vollstaendig zwischen AMP- und Bewegungsdaten deckungsgleich
- Track 95 weist deutlich mehr Codes im Bewegungsdatensatz auf, die in der AMP-Datei nicht vorkommen
- Diese Differenz ist real im Bestand vorhanden und sollte bei Punkt- oder Zeitreihenjoins beruecksichtigt werden

---

## 6. Raeumliche Abdeckung

### 6.1 Verifizierte Bounding Boxes der Quell-AMP-GPKGs

| Datensatz | West | Ost | Sued | Nord |
|----------|-----:|----:|-----:|-----:|
| `ASC_T44_AMP.gpkg` | 12,9750389 | 13,0996305 | 47,7505758 | 47,8541804 |
| `ASC_T95_AMP.gpkg` | 12,9742967 | 13,0947458 | 47,7497277 | 47,8542833 |

### 6.2 Verifizierte Bounding Boxes der verarbeiteten Bewegungsdaten

Fuer `Stadt_Salzburg.gpkg` sind die Bounding-Box-Werte in `gpkg_contents` nicht brauchbar, da dort fuer beide Layer die globale Ausdehnung `(-180, -90, 180, 90)` hinterlegt ist. Die tatsaechliche Ausdehnung wurde daher ueber die abgeleiteten GeoParquets und MBTiles verifiziert.

| Datensatz | West | Ost | Sued | Nord |
|----------|-----:|----:|-----:|-----:|
| Bewegungsdaten Track 44 | 12,9857670 | 13,1235728 | 47,7513428 | 47,8535112 |
| Bewegungsdaten Track 95 | 12,9857294 | 13,1194578 | 47,7513792 | 47,8535426 |

### 6.3 Gemeinsamer Kernbereich der Bewegungsdaten

- West: 12,9857670
- Ost: 13,1194578
- Sued: 47,7513792
- Nord: 47,8535112

Dieser Bereich entspricht dem fuer die App relevanten gemeinsamen Beobachtungsraum der beiden Tracks.

---

## 7. Operative Nutzung im Backend

Die folgenden Tabellen bilden den aktuellen operativen Datenkern des Backends:

- `insar_points`
- `insar_timeseries`
- `insar_amplitude_timeseries`
- `insar_point_terrain`
- `building_terrain_context`
- `gba_buildings`
- `osm_buildings`

Wichtige Konsequenz:

- Punktdetails kommen aus `insar_points`
- Zeitreihenabfragen kombinieren `insar_timeseries` und `insar_amplitude_timeseries`
- Terrain-Information wird ueber `insar_point_terrain` bzw. `building_terrain_context` angereichert
- Kacheln werden standardmaessig aus `data/tiles_v2/` ausgeliefert

---

## 8. Datenstand und Aktualitaet zum 18.03.2026

### 8.1 Was ist aktuell?

- Die **InSAR-Quell-GPKGs** sind im Repository vorhanden und inhaltlich konsistent
- Die **analytischen Kerndaten** in den bisherigen Abschnitten 2 bis 6 lassen sich direkt aus diesen GPKGs bestaetigen
- Die **abgeleiteten InSAR-Parquets** sind vorhanden und wurden zuletzt Anfang Februar 2026 erzeugt
- Die **Terrain-Kontext-Daten** wurden Mitte Maerz 2026 erzeugt und sind vollstaendig vorhanden
- Die **Tile-Artefakte** fuer Karte und Frontend sind vorhanden

### 8.2 Was im alten Bericht fehlte und nun ergaenzt wurde

- die explizite Trennung zwischen
  - Bewegungszeitreihen aus `Stadt_Salzburg.gpkg`
  - Amplitudenzeitreihen aus den AMP-GPKGs
- die operativ genutzten GeoParquet-Dateien
- Gebaeude-Datensaetze aus GBA und OSM
- der Terrain-Kontext fuer Punkte und Gebaeude
- GeoJSONL- und MBTiles-Ausgaben
- die Backend-relevanten Tabellen
- der Hinweis auf die fehlerhafte GPKG-Bounding-Box in `Stadt_Salzburg.gpkg`

---

## 9. Empfehlungen fuer die Datennutzung

| Anwendungsfall | Empfohlene Datenbasis |
|---------------|-----------------------|
| Rohdatenpruefung / Originalquelle | `data/Daten/*.gpkg` |
| Punktanalyse in der App / API | `data/parquet/insar_points_t44.parquet`, `data/parquet/insar_points_t95.parquet` bzw. PostGIS `insar_points` |
| Verschiebungszeitreihen | `data/parquet/insar_timeseries_t44.parquet`, `data/parquet/insar_timeseries_t95.parquet` bzw. PostGIS `insar_timeseries` |
| Amplitudenzeitreihen | `data/parquet/insar_amplitude_timeseries_t44.parquet`, `data/parquet/insar_amplitude_timeseries_t95.parquet` bzw. PostGIS `insar_amplitude_timeseries` |
| Punkt-Gebaeude-Zuordnung | dynamisch in `anomaly_local_v1` gegen `gba_buildings` |
| Terrain-Kontext | `data/parquet/insar_point_terrain.parquet`, `data/parquet/building_terrain_context.parquet` |
| Kartenanzeige | `data/tiles_v2/*.mbtiles` |

### Empfohlene Qualitaetsfilter fuer Bewegungsanalysen

- `coherence >= 0.6`, besser `>= 0.7`
- `velocity_std <= 1.5`
- bei Extremwerten zusaetzlich `coherence >= 0.8`
- bei Track-vergleichenden Analysen immer `track` und `code` gemeinsam verwenden

---

## 10. Schlussbewertung

Die Daten-Dokumentation ist jetzt auf den aktuellen Repo-Stand gebracht:

- Die drei InSAR-GPKGs sind weiterhin die **fachlichen Quelldaten**
- Die Zeitreihen stammen tatsaechlich aus diesen GPKGs
- Fuer die Anwendung relevant sind heute jedoch vor allem die **abgeleiteten Parquet-, Link-, Terrain- und Tile-Datensaetze**
- Der aktuelle Datenbestand des Repositories ist damit wesentlich umfassender als nur die drei Dateien unter `data/Daten/`

Diese Datei ist damit nicht mehr nur ein GPKG-Bericht, sondern eine belastbare Uebersicht ueber die tatsaechlich vorhandene Datenbasis des Projekts.
