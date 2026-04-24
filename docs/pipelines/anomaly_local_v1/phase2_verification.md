# `anomaly_local_v1` Phase-1-Verifikation

Stand: 2026-04-23
Status: `P1-W3-T1` green

## Scope

Diese Notiz dokumentiert den Abschluss von `P1`:

- Pipeline-Rollups fuer `main_cluster`, `building_motion_mm_a`, `building_reliability_score` und `differential_motion_flag`
- Backend-Schemas, Building-Endpunkte und Tiles auf dem kanonischen Rollup-Vertrag
- Frontend-Umstellung von Diagnosemitteln auf echte Gebaeude-Semantik

## Mechanische Verifikation

- `python -m compileall backend/app`: gruen
- `npm run build`: gruen
- Live-PostGIS / MLflow verfuegbar via Docker-Compose waehrend der Verifikation

## AOI-Laeufe

| AOI | BBox | Run-ID | Kernergebnis |
| --- | --- | --- | --- |
| Mirabell | `[13.04027, 47.80375, 13.04387, 47.80735]` | `b816c7d9-97bd-4e4f-9f76-1bef4b02e077` | `assigned_buildings=58`, `multi_cluster_buildings=29`, `small_n_buildings=8`, `median_cross_track_diff_after=0.6405`, `cross_track_improvement=0.1263` |
| Moosstrasse | `[13.02714, 47.79189, 13.03074, 47.79549]` | `578684cf-67f3-4899-bf68-a48009451dd0` | `assigned_buildings=147`, `multi_cluster_buildings=72`, `small_n_buildings=20`, `median_cross_track_diff_after=1.0229`, `cross_track_improvement=0.1293` |
| Osthang-Stressbereich | `[13.0492, 47.8036, 13.0528, 47.8054]` | `93a50f3c-21d9-40fd-931a-12c12c2bd8a9` | `assigned_buildings=47`, `multi_cluster_buildings=27`, `small_n_buildings=6`, `median_cross_track_diff_after=0.8976`, `cross_track_improvement=0.1904` |

Die Reihenfolge der AOI-Pruefung war `Mirabell -> Moosstrasse -> Osthang-Stressbereich`.

## Spot-Checks

### 1. Mirabell: plausibler Standardfall

- Gebaeude `548205`
- `building_status=ok`
- `building_motion_mm_a=0.6403`
- `building_reliability_score=0.9839` (`high`)
- `track_agreement_score=0.9977`
- `differential_motion_flag=false`
- `main_cluster_track_44_id=548205:t44:cluster_0`
- `main_cluster_track_95_id=548205:t95:cluster_0`

Beobachtung:
Der Standardfall liefert jetzt einen klaren Gebaeudewert statt eines Punktmittel-Proxys. Beide Tracks haben einen expliziten `main_cluster`, und die Reliability bleibt hoch.

### 2. Moosstrasse: Multi-Cluster mit differenzieller Bewegung

- Gebaeude `96637447`
- `building_status=ok`
- `building_motion_mm_a=0.4482`
- `building_reliability_score=0.7610` (`high`)
- `track_agreement_score=0.9009`
- `differential_motion_flag=true`
- `cluster_count=6`, `reliable_cluster_count=5`
- `main_cluster_track_44_id=96637447:t44:cluster_2`
- `main_cluster_track_95_id=96637447:t95:cluster_0`

Beobachtung:
Der Fall zeigt den gewuenschten V1-Mehrwert: Multi-Cluster bleibt sichtbar, aber der primaere Gebaeudewert kommt aus den `main_cluster`-Rollups. Gleichzeitig wird die interne Bewegungsdifferenz nicht versteckt, sondern als `differential_motion_flag` nach oben gezogen.

### 3. Osthang-Stressbereich: Small-n / insufficient-support

- Gebaeude `395674088`
- `building_status=insufficient_support`
- `building_motion_mm_a=null`
- `building_reliability_score=null`
- `track_agreement_score=null`
- `differential_motion_flag=false`
- `cluster_count=1`, `reliable_cluster_count=0`
- `kept_point_count=1`

Beobachtung:
Der Stress-AOI produziert weiterhin kleine Stichproben. Die neue Semantik bleibt hier bewusst ehrlich: kein scheinpraeziser Gebaeudewert, kein Reliability-Band, sondern ein explizites `insufficient_support`.

## UI-/API-Checks

- Lokaler FastAPI-Start via `.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`: gruen
- Lokaler Frontend-Start via `npm run dev -- --host 127.0.0.1 --port 3000`: gruen
- HTTP-Checks `200 OK` auf
  - `/api/ml/runs/b816c7d9-97bd-4e4f-9f76-1bef4b02e077/buildings/gba/548205`
  - `/api/ml/runs/b816c7d9-97bd-4e4f-9f76-1bef4b02e077/buildings/gba/548205/points`
  - `/api/ml/runs/b816c7d9-97bd-4e4f-9f76-1bef4b02e077/buildings/gba/548205/context`
  - `/api/ml/runs/b816c7d9-97bd-4e4f-9f76-1bef4b02e077/buildings/17/70424/45191.pbf`
- Building-Detail liefert die neuen V1-Felder (`building_motion_mm_a`, `building_reliability_score`, `building_reliability_band`, `differential_motion_flag`, `main_cluster_track_*`, `track_motion_mm_a`, `reliable_cluster_count`)
- Building-Tiles transportieren dieselben primaeren Gebaeudefelder fuer Karte und Tooltip
- Inspector zeigt Gebaeude-Summary jetzt auf Motion / Reliability / `main_cluster`-Basis; alte Durchschnittswerte bleiben nur noch im Diagnoseblock
- `PipelinePanel` verwendet den View-Namen `reliability`
- Karten-Tooltip fuer Gebaeude reagiert auf Motion, Reliability, Track-Agreement und `differential_motion_flag`
- Interaktive Browser-Abnahme gegen den laufenden Stack:
  - Osthang `395674088` zeigt live `insufficient_support` mit `building_motion_mm_a=null`, `building_reliability_score=null`, keinen `main_cluster`-IDs und genau einem nicht belastbaren Cluster.
  - Moosstrasse `96637447` zeigt live `0.45 mm/yr`, `0.76 / high`, `differential_motion=yes`, `6 / 5` Cluster/reliable und konsistente `main_cluster`-IDs fuer beide Tracks.
  - Mirabell zeigt live auf dem direkt benachbarten Footprint `548204` denselben erwarteten Standardfall-Typ (`ok`, hohe Reliability, kein `differential_motion_flag`); der referenzierte Spot-Check `548205` wurde zusaetzlich ueber den API-Vertrag verifiziert.
- Browser-Konsole ohne fachlich relevante App-Fehler; sichtbar waren nur `favicon.ico`-`404` und WebGL-`ReadPixels`-Warnings.

## Restrisiken fuer Phase 2

- Die V1-Reliability-Formel ist bewusst heuristisch; Kalibrierung gegen Expertenfeedback und KI-Vergleich bleibt `P2`.
- `differential_motion_flag` ist fachlich nuetzlich, aber die Schwelle muss mit mehr AOIs weiter justiert werden.
- Die derive-first-Strategie ueber `ml_point_results.meta` funktioniert fuer `P1`; Performance und Auditierbarkeit bei groesseren Abfragen muessen in spaeteren Phasen beobachtet werden.
- Die Browser-Abnahme ist interaktiv erfolgt, nicht als reproduzierbarer E2E-Test automatisiert.
