#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"; [ -f "$root/.env" ] || cp "$root/.env.example" "$root/.env"; (cd "$root/backend" && npm ci); (cd "$root/frontend" && npm ci)
