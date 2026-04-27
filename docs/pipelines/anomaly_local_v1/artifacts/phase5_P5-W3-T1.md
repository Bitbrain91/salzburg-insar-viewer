# P5-W3-T1 Audit: Adaptive Gebaeude-Buffer und Candidate-Areas

- Ticket-Status: `green`
- Bewertung: `Daten korrekt`
- Geaenderte Dateien:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T1.md`

## Scope und Gate-Kontext

Read-only Audit nur fuer `P5-W3-T1`.

Geprueft wurden:

- adaptive Buffer-Formel in Methodik, Pipeline und ML-Kontext-API
- Track-Signatur fuer die Kandidatenverschiebung
- API-Geometrie fuer Candidate-Areas
- Frontend-Filterlogik fuer `ASC + DSC`, `ASC only`, `DSC only`
- je mindestens ein reales GBA-Gebaeude in Mirabell, Moosstrasse und Osthang

Gate-Kontext, bewusst mitgefuehrt:

- `P5-W1-T1`: `green`
- `P5-W1-T2`: `red` wegen leerer `insar_to_gba`/`insar_to_osm`-Tabellen mit generischer API-Wirkung
- `P5-W2-T1`: `green`
- `P5-W2-T2`: `inconclusive` fuer die realphysikalische Satelliten-Blickrichtung, aber intern konsistente Track-/LOS-Semantik

Der `W1-T2`-Defekt blockiert dieses Ticket nicht, weil die Candidate-Area-Pfade auf
`gba_buildings`, `insar_points`, `ml_runs` und `ml_point_results` arbeiten, nicht auf
den leeren Legacy-Linktabellen.

## Kurzfazit

Die adaptive Candidate-Area-Logik ist im aktiven Stand technisch und fachlich
konsistent:

- Die Repo-Formel aus `methodik.md` wird in der Pipeline und in der ML-Kontext-API
  mit derselben `clamp`-Semantik umgesetzt.
- Die Pipeline verwendet fuer die Verschiebung `track 44` bzw. `LOS A` mit negativem
  UTM-X, sonst positives UTM-X.
- Die Kontext-API verwendet fuer Candidate-Areas `track 44 -> -range_offset_m`,
  `track 95 -> +range_offset_m`.
- Die drei Pflicht-AOI-Beispiele liefern in der API jeweils genau zwei
  Kandidatenflaechen (`44`, `95`), die das Gebaeude enthalten und in die erwartete
  Richtung erweitert sind.
- Die UI-Fokusansicht filtert Candidate-Areas direkt ueber das numerische
  `track`-Property der API-Features. `ASC + DSC`, `ASC only`, `DSC only` sind damit
  fuer Candidate-Areas korrekt verdrahtet.

## DoD-Evidenz

### 1. Formel-Vertrag: Methodik -> Pipeline -> Persistenz -> API

Repo-Methodik:

- `docs/pipelines/anomaly_local_v1/methodik.md:70-78`
- Richtung: `ASC -> Westen`, `DSC -> Osten`
- Formel:
  `range_offset = clamp(height_m * tan(incidence_angle) * buffer_multiplier, min_buffer_m, max_buffer_m)`

Pipeline-Zuordnung:

- `backend/app/ml/pipelines/anomaly_local_v1.py:284-305`
- `GREATEST(min_buffer, LEAST(max_buffer, height * tan(radians(incidence_angle)) * multiplier))`
- Signatur:
  - `upper(los) = 'A' OR track = 44 -> shift_sign = -1.0`
  - sonst `shift_sign = +1.0`
- Geometrie:
  `ST_Union(b.geom_utm, ST_Translate(b.geom_utm, shift_sign * range_offset_m, 0.0))`
  plus lateraler Slack-Buffer

Persistenz:

- `backend/app/ml/pipelines/anomaly_local_v1.py:1815-1837`
- `building_context` speichert `assignment_method`, `range_offset_m`, `buffer_m`
  pro Punkt in `ml_point_results.meta`

ML-Kontext-API:

- `backend/app/routers/ml.py:821-953`
- mediane `incidence_angle` je Track aus `ml_point_results x insar_points`
- identische `GREATEST/LEAST`-Formel
- Signatur:
  - `track = 44 -> -range_offset_m`
  - sonst `+range_offset_m`
- API gibt `candidate_areas.features[*].properties.track`,
  `incidence_angle_deg`, `range_offset_m` explizit aus

Clamp-Pfad nicht nur theoretisch, sondern live aktiv:

| Run | directional-buffer Punkte | min-clamped | max-clamped |
| --- | ---: | ---: | ---: |
| Mirabell `b5c20834-...` | `323` | `9` | `0` |
| Moosstrasse `fa27294d-...` | `469` | `59` | `0` |
| Osthang `71770d85-...` | `139` | `53` | `0` |

Damit ist belegt, dass die `clamp`-Grenzen in der Laufzeit tatsaechlich benutzt
werden und nicht nur toter Code sind.

### 2. AOI-Beispiele: Mirabell, Moosstrasse, Osthang

Verwendete Pflichtbeispiele:

| AOI | Run | GBA-Gebaeude | Gebaeudehoehe | API-Kandidaten | Hulls | Punkte |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Mirabell | `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7` | `324384` | `15.443 m` | `2` | `2` | `215` |
| Moosstrasse | `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` | `96639520` | `6.574 m` | `2` | `2` | `53` |
| Osthang | `71770d85-ec8c-4354-840a-545fa0b7c757` | `150506168` | `4.699 m` | `2` | `2` | `47` |

Track-medians und API-Offsets:

| AOI / Gebaeude | Track | Median incidence | directional-buffer Punkte | erwarteter API-Offset | API `range_offset_m` | Differenz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mirabell `324384` | `44` | `38.795 deg` | `21` | `12.414457 m` | `12.414457 m` | `0.0` |
| Mirabell `324384` | `95` | `38.514260 deg` | `35` | `12.290376 m` | `12.290376 m` | `0.0` |
| Moosstrasse `96639520` | `44` | `38.725460 deg` | `2` | `5.271201 m` | `5.271201 m` | `0.0` |
| Moosstrasse `96639520` | `95` | `38.553820 deg` | `6` | `5.238924 m` | `5.238924 m` | `0.0` |
| Osthang `150506168` | `44` | `38.831253 deg` | `6` | `3.782389 m` | `3.782389 m` | `0.0` |
| Osthang `150506168` | `95` | `38.474125 deg` | `4` | `3.734363 m` | `3.734363 m` | `0.0` |

Punkt-level Pipeline-Beispiele aus `ml_point_results.meta.building_context`:

| AOI | Track | Punkt | LOS | gespeicherter `range_offset_m` | gespeicherter `buffer_m` | erwarteter Offset | erwarteter Buffer |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: |
| Mirabell | `44` | `O7SG86Z01` | `A` | `12.413321` | `14.413321` | `12.413321` | `14.413321` |
| Mirabell | `95` | `NPVNRG401` | `D` | `12.289316` | `14.289316` | `12.289316` | `14.289316` |
| Moosstrasse | `44` | `O2ZSIPC01` | `A` | `5.271341` | `7.271341` | `5.271341` | `7.271341` |
| Moosstrasse | `95` | `NT1YZOB01` | `D` | `5.238767` | `7.238767` | `5.238767` | `7.238767` |
| Osthang | `44` | `OAL2HF101` | `A` | `3.782254` | `5.782254` | `3.782254` | `5.782254` |
| Osthang | `95` | `NN31I7Q01` | `D` | `3.734261` | `5.734261` | `3.734261` | `5.734261` |

Die Punktbeispiele zeigen, dass die in der Pipeline persistierten Offsets und Buffer
exakt dem Rechenweg `clamp(...)` und `buffer = range_offset + lateral_slack_m`
folgen.

### 3. Track-Signatur und Kandidatengeometrie

Codebefund:

- Pipeline:
  `backend/app/ml/pipelines/anomaly_local_v1.py:293-303`
  - `track 44` oder `LOS A` -> negatives UTM-X
  - sonst positives UTM-X
- Kontext-API:
  `backend/app/routers/ml.py:878-887`
  - `CASE WHEN track = 44 THEN -range_offset_m ELSE range_offset_m END`

Runtime-Befund in den drei AOIs, jeweils gegen UTM-33-Bounds der API-Geometrien:

| AOI / Gebaeude | Track | westliche Erweiterung | oestliche Erweiterung | dominierende Richtung |
| --- | ---: | ---: | ---: | --- |
| Mirabell `324384` | `44` | `14.412 m` | `1.995 m` | Westen |
| Mirabell `324384` | `95` | `1.998 m` | `14.286 m` | Osten |
| Moosstrasse `96639520` | `44` | `7.265 m` | `1.994 m` | Westen |
| Moosstrasse `96639520` | `95` | `1.994 m` | `7.233 m` | Osten |
| Osthang `150506168` | `44` | `5.779 m` | `1.996 m` | Westen |
| Osthang `150506168` | `95` | `1.996 m` | `5.731 m` | Osten |

Zusaetzlich enthielt jede Candidate-Area das Originalgebaeude (`contains_building=true`).

Bewertung:

- die Pipeline-Signatur `44/LOS A -> negativ`, sonst positiv, ist sauber im Code
  verankert
- die Kontext-API folgt derselben Richtungslogik
- die live gelieferten Candidate-Areas zeigen genau die erwartete West-/Ost-Asymmetrie

### 4. API-Geometrie und UI-Fokusfilter

API-Vertrag:

- `backend/app/routers/ml.py:947-988`
- `candidate_areas` liefert FeatureCollection mit Properties:
  - `track`
  - `incidence_angle_deg`
  - `range_offset_m`
- `cluster_hulls` liefert je Hull ebenfalls `track`
- `bounds` der Fokusansicht kommen direkt aus dem GBA-Gebaeude

Frontend-Verdrahtung:

- `frontend/src/components/MapView.tsx:954-960`
  - `ml_focus_candidates` wird direkt aus `focusContextQuery.data.candidate_areas`
    gespeist
- `frontend/src/components/MapView.tsx:1201-1249`
  - `trackFilterExpression("both") -> null`
  - `trackFilterExpression("44") -> ["==", ["get", "track"], 44]`
  - `trackFilterExpression("95") -> ["==", ["get", "track"], 95]`
  - dieselbe Track-Expression wird auf
    `ml_focus_candidate_fill` und `ml_focus_candidate_line` gesetzt
- `frontend/src/components/InspectorPanel.tsx:718-730`
  - UI-Steuerung:
    - `ASC + DSC`
    - `ASC only`
    - `DSC only`
- `frontend/src/lib/store.ts:94-116`
  - Default ist `mlBuildingTrackFilter = "both"`

Runtime-Befund fuer die drei API-Proben:

| AOI / Gebaeude | Candidate-Tracks | Hull-Tracks | Punkt-Tracks |
| --- | --- | --- | --- |
| Mirabell `324384` | `[44, 95]` | `{44: 1, 95: 1}` | `{44: 103, 95: 112}` |
| Moosstrasse `96639520` | `[44, 95]` | `{44: 1, 95: 1}` | `{44: 29, 95: 24}` |
| Osthang `150506168` | `[44, 95]` | `{44: 1, 95: 1}` | `{44: 22, 95: 25}` |

Zusatzsignal aus der Punkte-API fuer die Fokusansicht:

- Mirabell: gate-excluded nach Track `44:3`, `95:4`
- Moosstrasse: gate-excluded nach Track `44:1`, `95:2`
- Osthang: gate-excluded nach Track `44:3`, `95:1`

Damit ist die UI-Logik fuer Candidate-Areas konsistent:

- `ASC + DSC` zeigt beide Candidate-Features
- `ASC only` filtert auf `track=44`
- `DSC only` filtert auf `track=95`

Es gibt in diesem Pfad keinen Hinweis auf vertauschte Track-Werte, fehlende
Track-Properties oder eine von der API abweichende Filtersemantik.

## Verwendete Kommandos / SQL / API

Shell / Services:

```bash
git status --short --branch
docker compose ps
cd backend
.venv-wsl/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/api/health
```

Code-Lesung:

```bash
rg -n "range_offset|directional_buffer|candidate_areas|ml_focus_candidate|ASC only|DSC only" \
  backend/app/ml/pipelines/anomaly_local_v1.py \
  backend/app/routers/ml.py \
  frontend/src/components/MapView.tsx \
  frontend/src/components/InspectorPanel.tsx \
  frontend/src/lib/store.ts \
  docs/pipelines/anomaly_local_v1/methodik.md
```

Read-only SQL:

```sql
SELECT run_id::text, building_id, track,
       COALESCE(meta->'building_context'->>'assignment_method','') AS assignment_method,
       COUNT(*) AS n
FROM ml_point_results
WHERE (run_id, building_id) IN (...)
GROUP BY run_id, building_id, track, assignment_method;

WITH params AS (...)
SELECT r.run_id::text,
       SUM(CASE WHEN ... = 'directional_buffer' THEN 1 ELSE 0 END) AS directional_points,
       SUM(CASE WHEN ... range_offset_m = min_buffer_m THEN 1 ELSE 0 END) AS min_clamped_points,
       SUM(CASE WHEN ... range_offset_m = max_buffer_m THEN 1 ELSE 0 END) AS max_clamped_points
FROM ml_point_results r
JOIN params p ON p.run_id = r.run_id
GROUP BY r.run_id;
```

Python / API-Pruefungen:

```bash
backend/.venv-wsl/bin/python - <<'PY'
# Requests + SQLAlchemy + Shapely + PyProj:
# - run params lesen
# - GBA-Gebaeudehoehe lesen
# - Median incidence je Track aus ml_point_results x insar_points berechnen
# - point-level directional_buffer Beispiele mit persisted range_offset_m/buffer_m pruefen
# - /api/ml/runs/{run}/buildings/gba/{id}/context lesen
# - /api/ml/runs/{run}/buildings/gba/{id}/points lesen
# - Candidate-Area-Bounds in UTM 33N gegen Gebaeudebounds vergleichen
PY
```

Direkt gepruefte Endpunkte:

- `/api/health`
- `/api/ml/runs/b5c20834-6b5d-4a8f-b2a7-90ce623c78f7/buildings/gba/324384/context`
- `/api/ml/runs/b5c20834-6b5d-4a8f-b2a7-90ce623c78f7/buildings/gba/324384/points`
- `/api/ml/runs/fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5/buildings/gba/96639520/context`
- `/api/ml/runs/fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5/buildings/gba/96639520/points`
- `/api/ml/runs/71770d85-ec8c-4354-840a-545fa0b7c757/buildings/gba/150506168/context`
- `/api/ml/runs/71770d85-ec8c-4354-840a-545fa0b7c757/buildings/gba/150506168/points`

## Lokale Verifikation

- `docker compose ps` zeigte laufende Services `db` und `mlflow`
- lokaler Backend-Start auf `127.0.0.1:8000` war erfolgreich
- `GET /api/health` lieferte `{"status":"ok"}`
- alle SQL- und API-Pruefungen waren read-only
- keine Datenregeneration, kein DB-Reload, keine Code-/Schemaaenderung

## Offene Risiken

1. `P5-W1-T2` bleibt als separater API-Defekt offen:
   - generische Link-basierte Endpunkte bleiben durch leere `insar_to_gba` /
     `insar_to_osm` defekt
   - die Candidate-Area-Endpunkte dieses Tickets sind davon nach aktuellem Codepfad
     nicht betroffen

2. `P5-W2-T2` bleibt fuer die echte Satelliten-Blickrichtung `inconclusive`:
   - die hier gepruefte West-/Ost-Verschiebung ist ein interner Repo-Vertrag fuer
     Candidate-Areas
   - dieser Ticketstatus haengt nicht an einer neuen physikalischen
     Richtungsentscheidung

3. Candidate-Areas werden in der Kontext-API derzeit nur fuer `source='gba'`
   berechnet:
   - das ist zum aktiven Pipeline-Vertrag passend
   - fuer OSM waere eine spaetere Produktentscheidung noetig, falls dieselbe
     Visualisierung dort erwartet wird

## Endbewertung

`Daten korrekt`

Praezise Einordnung:

- Formel, Clamp und lateraler Slack sind zwischen Methodik, Pipeline, Persistenz und
  ML-Kontext-API konsistent
- Track-Signatur ist in Pipeline und API konsistent und zeigt sich in den live
  gelieferten Candidate-Geometrien in allen drei Pflicht-AOIs
- API-Geometrie und UI-Filterlogik fuer die Fokusansicht sind korrekt verdrahtet
- der bekannte Linktabellen-Defekt aus `P5-W1-T2` bleibt real, betrifft diesen
  Candidate-Area-Pfad aber nicht unmittelbar

Damit ist `P5-W3-T1` fuer den geprueften Scope `green`.
