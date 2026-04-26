# `anomaly_local_v1` Terrain-Entscheidung

Stand: 2026-04-25
Ticket: `P4-W1-T1`
Status: decided

## Kurzentscheidung

Der bestehende Terrain-Kontext reicht fuer `P4` nur als dokumentierter Status quo und fuer die
bereits produktive, slope-basierte P3/P4-Basis. Er reicht **nicht** als Grundlage fuer neue
Aspect-/Terrain-Logik in `anomaly_local_v1`.

Entscheidung:

1. `SRTM` bleibt bis auf Weiteres unveraendert fuer den bestehenden Kontext, die aktuelle
   Harness-Toleranz und die bestehende Terrain-/Relief-Karte.
2. Vor jeder Aspect-Integration oder hoehenbasierten Terrain-Erweiterung ist ein Datenupgrade auf
   ein hochaufloesendes **DTM** noetig.
3. Bevorzugte Zielquelle ist das **BEV ALS-DTM 1 m**. Es ist amtlich, oesterreichweit,
   unentgeltlich, reproduzierbar und dokumentiert den Hoehenbezug explizit.
4. `DSM` bzw. spaeter ein daraus abgeleitetes `nDSM` sind nur Zusatzkontext, nicht die neue
   Terrain-Basis fuer `anomaly_local_v1`.

## Status quo im Repo

Aktueller Repo-Stand, lokal geprueft am 2026-04-25:

- `P3-W3-T2` ist gruener Pflicht-Stand mit den Referenz-Runs
  `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7` (Mirabell),
  `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` (Moosstrasse) und
  `71770d85-ec8c-4354-840a-545fa0b7c757` (Osthang-Stressbereich).
- `pipeline/prepare_terrain.py` erzeugt ausschliesslich einen `srtm`-basierten Terrain-Stack
  (`elevation`, `hillshade`, `slope`, `aspect`) und schreibt `terrain_source = "srtm"`.
- `data/parquet/insar_point_terrain.parquet` hat `550764` Zeilen mit
  `terrain_source = srtm`, `terrain_resolution_m = 25.82`; `aspect_deg` ist auf Punkt-Level
  vorhanden.
- `data/parquet/building_terrain_context.parquet` hat `106729` Zeilen mit
  `terrain_source = srtm`, `terrain_resolution_m = 25.82`; Building-Level-Aspect existiert
  aktuell nicht.
- `backend/sql/migrations/003_terrain_context.sql` und
  `backend/app/ml/pipelines/anomaly_local_v1.py` nutzen auf Building-Level nur
  `slope_mean_deg`, `slope_max_deg` und `relief_range_m`.
- `backend/app/ml/evaluation/phase2_harness.py` setzt
  `allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg`.
- `docs/pipelines/anomaly_local_v1/methodik.md` dokumentiert bereits, dass Punkt-`height`
  ellipsoidisch ist und absolute Punkt-vs-Terrain-Hoehendifferenzen ohne Datumsharmonisierung
  nicht belastbar sind.
- `frontend/src/components/MapView.tsx` nutzt die bestehenden Raster-Layer
  `relief_hillshade` und `relief_slope`; `InspectorPanel.tsx` zeigt Punkt-Aspect, aber kein
  Building-Aspect.

Konsequenz aus dem Status quo:

- Die aktuelle Terrain-Nutzung ist **additiv und grob topographisch**.
- Sie ist fachlich ausreichend fuer die bestehende P3-Logik.
- Sie ist fachlich **nicht ausreichend** fuer neue gebaeude- oder hangorientierte
  Aspect-Entscheidungen.

## DTM vs. DSM vs. nDSM

| Modell | Inhalt | Staerken | Risiken fuer `anomaly_local_v1` | Eignung |
| --- | --- | --- | --- | --- |
| `DTM` | nackte Gelaendeoberflaeche ohne Gebaeude/Bewuchs | beste Basis fuer Hangneigung, Hangausrichtung und spaeter "Hoehe ueber Grund" | erfordert Datumsharmonisierung, wenn Punkt-`height` absolut gegen Terrain gerechnet wird | **bevorzugte Terrain-Basis** |
| `DSM` | sichtbare Oberflaeche inkl. Daecher und Vegetation | brauchbar fuer grobe Relief-/Oberflaechenkontexte und Visualisierung | verwechselt Terrain mit Daecher/Baeumen; Aspect kann in urbanen Bereichen oder am Waldrand systematisch falsch sein | **nur Kontext**, nicht neue Terrain-Basis |
| `nDSM = DSM - DTM` | Objekthoehen ueber Grund | sinnvoll fuer Vegetation, Baukoerperhoehen und spaetere Reflexionsinterpretation | kein Terrainmodell; ungeeignet als direkte Basis fuer slope/aspect des Gelaendes | **optional spaeterer Zusatzkontext** |

Bewertung fuer dieses Projekt:

- Fuer eine **Terrain-/Aspect-Entscheidung** ist `DTM` das richtige Modell.
- Fuer die spaetere Frage `Dach/Baum/Gelaende?` kann ein `nDSM` nuetzlich sein, ist aber
  derzeit kein harter Blocker.
- Das heutige `SRTM` ist als globales Radar-`DSM` zu grob fuer gebaeudenahe Aspect-Logik.

## Salzburg-/AT-Datenquellen

Alle externen Quellen in diesem Abschnitt wurden am **2026-04-25** abgerufen.

| Quelle | Modell | Aufloesung | Abdeckung | Lizenz / Zugang | Reproduzierbarkeit | Hoehenbezug / Risiko | Eignung fuer `anomaly_local_v1` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Repo-Status quo: USGS/NASA `SRTM 1 Arc-Second Global` | globales `DSM` | ca. 30 m; im Repo lokal `25.82 m` nach Warp/Sampling | global, Salzburg enthalten | `Public Domain`, Download ueber EarthExplorer | sehr hoch | `EGM96`; nicht kompatibel zu ellipsoidischen Punkt-Hoehen ohne Transformation | ausreichend fuer groben Kontext, **nicht** fuer neue Aspect-Logik |
| Copernicus DEM (`EEA-10`, `GLO-30`, `GLO-90`) | `DEM`/nahe `DTM`, aber nicht gebaeudescharf | 10 m (EEA), 30 m, 90 m | Europa bzw. global | frei ueber Copernicus Data Space, mit Copernicus-Nutzungs-/Zitierhinweisen | sehr hoch | `EGM2008`; weiterhin Datumstransformation noetig | besser als SRTM, aber fuer Building-nahe Aspect-Logik in Salzburg weiterhin zu grob |
| Stadt Salzburg `Digitales Hoehenmodell` | 5 m Gelaende- und Oberflaechenmodell | 5 m | Stadtgemeinde Salzburg | `CC BY 3.0 AT` | mittel bis hoch; amtlich, aber nur Stadtgebiet und Stand 2016 | Hoehenbezug in der geprueften OGD-Seite nicht explizit genannt | brauchbar fuer Stadt-Ausschnitte, aber zu lokal und fuer AOIs ausserhalb der Stadt ungeeignet |
| Land Salzburg ALS-OGD (`DGM`/`DOM` 1 m, gemeindeweise) | `DTM` und `DSM` | 1 m | ganz Land Salzburg, gemeindeweise; 6-Jahres-Zyklus | OGD Land Salzburg, `CC BY 4.0` | hoch innerhalb Salzburg; freie OGD-Bereitstellung | horizontale Projektion ist oeffentlich dokumentiert (`BMN M31`), der vertikale Bezug ist in den geprueften OGD-Seiten aber nicht klar ausgewiesen | fachlich gut, aber Hoehenbezug fuer absolute Hoehenlogik vorab klaeren |
| Land Salzburg `DGM 5 m` / `DOM 5 m` | `DTM` / `DSM` | 5 m | ganz Land Salzburg | `CC BY 4.0` | hoch | Metadaten nennen Luftbild-/ALS-Herkunft und `BMN M31`; vertikaler Bezug bleibt in den geprueften Auszuegen unklar | besser als SRTM, aber gegenueber 1 m DTM kein sinnvoller Zielstand |
| BEV `ALS-DTM Hoehenraster (DGM) 1 m` | amtliches `DTM` | 1 m | ganz Oesterreich, 50 km x 50 km Kacheln, jaehrliches Gesamtmosaik | unentgeltlicher Download ueber `data.bev.gv.at`, BEV-Nutzungsbedingungen | **sehr hoch** | grundsaetzlich `EVRF2000 Austria` (`EPSG:9274`), Ausnahme fuer Kacheln mit Stichtag `15.09.2021`: `EPSG:5778` | **beste Zielquelle fuer Terrain-Basis** |
| BEV `ALS-DSM Hoehenraster (DOM) 1 m` | amtliches `DSM` | 1 m | ganz Oesterreich, 50 km x 50 km Kacheln, jaehrliches Gesamtmosaik | unentgeltlicher Download ueber `data.bev.gv.at`, BEV-Nutzungsbedingungen | **sehr hoch** | grundsaetzlich `EPSG:9274`, Ausnahme `15.09.2021`: `EPSG:5778` | guter Zusatz fuer spaeteres `nDSM`, aber nicht neue Terrain-Basis |

### Einordnung der Quellen

- **Fuer Salzburg-only und schnelle fachliche Tests** waeren die offenen `1 m`-ALS-Daten des
  Landes Salzburg technisch ausreichend interessant.
- **Fuer eine belastbare Repo-Entscheidung** ist das BEV-`ALS-DTM 1 m` die bessere Zielquelle:
  oesterreichweite Abdeckung, jaehrliche Gesamtmosaike, expliziter Hoehenbezug und amtlicher
  Transformationspfad.
- `Copernicus DEM` und `SRTM` bleiben Referenzquellen fuer grobe, reproduzierbare Hintergruende,
  nicht fuer gebaeudescharfe Aspect-Integration.

## Vertikaldatum- und Hoehenbezug-Risiko

Das zentrale Risiko ist nicht nur die Rasteraufloesung, sondern der **Hoehenbezug**:

- Die Punkt-`height` im Repo ist laut `methodik.md` **ellipsoidisch**.
- `SRTM` ist laut USGS im vertikalen Bezug `EGM96`.
- `Copernicus DEM` nutzt `EGM2008`.
- Das BEV-`ALS-DTM 1 m` ist grundsaetzlich in `EVRF2000 Austria` (`EPSG:9274`) dokumentiert,
  mit einer klar benannten Ausnahme fuer Kacheln mit Stichtag `15.09.2021` in `EPSG:5778`.
- Das BEV dokumentiert mit `Hoehen-Grid` und `Hoehen-Grid plus Geoid` auch den offiziellen
  Transformationspfad zwischen ellipsoidischen, orthometrischen und oesterreichischen
  Gebrauchshoehen.
- Bei den geprueften Land-Salzburg-OGD-Seiten ist der vertikale Bezug nicht in derselben
  Eindeutigkeit ausgewiesen; daraus folgt ein zusatzliches Dokumentationsrisiko fuer absolute
  Hoehenlogik.

Bewertung:

- Solange Punkt-`height` nicht sauber in denselben Hoehenbezug wie das Ziel-DTM transformiert
  wird, bleiben absolute Punkt-vs-Terrain-Hoehendifferenzen fuer `anomaly_local_v1` **nicht
  belastbar**.
- Dieses Risiko blockiert **nicht** die heutige slope-basierte P3/P4-Basis.
- Dieses Risiko blockiert aber jede neue Logik, die `Aspect`, `Hoehe ueber Grund` oder
  gebaeude-scharfe Terraininterpretation fachlich stark gewichten will.

## Entscheidung: Reicht der bestehende Terrain-Kontext fuer P4?

### Antwort

**Teilweise, aber nicht fuer Aspect-Integration.**

Genauer:

- **Ja** fuer:
  - den unveraenderten P3/P4-Status quo
  - die bestehende Harness-Toleranz auf Basis von `slope_mean_deg`
  - die bestehende Terrain-/Relief-Karte
  - reine Dokumentation, Kontext oder Visualisierung ohne neue Logik
- **Nein** fuer:
  - Aspect als neue Regel-, Gate- oder Toleranzlogik
  - hoehenbasierte Punkt-vs-Terrain-Interpretation
  - gebaeudescharfe Terrainentscheidungen in steilen oder urbanen Bereichen

### Begruendung

1. `SRTM` ist ein grobes `DSM` und bildet in bebauten oder bewachsenen Bereichen nicht die nackte
   Terrainflaeche ab.
2. `25.82 m` lokale Rasterweite ist fuer `anomaly_local_v1` zu grob, wenn neue Logik auf
   Building-Ebene argumentieren soll.
3. Das Repo hat noch kein Building-Aspect und keine DTM-basierte Aggregation.
4. Das Vertikaldatum ist fuer absolute Hoehenlogik noch nicht harmonisiert.
5. Mit dem BEV-`ALS-DTM 1 m` existiert seit 2025 eine amtliche, unentgeltliche und klar
   dokumentierte Upgrade-Option, die fachlich den besseren Zielstand darstellt.

## Konsequenz fuer `anomaly_local_v1`

Die Konsequenz fuer Phase 4 ist bewusst konservativ:

1. **Keine Aspect-Integration auf Basis des heutigen SRTM-Kontexts.**
2. Wenn `P4-W2` Aspect ueberhaupt weiterverfolgt, dann nur nach dokumentierter
   Datenupgrade-Entscheidung auf `DTM 1 m`-Basis.
3. Bevorzugter Zielstand fuer eine spaetere Regeneration:
   - Terrain-Basis: `BEV ALS-DTM 1 m`
   - optionaler Zusatzkontext: `BEV ALS-DOM 1 m` und daraus abgeleitetes `nDSM`
4. Bis dahin bleibt `anomaly_local_v1` beim bestehenden Terrain-Vertrag:
   - `slope_mean_deg`
   - `slope_max_deg`
   - `relief_range_m`
   - keine absolute Punkt-vs-Terrain-Hoehendifferenz
   - keine neue Aspect-Regel
5. Die bestehende Terrain-/Relief-Karte bleibt unveraendert.

## Empfohlener Folgeentscheid fuer `P4-W2`

Falls `P4-W2` auf diesem Dokument aufsetzt, ist der fachlich saubere Default:

- `Aspect = defer`, solange kein `DTM 1 m`-Upgrade plus Hoehenbezugskonzept beschlossen ist.

Eine spaetere, additive Rueckkehr ist moeglich, aber erst auf der neuen Terrain-Basis.

## Quellen

Amtliche und primaere Quellen, abgerufen am 2026-04-25:

- Stadt Salzburg, `Digitales Hoehenmodell der Stadt Salzburg`:
  <https://www.data.gv.at/katalog/dataset/888a68db-435d-4d37-974b-d484198dd602>
- Land Salzburg, ALS-Befliegungen / 1 m DGM-DOM / 6-Jahres-Zyklus:
  <https://www.salzburg.gv.at/themen/salzburg/sagis/als-befliegungen>
- Land Salzburg, Geobasisdaten und ALS-Produktbeschreibung:
  <https://www.salzburg.gv.at/themen/salzburg/sagis/geobasisdaten-und-geofachdaten>
- Land Salzburg, OGD-Nutzungsbedingungen (`CC BY 4.0`):
  <https://www.salzburg.gv.at/themen/statistik/ogd/rechtliches-und-netiquette>
- Land Salzburg, `Digitales Oberflaechenmodell 5 m (DOM) Land Salzburg`:
  <https://www.data.gv.at/katalog/dataset/e4754058-584b-43e4-b584-72df070bdb60>
- Land Salzburg, OGD-Suche `Gelaendemodell`:
  <https://www.data.gv.at/katalog/dataset/?organization=land-salzburg&tags=Gel%C3%A4ndemodell>
- BEV, `Kostenfreier Zugang zum Digitalen Gelaendehoehenmodell des BEV`:
  <https://www.bev.gv.at/Presse/Aktuelles/Kostenfreier-Zugang-DGM.html>
- BEV, `Digitales Gelaendehoehenmodell (ALS-DGM) - Hoehenraster`:
  <https://www.bev.gv.at/Services/Produkte/Digitales-Gelaendehoehenmodell/ALS-Hoehenraster.html>
- BEV, `Digitales Oberflaechenmodell (ALS-DOM) - Hoehenraster`:
  <https://www.bev.gv.at/Services/Produkte/Digitales-Oberflaechenmodell/ALS-Oberflaechenmodell.html>
- BEV, `Hoehen-Grid`:
  <https://www.bev.gv.at/Services/Produkte/Grundlagenvermessung/Hoehen-Grid.html>
- BEV, `Hoehen-Grid plus Geoid`:
  <https://www.bev.gv.at/Services/Produkte/Grundlagenvermessung/Hoehen-Grid-plus-Geoid.html>
- USGS, `SRTM 1 Arc-Second Global`:
  <https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1>
- USGS, `SRTM Overview`:
  <https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm>
- Copernicus DEM Produktseite:
  <https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM>
- Copernicus DEM Product Handbook:
  <https://dataspace.copernicus.eu/sites/default/files/media/files/2024-06/geo1988-copernicusdem-spe-002_producthandbook_i5.0.pdf>
