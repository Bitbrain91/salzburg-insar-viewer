# Bad Gastein Integration Supervisor Prompt

Lies `docs/bad_gastein_integration_execution_plan.md` und fuehre den Plan
vollstaendig aus.

## Ziel der Session

Integriere Bad Gastein end-to-end als zweiten AOI in den Salzburg InSAR Viewer:
GBA-Download, InSAR-Aufbereitung, Parquet, PostGIS, Tiles, API, Frontend und
ML-Pipeline.

## Arbeitsmodus

- Arbeite als Supervisor, nicht als stiller Ticket-Implementierer.
- Ticket-Arbeit wird an Subagents delegiert.
- Nutze fuer delegierte Agents `gpt-5.5` mit Reasoning `xhigh`.
- Wenn `gpt-5.5` nicht verfuegbar ist, stoppe und melde den Blocker.
- Fuehre alle Phasen ohne User-Zwischenreview aus.
- Starte die naechste Phase automatisch, sobald das interne Gate gruen ist.
- Verwende keine destruktiven Git-Kommandos.
- Revertiere keine fremden oder User-Aenderungen.

## Pflichtlektuere

- `AGENTS.md` bzw. die Repository Guidelines aus dem Session-Kontext
- `docs/workflows/ai_supervisor_workflow.md`
- `docs/bad_gastein_integration_execution_plan.md`
- `README.md`
- Relevante Einstiegspunkte:
  - `pipeline/prepare_insar.py`
  - `pipeline/prepare_buildings.py`
  - `pipeline/load_postgis.py`
  - `pipeline/build_tiles.sh`
  - `backend/sql/schema.sql`
  - `backend/app/routers/api.py`
  - `backend/app/ml/track_geometry.py`
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - `frontend/src/components/MapView.tsx`
  - `frontend/src/components/LayerPanel.tsx`
  - `frontend/src/lib/store.ts`

## Empfohlene erste Delegationen

1. Pipeline/Daten-Agent:
   - GBA-Download, InSAR-Preparation, Gebaeude-Preparation, Tile-Build.
2. Backend/API/ML-Agent:
   - Schema, API, Track-Geometrie, ML-Run-Identitaet, Pipeline-Joins.
3. Frontend-Agent:
   - AOI-Auswahl, dynamische Track-Toggles, MapView, Inspector/Tooltip.

Die Write-Sets muessen disjunkt bleiben. Der Supervisor prueft Rueckgaben,
integriert Konflikte und fuehrt Gates aus.

## Harte Gates

- Bad-Gastein-GBA ist automatisch erzeugt und validiert.
- `(dataset_id, code, track)` ist kollisionsfrei.
- Salzburg-Default bleibt lauffaehig.
- API- und UI-Punktidentitaet nutzen `dataset_id`.
- Bad-Gastein-GBA wird fuer ML verwendet; OSM ist kein Ersatz.

## Abschlusskriterium

Die Session endet erst, wenn alle Phasen umgesetzt und verifiziert sind oder ein
harter Blocker reproduzierbar dokumentiert ist.

Minimaler Session-Start:

```text
Lies docs/bad_gastein_integration_supervisor_prompt.md und fuehre es vollstaendig aus.
```
