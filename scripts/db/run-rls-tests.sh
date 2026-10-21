#!/usr/bin/env bash
# Ejecuta las pruebas SQL de aislamiento multi-tenant y roles (supabase/ci/*_tests.sql).
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL}"
cd "$(dirname "$0")/../.."
for file in $(ls supabase/ci/*_tests.sql | sort); do
  echo "pruebas: $(basename "$file")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q -f "$file" 2>&1 | grep -E "NOTICE|ERROR|CONTEXT|RLS:" | sed 's/^psql:[^ ]* //' ; test "${PIPESTATUS[0]}" -eq 0
done
