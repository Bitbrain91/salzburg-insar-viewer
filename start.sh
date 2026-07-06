#!/usr/bin/env bash
set -euo pipefail

# Starts the Salzburg InSAR Viewer (Docker services + backend + frontend).
#
# Default semantics are a fresh app start: processes listening on the viewer
# app ports are stopped before backend/frontend are launched. This avoids stale
# Vite or uvicorn processes serving old code after a terminal was closed. Set
# INSAR_REUSE=1 to keep already healthy backend/frontend processes.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_HOST="${INSAR_API_HOST:-127.0.0.1}"
API_BIND_HOST="${INSAR_API_BIND_HOST:-0.0.0.0}"
API_PORT="${INSAR_API_PORT:-8000}"
FRONTEND_HOST="${INSAR_FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${INSAR_FRONTEND_PORT:-3000}"
MLFLOW_PORT="${INSAR_MLFLOW_PORT:-5001}"
API_URL="http://${API_HOST}:${API_PORT}"
FRONTEND_URL="http://127.0.0.1:${FRONTEND_PORT}"
MLFLOW_URL="http://127.0.0.1:${MLFLOW_PORT}"
BROWSER_URL="${INSAR_VIEWER_URL:-http://localhost:${FRONTEND_PORT}}"
PIDS=()

cleanup() {
  local exit_code=$?

  if [ "${#PIDS[@]}" -gt 0 ]; then
    echo ""
    echo "Stopping services started by this window..."
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
    done
    sleep 1
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
    echo "Done. (Docker services still running - use ./stop.sh to stop everything)"
  fi

  exit "$exit_code"
}
trap cleanup EXIT INT TERM HUP

http_ok() {
  local url="$1"
  curl -fsS --max-time 2 -o /dev/null "$url" >/dev/null 2>&1
}

wait_http_ready() {
  local label="$1"
  local url="$2"
  local timeout_seconds="${3:-120}"
  local pid="${4:-}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "    ERROR: ${label} process exited early."
      return 1
    fi

    if http_ok "$url"; then
      return 0
    fi

    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "    ERROR: ${label} did not become ready at ${url} within ${timeout_seconds}s."
  return 1
}

pids_on_port() {
  local port="$1"

  {
    if command -v ss >/dev/null 2>&1; then
      ss -H -tlnp 2>/dev/null \
        | awk -v suffix=":${port}" '$4 ~ (suffix "$")' \
        | grep -oE 'pid=[0-9]+' \
        | cut -d= -f2
    fi

    if command -v lsof >/dev/null 2>&1; then
      lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null
    fi

    if command -v fuser >/dev/null 2>&1; then
      fuser "${port}/tcp" 2>/dev/null | tr ' ' '\n'
    fi
  } | grep -E '^[0-9]+$' | sort -u || true
}

backend_repo_pids() {
  ps -eo pid=,args= \
    | awk -v root="${ROOT_DIR}/backend" 'index($0, root) > 0 && $0 ~ /uvicorn/ {print $1}' \
    | sort -u || true
}

frontend_repo_pids() {
  ps -eo pid=,args= \
    | awk -v root="${ROOT_DIR}/frontend" 'index($0, root) > 0 && ($0 ~ /vite/ || $0 ~ /npm run dev/) {print $1}' \
    | sort -u || true
}

kill_pids_gracefully() {
  local pids="$1"
  [ -n "$pids" ] || return 0

  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true

  for _ in {1..20}; do
    local still_running=""
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        still_running="${still_running} ${pid}"
      fi
    done

    if [ -z "$still_running" ]; then
      return 0
    fi

    sleep 0.25
  done

  # shellcheck disable=SC2086
  kill -9 $pids 2>/dev/null || true
}

stop_app_port() {
  local port="$1"
  local label="$2"
  local repo_pids="$3"
  local port_pids
  local pids

  port_pids="$(pids_on_port "$port")"
  pids="$(
    {
      printf '%s\n' "$repo_pids"
      printf '%s\n' "$port_pids"
    } | grep -E '^[0-9]+$' | grep -v "^$$$" | sort -u || true
  )"

  if [ -z "$pids" ]; then
    return 0
  fi

  echo "[INFO] Stopping stale ${label} on port ${port} (PID ${pids//$'\n'/, })..."
  kill_pids_gracefully "$pids"

  if [ -n "$(pids_on_port "$port")" ]; then
    echo "    ERROR: Port ${port} is still in use; cannot start ${label}."
    return 1
  fi
}

start_docker_desktop() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) { Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' }" \
      >/dev/null 2>&1 || true
  fi
}

wait_docker_ready() {
  local timeout_seconds="${1:-240}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  return 1
}

open_browser() {
  local url="$1"

  if [ "${INSAR_OPEN_BROWSER:-1}" = "0" ]; then
    return 0
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Start-Process '${url}'" >/dev/null 2>&1 || true
  elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /C start "" "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

ensure_backend_env() {
  local venv_dir="${ROOT_DIR}/backend/.venv-wsl"
  local venv_py="${venv_dir}/bin/python"

  if [ ! -x "$venv_py" ]; then
    echo "==> Creating backend venv..."
    python3 -m venv "$venv_dir"
  fi

  if ! "$venv_py" -c "import asyncpg, fastapi, mlflow, numpy, orjson, pyarrow, sklearn, uvicorn" >/dev/null 2>&1; then
    echo "==> Installing backend dependencies..."
    "$venv_py" -m pip install -q -r "${ROOT_DIR}/backend/requirements.txt"
  fi
}

ensure_frontend_deps() {
  local vite_bin="${ROOT_DIR}/frontend/node_modules/.bin/vite"

  if [ ! -x "$vite_bin" ]; then
    echo "==> Installing frontend dependencies..."
    npm install --prefix "${ROOT_DIR}/frontend" --include=dev --production=false || \
      npm install --prefix "${ROOT_DIR}/frontend" --production=false || \
      npm install --prefix "${ROOT_DIR}/frontend"
  fi

  if [ ! -x "$vite_bin" ]; then
    echo "    ERROR: vite is still missing after npm install (frontend/node_modules/.bin/vite)."
    echo "    Run npm install in frontend and rerun."
    exit 1
  fi
}

echo ""
echo "============================================================"
echo "Salzburg InSAR Viewer wird gestartet"
echo "============================================================"
echo ""
echo "Repo:     ${ROOT_DIR}"
echo "Frontend: ${BROWSER_URL}"
echo "Backend:  ${API_URL}"
echo "MLflow:   ${MLFLOW_URL}"
echo ""

echo "==> Checking Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "    Docker is not running yet. Starting Docker Desktop..."
  start_docker_desktop
  if ! wait_docker_ready 240; then
    echo "    ERROR: Docker did not become ready within 240s."
    echo "    Please start Docker Desktop manually, then re-run this script."
    exit 1
  fi
fi
echo "    Docker is running."

echo "==> Starting Docker services (PostGIS, MLflow)..."
docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d

echo "==> Waiting for PostGIS to accept connections..."
for _ in {1..60}; do
  if docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T db \
    pg_isready -U insar -d insar >/dev/null 2>&1; then
    echo "    PostGIS is ready."
    break
  fi
  sleep 1
done

if ! docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T db \
  pg_isready -U insar -d insar >/dev/null 2>&1; then
  echo "    ERROR: PostGIS did not become ready within 60s."
  exit 1
fi

ensure_backend_env

BACKEND_PID=""
if [ "${INSAR_REUSE:-0}" = "1" ] && http_ok "${API_URL}/api/health"; then
  echo "==> Backend already running (:${API_PORT}, INSAR_REUSE=1)."
else
  stop_app_port "$API_PORT" "backend" "$(backend_repo_pids)"
  echo "==> Starting backend (uvicorn :${API_PORT})..."
  (
    cd "${ROOT_DIR}/backend"
    "${ROOT_DIR}/backend/.venv-wsl/bin/python" -m uvicorn app.main:app --reload --host "${API_BIND_HOST}" --port "${API_PORT}"
  ) &
  BACKEND_PID=$!
  PIDS+=("$BACKEND_PID")
fi

ensure_frontend_deps

FRONTEND_PID=""
if [ "${INSAR_REUSE:-0}" = "1" ] && http_ok "${FRONTEND_URL}"; then
  echo "==> Frontend already running (:${FRONTEND_PORT}, INSAR_REUSE=1)."
else
  stop_app_port "$FRONTEND_PORT" "frontend" "$(frontend_repo_pids)"
  echo "==> Starting frontend (vite :${FRONTEND_PORT})..."
  (
    cd "${ROOT_DIR}/frontend"
    npm run dev -- --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}" --strictPort
  ) &
  FRONTEND_PID=$!
  PIDS+=("$FRONTEND_PID")
fi

echo "==> Waiting for backend health on :${API_PORT}..."
if [ -n "$BACKEND_PID" ]; then
  wait_http_ready "Backend" "${API_URL}/api/health" 120 "$BACKEND_PID"
else
  wait_http_ready "Backend" "${API_URL}/api/health" 10
fi

echo "==> Waiting for frontend on :${FRONTEND_PORT}..."
if [ -n "$FRONTEND_PID" ]; then
  wait_http_ready "Frontend" "${FRONTEND_URL}" 60 "$FRONTEND_PID"
else
  wait_http_ready "Frontend" "${FRONTEND_URL}" 10
fi

echo "==> Waiting for MLflow on :${MLFLOW_PORT}..."
wait_http_ready "MLflow" "${MLFLOW_URL}/" 300

echo ""
echo "========================================"
echo "  Frontend:  ${BROWSER_URL}"
echo "  Backend:   ${API_URL}"
echo "  MLflow:    ${MLFLOW_URL}"
echo "========================================"
echo "  Zum Beenden dieses Fenster schliessen oder Ctrl+C druecken."
echo "========================================"

echo "==> Opening browser..."
open_browser "$BROWSER_URL"

if [ "${INSAR_EXIT_AFTER_READY:-0}" = "1" ]; then
  echo "[OK] Ready check completed."
  exit 0
fi

if [ "${#PIDS[@]}" -eq 0 ]; then
  echo "[OK] InSAR Viewer laeuft bereits (INSAR_REUSE=1)."
  exit 0
fi

wait -n "${PIDS[@]}"
