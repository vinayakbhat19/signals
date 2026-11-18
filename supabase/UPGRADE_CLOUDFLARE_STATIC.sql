-- =============================================================================
-- Fiesta'26 Live — Cloudflare Static Upgrade (Run ONCE in Supabase SQL Editor)
-- Adds: app_config.data_version + poll_seconds, live_feed(), push RPCs,
-- delete_my_account(), host_set_voting(), host_save_contestant(),
-- host_update_event(), static clue Treasure Hunt (/s/?t=), pg-safeupdate fix.
-- =============================================================================

-- 1. Add data_version and poll_seconds to app_config
alter table public.app_config add column if not exists data_version bigint not null default 1;
alter table public.app_config add column if not exists poll_seconds int not null default 30;
alter table public.app_config drop constraint if exists app_config_poll_seconds_check;
alter table public.app_config add constraint app_config_poll_seconds_check check (poll_seconds between 10 and 300);
grant update (poll_seconds) on public.app_config to authenticated;

-- 2. Upgrade Stamp Hunt to static clue-based Treasure Hunt
drop view if exists public.stamp_leaderboard;
drop function if exists public.get_live_code(uuid);
drop function if exists public.get_print_code(uuid);
drop function if exists public.claim_stamp(uuid, text);
drop function if exists public.my_hunt();
drop table if exists public.stamps cascade;
drop table if exists public.stamp_points cascade;
drop table if exists public.stamp_hunt cascade;

-- Fest Live: Stamp Hunt (treasure hunt). Run AFTER schema.sql (and schema_voting.sql if you use it; the order between them doesn't matter).
--
-- How it works (simple version)
--   * About 10 hidden places on campus. Each place has a printed QR sticker, made ONCE by a
--     volunteer or host and stuck up. The QR never changes (nobody has to regenerate anything).
--   * Students do NOT see the place name. They see a clue (and an optional extra hint). They work
--     out the place, go there and scan the QR. The place name is revealed when they get the stamp.
--   * The QR opens the app at /s/<point id>.<code>; the code is long and random (unguessable).
--     The QR is open to everyone; the hunt is the fun part, not secrecy.
--   * Checks inside the database: hunt open, point active, valid code, one stamp per place,
--     a short gap between scans (default 45 s, so a bundle of shared photos can't be scanned at once),
--     max 6 claims a minute. Organisers can rotate a leaked code (the old sticker stops working)
--     and delete suspicious stamps. The winners list shows how long each player took.
--   * Leaderboard shows first name + initial only; anyone can hide themselves.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- roles (shared, safe to run twice)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'volunteer', 'scorer', 'organiser', 'admin'));

create or replace function public.is_volunteer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('volunteer', 'scorer', 'organiser', 'admin')
  );
$$;
grant execute on function public.is_volunteer() to anon, authenticated;

-- ---------------------------------------------------------------- settings (one row)
create table public.stamp_hunt (
  id              int primary key default 1 check (id = 1),
  name            text not null default 'Fiesta Treasure Hunt',
  opens_at        timestamptz not null,
  closes_at       timestamptz not null,
  stamp_value     int not null default 10,    -- points per place
  complete_bonus  int not null default 20,    -- all active places found
  min_gap_seconds int not null default 45,    -- minimum time between two scans by the same person
  sequential      boolean not null default false,  -- true = show only the next clue after each stamp
  check (closes_at > opens_at)
);

-- ---------------------------------------------------------------- stamp points (the hidden places)
create table public.stamp_points (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),   -- the real place; hidden until found
  clue        text not null default '' check (char_length(clue) <= 300),  -- the riddle
  hint        text check (char_length(hint) <= 300),                      -- optional extra help
  found_text  text check (char_length(found_text) <= 200),                -- fun line shown after the stamp
  mascot      text not null default 'spark' check (mascot in ('spark', 'zap', 'beat', 'kick', 'doodle', 'buzz')),
  sort        int not null default 0,
  active      boolean not null default true,
  code        text not null default encode(gen_random_bytes(8), 'hex'),   -- 16 hex chars, never readable by clients
  created_at  timestamptz not null default now()
);

create table public.stamps (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  point_id   uuid not null references public.stamp_points (id) on delete cascade,
  points     int not null,
  scanned_at timestamptz not null default now(),
  primary key (user_id, point_id)
);
create index stamps_point_idx on public.stamps (point_id);
create index stamps_recent_idx on public.stamps (user_id, scanned_at desc);

-- Students may hide themselves from the leaderboard.
alter table public.profiles add column if not exists leaderboard_hidden boolean not null default false;
grant update (leaderboard_hidden) on public.profiles to authenticated;

-- ---------------------------------------------------------------- claiming
create or replace function public.claim_stamp(p_point uuid, p_code text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  uid   uuid := auth.uid();
  hunt  public.stamp_hunt;
  sp    public.stamp_points;
  pts   int;
  done  int;
  total int;
  last_scan timestamptz;
  wait_s int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'sign_in', 'message', 'Sign in to join the hunt');
  end if;
  select * into hunt from public.stamp_hunt where id = 1;
  if hunt.id is null or now() < hunt.opens_at or now() > hunt.closes_at then
    return jsonb_build_object('ok', false, 'reason', 'closed', 'message', 'The treasure hunt is not open right now');
  end if;
  select * into sp from public.stamp_points where id = p_point;
  if sp.id is null or not sp.active then
    return jsonb_build_object('ok', false, 'reason', 'unknown', 'message', 'This stamp is not active');
  end if;
  if p_code is null or p_code <> sp.code then
    return jsonb_build_object('ok', false, 'reason', 'bad_code', 'message', 'This QR is not valid. Ask a volunteer');
  end if;
  if exists (select 1 from public.stamps where user_id = uid and point_id = sp.id) then
    return jsonb_build_object('ok', false, 'reason', 'already', 'message', 'You already have this stamp', 'place', sp.name);
  end if;
  if (select count(*) from public.stamps where user_id = uid and scanned_at > now() - interval '1 minute') >= 6 then
    return jsonb_build_object('ok', false, 'reason', 'slow_down', 'message', 'Slow down a little and try again');
  end if;
  select max(scanned_at) into last_scan from public.stamps where user_id = uid;
  if last_scan is not null and now() < last_scan + make_interval(secs => hunt.min_gap_seconds) then
    wait_s := ceil(extract(epoch from (last_scan + make_interval(secs => hunt.min_gap_seconds) - now())))::int;
    return jsonb_build_object('ok', false, 'reason', 'too_fast', 'wait', wait_s,
                              'message', 'Nice, but you can scan the next place in ' || wait_s || ' seconds');
  end if;

  pts := hunt.stamp_value;
  insert into public.stamps (user_id, point_id, points) values (uid, sp.id, pts)
  on conflict (user_id, point_id) do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already', 'message', 'You already have this stamp',
                              'place', sp.name);
  end if;

  select count(*), coalesce(sum(points), 0) into done, total from public.stamps where user_id = uid;
  return jsonb_build_object('ok', true, 'points', pts, 'mascot', sp.mascot, 'place', sp.name,
                            'found_text', sp.found_text, 'stamps', done, 'total', total,
                            'of', (select count(*) from public.stamp_points where active));
end;
$$;

-- ---------------------------------------------------------------- the player's passport
-- Clues for everybody (also when signed out); place names only for places the player has found.
create or replace function public.my_hunt()
returns table (sort int, point_id uuid, mascot text, found boolean, found_at timestamptz,
               points int, clue text, hint text, place text, found_text text, locked boolean)
language plpgsql stable security definer set search_path = public
as $$
declare uid uuid := auth.uid(); seq boolean; nfound int;
begin
  select h.sequential into seq from public.stamp_hunt h where h.id = 1;
  select count(*) into nfound from public.stamps s join public.stamp_points p on p.id = s.point_id and p.active
   where s.user_id = uid;
  return query
  with pts as (
    select p.*, row_number() over (order by p.sort, p.created_at)::int as rn
      from public.stamp_points p where p.active
  )
  select pts.rn, pts.id, pts.mascot, (s.user_id is not null), s.scanned_at, s.points,
         case when coalesce(seq, false) and pts.rn > nfound + 1 and s.user_id is null then null else pts.clue end,
         case when coalesce(seq, false) and pts.rn > nfound + 1 and s.user_id is null then null else pts.hint end,
         case when s.user_id is not null then pts.name end,
         case when s.user_id is not null then pts.found_text end,
         (coalesce(seq, false) and pts.rn > nfound + 1 and s.user_id is null)
    from pts left join public.stamps s on s.point_id = pts.id and s.user_id = uid
   order by pts.rn;
end;
$$;

-- ---------------------------------------------------------------- leaderboard
-- Runs with the owner's rights so it can read names, but exposes only safe columns.
create view public.stamp_leaderboard as
with active_count as (select count(*)::int as n from public.stamp_points where active),
per_user as (
  select s.user_id, count(*)::int as stamps, sum(s.points)::int as points, max(s.scanned_at) as last_scan
  from public.stamps s join public.stamp_points sp on sp.id = s.point_id and sp.active
  group by s.user_id
)
select u.user_id,
       trim(split_part(coalesce(p.full_name, 'Student'), ' ', 1) || ' ' ||
            coalesce(nullif(left(split_part(coalesce(p.full_name, ''), ' ', 2), 1), '') || '.', '')) as display_name,
       u.stamps,
       u.points + case when u.stamps >= ac.n and ac.n > 0 then h.complete_bonus else 0 end as score,
       u.last_scan
from per_user u
join public.profiles p on p.id = u.user_id
cross join active_count ac
cross join public.stamp_hunt h
where not p.leaderboard_hidden;
-- Order in the client: score desc, last_scan asc (whoever got there first ranks higher).

-- ---------------------------------------------------------------- access
alter table public.stamp_hunt   enable row level security;
alter table public.stamp_points enable row level security;
alter table public.stamps       enable row level security;

-- Supabase grants every new table to anon/authenticated by default: take that back first.
revoke all on public.stamp_points, public.stamps from anon, authenticated;
grant select on public.stamp_hunt, public.stamp_leaderboard to anon, authenticated;
grant insert, update, delete on public.stamp_hunt to authenticated;
-- Clients cannot read stamp_points at all (clues, names and codes come only through my_hunt() and
-- the organiser/volunteer functions); organisers manage them through the table with the grants below.
grant select, insert, update, delete on public.stamp_points to authenticated;
grant select, delete on public.stamps to authenticated;    -- no insert: only claim_stamp() adds stamps

create policy hunt_read on public.stamp_hunt for select to anon, authenticated using (true);
create policy hunt_write on public.stamp_hunt for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy points_organiser on public.stamp_points for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy stamps_read on public.stamps for select to authenticated
  using (user_id = auth.uid() or public.is_organiser());
create policy stamps_delete on public.stamps for delete to authenticated
  using (public.is_organiser());                            -- organisers remove suspicious stamps

revoke execute on function public.claim_stamp(uuid, text) from public, anon;
grant execute on function public.claim_stamp(uuid, text) to authenticated;
grant execute on function public.my_hunt() to anon, authenticated;

drop trigger if exists stamps_guard on public.stamps;
create trigger stamps_guard before insert on public.stamps
  for each row execute function public.guard_fest_writes();

-- 3. Patch archive_and_purge_fest() for Supabase pg-safeupdate
-- Hotfix for Supabase pg-safeupdate ("DELETE requires a WHERE clause" / 21000)
-- Run once in Supabase SQL Editor to patch archive_and_purge_fest().

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

-- 4. Allow admin role in staff_invites + volunteers, host event editor, live_feed(), push & host voting RPCs
-- ================================================================ volunteers by email, hunt QR tools, winners
-- Anyone can sign in with an email or Google and vote; nobody is "verified". Volunteers (who make the
-- hunt QR stickers and read the winners list) are added by an organiser by EMAIL, like hosts.
create table if not exists public.staff_invites (
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
drop policy if exists staff_invites_read on public.staff_invites;
create policy staff_invites_read on public.staff_invites for select to authenticated using (public.is_organiser());
drop policy if exists staff_invites_delete on public.staff_invites;
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
drop trigger if exists z_accept_staff_invites on auth.users;
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
alter table public.events drop constraint if exists events_description_len;
alter table public.events add constraint events_description_len check (description is null or char_length(description) <= 2000);
alter table public.events drop constraint if exists events_registration_window;
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

alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites add constraint staff_invites_role_check check (role in ('volunteer', 'admin'));

-- 5. Seed 10 editable Treasure Hunt places if empty
-- Fest Live: treasure hunt test data (development only). Run after schema_stamps.sql.
-- Opens the hunt now for 12 hours with 10 sample places. On fest day, replace these in /admin/hunt
-- with the real places, clues and hints (see STAMP_HUNT.md for how to write good clues).

insert into public.stamp_hunt (id, name, opens_at, closes_at)
values (1, 'Fiesta Treasure Hunt', now() - interval '1 hour', now() + interval '12 hours')
on conflict (id) do update set opens_at = excluded.opens_at, closes_at = excluded.closes_at;

insert into public.stamp_points (name, clue, hint, found_text, mascot, sort)
select v.name, v.clue, v.hint, v.found, v.mascot, v.sort
from (values
  ('Library steps',  'Silence is loud here, and the stairs keep secrets.',          'Books live inside.',                'Shhh! You found the quiet place.', 'doodle', 1),
  ('Canteen',        'Chai o''clock. Follow your nose and your hunger.',           'It smells of samosas.',             'Chai and stamps. Perfect.',        'buzz',   2),
  ('Main gate',      'Every story of the fest starts and ends here.',               'You walked through it this morning.', 'The big entrance!',              'kick',   3),
  ('Fountain',       'Water, but not a lake. Wishes welcome.',                      'Near the garden.',                  'Splash!',                          'zap',    4),
  ('Notice board',   'Everything is announced here, even the things nobody reads.', 'Pins, paper and dates.',            'You read the notices. Rare!',      'spark',  5),
  ('Cycle stand',    'Two wheels sleep here all day.',                              'Rows of handlebars.',               'Nice parking skills.',             'kick',   6),
  ('Open air stage', 'Where the music comes out to play.',                          'Look for the big speakers.',        'Take a bow!',                      'beat',   7),
  ('Statue',         'He stands all day and never gets a seat.',                    'People take photos with him.',      'Stand tall. Stamp taken.',         'doodle', 8),
  ('Garden bench',   'Take a break, but not for too long.',                         'Green and quiet.',                  'Good spot for a selfie.',          'spark',  9),
  ('Help desk',      'Lost? Confused? This place has answers (and the last stamp).', 'Volunteers in bright shirts.',      'You finished the hunt!',           'zap',   10)
) as v(name, clue, hint, found, mascot, sort)
where not exists (select 1 from public.stamp_points);
