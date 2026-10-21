#!/usr/bin/env bash
# Aplica el shim de Supabase y todas las migraciones, en orden, sobre un Postgres vacío.
# Uso: DATABASE_URL=postgres://... bash scripts/db/apply-migrations.sh
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
: "${DATABASE_URL:?Define DATABASE_URL (Postgres vacío o desechable)}"
cd "$(dirname "$0")/../.."

psql_run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X "$@"; }

psql_run -f supabase/ci/00_supabase_shim.sql >/dev/null
for file in $(ls supabase/migrations/*.sql | sort); do
  echo "migración: $(basename "$file")"
  psql_run -f "$file" >/dev/null
done
echo "migraciones aplicadas"
