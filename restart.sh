#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== STOPPING ==="
"$ROOT_DIR/stop.sh"

echo ""
echo "=== STARTING ==="
"$ROOT_DIR/start.sh"
