# Bad Gastein Integration Execution Plan

## Ziel

Bad Gastein wird als zweiter AOI vollstaendig in den Salzburg InSAR Viewer integriert:
Rohdaten, automatisch geladene GBA-Gebaeude, Parquet, PostGIS, Tiles, API,
Frontend und ML-Pipelines muessen end-to-end nutzbar sein.

Die Umsetzung wartet nicht nach einzelnen Phasen auf User-Review. Der Supervisor
fuehrt interne Gates aus und startet die naechste Phase automatisch, solange kein
harter Blocker auftritt.

## Ausgangslage

- Salzburg nutzt aktuell InSAR Tracks 44/95, GBA, OSM, Terrain, PostGIS, MBTiles
  und `anomaly_local_v1`.
- Bad-Gastein-Rohdaten liegen in `data/Daten/Export Bad Gastein.zip`.
- ZIP-Inhalt:
  - `Gastein SNT/Gastein SNT.gpkg`: Layer 22, 44, 95
  - `Gastein TSX/Gastein TSX.gpkg`: Layer 70, 93
- Audit-Befund:
  - Bad Gastein SNT: 325583 Punkte
  - Bad Gastein TSX/PAZ: 800163 Punkte
  - Gesamt: 1125746 Punkte
  - Displacement-Zeitreihenwerte: 79262665
  - 200 echte `(code, track)`-Kollisionen zwischen Salzburg und Bad Gastein
- GBA wird automatisch aus dem TUM GlobalBuildingAtlas WFS geladen.
  - Endpoint: `https://tubvsig-so2sat-vm1.srv.mwn.de/geoserver/ows?`
  - Feature type: `global3D:lod1_global`
  - Bad-Gastein-WFS-Hitcount fuer InSAR-Bounds: ca. 5057 Gebaeude

## Leitprinzipien

- `area_id` und `dataset_id` sind Pflicht in allen neuen Datenpfaden.
- Salzburg bleibt Rueckwaertskompatibilitaets-Default.
- OSM ist kein Ersatz fuer GBA; Bad-Gastein-Pipelines muessen GBA nutzen.
- SNT22 wird importiert und angezeigt, aber fuer richtungsabhaengige ML-Logik
  nur genutzt, wenn seine Blickrichtung fachlich verifiziert ist.
- Subagents arbeiten an disjunkten Write-Sets; der Supervisor integriert und
  prueft Gates.

## Entscheidungen

- AOIs: `salzburg`, `bad_gastein`
- Datasets: `salzburg_snt`, `bad_gastein_snt`, `bad_gastein_tsx_paz`
- Track-Paare fuer Cross-Track-Auswertung:
  - Salzburg/SNT: 44/95
  - Bad Gastein/SNT: 44/95
  - Bad Gastein/TSX-PAZ: 93/70
- TSX/PAZ Defaults aus Markus' Nachricht:
  - Track 70: Blickrichtung 279.45 deg, Einfallswinkel 51.68 deg
  - Track 93: Blickrichtung 83.77 deg, Einfallswinkel 53.9 deg

## Phasen, Wellen und Tickets

### Phase 0: Daten-Audit und GBA-Download

#### Welle 0.1

- Ticket A: Bad-Gastein-InSAR-Audit reproduzierbar machen.
  - Artefakt: Audit-Notiz oder Pipeline-Validierungsoutput.
  - DoD: Counts, Bounds, CRS, Layer, Spalten, Zeitreihen, Nullwerte und
    Kollisionsbefund dokumentiert.
  - Write-Set: `docs/`, optional `pipeline/`.
- Ticket B: GBA-Download automatisieren.
  - Artefakt: `data/gba/bad_gastein_gba.geojson` und Downloadskript.
  - DoD: WFS-Paging funktioniert; GeoJSON hat EPSG:4326 und GBA-kompatible
    Spalten `source`, `id`, `height`, `var`, `region`, `geometry`.
  - Write-Set: `pipeline/`, `data/gba/`.
- Ticket C: Quellen- und Lizenzhinweise dokumentieren.
  - Artefakt: README-/Daten-Doku-Abschnitt.
  - DoD: GBA-Quelle, Endpoint und Nutzungshinweis nachvollziehbar dokumentiert.
  - Write-Set: `README.md`, `docs/`.

### Phase 1: Pipeline und Datenmodell

#### Welle 1.1

- Ticket D: SQL-Schema und Loader area-/dataset-aware machen.
  - DoD: Punkte, Zeitreihen, Terrain, Gebaeude und ML-Ergebnisse koennen
    mehrere AOIs/Datasets eindeutig speichern.
  - Write-Set: `backend/sql/`, `pipeline/load_*.py`.
- Ticket E: InSAR-Preparation manifestbasiert generalisieren.
  - DoD: Salzburg und Bad Gastein werden aus Manifest/Config erzeugt; Ausgaben
    enthalten explizit `area_id`, `dataset_id` und `sensor`.
  - Write-Set: `pipeline/`.
- Ticket F: Gebaeude- und Terrain-Pipeline area-aware machen.
  - DoD: Salzburg-GBA und Bad-Gastein-GBA landen mit `area_id` in Parquet und
    PostGIS; Terrain-Kontext kann pro AOI erzeugt werden.
  - Write-Set: `pipeline/`.

#### Welle 1.2

- Ticket G: Tiles generisch bauen.
  - DoD: InSAR- und Gebaeude-Tiles enthalten `area_id`, `dataset_id`, `sensor`,
    `track`; die App nutzt nur den generischen `insar_points`-Layer.
  - Write-Set: `pipeline/build_tiles.sh`, Tile-Doku.

### Phase 2: Backend, API und ML

#### Welle 2.1

- Ticket H: API-Kontrakte erweitern.
  - DoD: `/api/config`, Punktdetails, Zeitreihen und Queries akzeptieren
    `area_id`/`dataset_id`; Responses enthalten die neuen Identitaetsfelder.
  - Write-Set: `backend/app/`.
- Ticket I: Track-Geometrie dataset-aware machen.
  - DoD: alle bekannten Tracks haben Metadaten; SNT22 ist als unverified
    markiert; Geometrie-Lookups erfordern ein `dataset_id`.
  - Write-Set: `backend/app/ml/track_geometry.py`.

#### Welle 2.2

- Ticket J: ML-Pipeline dataset-aware machen.
  - DoD: `anomaly_local_v1` kann Bad-Gastein-GBA-Runs auf verifizierten
    Track-Paaren ausfuehren und joined auf `dataset_id`.
  - Write-Set: `backend/app/ml/`.
- Ticket K: ML-CLI/API/Run-Store erweitern.
  - DoD: Runs speichern `area_id` und optional `dataset_id`; Salzburg-CLI bleibt
    kompatibel.
  - Write-Set: `backend/app/ml/`, `backend/app/routers/ml.py`.

### Phase 3: Frontend und End-to-End-Abnahme

#### Welle 3.1

- Ticket L: AOI- und dynamische Track-UI.
  - DoD: UI kann Salzburg/Bad Gastein waehlen und passende Tracks anzeigen.
  - Write-Set: `frontend/src/`.
- Ticket M: MapView generische Tiles.
  - DoD: Karte filtert nach `area_id`, `dataset_id`, `track` und nutzt keine
    alten track-spezifischen InSAR-Layer.
  - Write-Set: `frontend/src/components/MapView.tsx`.
- Ticket N: Inspector/Tooltip/Selection.
  - DoD: Punktidentitaet nutzt `dataset_id + code + track`; UI zeigt AOI,
    Sensor und Dataset.
  - Write-Set: `frontend/src/`.

#### Welle 3.2

- Ticket O: Vollstaendige Verifikation.
  - DoD: Daten-Counts, API-Smoke, Frontend-Build, Tiles und ein kleiner
    Bad-Gastein-ML-Run sind geprueft oder konkrete Restblocker dokumentiert.
  - Write-Set: `docs/`, keine Feature-Implementierung.

## Fail-Regeln

- `gpt-5.5` nicht verfuegbar: Stop und Blocker melden.
- GBA-WFS nicht erreichbar: Fallback ueber GBA-Downloadquelle versuchen; wenn
  auch das scheitert, Stop mit reproduzierbarem Fehler.
- Lizenz/Nutzungsbedingungen unklar oder unzulaessig: Stop vor produktiver
  Integration.
- Einzelnes Ticket rot: Supervisor erzeugt Nachbesserung oder Ersatz-Ticket.
- Phase-Gate rot: keine naechste Phase, bis Gate gruen oder Blocker explizit ist.

## Verifikation / Exit-Kriterien

- `data/gba/bad_gastein_gba.geojson` existiert und ist validiert.
- Parquets und PostGIS enthalten Salzburg und Bad Gastein ohne Schluesselkollisionen.
- API kann kollidierende Salzburg-/Bad-Gastein-Punkte ueber `dataset_id`
  eindeutig aufloesen.
- Frontend zeigt Salzburg unveraendert und Bad Gastein mit GBA und allen fuenf
  Tracks.
- Kleiner Bad-Gastein-GBA-ML-Run laeuft auf mindestens einem verifizierten
  Track-Paar.

## Status

- `complete`: Phase 0 bis 3 sind code-, daten-, DB- und ML-Smoke-bezogen umgesetzt.
- Verifikation siehe `docs/bad_gastein_integration_verification.md`.
- PostGIS wurde ueber Docker Desktop gestartet, Salzburg-Bestand wurde auf das
  area-/dataset-aware Schema migriert, Bad Gastein wurde geladen, und ein
  kleiner Bad-Gastein-GBA-ML-Run auf `bad_gastein_snt` ist erfolgreich
  durchgelaufen.
