#!/usr/bin/env bash
# Rebuild the golden descriptor snapshot
# (dev/tests/render/fixtures/descriptorData.snap.json) from the current
# descriptor data. The geometry editor's save server does this automatically
# on every Save; run this to reconcile manually (e.g. after a revert).
# Resolves node like dev/tests/run.sh (falls back to the Flatpak host node).
set -euo pipefail
cd "$(dirname "$0")/../.."

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x /run/host/usr/bin/node ]; then
  NODE_BIN="/run/host/usr/bin/node"
else
  echo "error: node not found (install Node.js or set NODE_BIN)" >&2
  exit 1
fi

exec "$NODE_BIN" dev/scripts/regenerate_descriptor_snapshot.mjs
