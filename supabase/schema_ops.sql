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
  data_version   bigint not null default 1,                       -- +1 whenever public fest data changes (phones fetch the feed only then)
  poll_seconds   int not null default 30 check (poll_seconds between 10 and 300),   -- how often phones ask; organisers can slow it down
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
    with d as (delete from public.votes where true returning 1) select count(*) into n_votes from d;
  end if;
  with d as (delete from public.push_subscriptions where true returning 1) select count(*) into n_push from d;
  delete from public.push_queue where true;
  delete from public.rate_limits where true;
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
              writes_paused, banner_message, banner_level, poll_seconds) on public.app_config to authenticated;
alter table public.app_config enable row level security;
create policy config_read on public.app_config for select to anon, authenticated using (true);
create policy config_update on public.app_config for update to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

grant execute on function public.current_mode(), public.app_status() to anon, authenticated;

-- ================================================================ volunteers by email, hunt QR tools, winners
-- Anyone can sign in with an email or Google and vote; nobody is "verified". Volunteers (who make the
-- hunt QR stickers and read the winners list) are added by an organiser by EMAIL, like hosts.
create table public.staff_invites (
  email       text primary key check (email = lower(email) and char_length(email) <= 120),
  role        text not null default 'volunteer' check (role in ('volunteer', 'admin')),   -- 'admin' only via bootstrap_admin.sql
  invited_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
revoke all on public.staff_invites from anon, authenticated;
grant select, delete on public.staff_invites to authenticated;
alter table public.staff_invites enable row level security;
create policy staff_invites_read on public.staff_invites for select to authenticated using (public.is_organiser());
create policy staff_invites_delete on public.staff_invites for delete to authenticated using (public.is_organiser());

create or replace function public.invite_volunteer(p_email text)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare e text := lower(trim(p_email)); uid uuid;
begin
  if not public.is_organiser() then raise exception 'Not allowed'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 120 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email', 'message', 'That email address does not look right');
  end if;
  select u.id into uid from auth.users u where lower(u.email) = e and u.email_confirmed_at is not null limit 1;
  if uid is not null and exists (select 1 from public.profiles where id = uid) then
    update public.profiles set role = 'volunteer' where id = uid and role = 'student';
    insert into public.staff_invites (email, accepted_by, accepted_at) values (e, uid, now())
      on conflict (email) do update set accepted_by = uid, accepted_at = now();
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;
  insert into public.staff_invites (email) values (e) on conflict (email) do nothing;
  return jsonb_build_object('ok', true, 'status', 'invited');
end;
$$;

-- Only a CONFIRMED email turns an invite into a role, so nobody becomes staff by typing someone else's address.
create or replace function public.accept_staff_invites()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.staff_invites where email = lower(new.email) and accepted_at is null) then
    update public.profiles p set role = i.role
      from public.staff_invites i
     where p.id = new.id and i.email = lower(new.email) and i.accepted_at is null
       and (p.role = 'student' or i.role = 'admin');
    update public.staff_invites set accepted_by = new.id, accepted_at = now()
     where email = lower(new.email) and accepted_at is null;
  end if;
  return new;
end;
$$;
create trigger z_accept_staff_invites after insert or update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null) execute function public.accept_staff_invites();

-- Who may make hunt QR stickers: volunteers, organisers, and hosts (of any event, while host access lasts).
create or replace function public.can_make_qr()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_volunteer()
      or (exists (select 1 from public.event_hosts where user_id = auth.uid())
          and now() <= (select hosts_until from public.app_config where id = 1));
$$;
grant execute on function public.can_make_qr() to authenticated;

-- The sticker details for one hunt place: the link to put in the QR. One-time: it never changes
-- unless an organiser rotates it.
create or replace function public.get_stamp_qr(p_point uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare sp public.stamp_points;
begin
  if not public.can_make_qr() then raise exception 'Not allowed'; end if;
  select * into sp from public.stamp_points where id = p_point;
  if sp.id is null then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;
  return jsonb_build_object('ok', true, 'token', sp.id::text || '.' || sp.code,
                            'path', '/s/?t=' || sp.id::text || '.' || sp.code, 'name', sp.name,
                            'sort', sp.sort, 'mascot', sp.mascot);
end;
$$;

-- All places (name, clue, hint, path) for the generator page and the organiser's hunt editor.
create or replace function public.list_stamp_qrs()
returns table (point_id uuid, sort int, name text, clue text, hint text, path text, active boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_make_qr() then raise exception 'Not allowed'; end if;
  return query select p.id, p.sort, p.name, p.clue, p.hint, '/s/?t=' || p.id::text || '.' || p.code, p.active
                 from public.stamp_points p order by p.sort, p.created_at;
end;
$$;

-- If a code leaks (someone posts it online), rotate it and reprint that one sticker.
create or replace function public.rotate_stamp_code(p_point uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions
as $$
begin
  if not public.is_organiser() then raise exception 'Not allowed'; end if;
  update public.stamp_points set code = encode(gen_random_bytes(8), 'hex') where id = p_point;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;
  perform public._audit('rotate_stamp_code', p_point::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

-- Winners list (volunteers and organisers): top players with contact details to hand over prizes,
-- and how long each one took (first to last stamp) so impossible speed is easy to spot.
create or replace function public.hunt_winners(p_limit int default 20)
returns table (rank int, user_id uuid, full_name text, email text, stamps int, score int,
               minutes_taken int, hidden boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_volunteer() then raise exception 'Not allowed'; end if;
  perform public._audit('winners_view', 'stamp_leaderboard', jsonb_build_object('limit', p_limit));
  return query
  with ac as (select count(*)::int as n from public.stamp_points where active),
  per as (
    select s.user_id, count(*)::int as stamps, sum(s.points)::int as pts,
           min(s.scanned_at) as first_scan, max(s.scanned_at) as last_scan
      from public.stamps s join public.stamp_points sp on sp.id = s.point_id and sp.active group by s.user_id
  ), scored as (
    select per.*, per.pts + case when per.stamps >= ac.n and ac.n > 0 then h.complete_bonus else 0 end as score
      from per cross join ac cross join public.stamp_hunt h
  )
  select (row_number() over (order by sc.score desc, sc.last_scan))::int, sc.user_id, pr.full_name, pr.email,
         sc.stamps, sc.score, (extract(epoch from (sc.last_scan - sc.first_scan)) / 60)::int, pr.leaderboard_hidden
    from scored sc join public.profiles pr on pr.id = sc.user_id
   order by 1 limit least(greatest(p_limit, 1), 100);
end;
$$;

revoke execute on function public.invite_volunteer(text), public.get_stamp_qr(uuid), public.list_stamp_qrs(),
  public.rotate_stamp_code(uuid), public.hunt_winners(int), public.can_make_qr() from public, anon;
grant execute on function public.invite_volunteer(text), public.get_stamp_qr(uuid), public.list_stamp_qrs(),
  public.rotate_stamp_code(uuid), public.hunt_winners(int), public.can_make_qr() to authenticated;

-- ================================================================ hosts update their own event
-- Hosts (not only organisers) change the time, venue and status of THEIR events. Every change goes
-- through this function, so title, category, publishing and other events stay out of reach, and
-- the automatic change alerts (event_changes + push) fire as for any other change.
alter table public.events add column if not exists registration_opens_at  timestamptz;
alter table public.events add column if not exists registration_closes_at timestamptz;
alter table public.events add constraint events_description_len check (description is null or char_length(description) <= 2000);
alter table public.events add constraint events_registration_window check
  (registration_opens_at is null or registration_closes_at is null or registration_closes_at > registration_opens_at);

create or replace function public.host_update_event(
  p_event uuid,
  p_starts_at timestamptz default null, p_ends_at timestamptz default null,
  p_venue_id uuid default null, p_status text default null,
  p_description text default null, p_registration_url text default null,
  p_registration_opens_at timestamptz default null, p_registration_closes_at timestamptz default null,
  p_contact_info text default null, p_cover_url text default null, p_host_coordinator text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  ev public.events; cfg public.app_config;
  ns timestamptz; ne timestamptz; changed text[] := '{}';
begin
  if not public.is_event_host(p_event) then raise exception 'Not allowed'; end if;
  select * into cfg from public.app_config where id = 1;
  select * into ev from public.events where id = p_event;
  if ev.id is null then return jsonb_build_object('ok', false, 'reason', 'unknown_event', 'message', 'That event does not exist'); end if;
  if (select count(*) from public.audit_log where action = 'host_event_update' and target = p_event::text
        and at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'too_many', 'message', 'Too many changes in the last hour. Ask an organiser');
  end if;
  ns := coalesce(p_starts_at, ev.starts_at); ne := coalesce(p_ends_at, ev.ends_at);
  if ne <= ns or ne - ns > interval '48 hours' then
    return jsonb_build_object('ok', false, 'reason', 'bad_times', 'message', 'The end must be after the start (and within 48 hours)');
  end if;
  if ns < cfg.fest_starts_at - interval '3 days' or ns > cfg.campus_from then
    return jsonb_build_object('ok', false, 'reason', 'outside_fest', 'message', 'That time is outside the fest dates');
  end if;
  if p_status is not null and p_status not in ('scheduled', 'delayed', 'cancelled', 'done') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status', 'message', 'Unknown status');
  end if;
  if p_venue_id is not null and not exists (select 1 from public.venues where id = p_venue_id) then
    return jsonb_build_object('ok', false, 'reason', 'unknown_venue', 'message', 'Pick a venue from the list');
  end if;
  if p_registration_url is not null and p_registration_url <> ''
     and (p_registration_url !~ '^https://[^\s]+$' or char_length(p_registration_url) > 300) then
    return jsonb_build_object('ok', false, 'reason', 'bad_url', 'message', 'The registration link must start with https://');
  end if;
  if p_cover_url is not null and p_cover_url <> '' and (p_cover_url !~ '^https://[^\s]+$' or char_length(p_cover_url) > 500) then
    return jsonb_build_object('ok', false, 'reason', 'bad_url', 'message', 'The cover link must start with https://');
  end if;
  if p_description is not null and char_length(p_description) > 2000 then
    return jsonb_build_object('ok', false, 'reason', 'too_long', 'message', 'Description is too long (2,000 characters)');
  end if;
  if p_contact_info is not null and char_length(p_contact_info) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'too_long', 'message', 'Contact info is too long');
  end if;
  if coalesce(p_registration_opens_at, ev.registration_opens_at) is not null
     and coalesce(p_registration_closes_at, ev.registration_closes_at) is not null
     and coalesce(p_registration_closes_at, ev.registration_closes_at) <= coalesce(p_registration_opens_at, ev.registration_opens_at) then
    return jsonb_build_object('ok', false, 'reason', 'bad_window', 'message', 'Registration must close after it opens');
  end if;

  if p_starts_at is not null and p_starts_at is distinct from ev.starts_at then changed := array_append(changed, 'starts_at'); end if;
  if p_ends_at is not null and p_ends_at is distinct from ev.ends_at then changed := array_append(changed, 'ends_at'); end if;
  if p_venue_id is not null and p_venue_id is distinct from ev.venue_id then changed := array_append(changed, 'venue'); end if;
  if p_status is not null and p_status is distinct from ev.status then changed := array_append(changed, 'status'); end if;
  if p_description is not null then changed := array_append(changed, 'description'); end if;
  if p_registration_url is not null then changed := array_append(changed, 'registration_url'); end if;
  if p_registration_opens_at is not null or p_registration_closes_at is not null then changed := array_append(changed, 'registration_window'); end if;

  update public.events set
    starts_at = ns, ends_at = ne,
    venue_id = coalesce(p_venue_id, venue_id),
    status = coalesce(p_status, status),
    description = coalesce(p_description, description),
    registration_url = case when p_registration_url is null then registration_url else nullif(p_registration_url, '') end,
    registration_opens_at = coalesce(p_registration_opens_at, registration_opens_at),
    registration_closes_at = coalesce(p_registration_closes_at, registration_closes_at),
    contact_info = coalesce(p_contact_info, contact_info),
    cover_url = case when p_cover_url is null then cover_url else nullif(p_cover_url, '') end,
    host_coordinator = coalesce(p_host_coordinator, host_coordinator)
  where id = p_event;
  perform public._audit('host_event_update', p_event::text, jsonb_build_object('changed', changed));
  return jsonb_build_object('ok', true, 'changed', to_jsonb(changed));
end;
$$;
revoke execute on function public.host_update_event(uuid, timestamptz, timestamptz, uuid, text, text, text, timestamptz, timestamptz, text, text, text) from public, anon;
grant execute on function public.host_update_event(uuid, timestamptz, timestamptz, uuid, text, text, text, timestamptz, timestamptz, text, text, text) to authenticated;


-- ================================================================ static hosting (Cloudflare Pages) support
-- The website is a static site: there is no server in between. The phone calls Supabase directly, so
-- the cheap, public, tiny calls live here. Nothing below exposes private data.
--
--   app_status()  tiny: mode, banner, data version, how often to poll (every phone calls this)
--   live_feed()   one call: events, venues, latest changes, notices, open polls (only when the version changed)
--   data_version  goes up by 1 whenever events, venues, announcements, changes, polls, contestants or results change
--   poll_seconds  organisers can slow every phone's polling from the safety panel (protects the free egress limit)

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
    'version', c.data_version,
    'poll_seconds', c.poll_seconds,
    'server_time', now())
  from public.app_config c where c.id = 1;
$$;

-- Bumping the version must not fill the audit log: audit only real settings changes.
drop trigger if exists audit_config on public.app_config;
create trigger audit_config after update of mode_override, writes_paused, campus_from, banner_message, banner_level, poll_seconds
  on public.app_config for each row execute function public.audit_config();

create or replace function public.bump_data_version()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.app_config set data_version = data_version + 1 where id = 1;
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['events', 'venues', 'announcements', 'event_changes', 'polls', 'contestants', 'results']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', 'bump_version_' || t, t);
      execute format('create trigger %I after insert or update or delete on public.%I for each statement execute function public.bump_data_version()',
                     'bump_version_' || t, t);
    end if;
  end loop;
end $$;

create or replace function public.live_feed()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'status', public.app_status(),
    'venues', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'maps_url', v.maps_url) order by v.name)
                          from public.venues v), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
                'id', e.id, 'title', e.title, 'category', e.category, 'venue_id', e.venue_id,
                'starts_at', e.starts_at, 'ends_at', e.ends_at, 'status', e.status, 'cover_url', e.cover_url,
                'host_name', e.host_name, 'registration_url', e.registration_url,
                'registration_opens_at', e.registration_opens_at, 'registration_closes_at', e.registration_closes_at)
                order by e.starts_at)
                from public.events e where e.is_published), '[]'::jsonb),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'event_id', c.event_id, 'kind', c.kind,
                'message', c.message, 'created_at', c.created_at) order by c.created_at desc)
                from (select * from public.event_changes where created_at > now() - interval '24 hours'
                       order by created_at desc limit 10) c), '[]'::jsonb),
    'notices', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'message', a.message, 'priority', a.priority,
                'event_id', a.event_id, 'created_at', a.created_at) order by a.created_at desc)
                from (select * from public.announcements order by created_at desc limit 8) a), '[]'::jsonb),
    'polls', coalesce((select jsonb_agg(jsonb_build_object('poll_id', p.id, 'event_id', p.event_id, 'title', p.title,
                'closes_at', p.closes_at, 'results_visibility', p.results_visibility))
                from public.polls p where public.poll_open(p)), '[]'::jsonb),
    'server_time', now());
$$;
grant execute on function public.app_status(), public.live_feed() to anon, authenticated;

-- Push subscribe/unsubscribe from the browser (no server needed). Signed-in only, at most 5 devices
-- per person, rate limited, and at most 30,000 devices in total (keeps the free database small).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_topics text[] default null)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare uid uuid := auth.uid(); t text[];
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'sign_in', 'message', 'Sign in to get alerts'); end if;
  if p_endpoint !~ '^https://[^\s]+$' or char_length(p_endpoint) > 1000 or char_length(coalesce(p_p256dh, '')) not between 20 and 200
     or char_length(coalesce(p_auth, '')) not between 8 and 100 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'message', 'That device could not be registered');
  end if;
  if not (public.rate_hit('push:' || uid::text, 10, 3600)->>'allowed')::boolean then
    return jsonb_build_object('ok', false, 'reason', 'slow_down', 'message', 'Try again in a little while');
  end if;
  t := coalesce((select array_agg(x) from unnest(coalesce(p_topics, '{changes,urgent}')) x
                  where x in ('changes', 'urgent', 'vote', 'hunt', 'signals') or x ~ '^event:[0-9a-f-]{36}$'), '{changes,urgent}');
  if not exists (select 1 from public.push_subscriptions where endpoint = p_endpoint) then
    if (select count(*) from public.push_subscriptions where user_id = uid) >= 5
       or (select count(*) from public.push_subscriptions) >= 30000 then
      return jsonb_build_object('ok', false, 'reason', 'limit', 'message', 'Too many devices for this account');
    end if;
  end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, topics, user_id)
  values (p_endpoint, p_p256dh, p_auth, t, uid)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, topics = excluded.topics,
                                       user_id = uid, failures = 0;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text[]), public.remove_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text[]), public.remove_push_subscription(text) to authenticated;

-- "Delete my account and data": the website has no server, so the user deletes themselves with this function.
create or replace function public.delete_my_account()
returns jsonb
language plpgsql volatile security definer set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'sign_in'); end if;
  if public.is_organiser() then
    return jsonb_build_object('ok', false, 'reason', 'organiser', 'message', 'Ask another organiser to remove your organiser role first');
  end if;
  perform public._audit('delete_account', uid::text, '{}'::jsonb);
  delete from auth.users where id = uid;          -- cascades to profiles, stars, signals, stamps, votes, push subscriptions
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ================================================================ hosts control voting for THEIR event
-- "Voting on/off" belongs to the host of the competition (and organisers/admin). Hosts never touch the
-- polls table directly: these functions check is_event_host() and validate every value.
create or replace function public.host_set_voting(
  p_event uuid, p_enabled boolean, p_title text default null, p_opens_at timestamptz default null,
  p_closes_at timestamptz default null, p_visibility text default null, p_clear_times boolean default false)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare p public.polls;
begin
  if not public.is_event_host(p_event) then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.events where id = p_event) then
    return jsonb_build_object('ok', false, 'reason', 'unknown_event', 'message', 'That event does not exist');
  end if;
  if p_visibility is not null and p_visibility not in ('live', 'after_close', 'hidden') then
    return jsonb_build_object('ok', false, 'reason', 'bad_visibility', 'message', 'Results can be Live, After close or Hidden');
  end if;
  if p_title is not null and char_length(p_title) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'title_long', 'message', 'The title is too long');
  end if;
  if not (public.rate_hit('hostvote:' || p_event::text, 60, 3600)->>'allowed')::boolean then
    return jsonb_build_object('ok', false, 'reason', 'too_many', 'message', 'Too many changes, try again in a little while');
  end if;
  insert into public.polls (event_id, enabled) values (p_event, false) on conflict (event_id) do nothing;
  select * into p from public.polls where event_id = p_event;
  if p_enabled and not exists (select 1 from public.contestants where poll_id = p.id and active) then
    return jsonb_build_object('ok', false, 'reason', 'no_contestants', 'message', 'Add at least one team or person before turning voting on');
  end if;
  if coalesce(p_opens_at, p.opens_at) is not null and coalesce(p_closes_at, p.closes_at) is not null
     and not p_clear_times and coalesce(p_closes_at, p.closes_at) <= coalesce(p_opens_at, p.opens_at) then
    return jsonb_build_object('ok', false, 'reason', 'bad_times', 'message', 'Voting must close after it opens');
  end if;
  update public.polls set
    enabled = p_enabled,
    title = coalesce(nullif(trim(p_title), ''), title),
    opens_at  = case when p_clear_times then null else coalesce(p_opens_at, opens_at) end,
    closes_at = case when p_clear_times then null else coalesce(p_closes_at, closes_at) end,
    results_visibility = coalesce(p_visibility, results_visibility)
  where id = p.id;
  perform public._audit('host_voting', p_event::text, jsonb_build_object('enabled', p_enabled));
  return jsonb_build_object('ok', true, 'enabled', p_enabled);
end;
$$;

create or replace function public.host_save_contestant(
  p_event uuid, p_id uuid, p_name text, p_subtitle text default null, p_photo_url text default null,
  p_sort int default 0, p_active boolean default true)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare p public.polls; cid uuid;
begin
  if not public.is_event_host(p_event) then raise exception 'Not allowed'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name', 'message', 'The name must be 1 to 80 characters');
  end if;
  if char_length(coalesce(p_subtitle, '')) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'bad_subtitle', 'message', 'The line under the name is too long');
  end if;
  if p_photo_url is not null and p_photo_url <> '' and (p_photo_url !~ '^https://[^\s]+$' or char_length(p_photo_url) > 300) then
    return jsonb_build_object('ok', false, 'reason', 'bad_url', 'message', 'The photo link must start with https://');
  end if;
  insert into public.polls (event_id, enabled) values (p_event, false) on conflict (event_id) do nothing;
  select * into p from public.polls where event_id = p_event;
  if p_id is null then
    if (select count(*) from public.contestants where poll_id = p.id) >= 60 then
      return jsonb_build_object('ok', false, 'reason', 'limit', 'message', 'At most 60 teams or people per vote');
    end if;
    insert into public.contestants (poll_id, name, subtitle, photo_url, sort, active)
    values (p.id, trim(p_name), nullif(trim(coalesce(p_subtitle, '')), ''), nullif(p_photo_url, ''), coalesce(p_sort, 0), coalesce(p_active, true))
    returning id into cid;
  else
    update public.contestants set name = trim(p_name), subtitle = nullif(trim(coalesce(p_subtitle, '')), ''),
           photo_url = nullif(p_photo_url, ''), sort = coalesce(p_sort, sort), active = coalesce(p_active, active)
     where id = p_id and poll_id = p.id returning id into cid;
    if cid is null then return jsonb_build_object('ok', false, 'reason', 'unknown', 'message', 'That team or person is not in this vote'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', cid);
end;
$$;

revoke execute on function public.host_set_voting(uuid, boolean, text, timestamptz, timestamptz, text, boolean),
  public.host_save_contestant(uuid, uuid, text, text, text, int, boolean) from public, anon;
grant execute on function public.host_set_voting(uuid, boolean, text, timestamptz, timestamptz, text, boolean),
  public.host_save_contestant(uuid, uuid, text, text, text, int, boolean) to authenticated;
