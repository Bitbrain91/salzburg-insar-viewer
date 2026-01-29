# Repository Guidelines

This repository hosts the Salzburg InSAR Viewer: a React/MapLibre frontend, a FastAPI backend, and data pipelines for InSAR + building datasets. Use the notes below to keep changes consistent and easy to review.

## Project Structure & Module Organization
- `frontend/`: React + Vite UI. Source lives in `frontend/src/` with components in `frontend/src/components/` and shared state in `frontend/src/lib/`.
- `backend/`: FastAPI service in `backend/app/`, SQL schema in `backend/sql/`, static assets in `backend/static/`.
- `pipeline/`: Python scripts to prepare GeoParquet data and build MBTiles (see `pipeline/build_tiles.sh`).
- `data/`: Raw inputs (`data/Daten/`, `data/gba/`), processed parquet (`data/parquet/`), and tiles (`data/tiles_v2/`).
- `docs/`: Analysis and project documentation.
- `mlruns/`: Local MLflow tracking database + artifacts (created when MLflow runs).

## Build, Test, and Development Commands
```bash
# Start PostGIS (required for backend queries)
docker compose up -d

# Backend (from repo root)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npx vite --host --port 3000

# Data pipeline examples
python pipeline/prepare_insar.py --track all
python pipeline/load_postgis.py --dsn postgresql://insar:insar@localhost:5432/insar
./pipeline/build_tiles.sh
```

## Coding Style & Naming Conventions
- Frontend: TypeScript/TSX, 2‑space indentation, PascalCase components (`MapView.tsx`), camelCase for functions/hooks, styles in `frontend/src/styles/index.css`.
- Backend/Pipeline: Python with 4‑space indentation, snake_case modules/functions, keep SQL in `backend/sql/`.
- No enforced formatter/linter config; follow existing file conventions.

## Testing Guidelines
- No automated test suite is present. For now, smoke‑test by starting Docker + backend + frontend and verifying the UI loads and map layers respond.
- If adding tests, place them alongside the relevant package (e.g., `backend/tests/` or `frontend/src/__tests__/`) and document the new command in this file.

## Commit & Pull Request Guidelines
- Current history uses short, imperative summaries (e.g., “Add InSAR documentation PDFs”). Keep messages concise and descriptive.
- PRs should include: what changed, how to run/verify, and screenshots for UI changes. Note any data regeneration steps (pipelines, tiles) explicitly.

## Configuration & Data Notes
- Python 3.13 is the preferred local runtime (Windows).
- Environment variables live in `frontend/.env` and `backend/.env` (see `README.md` for examples).
- Use `127.0.0.1` instead of `localhost` in the frontend env if API routes return 404 (IPv6 vs IPv4 mismatch).
- Generated artifacts land in `data/parquet/` and `data/tiles_v2/`; avoid manual edits and regenerate via pipeline scripts when needed.
- MLflow runs via Docker (`docker compose up -d`) and serves the UI at `http://localhost:5001`.

## ML Pipelines (Short)
- Runs are tracked in MLflow and stored in PostGIS tables `ml_runs`, `ml_point_results`, `ml_run_metrics`.
- Start runs in the left UI panel or via CLI:
  ```bash
  python -m backend.app.ml.cli --pipeline assignment --source gba --track 44 \
    --bbox 12.98,47.75,13.12,47.85
  ```
- Delete a run (DB + MLflow):
  ```bash
  curl -X DELETE "http://127.0.0.1:8000/api/ml/runs/<RUN_ID>?force=true"
  ```

## MCP Server (MLflow, Codex)
- Codex startet den MCP Server als Prozess; Tracking-URI muss `http://localhost:5001` sein.
- Minimal-Config fuer `.codex/config.toml`:
  ```toml
  [mcp_servers.mlflow-mcp]
  command = "backend/.venv-wsl/bin/mlflow"
  args = ["mcp", "run"]

  [mcp_servers.mlflow-mcp.env]
  MLFLOW_TRACKING_URI = "http://localhost:5001"
  ```
- MCP ist nur fuer Traces/Evaluations (keine Experimente/Runs/Artifacts).
- CLI/API (kompakt):
  ```bash
  MLFLOW_TRACKING_URI=http://localhost:5001 backend/.venv-wsl/bin/mlflow experiments list
  MLFLOW_TRACKING_URI=http://localhost:5001 backend/.venv-wsl/bin/python - <<'PY'
  from mlflow.tracking import MlflowClient; print([e.name for e in MlflowClient().search_experiments()])
  PY
  ```
