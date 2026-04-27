# P5-W3-T2 Audit: UI-End-to-End-Anzeige mit echten Services

- Ticket-Status: `red`
- Bewertung: `Fehler`
- Geaenderte Dateien:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2.md`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_all_on.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_no_insar44.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_no_insar95.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_no_gba.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_no_osm.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_no_relief.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_layers_no_ml.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_full.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_point_full.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_generic_building_full.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_camera_t44.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_camera_t95.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_trackfilter_both.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_trackfilter_asc_only.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_mirabell_trackfilter_dsc_only.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_moosstrasse_full.png`
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T2_osthang_full.png`

## Scope

Read-only Browser-Audit fuer die echte React/Vite-UI gegen echte Backend- und
DB-Services. Kein Code-, Schema- oder Datenfix. Kein DB-Reload. Keine
Regeneration.

Gate-Kontext bewusst mitgefuehrt:

- `P5-W1-T1`: `green`
- `P5-W1-T2`: `red` wegen leerer `insar_to_gba` / `insar_to_osm` in der Live-DB
  mit generischer API-Wirkung
- `P5-W2-T1`: `green`
- `P5-W2-T2`: `inconclusive` fuer die echte physikalische Satelliten-Blickrichtung,
  aber intern konsistente UI-/Code-Semantik

## Kurzfazit

Die eigentliche Karten- und ML-UI funktioniert mit echten Services gut:

- Frontend und Backend liefen lokal gegen die Live-PostGIS-/ML-Daten.
- Pflicht-AOIs Mirabell, Moosstrasse und Osthang liessen sich reproduzierbar laden.
- Layer-Toggles fuer InSAR `44/95`, GBA, OSM, Relief und ML aendern die
  Kartendarstellung sichtbar.
- Punkt- und Gebaeude-Inspector stimmen fuer die geprueften ML-Pfade mit
  Live-API und read-only DB-Werten ueberein.
- Building Cluster View zeigt Kandidatenflaechen, Cluster-Huellen und Punktrollen;
  die Track-Filter `ASC + DSC`, `ASC only`, `DSC only` wirken sichtbar.
- Die Satelliten-Kameramodi rendern sauber und zeigen die erwarteten Overlaytexte.

Der Gesamtstatus ist trotzdem `red`, weil der bekannte `P5-W1-T2`-Defekt
weiterhin direkt user-sichtbar in der generischen Inspector-Kette ankommt:

- Punkt-Inspector zeigt fuer reale Punkte `Linked GBA = —` und `Linked OSM = —`
  trotz vorhandener Parquet-Links.
- Gebaeude-Inspector ohne aktiven ML-Run zeigt `Linked InSAR Points = 0`.

Das ist kein neuer UI-Only-Bug. Es ist die vererbte Live-DB-/API-Abweichung aus
`P5-W1-T2`, aber sie bleibt in dieser echten End-to-End-UI sichtbar und macht den
Ticket-Gesamtstatus deshalb `red`.

## DoD-Evidenz

### 1. Reale Services und AOI-Screenshots

Lokaler Echtbetrieb:

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8000`
- DB + MLflow ueber `docker compose`

Pflicht-AOI-Screenshots:

- Mirabell Building View:
  `phase5_P5-W3-T2_mirabell_full.png`
- Mirabell Point View:
  `phase5_P5-W3-T2_mirabell_point_full.png`
- Moosstrasse Building View:
  `phase5_P5-W3-T2_moosstrasse_full.png`
- Osthang Building View:
  `phase5_P5-W3-T2_osthang_full.png`

Gepruefte AOI-/Run-/Sample-Kombinationen:

| AOI | Run | Gebaeude | Punkt |
| --- | --- | --- | --- |
| Mirabell | `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7` | `324384` | `NQ9Y5YU01` / `95` |
| Moosstrasse | `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` | `96639520` | `O2WTCOF01` / `44` |
| Osthang | `71770d85-ec8c-4354-840a-545fa0b7c757` | `150506168` | `NN9L9VD01` / `95` |

### 2. Layer-Toggles wirken in der Live-Karte

Mirabell wurde als feste Karten-Referenz verwendet. Screenshots:

- Baseline: `phase5_P5-W3-T2_layers_all_on.png`
- `insar44` aus: `phase5_P5-W3-T2_layers_no_insar44.png`
- `insar95` aus: `phase5_P5-W3-T2_layers_no_insar95.png`
- `gba` aus: `phase5_P5-W3-T2_layers_no_gba.png`
- `osm` aus: `phase5_P5-W3-T2_layers_no_osm.png`
- `reliefHillshade` aus: `phase5_P5-W3-T2_layers_no_relief.png`
- ML aus (`showMlLayer=false`, `showMlBuildings=false`):
  `phase5_P5-W3-T2_layers_no_ml.png`

Zur Verifikation wurden die PNGs lokal per Pixel-Diff verglichen:

| Vergleich | veraenderte Pixel |
| --- | ---: |
| all-on vs no `insar44` | `275311` |
| all-on vs no `insar95` | `339895` |
| all-on vs no `gba` | `222917` |
| all-on vs no `osm` | `187476` |
| all-on vs no `reliefHillshade` | `744206` |
| all-on vs no ML | `156898` |

Bewertung:

- Die UI-Toggles greifen live auf die Kartendarstellung.
- Kein Befund fuer tote oder entkoppelte Layer-Schalter.

### 3. Point Inspector: konsistent mit Live-API/DB, aber generische Linkfelder bleiben leer

Mirabell Sample `NQ9Y5YU01 / track 95` in
`phase5_P5-W3-T2_mirabell_point_full.png`.

UI-Werte:

- `Track / LOS = 95 / D`
- `Velocity = 0.60`
- `Coherence = 0.91`
- `Incidence angle = 38.52`
- `Longitude / Latitude = 13.041723 / 47.805679`
- `Linked GBA = —`
- `Linked OSM = —`
- Run Analysis:
  - `Label = normal`
  - `Building = GBA / 324384`
  - `Distance to building = 0.6 m`
  - `Cluster role / probability = core / 0.99`
  - `Kept for scoring = yes`
  - `Assignment = directional_buffer`
  - `Track support = 112`

Read-only DB / API:

- `insar_points`: `NQ9Y5YU01`, `95`, `D`, `velocity=0.60`,
  `coherence=0.91`, `incidence_angle=38.52`,
  `lon=13.041723`, `lat=47.805679`
- `GET /api/points/NQ9Y5YU01?track=95`: dieselben Basiswerte,
  `gba_id=null`, `osm_id=null`
- `ml_point_results` fuer Run `b5c20834-...`:
  `building_id=324384`, `building_source=gba`, `cluster_role=core`,
  `kept_for_scoring=true`, `distance_m=0.6`, `quality_score=0.90`,
  `anomaly_score=0.07`, `cross_track_consistency=0.83`, `label=normal`

Bewertung:

- Der Inspector ist fuer Basis- und ML-Analysewerte konsistent mit Live-API und DB.
- Die leeren `Linked GBA` / `Linked OSM` sind der bekannte vererbte
  Linktabellen-Defekt aus `P5-W1-T2`, nicht ein separater Frontend-Mappingfehler.

### 4. Building Inspector: ML-Pfad korrekt, generischer Linkpfad weiterhin sichtbar defekt

#### Mit aktivem ML-Run

Gepruefte Gebaeude:

| AOI | UI-Screenshot | Kernwerte |
| --- | --- | --- |
| Mirabell `324384` | `phase5_P5-W3-T2_mirabell_full.png` | `215` Punkte, `208/7/67`, `0.38 mm/yr`, `0.89 / high`, `T44 0.26 / T95 0.51` |
| Moosstrasse `96639520` | `phase5_P5-W3-T2_moosstrasse_full.png` | `53` Punkte, `50/3/6`, `0.99 mm/yr`, `0.77 / high`, `T44 0.45 / T95 1.53` |
| Osthang `150506168` | `phase5_P5-W3-T2_osthang_full.png` | `47` Punkte, `43/4/7`, `0.57 mm/yr`, `0.83 / high`, `T44 0.00 / T95 1.15` |

Basis-Building-Details gegen DB:

- Mirabell `324384`: `height=15.4`, `terrain_mean=426.8`,
  `slope_mean=2.5`, `relief=3.0`
- Moosstrasse `96639520`: `height=6.6`, `terrain_mean=431.5`,
  `slope_mean=2.4`, `relief=1.0`
- Osthang `150506168`: `height=4.7`, `terrain_mean=455.0`,
  `slope_mean=43.4`, `relief=22.0`

UI und Live-API:

- `GET /api/buildings/gba/{id}` liefert fuer alle drei Gebaeude dieselben
  Building-/Terrain-Kerndaten wie der Inspector.
- `GET /api/ml/runs/{run}/buildings/gba/{id}` liefert fuer alle drei Gebaeude
  dieselben Run-Summaries wie der Inspector:
  - Run-assigned points
  - kept/excluded/noise
  - Motion / status
  - Reliability
  - Track agreement
  - Track motion
  - Cluster-Listen

Bewertung:

- Der aktive ML-Inspector-Pfad ist in allen drei AOIs fachlich und technisch konsistent.

#### Ohne aktiven ML-Run

Mirabell wurde zusaetzlich ohne aktiven Run geprueft:

- Screenshot: `phase5_P5-W3-T2_mirabell_generic_building_full.png`
- UI: `LINKED INSAR POINTS -> Count = 0`
- Das entspricht der aktuellen Live-API `/api/buildings/gba/324384/points`
  und der leeren Live-DB-Linklage, ist aber weiterhin im Widerspruch zum
  Artefaktstand aus `P5-W1-T2`.

Bewertung:

- Die UI bildet die defekte generische API korrekt ab.
- Produktseitig ist dieser Pfad weiterhin falsch und user-sichtbar.

### 5. Satelliten-Kameramodi

Mirabell Screenshots:

- `phase5_P5-W3-T2_mirabell_camera_t44.png`
- `phase5_P5-W3-T2_mirabell_camera_t95.png`

Live-Badges:

- `satellite_track44` -> `Satellitensicht T44 / Blick nach Osten`
- `satellite_track95` -> `Satellitensicht T95 / Blick nach Westen`

Pixel-Diff zwischen beiden Screenshots:

- `983095` veraenderte Pixel

Bewertung:

- Die UI wechselt Kameraeinstellung und Overlaytext sichtbar.
- Die echte physikalische Blickrichtung bleibt gemaess `P5-W2-T2`
  ausserhalb dieses Tickets `inconclusive`; die UI-Implementierung selbst ist
  intern konsistent.

### 6. Building Cluster View: Kandidatenflaechen, Cluster-Huellen, Punktrollen

Mirabell `324384` als Fokusfall:

- Full view: `phase5_P5-W3-T2_mirabell_full.png`
- Filter `ASC + DSC`: `phase5_P5-W3-T2_mirabell_trackfilter_both.png`
- Filter `ASC only`: `phase5_P5-W3-T2_mirabell_trackfilter_asc_only.png`
- Filter `DSC only`: `phase5_P5-W3-T2_mirabell_trackfilter_dsc_only.png`

API-Kontext:

- `GET /api/ml/runs/b5c20834-.../buildings/gba/324384/context`
  - `candidate_area_count = 2`
  - `cluster_hull_count = 2`
- `GET /api/ml/runs/b5c20834-.../buildings/gba/324384`
  - sichtbare Clusterrollen im Inspector:
    - `324384:t44:cluster_0` -> `core`
    - `324384:t95:cluster_0` -> `core`
    - `324384:t44:noise` -> `noise`
    - `324384:t95:noise` -> `noise`
  - niedrigste Qualitaetspunkte enthalten explizit `excluded`

Trackfilter-Wirkung via Screenshot-Diff:

| Vergleich | veraenderte Pixel |
| --- | ---: |
| both vs `ASC only` | `40457` |
| both vs `DSC only` | `41195` |
| `ASC only` vs `DSC only` | `53311` |

Bewertung:

- Kandidatenflaechen sind sichtbar.
- Cluster-Huellen sind sichtbar.
- Punktrollen `core`, `noise`, `excluded` sind im Map-/Inspector-Verbund sichtbar.
- Track-Filter `ASC + DSC`, `ASC only`, `DSC only` aendern den Fokus-Overlay
  nachvollziehbar.

## Verwendete Kommandos / API / Browser-Schritte

Shell / Services:

```bash
git status --short --branch
docker compose ps
curl http://127.0.0.1:8000/api/health
cd frontend && npx vite --host 127.0.0.1 --port 3000
cd backend && ./.venv-wsl/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Read-only DB-Checks:

```bash
docker compose exec -T db psql -U insar -d insar -P pager=off -F $'\\t' -A -c "<sample point/building queries>"
docker compose exec -T db psql -U insar -d insar -c "\\d ml_point_results"
```

Direkt gepruefte API-Endpunkte:

- `/api/health`
- `/api/points/NQ9Y5YU01?track=95`
- `/api/points/O2WTCOF01?track=44`
- `/api/points/NN9L9VD01?track=95`
- `/api/buildings/gba/324384`
- `/api/buildings/gba/96639520`
- `/api/buildings/gba/150506168`
- `/api/buildings/gba/324384/points`
- `/api/ml/runs`
- `/api/ml/runs/{run_id}`
- `/api/ml/runs/{run_id}/points/{code}?track=...`
- `/api/ml/runs/{run_id}/buildings/gba/{id}`
- `/api/ml/runs/{run_id}/buildings/gba/{id}/context`

Browser-Pruefung:

- Playwright gegen `http://127.0.0.1:3000/`
- Zustand-Store im Vite-Dev-Frontend direkt gesetzt, um echte UI-Zustaende fuer
  Runs, Selektion, Layer, Kamera und Trackfilter reproduzierbar zu pruefen
- Screenshots als repo-lokale Artefakte gespeichert
- lokale PNG-Diffs mit `python3` + `PIL.ImageChops.difference(...)`

## Lokale Verifikation

- `docker compose ps`: `db` und `mlflow` liefen die ganze Zeit
- Frontend wurde in dieser Session lokal auf `127.0.0.1:3000` gestartet
- Ein bereits vorhandener Backend-Prozess auf `127.0.0.1:8000` fiel waehrend des
  Audits weg; danach wurde fuer diese Ticket-Pruefung ein eigener lokaler
  Backend-Prozess gestartet und durchgaengig verwendet
- Browser-Reload nach Backend-Neustart: erfolgreich
- Alle hier referenzierten Screenshots wurden nach dem stabilen Backend-Neustart
  neu erzeugt

## Offene Risiken

- Der Gesamtbefund haengt weiter an `P5-W1-T2`: Solange die Linktabellen leer sind,
  bleiben generische Inspector-Pfade user-sichtbar falsch, auch wenn ML-Pfade gut
  funktionieren.
- `P5-W2-T2` bleibt fuer die echte physikalische Satelliten-Blickrichtung
  `inconclusive`; dieses Ticket prueft die sichtbare UI-Umschaltung, nicht die
  externe Orbit-Autoritaet.
- Die Pixel-Diff-Pruefung belegt sichtbare Renderaenderung, nicht deren
  fachliche Perfektion auf jedem einzelnen Feature.

## Endbewertung

`Fehler`

Praezise Einordnung:

- `Daten korrekt` fuer:
  - lokale UI-Anbindung an echte Frontend-/Backend-/DB-Services
  - AOI-Rendering Mirabell, Moosstrasse, Osthang
  - Layer-Toggles
  - ML-Point-/ML-Building-Inspector gegen Live-API/DB
  - Kameraumschaltung und sichtbare Overlaytexte
  - Building Cluster View mit Candidate Areas, Hulls, Punktrollen und Trackfiltern
- `Fehler` fuer den Gesamt-Ticketstatus, weil die bekannte generische
  Linktabellen-Abweichung im realen UI weiterhin direkt sichtbar ist:
  - Point Inspector: `Linked GBA/OSM = —`
  - Building Inspector ohne aktiven ML-Run: `Linked InSAR Points = 0`

Damit ist `P5-W3-T2` kein neuer Frontend-Implementierungsfehler, aber als
echte End-to-End-Anzeige gegen die derzeitige Live-Datenlage insgesamt `red`.
