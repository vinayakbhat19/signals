-- Fest Live: privilege audit. Run in the Supabase SQL Editor (or psql) AFTER all SQL files. Read-only.
-- Every section should match the EXPECTED line. Anything else is a finding: fix it before the test.

\echo '== 1. Tables in public WITHOUT row level security (EXPECTED: none)'
select c.relname as table_without_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

\echo '== 2. What the signed-OUT role (anon) can touch: tables and views (EXPECTED: only the public ones listed in SECURITY_CHECKLIST.md section B)'
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
group by table_name order by 1;

\echo '== 3. Column-level grants for anon (EXPECTED: polls (no secret), profile columns none)'
select table_name, string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema = 'public' and grantee = 'anon' and table_name in (select table_name from information_schema.tables where table_type='BASE TABLE')
group by table_name order by 1;

\echo '== 4. Tables a signed-in student can WRITE directly (EXPECTED: only own rows: profiles name/avatar/hidden flag, stars, signals, signal_responses, reports)'
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE','DELETE')
group by table_name order by 1;

\echo '== 5. Secret columns with a SELECT grant to clients. EXPECTED: only stamp_points (name, clue, hint, code) and participants (email, phone) for authenticated, and ONLY because row level security shows those rows to organisers/hosts alone (the attack test proves it). polls.secret, signals.contact and push_subscriptions must NOT appear'
select grantee, table_name, column_name
from information_schema.column_privileges
where table_schema = 'public' and privilege_type = 'SELECT' and grantee in ('anon','authenticated','PUBLIC')
  and ((table_name = 'polls' and column_name = 'secret') or (table_name = 'stamp_points' and column_name in ('code','name','clue','hint'))
       or (table_name = 'signals' and column_name = 'contact') or (table_name = 'push_subscriptions') or (table_name = 'participants' and column_name in ('email','phone')));

\echo '== 6. Functions the signed-out role (anon) can run (EXPECTED: only the public read functions: app_status, live_feed, my_hunt, current_mode, poll_open, is_volunteer, fmt_ist, helpers)'
select p.proname as function, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
  and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
order by 1;

\echo '== 7. SECURITY DEFINER functions without a fixed search_path (EXPECTED: none)'
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
order by 1;

\echo '== 8. Views readable by clients and whether they run with the caller rights (review each: security_invoker=true, or the view exposes only safe columns)'
select c.relname as view, coalesce((select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'), 'false') as security_invoker
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v' order by 1;

\echo '== 9. Role time limits (EXPECTED: anon and authenticated each have a statement_timeout)'
select rolname, rolconfig from pg_roles where rolname in ('anon','authenticated','authenticator') order by 1;

\echo '== 10. Extension functions that clients can call as RPC (EXPECTED on Supabase: none; pgcrypto must live in the extensions schema)'
select count(*) as pgcrypto_functions_in_public
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('crypt','gen_salt','hmac','digest','pgp_sym_encrypt','gen_random_bytes') ;
