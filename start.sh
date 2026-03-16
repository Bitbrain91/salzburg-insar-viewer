#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Stopping services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  echo "Done. (Docker services still running - use ./stop.sh to stop everything)"
  exit 0
}
trap cleanup SIGINT SIGTERM

port_in_use() {
  local port="$1"
  ss -ltn 2>/dev/null | awk -v p=":$port" '$4 ~ p"$"' | grep -q . || \
    netstat -ltn 2>/dev/null | awk -v p=":$port" '$4 ~ p"$"' | grep -q .
}

wait_port_ready() {
  local port="$1"
  local name="$2"
  local pid="$3"
  local timeout_seconds="${4:-30}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "    ERROR: $name process exited early."
      return 1
    fi
    if port_in_use "$port"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "    ERROR: $name did not listen on port $port within ${timeout_seconds}s."
  return 1
}

wait_http_ready() {
  local url="$1"
  local name="$2"
  local timeout_seconds="${3:-120}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if curl -fsS -o /dev/null "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "    ERROR: $name did not become ready at $url within ${timeout_seconds}s."
  return 1
}

# --- 0) Docker Desktop pruefen ---
echo "==> Checking Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "    ERROR: Docker is not running."
  echo "    Please start Docker Desktop first, then re-run this script."
  exit 1
fi
echo "    Docker is running."

# --- 1) Docker services (PostGIS + MLflow) ---
echo "==> Starting Docker services (PostGIS, MLflow)..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "==> Waiting for PostGIS to accept connections..."
RETRIES=0
until docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db \
  pg_isready -U insar -d insar >/dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge 30 ]; then
    echo "    ERROR: PostGIS did not become ready within 30s."
    exit 1
  fi
  sleep 1
done
echo "    PostGIS is ready."

# --- 2) Backend ---
VENV_DIR="$ROOT_DIR/backend/.venv-wsl"
VENV_PY="$VENV_DIR/bin/python"
if [ ! -x "$VENV_PY" ]; then
  echo "==> Creating backend venv..."
  python3 -m venv "$VENV_DIR"
  "$VENV_PY" -m pip install -q -r "$ROOT_DIR/backend/requirements.txt"
else
  if ! "$VENV_PY" -c "import uvicorn" >/dev/null 2>&1; then
    echo "==> Installing backend dependencies..."
    "$VENV_PY" -m pip install -q -r "$ROOT_DIR/backend/requirements.txt"
  fi
fi

echo "==> Starting backend (uvicorn :8000)..."
(
  cd "$ROOT_DIR/backend"
  "$VENV_PY" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")

# --- 3) Frontend ---
VITE_BIN="$ROOT_DIR/frontend/node_modules/.bin/vite"
if [ ! -x "$VITE_BIN" ]; then
  echo "==> Installing frontend dependencies..."
  npm install --prefix "$ROOT_DIR/frontend" --include=dev --production=false || \
    npm install --prefix "$ROOT_DIR/frontend" --production=false || \
    npm install --prefix "$ROOT_DIR/frontend"
  if [ ! -x "$VITE_BIN" ]; then
    echo "    ERROR: vite is still missing after npm install (frontend/node_modules/.bin/vite)."
    echo "    Run npm install in frontend and rerun."
    exit 1
  fi
fi

echo "==> Starting frontend (vite :3000)..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev -- --host --port 3000 --strictPort
) &
FRONTEND_PID=$!
PIDS+=("$FRONTEND_PID")

echo "==> Waiting for backend on :8000..."
if ! wait_port_ready 8000 "Backend" "$BACKEND_PID"; then
  exit 1
fi

echo "==> Waiting for frontend on :3000..."
if ! wait_port_ready 3000 "Frontend" "$FRONTEND_PID"; then
  exit 1
fi

echo "==> Waiting for MLflow on :5001..."
if ! wait_http_ready "http://127.0.0.1:5001/" "MLflow" 180; then
  exit 1
fi

echo ""
echo "========================================"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  MLflow:    http://localhost:5001"
echo "========================================"
echo "  Press Ctrl+C to stop all services"
echo "========================================"

wait "${PIDS[@]}"
