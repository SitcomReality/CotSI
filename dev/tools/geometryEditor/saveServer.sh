#!/usr/bin/env bash
# Launch the geometry editor save server (see saveServer.mjs).
# Resolves node like tests/run.sh (falls back to the Flatpak host node).
# Usage: dev/tools/geometryEditor/saveServer.sh [PORT]
set -euo pipefail
cd "$(dirname "$0")/../../.."

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x /run/host/usr/bin/node ]; then
  NODE_BIN="/run/host/usr/bin/node"
else
  echo "error: node not found (install Node.js or set NODE_BIN)" >&2
  exit 1
fi

exec "$NODE_BIN" dev/tools/geometryEditor/saveServer.mjs "$@"
