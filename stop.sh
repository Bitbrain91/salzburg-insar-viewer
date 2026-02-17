#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

kill_pids() {
  local pids="$1"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

echo "==> Stopping frontend (port 3000)..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp >/dev/null 2>&1 || true
else
  kill_pids "$(lsof -ti tcp:3000 -sTCP:LISTEN 2>/dev/null || true)"
fi
kill_pids "$(ps -eo pid=,args= | awk -v root="$ROOT_DIR/frontend" 'index($0, root) > 0 && ($0 ~ /vite|npm run dev/) {print $1}')"

echo "==> Stopping backend (port 8000)..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8000/tcp >/dev/null 2>&1 || true
else
  kill_pids "$(lsof -ti tcp:8000 -sTCP:LISTEN 2>/dev/null || true)"
fi
kill_pids "$(ps -eo pid=,args= | awk -v root="$ROOT_DIR/backend" 'index($0, root) > 0 && $0 ~ /uvicorn/ {print $1}')"

echo "==> Stopping Docker services..."
docker compose -f "$ROOT_DIR/docker-compose.yml" down >/dev/null

sleep 1
echo "All services stopped."
