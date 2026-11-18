-- Fiesta'26 Live: operations, safety and "back to the campus app" after the fest.
-- Run LAST: after schema.sql, schema_changes.sql, schema_participants.sql, schema_voting.sql
-- and (if you build the hunt) schema_stamps.sql.
--
-- What this adds
--   1. app_config: ONE row that says whether the app is in "fest" or "campus" mode.
--      Mode switches by itself at campus_from (28 Nov 2026 00:00 IST). No cron needed:
--      everything compares against now().
--   2. Votes and stamps are refused outside fest mode, or when an organiser pauses
--      writes (kill switch for an incident).
--   3. Host management: organisers invite hosts by email; an invite becomes a host
--      only after that email is CONFIRMED. Host access expires at hosts_until.
--   4. audit_log: who changed roles, hosts, polls, config, deleted events.
--   5. rate_hit(): database rate limiter, the fallback when Upstash Redis is down.
--   6. push_subscriptions + push_queue: Web Push storage. Clients never touch them:
--      only the server (service role) does.
--   7. archive_and_purge_fest(): after the fest, keep vote totals, delete individual
--      votes, push subscriptions and participants' emails/phones.

-- ---------------------------------------------------------------- app config
create table public.app_config (
  id             int primary key default 1 check (id = 1),
  mode_override  text not null default 'auto' check (mode_override in ('auto', 'fest', 'campus')),
  fest_name      text not null default 'Fiesta''26' check (char_length(fest_name) <= 60),
  fest_starts_at timestamptz not null default timestamptz '2026-11-25 00:00:00+05:30',
  fest_ends_at   timestamptz not null default timestamptz '2026-11-27 23:59:59+05:30',
  campus_from    timestamptz not null default timestamptz '2026-11-28 00:00:00+05:30',
  hosts_until    timestamptz not null default timestamptz '2026-11-30 23:59:59+05:30',
  writes_paused  boolean not null default false,
  banner_message text check (char_length(banner_message) <= 200),
  banner_level   text not null default 'info' check (banner_level in ('info', 'warning', 'critical')),
  updated_at     timestamptz not null default now(),
  check (campus_from >= fest_ends_at)
);
insert into public.app_config (id) values (1);

create trigger app_config_touch before update on public.app_config
  for each row execute function public.touch_updated_at();   -- from schema.sql

create or replace function public.current_mode()
returns text
language sql stable
as $$
  select case c.mode_override
           when 'fest'   then 'fest'
           when 'campus' then 'campus'
           else case when now() >= c.campus_from then 'campus' else 'fest' end
         end
  from public.app_config c where c.id = 1;
$$;

-- Everything the app shell needs in one cheap call (cache it for 15 s).
create or replace function public.app_status()
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'mode', public.current_mode(),
    'fest_name', c.fest_name,
    'fest_starts_at', c.fest_starts_at,
    'fest_ends_at', c.fest_ends_at,
    'campus_from', c.campus_from,
    'writes_paused', c.writes_paused,
    'banner', c.banner_message,
    'banner_level', c.banner_level,
    'server_time', now())
  from public.app_config c where c.id = 1;
$$;

-- ---------------------------------------------------------------- guard: votes and stamps
create or replace function public.guard_fest_writes()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select writes_paused from public.app_config where id = 1) then
    raise exception 'Writes are paused right now. Please try again in a few minutes' using errcode = 'P0001';
  end if;
  if public.current_mode() <> 'fest' then
    raise exception 'The fest is over' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.votes') is not null then
    drop trigger if exists votes_guard on public.votes;
    create trigger votes_guard before insert on public.votes
      for each row execute function public.guard_fest_writes();
  end if;
  if to_regclass('public.stamps') is not null then
    drop trigger if exists stamps_guard on public.stamps;
    create trigger stamps_guard before insert on public.stamps
      for each row execute function public.guard_fest_writes();
  end if;
end $$;

-- ---------------------------------------------------------------- audit log
create table public.audit_log (
  id     bigserial primary key,
  at     timestamptz not null default now(),
  actor  uuid,                                   -- null = dashboard / service role
  action text not null,
  target text,
  detail jsonb not null default '{}'
);
create index audit_log_at_idx on public.audit_log (at desc);

create or replace function public._audit(p_action text, p_target text, p_detail jsonb)
returns void
language sql security definer set search_path = public
as $$
  insert into public.audit_log (actor, action, target, detail) values (auth.uid(), p_action, p_target, coalesce(p_detail, '{}'));
$$;
revoke execute on function public._audit(text, text, jsonb) from public, anon, authenticated;

create or replace function public.audit_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._audit('role_change', new.id::text, jsonb_build_object('email', new.email, 'from', old.role, 'to', new.role));
  return new;
end $$;
create trigger audit_profile_role after update of role on public.profiles
  for each row when (old.role is distinct from new.role) execute function public.audit_profile_role();

create or replace function public.audit_hosts()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.event_hosts := case when tg_op = 'DELETE' then old else new end;
begin
  perform public._audit(case when tg_op = 'DELETE' then 'host_removed' else 'host_added' end,
                        r.event_id::text, jsonb_build_object('user_id', r.user_id));
  return r;
end $$;
create trigger audit_hosts after insert or delete on public.event_hosts
  for each row execute function public.audit_hosts();

create or replace function public.audit_event_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._audit('event_deleted', old.id::text, jsonb_build_object('title', old.title));
  return old;
end $$;
create trigger audit_event_deleted after delete on public.events
  for each row execute function public.audit_event_deleted();

create or replace function public.audit_config()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._audit('config_change', 'app_config',
    jsonb_build_object('mode_override', new.mode_override, 'writes_paused', new.writes_paused,
                       'campus_from', new.campus_from, 'banner', new.banner_message));
  return new;
end $$;
create trigger audit_config after update on public.app_config
  for each row execute function public.audit_config();

do $$
begin
  if to_regclass('public.polls') is not null then
    create or replace function public.audit_poll()
    returns trigger language plpgsql security definer set search_path = public as $f$
    begin
      perform public._audit('poll_change', new.id::text,
        jsonb_build_object('enabled', new.enabled, 'visibility', new.results_visibility, 'closes_at', new.closes_at));
      return new;
    end $f$;
    drop trigger if exists audit_poll on public.polls;
    create trigger audit_poll after update of enabled, results_visibility, closes_at on public.polls
      for each row execute function public.audit_poll();
  end if;
end $$;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select to authenticated using (public.is_organiser());

-- ---------------------------------------------------------------- host management
create table public.host_invites (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  email       text not null check (email = lower(email) and char_length(email) <= 120),
  invited_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (event_id, email)
);

revoke all on public.host_invites from anon, authenticated;
grant select, delete on public.host_invites to authenticated;   -- inserts only through invite_host()
alter table public.host_invites enable row level security;
create policy invites_read on public.host_invites for select to authenticated using (public.is_organiser());
create policy invites_delete on public.host_invites for delete to authenticated using (public.is_organiser());

-- Hosts only count until hosts_until (organisers always count).
create or replace function public.is_event_host(p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_organiser()
      or (exists (select 1 from public.event_hosts where event_id = p_event and user_id = auth.uid())
          and now() <= (select hosts_until from public.app_config where id = 1));
$$;

create or replace function public.invite_host(p_event uuid, p_email text)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  e   text := lower(trim(p_email));
  uid uuid;
begin
  if not public.is_organiser() then
    raise exception 'Not allowed';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 120 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email', 'message', 'That email address does not look right');
  end if;
  if not exists (select 1 from public.events where id = p_event) then
    return jsonb_build_object('ok', false, 'reason', 'unknown_event', 'message', 'That event does not exist');
  end if;
  -- an existing user with a confirmed email becomes a host straight away
  select u.id into uid from auth.users u
   where lower(u.email) = e and u.email_confirmed_at is not null limit 1;
  if uid is not null and exists (select 1 from public.profiles where id = uid) then
    insert into public.event_hosts (event_id, user_id) values (p_event, uid) on conflict do nothing;
    insert into public.host_invites (event_id, email, accepted_by, accepted_at) values (p_event, e, uid, now())
      on conflict (event_id, email) do update set accepted_by = uid, accepted_at = now();
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;
  insert into public.host_invites (event_id, email) values (p_event, e) on conflict (event_id, email) do nothing;
  return jsonb_build_object('ok', true, 'status', 'invited');
end;
$$;
revoke execute on function public.invite_host(uuid, text) from public, anon;
grant execute on function public.invite_host(uuid, text) to authenticated;

-- When an email gets CONFIRMED (Google sign-in is confirmed at once; email sign-ups after
-- clicking the link), turn matching invites into hosts. Unconfirmed sign-ups never qualify,
-- so nobody can become a host by typing someone else's email.
create or replace function public.accept_host_invites()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.event_hosts (event_id, user_id)
    select i.event_id, new.id from public.host_invites i
     where i.email = lower(new.email) and i.accepted_at is null
  on conflict do nothing;
  update public.host_invites set accepted_by = new.id, accepted_at = now()
   where email = lower(new.email) and accepted_at is null;
  return new;
end;
$$;
-- name starts with z_ so it fires after on_auth_user_created (which creates the profile)
create trigger z_accept_host_invites after insert or update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null) execute function public.accept_host_invites();

-- ---------------------------------------------------------------- rate limiter (database fallback)
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         int not null default 0
);

-- Used by the server (service role) when Upstash Redis is unreachable.
create or replace function public.rate_hit(p_key text, p_limit int, p_window_seconds int)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare r record;
begin
  insert into public.rate_limits as t (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when t.window_start < now() - make_interval(secs => p_window_seconds) then now() else t.window_start end,
    hits         = case when t.window_start < now() - make_interval(secs => p_window_seconds) then 1 else t.hits + 1 end
  returning t.hits, t.window_start into r;
  return jsonb_build_object(
    'allowed', r.hits <= p_limit,
    'hits', r.hits,
    'retry_after', greatest(0, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_seconds) - now())))::int));
end;
$$;

create or replace function public.rate_limits_cleanup()
returns int
language sql volatile security definer set search_path = public
as $$
  with d as (delete from public.rate_limits where window_start < now() - interval '1 day' returning 1)
  select count(*)::int from d;
$$;

revoke all on public.rate_limits from anon, authenticated;
alter table public.rate_limits enable row level security;
revoke execute on function public.rate_hit(text, int, int), public.rate_limits_cleanup() from public, anon, authenticated;

-- ---------------------------------------------------------------- web push (server only)
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique check (char_length(endpoint) <= 1000),
  p256dh     text not null,
  auth       text not null,
  topics     text[] not null default '{changes,urgent}',   -- also 'vote', 'hunt', 'event:<id>'
  user_id    uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  failures   int not null default 0
);

create table public.push_queue (
  id         bigserial primary key,
  topic      text not null,
  title      text not null,
  body       text not null,
  url        text,
  event_id   uuid,
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  attempts   int not null default 0
);
create index push_queue_pending_idx on public.push_queue (created_at) where sent_at is null;

revoke all on public.push_subscriptions, public.push_queue from anon, authenticated;
alter table public.push_subscriptions enable row level security;
alter table public.push_queue enable row level security;
-- no policies on purpose: only the server (service role, which bypasses RLS) reads or writes these

create or replace function public.queue_change_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.push_queue (topic, title, body, url, event_id)
  values ('changes', (select fest_name from public.app_config where id = 1) || ' update', new.message, '/events/' || new.event_id, new.event_id);
  return new;
end $$;
create trigger event_changes_push after insert on public.event_changes
  for each row execute function public.queue_change_push();

create or replace function public.queue_urgent_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.priority = 'urgent' then
    insert into public.push_queue (topic, title, body, url, event_id)
    values ('urgent', 'Important notice', new.message, '/updates', new.event_id);
  end if;
  return new;
end $$;
create trigger announcements_push after insert on public.announcements
  for each row execute function public.queue_urgent_push();

-- ---------------------------------------------------------------- after the fest: archive and purge
create table public.poll_results_archive (
  poll_id       uuid not null,
  event_id      uuid,
  contestant_id uuid not null,
  name          text not null,
  votes         int not null,
  percent       int,
  archived_at   timestamptz not null default now(),
  primary key (poll_id, contestant_id)
);
revoke all on public.poll_results_archive from anon, authenticated;
grant select on public.poll_results_archive to anon, authenticated;
alter table public.poll_results_archive enable row level security;
create policy archive_read on public.poll_results_archive for select to anon, authenticated using (true);

-- Organisers run this once, after the app has switched to campus mode.
-- Keeps: final vote totals per contestant, the Stamp Hunt leaderboard, events and results.
-- Deletes: individual votes, push subscriptions and queue, rate-limit rows, and participants'
--          emails and phone numbers.
create or replace function public.archive_and_purge_fest()
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  n_votes int := 0; n_push int; n_contacts int;
begin
  if not public.is_organiser() then
    raise exception 'Not allowed';
  end if;
  if public.current_mode() <> 'campus' then
    raise exception 'Only after the app is in campus mode' using errcode = 'P0001';
  end if;
  if to_regclass('public.votes') is not null then
    insert into public.poll_results_archive (poll_id, event_id, contestant_id, name, votes, percent)
    select c.poll_id, p.event_id, c.id, c.name, count(v.user_id)::int,
           round(100.0 * count(v.user_id) / nullif(sum(count(v.user_id)) over (partition by c.poll_id), 0))::int
      from public.contestants c
      join public.polls p on p.id = c.poll_id
      left join public.votes v on v.contestant_id = c.id
     group by c.poll_id, p.event_id, c.id, c.name
    on conflict (poll_id, contestant_id) do update
      set votes = excluded.votes, percent = excluded.percent, archived_at = now();
    with d as (delete from public.votes returning 1) select count(*) into n_votes from d;
  end if;
  with d as (delete from public.push_subscriptions returning 1) select count(*) into n_push from d;
  delete from public.push_queue;
  delete from public.rate_limits;
  with u as (update public.participants set email = null, phone = null
              where email is not null or phone is not null returning 1) select count(*) into n_contacts from u;
  perform public._audit('archive_and_purge', 'fest', jsonb_build_object('votes_deleted', n_votes, 'push_deleted', n_push, 'contacts_cleared', n_contacts));
  return jsonb_build_object('ok', true, 'votes_deleted', n_votes, 'push_deleted', n_push, 'contacts_cleared', n_contacts);
end;
$$;
revoke execute on function public.archive_and_purge_fest() from public, anon;
grant execute on function public.archive_and_purge_fest() to authenticated;

-- ---------------------------------------------------------------- access to app_config
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;
grant update (mode_override, fest_name, fest_starts_at, fest_ends_at, campus_from, hosts_until,
              writes_paused, banner_message, banner_level) on public.app_config to authenticated;
alter table public.app_config enable row level security;
create policy config_read on public.app_config for select to anon, authenticated using (true);
create policy config_update on public.app_config for update to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

grant execute on function public.current_mode(), public.app_status() to anon, authenticated;
