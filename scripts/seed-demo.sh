#!/usr/bin/env bash
set -euo pipefail
[ "${CONFIRM_DEMO_SEED:-}" = yes ] || { echo "Set CONFIRM_DEMO_SEED=yes" >&2; exit 1; }; root="$(cd "$(dirname "$0")/.." && pwd)"; set -a; . "$root/.env"; set +a; (cd "$root/backend" && npm run seed)
