#!/usr/bin/env bash
# Runs the SQL tests on a throw-away local Postgres 16 (not on Supabase).
# Usage: bash supabase/tests/run_tests.sh   (from the kit folder; needs Postgres 16 binaries)
set -euo pipefail
KIT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
D="$(mktemp -d)"; PORT=5433
cleanup() { "$PGBIN/pg_ctl" -D "$D/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
cat > "$D/stub.sql" <<'SQL'
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
SQL
"$PGBIN/initdb" -D "$D/data" -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$D/data" -o "-k $D -p $PORT" -l "$D/log" start >/dev/null; sleep 2
S="$KIT/supabase"
psql -h "$D" -p $PORT -q -v ON_ERROR_STOP=1 -d postgres \
  -f "$D/stub.sql" -f "$S/schema.sql" -f "$S/schema_changes.sql" -f "$S/schema_participants.sql" \
  -f "$S/schema_voting.sql" -f "$S/schema_stamps.sql" -f "$S/schema_ops.sql" -f "$S/seed.sql" 2>&1 | grep -v NOTICE || true
echo "== schema applied in launch order"
psql -h "$D" -p $PORT -q -A -F ' | ' -d postgres -f "$S/tests/ops_test.sql" 2>&1 | grep -v "rows)\|row)\|^$\|^set_config\|^[0-9a-f-]\{36\}$\|^?column?"
