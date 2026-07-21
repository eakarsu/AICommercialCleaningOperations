#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"; set -a; . "$root/.env"; set +a; : "${DATABASE_URL:?DATABASE_URL required}"
for file in "$root"/backend/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"; done
