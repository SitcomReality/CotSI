#!/usr/bin/env bash
# Run the CotSI pure-layer test suite with Node's built-in test runner.
# Zero dependencies — no package.json, no npm install.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x /run/host/usr/bin/node ]; then
  # Fallback for Flatpak-sandboxed shells where the host node is exposed here.
  NODE_BIN="/run/host/usr/bin/node"
else
  echo "error: node not found (install Node.js or set NODE_BIN)" >&2
  exit 1
fi

exec "$NODE_BIN" --test
