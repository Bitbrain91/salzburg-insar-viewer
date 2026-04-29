# `anomaly_local_v1` Phase-5 Data Correctness Report

Stand: 2026-04-26
Status: audit-completed
Gesamtbewertung: `nicht data-correct green`; Phase 5 ist als Audit abgeschlossen, aber mit `red`- und `inconclusive`-Befunden.

## Gesamtfazit

`P5` ist audit-completed. Die Pflicht-AOIs Mirabell, Moosstrasse und Osthang wurden
in den vorliegenden Tickets abgedeckt. Die aktiven Daten-, Geometrie- und
Candidate-Area-Pfade sind ueber weite Strecken konsistent, aber zwei `red`-Befunde
verhindern einen Gesamtstatus `data korrekt`:

1. Die Live-DB-Linktabellen `insar_to_gba` und `insar_to_osm` sind leer, obwohl die
   Parquet-Artefakte befuellt sind und die generische API diese Tabellen weiter nutzt.
2. Dieser Linktabellenfehler ist in der echten UI user-sichtbar:
   Punkt-Inspector zeigt fehlende Gebaeudelinks, generischer Gebaeude-Inspector zeigt
   `Linked InSAR Points = 0`.

Zusatzlich bleibt ein Punkt bewusst `inconclusive`: Die intern implementierte
Track-/LOS-/Kamera-Semantik ist konsistent, aber eine im Repo direkt auditierbare
autoritative Quelle fuer die echte physikalische Satelliten-Blickrichtung wurde nicht
belegt.

## Nachtrag: Track-Geometrie von AUGMENTERRA bestaetigt

Nach Abschluss des P5-Audits hat AUGMENTERRA am 2026-04-28 die Track-Geometrie und
LOS-Vorzeichenkonvention beantwortet. Der historische P5-Befund bleibt als Auditstand
korrekt, ist aber fuer Folgearbeit nicht mehr offen.

Neue Quelle:

- `docs/pipelines/anomaly_local_v1/ps_insar_semantics_decision.md`

Folgephase:

- `P6` wertet die AUGMENTERRA-/TRE-ALTAMIRA-Handbooks als fachliche Validierung der
  PS-InSAR-Punktinterpretation aus und prueft danach, ob die bisherige X-only-Ost-/
  West-Candidate-Area auf einen echten 2D-Range-Vektor aus Track `44`/`95`
  umgestellt werden soll.

## Nachtrag: Legacy-Linkpfad entfernt

Nach dem Audit wurde entschieden, die statischen Punkt-Gebaeude-Linktabellen nicht
neu zu laden, sondern fachlich sauber zu entfernen. Der alte Vertrag `within` /
`nearest <= 15 m` bildet die produktive `anomaly_local_v1`-Zuordnung mit Track-,
Hoehen- und Einfallswinkelkontext nicht ab.

Bereinigt wurden:

- generische Linkfelder `gba_id` / `osm_id` aus `GET /api/points/{code}`
- generischer Endpoint `GET /api/buildings/{source}/{id}/points`
- Inspector-Anzeigen `Linked GBA`, `Linked OSM`, `Linked InSAR Points`
- DB-Schema und Loader fuer `insar_to_gba` / `insar_to_osm`
- Link-Generator und lokale Link-Parquet-Artefakte

Die fachliche Punkt-Gebaeude-Zuordnung bleibt Aufgabe der dynamischen ML-Pipeline
und ihrer `/api/ml/runs/...`-Endpunkte.

## Ticket-Matrix

| Ticket | Status | Integrierter Befund | Evidenz |
| --- | --- | --- | --- |
| `P5-W1-T1` | `green` | Datenlinie, CRS-Vertrag, Parquet-/Tile-Baseline und Transformationskette sind konsistent. | [phase5_P5-W1-T1.md](artifacts/phase5_P5-W1-T1.md) |
| `P5-W1-T2` | `red` | Live-DB weicht bei `insar_to_gba` und `insar_to_osm` hart vom Artefaktstand ab; generische API ist betroffen. | [phase5_P5-W1-T2.md](artifacts/phase5_P5-W1-T2.md) |
| `P5-W2-T1` | `green` | Raeumliche Layer-Ausrichtung passt in Mirabell, Moosstrasse und Osthang; kein systematischer Koordinatenfehler. | [phase5_P5-W2-T1.md](artifacts/phase5_P5-W2-T1.md) |
| `P5-W2-T2` | `inconclusive` | Interne Track-/LOS-/Kamera-Semantik ist konsistent; echte physikalische Blickrichtung im Repo nicht autoritativ belegt. | [phase5_P5-W2-T2.md](artifacts/phase5_P5-W2-T2.md) |
| `P5-W3-T1` | `green` | Adaptive Candidate-Area-Formel, Track-Signatur und UI-Trackfilter sind konsistent. | [phase5_P5-W3-T1.md](artifacts/phase5_P5-W3-T1.md) |
| `P5-W3-T2` | `red` | Echte UI funktioniert, aber der W1-Linktabellenfehler bleibt direkt sichtbar und user-wirksam. | [phase5_P5-W3-T2.md](artifacts/phase5_P5-W3-T2.md) |
| `P5-W4-T1` | `green` | Dieser Abschlussbericht und der aktualisierte Phase-5-Plan integrieren alle Ticketbefunde und Folgegates. | dieses Dokument + `phase5_data_correctness_plan.md` |

## Integrierte Befunde nach Pruefachse

### 1. Datenlinie, CRS-Vertrag und Artefakt-Baseline - `green`

Die aktive Datenkette `Raw -> Parquet -> PostGIS/API -> Tiles` ist fuer InSAR, GBA,
OSM, Terrain und MBTiles belastbar nachvollziehbar. Die zentralen CRS-Uebergaenge
`4326 -> 32633 -> 4326` fuer metrische Geometrie sowie `4326 -> 25833 -> 3857` fuer
Terrain sind im Code und in den Artefakten belegt.

Wichtige Restpunkte aus dem Audit:

- GPKG-Extent-Metadaten fuer die Roh-Layer `44`/`95` sind unzuverlaessig; belastbar
  waren nur die echten Feature-Bounds.
- OSM liegt im Repo nur als erzeugtes Parquet vor, nicht als eingefrorener Rohinput.
- Es gibt Baseline-Risiken ohne akuten Fehlerstatus:
  asymmetrische Amplitudenabdeckung fuer Track `95` und Pfad-Namensdrift
  `data/pmtiles` vs `data/tiles_v2`.

### 2. Live-DB-Integritaet und Parquet-vs-PostGIS - `red`

Punkte, Gebaeude, Terrain, Timeseries und ML-Tabellen stimmen zaehlerisch weitgehend
mit dem Parquet-Stand ueberein. Der harte Defekt liegt ausschliesslich in den
Linktabellen:

- `insar_to_gba.parquet = 483015`, Live-DB `insar_to_gba = 0`
- `insar_to_osm.parquet = 481423`, Live-DB `insar_to_osm = 0`

Das ist kein harmless Legacy-Zustand. Die generische API verwendet diese Tabellen
weiterhin direkt:

- `backend/app/routers/api.py:113`
- `backend/app/routers/api.py:299`

Reproduktionskern:

```bash
docker compose exec -T db psql -U insar -d insar -c \
  "SELECT COUNT(*) FROM insar_to_gba; SELECT COUNT(*) FROM insar_to_osm;"
curl "http://127.0.0.1:8000/api/points/MX6399F01?track=95"
curl "http://127.0.0.1:8000/api/buildings/gba/552204886/points"
```

Erwarteter Kontrast laut Artefakten:

- Punkt `MX6399F01` hat in beiden Link-Parquets je einen Gebaeudelink.
- GBA-Gebaeude `552204886` hat im Link-Parquet `1478` verknuepfte Punkte.
- Live-API liefert trotzdem `gba_id=null`, `osm_id=null` bzw. `count=0`.

Sekundaere, nicht statusbestimmende W1-T2-Befunde:

- `114` invalide `osm_buildings`-Geometrien, bereits im Parquet vorhanden
- `2320` `gba`-Zeilen in `building_terrain_context` mit `NULL`-Terrainwerten,
  ebenfalls Parquet-konsistent

### 3. Raeumliche Layer-Ausrichtung in AOIs - `green`

Mirabell, Moosstrasse und Osthang zeigen keinen systematischen Koordinaten- oder
Layer-Shift zwischen InSAR, GBA, OSM, Terrain, MBTiles und ML-Tiles.

Kernaussagen:

- Terrain-Abdeckung ist in allen drei AOIs vollstaendig.
- Mirabell und Moosstrasse zeigen praktisch keinen GBA-vs-OSM-Versatz.
- Osthang hat lokale Merge/Split-Unterschiede zwischen GBA und OSM, aber keinen
  globalen Layer-Shift.
- Punkt-, Building- und ML-API-Geometrien stimmen mit der DB ueberein.
- Dekodierte Vector-Tiles stimmen fachlich mit den zugrunde liegenden DB-Geometrien
  ueberein.

Reproduktionsbasis:

```bash
curl "http://127.0.0.1:8000/api/points?bbox=13.04027,47.80375,13.04387,47.80735"
curl "http://127.0.0.1:8000/api/ml/runs/b5c20834-6b5d-4a8f-b2a7-90ce623c78f7/buildings/gba/324384/context"
```

### 4. Track-/LOS- und Satelliten-Blickrichtungs-Audit - `inconclusive`

Intern ist die Semantik konsistent:

- Track `44` ist durchgaengig `LOS=A`
- Track `95` ist durchgaengig `LOS=D`
- UI/API labeln das konsistent als `Track 44 (Ascending)` und
  `Track 95 (Descending)`
- Kamera-Overlays setzen `Track 44 -> Blick nach Osten`,
  `Track 95 -> Blick nach Westen`
- Candidate-Areas verschieben absichtlich zur Sensor-/Near-Range-Seite:
  `Track 44 -> Westen`, `Track 95 -> Osten`

Der Gesamtstatus bleibt trotzdem `inconclusive`, weil im Repo keine direkt
auditierbare primaere Quelle fuer die reale physikalische Blickrichtung belegt wurde.

Reproduktionsbasis:

```bash
curl http://127.0.0.1:8000/api/config
rg -n "Blick nach Osten|Blick nach Westen|Ascending|Descending|range_offset|shift_sign" \
  frontend backend docs/pipelines/anomaly_local_v1
```

### 5. Adaptive Gebaeude-Buffer und Candidate-Areas - `green`

Die Formel

`range_offset = clamp(height * tan(incidence_angle) * multiplier, min_buffer_m, max_buffer_m)`

ist konsistent ueber Methodik, Pipeline, persistierte `ml_point_results.meta` und
ML-Kontext-API umgesetzt. Die Pflichtbeispiele aus Mirabell, Moosstrasse und Osthang
liefern jeweils genau zwei Candidate-Areas (`44`, `95`) mit der erwarteten
West-/Ost-Asymmetrie. Die UI-Trackfilter `ASC + DSC`, `ASC only`, `DSC only`
filtern diese Features korrekt ueber das numerische `track`-Property.

Reproduktionsbasis:

```bash
curl "http://127.0.0.1:8000/api/ml/runs/b5c20834-6b5d-4a8f-b2a7-90ce623c78f7/buildings/gba/324384/context"
rg -n "trackFilterExpression|candidate_areas|range_offset|shift_sign" \
  frontend/src/components/MapView.tsx backend/app/routers/ml.py backend/app/ml/pipelines/anomaly_local_v1.py
```

### 6. UI-End-to-End-Anzeige - `red`

Die UI funktioniert fuer Karten-, ML-, Kamera- und Candidate-Area-Pfade mit echten
Services gut. Die Pflicht-AOI-Screenshots und Layer-/Trackfilter-Screenshots liegen
unter `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_*`.

Der Gesamtstatus bleibt `red`, weil der W1-Linktabellenfehler direkt in der UI
ankommt:

- Punkt-Inspector zeigt `Linked GBA = -` und `Linked OSM = -`
- Gebaeude-Inspector ohne aktiven ML-Run zeigt `Linked InSAR Points = 0`

Das ist kein separater UI-Only-Bug, sondern die user-sichtbare Auswirkung von
`P5-W1-T2`.

Reproduktionskern:

```bash
curl "http://127.0.0.1:8000/api/points/NQ9Y5YU01?track=95"
curl "http://127.0.0.1:8000/api/buildings/gba/324384/points"
```

Visuelle Evidenz:

- [phase5_P5-W3-T2_mirabell_point_full.png](artifacts/phase5_P5-W3-T2_mirabell_point_full.png)
- [phase5_P5-W3-T2_mirabell_generic_building_full.png](artifacts/phase5_P5-W3-T2_mirabell_generic_building_full.png)
- [phase5_P5-W3-T2_mirabell_full.png](artifacts/phase5_P5-W3-T2_mirabell_full.png)

## Kritische Red Bugs und empfohlene Follow-up-Fix-Tickets

### Fix-Ticket A: Linktabellen in Live-DB wieder herstellen und Reload-Pfad absichern

Statusgrundlage: `P5-W1-T2 red`, `P5-W3-T2 red`

Status nach Nachtrag: **nicht umgesetzt, bewusst verworfen**. Die Linktabellen
werden nicht wiederhergestellt, weil sie fachlich nicht mehr zum produktiven
Zuordnungsvertrag passen.

- Betroffene Tabellen: `insar_to_gba`, `insar_to_osm`
- Betroffene Dateien: `pipeline/load_postgis.py`, `backend/sql/schema.sql`
- User-wirksame Endpunkte:
  - `GET /api/points/{code}?track=...`
  - `GET /api/buildings/{source}/{id}/points`

Empfohlene Fix-Arbeit:

1. Operative Ursache fuer die leeren Linktabellen belegen.
2. Link-Parquets kontrolliert in die Live-DB neu laden.
3. Danach row-count und API-Verhalten erneut gegen die in `P5-W1-T2` dokumentierten
   Beispiele verifizieren.

### Fix-Ticket B: Generische API gegen leere Linktabellen haerten

Statusgrundlage: `P5-W1-T2 red`, `P5-W3-T2 red`

Status nach Nachtrag: **umgesetzt durch Entfernung des Legacy-Pfads**. Die
generischen Linkfelder und der generische Building-Points-Endpunkt wurden aus dem
produktiven Vertrag entfernt.

- Betroffene Datei: `backend/app/routers/api.py`
- Ziel: Defekte frueher sichtbar machen oder einen fachlich vertretbaren Fallback
  liefern, statt still `null`/`0` aus leerer Linklage zu bedienen.

Empfohlene Fix-Arbeit:

1. Guard/Healthcheck fuer leere Linktabellen einfuehren.
2. API-Verhalten bei leerem Linkbestand explizit machen
   (Fehler, Warnflag oder read-only Fallback-Spatial-Query).
3. UI danach auf den finalen API-Vertrag neu pruefen.

## Empfohlener Follow-up fuer den Inconclusive-Befund

### Fix-Ticket C: Autoritative Blickrichtungsquelle ins Repo holen und UI-Claims gegenpruefen

Statusgrundlage: `P5-W2-T2 inconclusive`

- Betroffene Dateien: `frontend/src/lib/cameraModes.ts`,
  `frontend/src/components/LayerPanel.tsx`,
  `docs/pipelines/anomaly_local_v1/methodik.md`
- Ziel: `Track 44/95` Ost-/West-Claims mit einer primaeren, repo-lokal auditierbaren
  Quelle belegen oder korrigieren.

## Audit-Abschluss

`P5` ist hiermit als Audit abgeschlossen. Das Ergebnis ist bewusst **nicht**
`Daten korrekt / green`, sondern:

- `green` fuer Datenlinie/CRS, AOI-Layer-Ausrichtung und Candidate-Areas
- `red` fuer Live-Linktabellen und deren user-sichtbare API/UI-Auswirkungen
- `inconclusive` fuer die reale physikalische Satelliten-Blickrichtung mangels
  autoritativer In-Repo-Evidenz

Weitere Reparaturarbeit gehoert in eine separate Folgephase oder explizite
Fix-Tickets, nicht in `P5`.
