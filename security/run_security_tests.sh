#!/usr/bin/env bash
# Runs the privilege audit and the attack test on a throw-away local Postgres 16 (never on production).
# Usage (as a non-root user): bash security/run_security_tests.sh      needs Postgres 16 binaries
set -euo pipefail
KIT="$(cd "$(dirname "$0")/.." && pwd)"; PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"; D="$(mktemp -d)"; PORT=5466
cleanup() { "$PGBIN/pg_ctl" -D "$D/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$D"; }; trap cleanup EXIT
cat > "$D/stub.sql" <<'SQL'
create role anon nologin; create role authenticated nologin; create role authenticator nologin; create schema auth; create schema extensions;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated; grant usage on schema extensions to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
SQL
"$PGBIN/initdb" -D "$D/data" -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$D/data" -o "-k $D -p $PORT" -l "$D/log" start >/dev/null; sleep 2
S="$KIT/supabase"
psql -h "$D" -p $PORT -q -v ON_ERROR_STOP=1 -d postgres -f "$D/stub.sql" -f "$S/schema.sql" -f "$S/schema_changes.sql" -f "$S/schema_participants.sql" \
  -f "$S/schema_voting.sql" -f "$S/schema_stamps.sql" -f "$S/schema_ops.sql" >/dev/null 2>&1
echo "=== ATTACK TEST (every line must be PASS) ==="
psql -h "$D" -p $PORT -q -d postgres -f "$KIT/security/attack_test.sql" 2>&1 | grep -v "^$"
echo "=== PRIVILEGE AUDIT (read the sections) ==="
psql -h "$D" -p $PORT -q -d postgres -f "$KIT/security/privilege_audit.sql" 2>&1 | grep -v "^$"
