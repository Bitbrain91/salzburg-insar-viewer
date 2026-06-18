#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXPLAINERS_DIR="$ROOT_DIR/explainers"
PIDS=()
BROWSER_URL="${INSAR_EXPLAINERS_URL:-http://localhost:5174}"

cleanup() {
  echo ""
  echo "Stopping explainer..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

port_in_use() {
  local port="$1"
  ss -ltn 2>/dev/null | awk -v p=":$port" '$4 ~ p"$"' | grep -q . || \
    netstat -ltn 2>/dev/null | awk -v p=":$port" '$4 ~ p"$"' | grep -q .
}

is_http_ready() {
  local url="$1"
  curl -fsS -o /dev/null "$url" >/dev/null 2>&1
}

wait_http_ready() {
  local url="$1"
  local name="$2"
  local pid="$3"
  local timeout_seconds="${4:-60}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "    ERROR: $name process exited early."
      return 1
    fi
    if is_http_ready "$url"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "    ERROR: $name did not become ready at $url within ${timeout_seconds}s."
  return 1
}

open_browser() {
  local url="$1"

  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /C start "" "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

VITE_BIN="$EXPLAINERS_DIR/node_modules/.bin/vite"
if [ ! -x "$VITE_BIN" ]; then
  echo "==> Installing explainer dependencies..."
  npm install --prefix "$EXPLAINERS_DIR" --include=dev --production=false || \
    npm install --prefix "$EXPLAINERS_DIR" --production=false || \
    npm install --prefix "$EXPLAINERS_DIR"
  if [ ! -x "$VITE_BIN" ]; then
    echo "    ERROR: vite is still missing after npm install (explainers/node_modules/.bin/vite)."
    echo "    Run npm install in explainers and rerun."
    exit 1
  fi
fi

EXPLAINERS_PID=""
if is_http_ready "http://127.0.0.1:5174"; then
  echo "==> Explainer already running (:5174)."
elif port_in_use 5174; then
  echo "    ERROR: Port 5174 is already in use, but the explainer is not ready."
  echo "    Stop the process on port 5174 and try again."
  exit 1
else
  echo "==> Starting explainer (vite :5174)..."
  (
    cd "$EXPLAINERS_DIR"
    npm run dev -- --host --port 5174 --strictPort
  ) &
  EXPLAINERS_PID=$!
  PIDS+=("$EXPLAINERS_PID")
fi

echo "==> Waiting for explainer on :5174..."
if [ -n "$EXPLAINERS_PID" ]; then
  if ! wait_http_ready "http://127.0.0.1:5174" "Explainer" "$EXPLAINERS_PID" 60; then
    exit 1
  fi
elif ! is_http_ready "http://127.0.0.1:5174"; then
  echo "    ERROR: Explainer is not ready at http://127.0.0.1:5174."
  exit 1
fi

echo ""
echo "========================================"
echo "  Explainer: http://localhost:5174"
echo "========================================"
echo "  Press Ctrl+C to stop the explainer"
echo "========================================"

echo "==> Opening browser..."
open_browser "$BROWSER_URL"

if [ "${#PIDS[@]}" -gt 0 ]; then
  wait "${PIDS[@]}"
else
  echo "Explainer was already running; browser opened."
fi
