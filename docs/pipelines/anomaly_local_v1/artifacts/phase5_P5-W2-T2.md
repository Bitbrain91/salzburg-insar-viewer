# P5-W2-T2 Audit: Track-/LOS- und Satelliten-Blickrichtungs-Audit

- Ticket-Status: `inconclusive`
- Bewertung: `nicht entscheidbar`
- Geaenderte Dateien: `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W2-T2.md`

## Scope

Read-only Audit fuer Track-/LOS-Semantik, UI-Labels, Kamerapresets und
richtungsabhaengige Kandidatengeometrien. Kein Code-/Schema-/Datenfix, kein
DB-Reload, keine Datenregeneration.

W1-Gate-Kontext beruecksichtigt:

- `P5-W1-T1`: `green`
- `P5-W1-T2`: `red`, weil `insar_to_gba` / `insar_to_osm` in der Live-DB leer sind
  mit generischer API-Wirkung; **nicht** in diesem Ticket gefixt

## Kurzfazit

Die intern implementierte Semantik ist ueber Parquet, DB, API, Frontend und
`anomaly_local_v1` konsistent:

- Parquet und DB zeigen exakt dieselbe Verteilung:
  - Track `44` ist durchgaengig `LOS=A`
  - Track `95` ist durchgaengig `LOS=D`
- Backend und Frontend labeln das konsistent als
  `Track 44 (Ascending)` und `Track 95 (Descending)`.
- Die Frontend-Kamera kodiert
  `Track 44 -> Blick nach Osten` und `Track 95 -> Blick nach Westen`.
- Die richtungsabhaengigen Kandidatenflaechen sind **absichtlich nicht**
  gleich der Blickrichtung verschoben, sondern gemaess Repo-Methodik zur
  Sensor-/Near-Range-Seite:
  - `ASC/Track 44 -> Westen`
  - `DSC/Track 95 -> Osten`

Damit liegt **kein interner Widerspruch** vor. Die echte physikalische
Satelliten-Blickrichtung ist im Repo aber nicht mit einer direkt auditierten
autoritativen Quelle belegt. Ich habe nur abgeleitete Repo-Texte und Codeclaims
gefunden, nicht die primaere Referenz selbst. Deshalb ist der Gesamtbefund fuer
die reale Blickrichtung `inconclusive` statt geraten.

## DoD-Evidenz

### 1. Track-/LOS-Verteilung aus Parquet

Geprueft mit `backend/.venv-wsl/bin/python` direkt gegen
`data/parquet/insar_points_t44.parquet` und
`data/parquet/insar_points_t95.parquet`.

| Datei | Zeilen | Track-Verteilung | LOS-Verteilung | Bewertung |
| --- | ---: | --- | --- | --- |
| `insar_points_t44.parquet` | `247388` | `{44: 247388}` | `{A: 247388}` | ok |
| `insar_points_t95.parquet` | `303376` | `{95: 303376}` | `{D: 303376}` | ok |

Es wurden in den Parquet-Dateien keine Mischfaelle `44/D`, `95/A`, `NULL`-LOS
oder weitere Trackwerte gefunden.

### 2. Track-/LOS-Verteilung aus Live-DB

Read-only SQL gegen `insar_points`:

| Track | LOS | Anzahl |
| ---: | --- | ---: |
| `44` | `A` | `247388` |
| `95` | `D` | `303376` |

Zusatzcheck:

- `track=44` hat genau `1` distinct `los`-Wert
- `track=95` hat genau `1` distinct `los`-Wert

Damit stimmen Parquet und PostGIS fuer die Track-/LOS-Semantik exakt ueberein.

### 3. UI-Labels `Track 44 (Ascending)` / `Track 95 (Descending)`

Der Backend-Konfig-Endpunkt gibt diese Semantik direkt aus:

- [backend/app/routers/api.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/routers/api.py:29)
- Runtime-Probe `GET /api/config`:
  - `44 -> name="Track 44 (Ascending)", los="A"`
  - `95 -> name="Track 95 (Descending)", los="D"`

Im Frontend erscheinen dieselben Labels in zwei Stellen:

- [frontend/src/components/LayerPanel.tsx](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/frontend/src/components/LayerPanel.tsx:92)
- [frontend/src/components/PipelinePanel.tsx](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/frontend/src/components/PipelinePanel.tsx:166)

Bewertung:

- UI-Labeling ist gegen Daten und API **konsistent**
- kein Befund fuer vertauschte Tracknamen

### 4. Frontend-Kamerapresets und Overlaytexte

Die Kamerapresets sind in
[frontend/src/lib/cameraModes.ts](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/frontend/src/lib/cameraModes.ts:16)
hinterlegt:

- `satellite_track44`: `bearing=90`, `pitch=38.8`,
  `overlayText="Blick nach Osten"`
- `satellite_track95`: `bearing=-90`, `pitch=38.5`,
  `overlayText="Blick nach Westen"`

Die Layer-Hilfe spiegelt das explizit:

- [frontend/src/components/LayerPanel.tsx](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/frontend/src/components/LayerPanel.tsx:129)

Das Overlay wird in der Karte direkt aus dem aktiven Preset gerendert:

- [frontend/src/components/MapView.tsx](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/frontend/src/components/MapView.tsx:1864)

Bewertung:

- Frontend-Code ist intern eindeutig:
  - Track `44` wird als Ostblick dargestellt
  - Track `95` wird als Westblick dargestellt
- Diese Aussage ist im Repo mehrfach konsistent, aber nicht mit einer primaeren
  In-Repo-Quelle belegt

### 5. Pipeline-/API-Signatur fuer Kandidatengeometrien

Repo-Methodik:

- [docs/pipelines/anomaly_local_v1/methodik.md](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/docs/pipelines/anomaly_local_v1/methodik.md:71)
  beschreibt die Kandidatenflaeche als Verschiebung in Ground-Range-Richtung zum
  Sensor:
  - `ASC -> Westen`
  - `DSC -> Osten`
- [docs/pipelines/anomaly_local_v1/iterations.md](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/docs/pipelines/anomaly_local_v1/iterations.md:13)
  dokumentiert die Korrektur explizit als Wechsel von Blickrichtung auf
  sensorseitige Ground-Range-Richtung:
  - `ASC -> Westen`
  - `DSC -> Osten`

Pipeline-Code:

- [backend/app/ml/pipelines/anomaly_local_v1.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/ml/pipelines/anomaly_local_v1.py:293)
  setzt `shift_sign = -1.0`, wenn `LOS=A` oder `track=44`, sonst `+1.0`
- Das verschiebt das Gebaeude in UTM-X via
  `ST_Translate(..., shift_sign * range_offset_m, 0.0)`

ML-Kontext-API:

- [backend/app/routers/ml.py](/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/app/routers/ml.py:871)
  baut die auszugebenden Kandidatenflaechen mit
  `CASE WHEN track = 44 THEN -range_offset_m ELSE range_offset_m END`

Runtime-Probe mit
`GET /api/ml/runs/26b45d86-8eb1-436e-a48c-16fa99416dec/buildings/gba/324384/context`:

- Gebaeudebounds:
  `[13.041360, 47.805122, 13.042741, 47.805975]`
- Track `44` Candidate-Area:
  - `range_offset_m = 12.414`
  - Bounds:
    `[13.041168, 47.805101, 13.042768, 47.805993]`
  - westliche Erweiterung deutlich groesser als oestliche
- Track `95` Candidate-Area:
  - `range_offset_m = 12.290`
  - Bounds:
    `[13.041334, 47.805104, 13.042932, 47.805996]`
  - oestliche Erweiterung deutlich groesser als westliche

Bewertung:

- Pipeline, ML-API und Runtime-Probe sind **konsistent**
- Die Kandidatenflaechen folgen der Repo-Logik:
  - `Track 44 / LOS A -> Westverschiebung`
  - `Track 95 / LOS D -> Ostverschiebung`
- Das widerspricht den Kamera-Overlays **nicht**, weil die Kandidatenflaeche laut
  Repo zur Sensor-/Near-Range-Seite verschoben wird, nicht in Blickrichtung

### 6. Autoritative Quelle fuer echte Satelliten-Blickrichtung

Im Repo gefundene Aussagen:

- Methodik, Iterationslog und Frontend-Code enthalten klare Ost-/West-Claims
- `docs/archive/legacy/deep_research_neu/Deep_research_OpenAI.txt` verweist nur
  sekundaer auf ein externes `EGMS ATBD`

Nicht gefunden bzw. nicht direkt auditierbar:

- kein im Repo abgelegtes `EGMS ATBD` oder anderes primaeres Orbit-/Geometrie-Dokument
- kein direkt zitierbarer offizieller Text im aktuellen Ticket-Scope, der
  `Track 44 -> Osten` und `Track 95 -> Westen` primaer belegt

Es existiert zwar
`docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_1.pdf`, aber mit den in
dieser Session verfuegbaren lokalen Tools konnte daraus kein belastbarer,
zitierbarer Text zur Ost-/West-Blickrichtung extrahiert werden. Fuer dieses Ticket
zaehlt deshalb nur die direkt auditierbare Repo-Evidenz.

Bewertung:

- **intern konsistent**
- **realphysikalisch im Repo nicht autoritativ entscheidbar**
- daher fuer diesen Teilbefund: `inconclusive`

## Verwendete Kommandos / SQL / API

Shell / Repo-Checks:

```bash
git status --short --branch
docker compose ps
rg -n "Track 44|Track 95|Ascending|Descending|Blick nach Osten|Blick nach Westen|LOS|ascending|descending" frontend backend pipeline docs
```

Parquet-Checks:

```bash
backend/.venv-wsl/bin/python - <<'PY'
from pathlib import Path
import pyarrow.parquet as pq
base = Path("data/parquet")
for name in ["insar_points_t44.parquet", "insar_points_t95.parquet"]:
    table = pq.read_table(base / name, columns=["track", "los"])
    df = table.to_pandas()
    print(name, len(df), df["track"].value_counts().to_dict(), df["los"].value_counts().to_dict())
PY
```

DB-Checks:

```bash
docker compose exec -T db psql -U insar -d insar -c \
  "SELECT track, los, COUNT(*) AS n FROM insar_points GROUP BY track, los ORDER BY track, los;"

docker compose exec -T db psql -U insar -d insar -c \
  "SELECT track, COUNT(*) AS n, COUNT(DISTINCT los) AS los_values FROM insar_points GROUP BY track ORDER BY track;"

docker compose exec -T db psql -U insar -d insar -c \
  "SELECT run_id::text, building_id, COUNT(*) AS point_count, COUNT(DISTINCT track) AS track_count
     FROM ml_point_results
    WHERE building_source = 'gba'
 GROUP BY run_id, building_id
   HAVING COUNT(DISTINCT track) = 2
 ORDER BY COUNT(*) DESC
    LIMIT 10;"
```

API-Proben:

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/config
curl http://127.0.0.1:8000/api/points/NONLP9G01?track=44
curl http://127.0.0.1:8000/api/points/MX6399F01?track=95
curl http://127.0.0.1:8000/api/ml/runs/26b45d86-8eb1-436e-a48c-16fa99416dec/buildings/gba/324384/context
```

## Lokale Verifikation

- `docker compose ps`: `db` und `mlflow` liefen
- `127.0.0.1:8000` war fuer Read-only API-Proben erreichbar
- `GET /api/health`: `{"status":"ok"}`
- `GET /api/config`: bestaetigt
  `44/A/Ascending` und `95/D/Descending`
- `GET /api/points/NONLP9G01?track=44`: liefert `track=44`, `los=A`
- `GET /api/points/MX6399F01?track=95`: liefert `track=95`, `los=D`
- `GET /api/ml/.../324384/context`: liefert `2` Kandidatenflaechen mit
  westlicher Erweiterung fuer `44` und oestlicher Erweiterung fuer `95`
- ein spaeterer eigener `uvicorn`-Startversuch lief in `address already in use`;
  die erfolgreiche API-Evidenz bleibt gueltig, die Prozess-Ownership von Port
  `8000` war in dieser Multi-Agent-Session aber nicht eindeutig mir zuzuordnen

## Offene Risiken

- Ohne primaere In-Repo-Quelle bleibt die reale Satelliten-Blickrichtung
  fachlich nicht abschliessend beweisbar, auch wenn die interne Implementierung
  konsistent ist.
- Die leeren Legacy-Linktabellen aus `P5-W1-T2` bleiben im Gesamtsystem ein
  separater `red`-Befund mit generischer API-Wirkung, auch wenn dieses Ticket
  fuer Track-/LOS-Semantik nicht primaer daran haengt.
- Der Kandidatenflaechen-API-Endpunkt verwendet die Tracknummer direkt
  (`44 -> negativ`, sonst positiv). Das ist aktuell korrekt, solange die Datenlage
  weiterhin strikt `44/A` und `95/D` bleibt.

## Endbewertung

`nicht entscheidbar`

Praezise Einordnung:

- `Daten korrekt` fuer Track-/LOS-Verteilung in Parquet und DB
- `Daten korrekt` fuer UI-Labels `Track 44 (Ascending)` und
  `Track 95 (Descending)` gegen Daten und API
- `Daten korrekt` fuer die interne Kopplung von
  Kamera-Overlay (`44 -> Osten`, `95 -> Westen`) und Kandidatenflaechen-Shift
  (`44 -> Westen`, `95 -> Osten`), weil im Repo explizit zwischen Blickrichtung
  und Sensor-/Near-Range-Verschiebung unterschieden wird
- `nicht entscheidbar` fuer die **echte** Satelliten-Blickrichtung, weil im Repo
  keine direkt auditierbare autoritative Primaerquelle dafuer vorliegt

Gesamtstatus des Tickets daher: `inconclusive`, nicht `red`.
