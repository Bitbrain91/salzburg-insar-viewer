# P5-W2-T1 Audit: Raeumliche Layer-Ausrichtung in AOIs

- Ticket-Status: `green`
- Bewertung: `Daten korrekt` fuer die raeumliche Layer-Ausrichtung in den Pflicht-AOIs; der bekannte Linktabellen/API-Defekt aus `P5-W1-T2` bleibt davon getrennt `red`
- Geaenderte Dateien:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W2-T1.md`

## Scope und W1-Kontext

Read-only Audit fuer die Pflicht-AOIs Mirabell, Moosstrasse und Osthang.
Geprueft wurden:

- InSAR-Punkte gegen GBA- und OSM-Gebaeude
- Terrain-Kontext und Terrain-Rastertiles
- klassische MBTiles-Layer gegen DB-Geometrien
- ML-API und ML-Tiles gegen DB-Geometrien

Kein Code, keine Daten, kein Schema, kein DB-Reload, keine Regeneration.

W1-Kontext, bewusst mitgefuehrt:

- `P5-W1-T1` ist `green`
- `P5-W1-T2` ist `red`, weil `insar_to_gba` und `insar_to_osm` in der Live-DB leer sind
- dadurch bleiben die generischen Link-basierten Endpunkte
  `/api/points/{code}` (`gba_id`/`osm_id`) und
  `/api/buildings/{source}/{id}/points`
  fachlich defekt
- die unabhaengige Spatial-Pruefung dieses Tickets ist trotzdem moeglich, weil
  DB-Geometrien, ML-Queries, ML-API und MVT direkt auf `insar_points`,
  `gba_buildings`, `osm_buildings` und `ml_point_results` arbeiten

## DoD-Evidenz

### 1. AOI-Uebersicht

| AOI | InSAR-Punkte | GBA | OSM | Terrain-Kontext | Punkte in GBA | Punkte in OSM | Punkte <=15 m zu GBA | Punkte <=15 m zu OSM | GBA-OSM-Versatz |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Mirabell | `1481` (`44:700`, `95:781`) | `58` | `57` | Punkte `1481/1481`, GBA `58/58`, OSM `57/57` | `608` (`41.1%`) | `601` (`40.6%`) | `1348` (`91.0%`) | `1349` (`91.1%`) | `57/58` GBA mit OSM-Match; Centroid `p95=1.44 m`, `max=2.47 m`, IoU `min=0.815` |
| Moosstrasse | `1692` (`44:754`, `95:938`) | `152` | `152` | Punkte `1692/1692`, GBA `152/152`, OSM `152/152` | `570` (`33.7%`) | `570` (`33.7%`) | `1677` (`99.1%`) | `1676` (`99.1%`) | `149/152` GBA mit OSM-Match; Centroid `p95=0.20 m`, `max=2.62 m`, IoU `min=0.573` |
| Osthang | `616` (`44:289`, `95:327`) | `51` | `44` | Punkte `616/616`, GBA `51/51`, OSM `44/44` | `267` (`43.3%`) | `248` (`40.3%`) | `613` (`99.5%`) | `604` (`98.1%`) | `49/51` GBA mit OSM-Match; Centroid `p95=16.83 m`, `max=22.17 m`, aber lokal als Merge/Split-Unterschied eingegrenzt |

Einordnung:

- Terrain-Abdeckung ist in allen drei AOIs vollstaendig.
- Mirabell und Moosstrasse zeigen keinen nennenswerten GBA-vs-OSM-Shift.
- Osthang hat auffaellige Cross-Source-Ausreisser, aber kein Muster einer globalen
  Layer-Verschiebung.

### 2. Punkt-zu-Gebaeude-Plausibilitaet

Die Kernfrage war nicht, ob jeder AOI-Punkt auf einem Gebaeude liegen muss, sondern ob
die Layer in denselben Raumbezug fallen und die Punkt-naechste-Gebaeude-Verteilung
plausibel bleibt.

Wesentliche Befunde:

- Mirabell:
  - GBA `median=1.64 m`, `p95=19.65 m`
  - OSM `median=1.74 m`, `p95=19.73 m`
  - GBA und OSM verhalten sich praktisch identisch; die groesseren Distanzen liegen
    daher nicht an einem GBA-vs-OSM-Versatz, sondern an AOI-Flaechen ausserhalb von
    Footprints
- Moosstrasse:
  - GBA `median=1.90 m`, `p95=10.57 m`
  - OSM `median=1.89 m`, `p95=10.73 m`
  - sehr enge Plausibilitaet fuer beide Building-Layer
- Osthang:
  - GBA `median=0.91 m`, `p95=8.08 m`
  - OSM `median=1.31 m`, `p95=10.38 m`
  - trotz lokaler GBA/OSM-Modellunterschiede bleiben die Punktabstaende klein

Fazit aus der Punktsicht:

- kein Hinweis auf einen gemeinsamen Koordinatenfehler zwischen InSAR und GBA
- kein Hinweis auf einen gemeinsamen Koordinatenfehler zwischen InSAR und OSM
- Osthang zeigt leicht groessere OSM-Abstaende als GBA, aber nicht in einer Groesse,
  die auf einen systematischen Layer-Shift deutet

### 3. GBA-vs-OSM-Versatz: Osthang-Ausreisser eingeordnet

Nur Osthang erzeugt groessere Cross-Source-Centroidabstaende. Die Ursache ist lokal
und fachlich nachvollziehbar:

- sechs Match-Paare liegen ueber `5 m`, vier ueber `10 m`
- die Ausreisser konzentrieren sich nicht flaechig, sondern auf wenige IDs rund um
  `osm 54773351` und `osm 54773364`
- Beispiel:
  - `osm 54773351`: ca. `897.68 m2`
  - mehrere benachbarte GBA-Footprints (`255071634`, `54773351`, `54773352`,
    `54773360`, `54773361`): jeweils nur `100-421 m2`

Das ist kein Bild einer pauschalen Kartenverschiebung, sondern eines
Merge/Split-Unterschieds zwischen den beiden Building-Quellen. Die Punktdistanzen,
ML-Features und Tile/API-Geometrien bleiben in derselben Zone trotzdem konsistent.

### 4. API-Geometrie vs DB

Repraesentative AOI-Proben:

- Mirabell:
  - Sample-ML-Punkt `NQ9Y5YU01`, Track `95`
  - Sample-GBA-Gebaeude `324384`
  - Sample-OSM-Gebaeude `324384`
- Moosstrasse:
  - Sample-ML-Punkt `O2WTCOF01`, Track `44`
  - Sample-GBA-Gebaeude `96639520`
  - Sample-OSM-Gebaeude `96639520`
- Osthang:
  - Sample-ML-Punkt `NN9L9VD01`, Track `95`
  - Sample-GBA-Gebaeude `150506168`
  - Sample-OSM-Gebaeude `150506168`

Ergebnis:

- `GET /api/points?bbox=...`
  - Count stimmt in allen drei AOIs exakt mit der DB ueberein (`1481`, `1692`, `616`)
- `GET /api/points/{code}?track=...`
  - Punktgeometrie stimmt fuer alle Samples exakt mit der DB ueberein
  - `lon_diff_deg=0`, `lat_diff_deg=0`
  - `gba_id` und `osm_id` sind erwartungsgemaess `null`, weil `P5-W1-T2` die leeren
    Linktabellen bereits als harten Defekt belegt hat
- `GET /api/buildings/gba/{id}`
  - Building-GeoJSON fuer alle drei Samples exakt DB-gleich
- `GET /api/buildings/osm/{id}`
  - Moosstrasse und Osthang sind exakt DB-gleich
  - Mirabell hat `hausdorff=0`, aber `equals()` ist `false`; das ist ein
    Normalisierungs-/Ringordnungsdetail, kein Lagefehler
- `GET /api/buildings/gba/{id}/points`
  - liefert fuer alle drei Sample-Gebaeude `count=0`
  - das bestaetigt den getrennten W1-Defekt, nicht ein Geometrieproblem dieses Tickets
- `GET /api/ml/runs/{run}/buildings/gba/{id}/points`
  - Punkte-Set stimmt fuer alle Samples exakt mit DB/`ml_point_results` ueberein
  - Count: Mirabell `215`, Moosstrasse `53`, Osthang `47`
  - `max_coord_diff_deg <= 5e-10`
- `GET /api/ml/runs/{run}/buildings/gba/{id}/context`
  - Building-Geometrie fuer alle Samples exakt DB-gleich
  - jeweils `candidate_area_count=2`, `cluster_hull_count=2`

Damit ist die API-Geometrieschicht fuer Punkt-, Building- und ML-Geometrien in den
AOIs konsistent. Nur die alten Link-basierten Zuordnungsfelder bleiben defekt.

### 5. MVT/Tiles vs DB

#### Terrain

Fuer jede AOI-Mittelkoordinate waren beide Raster-Layer live abrufbar:

- `/raster/relief_hillshade/15/{x}/{y}.png` -> `200`
- `/raster/relief_slope/15/{x}/{y}.png` -> `200`

Gleichzeitig ist der Terrain-Kontext in der DB fuer alle Punkte und Gebaeude der drei
AOIs vollstaendig. Das stuetzt, dass Terrain-Raster und Terrain-Tabellen denselben
Raumbezug bedienen.

#### Klassische MBTiles

Die klassischen Tippecanoe-Tiles sind gepuffert. Deshalb duerfen rohe Tile-Counts
nicht gegen ein ungebuffertes `ST_TileEnvelope(...)` verglichen werden.
Fuer die eigentliche Geometriepruefung wurde deshalb je dekodiertes Feature gegen seine
DB-ID und DB-Geometrie geprueft.

Ergebnis:

- InSAR-Tiles `insar_t44` und `insar_t95`
  - alle dekodierten Feature-IDs existieren in `insar_points`
  - `max_coord_diff_deg` gegen die DB liegt je nach AOI/Track bei
    `1.339e-06` bis `1.341e-06` Grad, also grob unter `0.16 m`
- GBA- und OSM-Building-Tiles
  - alle dekodierten Building-IDs existieren in der DB
  - jedes dekodierte Polygon schneidet die gleichnamige DB-Geometrie

#### ML-Tiles

- ML-Punkt-Tiles
  - Mirabell `624`, Moosstrasse `971`, Osthang `531` dekodierte Features
  - alle IDs existieren in `ml_point_results` + `insar_points`
  - `max_coord_diff_deg` gegen die DB liegt bei `6.696e-07` bis `6.703e-07`
    Grad, also grob unter `0.08 m`
- ML-Building-Tiles
  - Mirabell `29`, Moosstrasse `105`, Osthang `43` dekodierte Features
  - alle Building-IDs existieren in den DB-Rollups
  - jedes dekodierte Polygon schneidet die gleichnamige GBA-Geometrie

Damit stimmen die live ausgelieferten Vector-Tiles mit den zugrunde liegenden
DB-Geometrien ueberein, soweit dies fuer gepufferte/geclippte MVT fachlich sinnvoll
pruefbar ist.

## Verwendete Kommandos / SQL / API

Shell / Services:

```bash
git status --short --branch
docker compose ps
cd backend
.venv-wsl/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

GeoPandas / SQLAlchemy / Requests:

```bash
backend/.venv-wsl/bin/python - <<'PY'
# AOI-Extraktion aus insar_points, gba_buildings, osm_buildings,
# insar_point_terrain, building_terrain_context und ml_point_results
# plus API-Vergleich gegen /api/* und /api/ml/*
PY
```

Outlier-Einordnung in Osthang:

```bash
docker compose exec -T db psql -U insar -d insar -P pager=off -c "<GBA/OSM area, centroid, bbox checks>"
```

Tile-Dekodierung:

```bash
mkdir -p /tmp/mvtdecode
cd /tmp/mvtdecode
npm init -y
npm install @mapbox/vector-tile pbf
node decode_url.js <tile-url> <layer> <z> <x> <y>
```

Direkt gepruefte Endpunkte:

- `/api/health`
- `/api/points?bbox=...`
- `/api/points/{code}?track=...`
- `/api/buildings/gba/{id}`
- `/api/buildings/osm/{id}`
- `/api/buildings/gba/{id}/points`
- `/api/ml/runs/{run}/points/{code}?track=...`
- `/api/ml/runs/{run}/buildings/gba/{id}/points`
- `/api/ml/runs/{run}/buildings/gba/{id}/context`
- `/mbtiles/{layer}/{z}/{x}/{y}.pbf`
- `/api/ml/runs/{run}/tiles/{z}/{x}/{y}.pbf`
- `/api/ml/runs/{run}/buildings/{z}/{x}/{y}.pbf`
- `/raster/relief_hillshade/{z}/{x}/{y}.png`
- `/raster/relief_slope/{z}/{x}/{y}.png`

## Lokale Verifikation

- `docker compose ps` zeigte laufende Services `db` und `mlflow`
- lokaler Backend-Start auf `127.0.0.1:8000` erfolgreich
- `GET /api/health` -> `{"status":"ok"}`
- alle Spatial-, API- und Tile-Pruefungen liefen read-only
- keine Datenregeneration, kein DB-Reload, keine Codeaenderung

## Offene Risiken

1. `P5-W1-T2` bleibt fachlich relevant:
   - die leeren DB-Linktabellen brechen weiterhin
     `/api/points/{code}`-Linkfelder und
     `/api/buildings/{source}/{id}/points`
   - das ist kein Geometriefehler, aber ein aktiver API-Defekt

2. Osthang hat einen echten GBA-vs-OSM-Modellunterschied:
   - lokale Merge/Split-Abweichungen koennen Cross-Source-Zuordnungen verfremden
   - die Befunde sprechen gegen einen globalen Layer-Shift, aber fuer eine spaetere
     Quelle-oder-Matching-Einordnung

3. Klassische MBTiles muessen mit Tippecanoe-Buffer bedacht werden:
   - Tile-Featurezahlen sind nicht mit einem nackten `ST_TileEnvelope(...)`
     gleichzusetzen
   - fuer Lagepruefungen ist ID-/Geometrie-Paritaet die belastbarere Metrik

## Schluss

Die Pflicht-AOIs Mirabell, Moosstrasse und Osthang zeigen fuer InSAR, GBA, OSM,
Terrain, klassische Tiles, ML-Tiles und ML-API keinen Hinweis auf einen systematischen
Koordinaten- oder Layer-Ausrichtungsfehler.

Der einzige harte Rot-Befund im Umfeld bleibt der bereits bekannte W1-Defekt der
leeren Linktabellen. Er verhindert generische API-Zuordnungen, faellt aber nicht als
raeumliche Fehlpositionierung der Layer auf.

Deshalb bleibt `P5-W2-T1` auf `green` mit der Bewertung:

`Daten korrekt` fuer die Layer-Ausrichtung in AOIs, bei getrennt weiter bestehendem
API-Linkfehler aus `P5-W1-T2`.
