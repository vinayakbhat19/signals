-- =============================================================================
-- Fiesta'26 Live — Combined v2 Migration Bundle (Run ONCE in Supabase SQL Editor)
-- Project: yppfxrsqnjsxcnikadao
-- Order: v2_upgrade -> storage -> changes -> participants -> voting -> stamps -> ops
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FILE: supabase/migration_v2_upgrade.sql
-- -----------------------------------------------------------------------------
-- Incremental upgrade from Fest Live v1 schema.sql to v2 schema.sql.
-- Safe to run if you already ran the original supabase/schema.sql.
-- Run this first in Supabase SQL Editor, then run:
--   1. supabase/storage.sql
--   2. supabase/schema_participants.sql
--   3. supabase/schema_voting.sql
--   4. supabase/schema_stamps.sql

-- 1. Update handle_new_user so college_verified requires email confirmation
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  domain text;
begin
  select value into domain from public.app_settings where key = 'college_domain';
  insert into public.profiles (id, full_name, avatar_url, email, college_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    new.email_confirmed_at is not null
      and lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(coalesce(domain, ''))
  );
  return new;
end;
$$;

-- 2. Grant verified badge when email/password user confirms their email
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  domain text;
begin
  select value into domain from public.app_settings where key = 'college_domain';
  update public.profiles
     set college_verified = lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(coalesce(domain, ''))
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

-- 3. Add cover photo & host fields to public.events
alter table public.events
  add column if not exists cover_url text,
  add column if not exists host_name text check (char_length(host_name) <= 80),
  add column if not exists host_coordinator text check (char_length(host_coordinator) <= 80);

-- -----------------------------------------------------------------------------
-- FILE: supabase/storage.sql
-- -----------------------------------------------------------------------------
-- Fest Live: storage for event cover photos (and contestant photos for voting).
-- Run in the Supabase SQL editor after schema.sql. Alternatively create the
-- buckets in Dashboard -> Storage and add the same policies there.
-- NOTE: not tested locally (needs Supabase's storage schema); if a statement
-- fails, create the buckets in the dashboard and paste the error into Antigravity.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
       ('contestants',  'contestants',  true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Anyone can view (the buckets are public); only organisers can upload, replace or delete.
create policy "covers organisers insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('event-covers', 'contestants') and public.is_organiser());
create policy "covers organisers update" on storage.objects for update to authenticated
  using (bucket_id in ('event-covers', 'contestants') and public.is_organiser());
create policy "covers organisers delete" on storage.objects for delete to authenticated
  using (bucket_id in ('event-covers', 'contestants') and public.is_organiser());

-- -----------------------------------------------------------------------------
-- FILE: supabase/schema_changes.sql
-- -----------------------------------------------------------------------------
-- Fest Live: automatic change alerts. Run AFTER schema.sql.
--
-- Whenever an organiser changes a published event's start time, venue or status
-- (delay, move, cancel, restore), a row is added to event_changes automatically,
-- with a ready-to-show message ("Flutter Workshop moved to Seminar Hall 1 (was
-- Seminar Hall 2)"). The Home header shows the latest changes; nobody has to type
-- a separate announcement. Times in messages are India time (Asia/Kolkata).

create table public.event_changes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  kind        text not null check (kind in ('time', 'venue', 'time_venue', 'cancelled', 'restored')),
  old_starts_at timestamptz,
  new_starts_at timestamptz,
  old_venue   text,
  new_venue   text,
  message     text not null,
  created_at  timestamptz not null default now()
);
create index event_changes_recent_idx on public.event_changes (created_at desc);

create or replace function public.fmt_ist(t timestamptz)
returns text language sql immutable as $$
  select ltrim(to_char(t at time zone 'Asia/Kolkata', 'HH12:MI AM'), '0');
$$;

create or replace function public.log_event_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  ov text; nv text;
  time_changed  boolean := old.starts_at is distinct from new.starts_at;
  venue_changed boolean := old.venue_id  is distinct from new.venue_id;
  k text; msg text;
begin
  if not new.is_published then
    return new;
  end if;
  select name into ov from public.venues where id = old.venue_id;
  select name into nv from public.venues where id = new.venue_id;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    k := 'cancelled';
    msg := new.title || ' is cancelled';
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    k := 'restored';
    msg := new.title || ' is back on at ' || public.fmt_ist(new.starts_at) || coalesce(', ' || nv, '');
  elsif time_changed and venue_changed then
    k := 'time_venue';
    msg := new.title || ' now starts at ' || public.fmt_ist(new.starts_at) || ' in ' || coalesce(nv, 'a new venue')
           || ' (was ' || public.fmt_ist(old.starts_at) || coalesce(', ' || ov, '') || ')';
  elsif time_changed then
    k := 'time';
    msg := new.title || ' now starts at ' || public.fmt_ist(new.starts_at) || ' (was ' || public.fmt_ist(old.starts_at) || ')';
  elsif venue_changed then
    k := 'venue';
    msg := new.title || ' moved to ' || coalesce(nv, 'a new venue') || coalesce(' (was ' || ov || ')', '');
  else
    return new;                                   -- other edits (description, status done...) aren't alerts
  end if;

  insert into public.event_changes (event_id, kind, old_starts_at, new_starts_at, old_venue, new_venue, message)
  values (new.id, k, old.starts_at, new.starts_at, ov, nv, msg);
  return new;
end;
$$;

create trigger events_log_change after update on public.events
  for each row execute function public.log_event_change();

-- Everyone can read changes; only the trigger writes them (organisers can delete a wrong one).
revoke all on public.event_changes from anon, authenticated;
grant select on public.event_changes to anon, authenticated;
grant delete on public.event_changes to authenticated;
alter table public.event_changes enable row level security;
create policy changes_read on public.event_changes for select to anon, authenticated using (true);
create policy changes_delete on public.event_changes for delete to authenticated using (public.is_organiser());

-- -----------------------------------------------------------------------------
-- FILE: supabase/schema_participants.sql
-- -----------------------------------------------------------------------------
-- Fest Live: event hosts and participants (registrations / line-up). Run AFTER schema.sql.
--
-- How it works
--   * An organiser makes someone the HOST of an event (event_hosts). Hosts are
--     usually club coordinators; they don't need the organiser role.
--   * Hosts (and organisers) upload the registration list (CSV or Excel, parsed in
--     the browser) into participants, edit it, mark check-in, set the performance
--     order, and export it.
--   * Students see the public line-up (participants_public): name, team, college,
--     department, order and status only. Emails and phone numbers are visible only
--     to that event's hosts and to organisers.
--   * A participant can be hidden from the public line-up (show_public = false).

create table public.event_hosts (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function public.is_event_host(p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_organiser()
      or exists (select 1 from public.event_hosts where event_id = p_event and user_id = auth.uid());
$$;
grant execute on function public.is_event_host(uuid) to anon, authenticated;

create table public.participants (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 80),
  team              text check (char_length(team) <= 80),
  college           text check (char_length(college) <= 80),
  department        text check (char_length(department) <= 80),
  email             text check (char_length(email) <= 120),        -- private
  phone             text check (char_length(phone) <= 20),         -- private
  performance_order int check (performance_order between 1 and 999),
  status            text not null default 'registered'
                    check (status in ('registered', 'checked_in', 'on_stage', 'performed', 'withdrawn')),
  show_public       boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index participants_event_idx on public.participants (event_id, performance_order);
-- Re-importing the same sheet updates people instead of duplicating them (matched by email).
create unique index participants_event_email_key on public.participants (event_id, lower(email)) where email is not null;

create trigger participants_touch before update on public.participants
  for each row execute function public.touch_updated_at();   -- defined in schema.sql

-- Public line-up: safe columns only. Runs with the owner's rights so students can read it.
create view public.participants_public as
select p.id, p.event_id, p.name, p.team, p.college, p.department, p.performance_order, p.status
from public.participants p
join public.events e on e.id = p.event_id and e.is_published
where p.show_public and p.status <> 'withdrawn';
-- Order in the client: performance_order nulls last, then name.

-- ---------------------------------------------------------------- access
revoke all on public.event_hosts, public.participants from anon, authenticated;
grant select, insert, delete on public.event_hosts to authenticated;
grant select, insert, update, delete on public.participants to authenticated;
grant select on public.participants_public to anon, authenticated;

alter table public.event_hosts  enable row level security;
alter table public.participants enable row level security;

create policy hosts_read on public.event_hosts for select to authenticated
  using (user_id = auth.uid() or public.is_organiser());
create policy hosts_write on public.event_hosts for insert to authenticated with check (public.is_organiser());
create policy hosts_delete on public.event_hosts for delete to authenticated using (public.is_organiser());

create policy participants_host_all on public.participants for all to authenticated
  using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));

-- -----------------------------------------------------------------------------
-- FILE: supabase/schema_voting.sql
-- -----------------------------------------------------------------------------
-- Fest Live: audience voting. Run AFTER schema.sql.
--
-- How it works
--   * Voting is OFF by default. An organiser turns it on per competition
--     (singing, dancing, band battle...), adds the contestants, and chooses:
--       - when voting opens and closes,
--       - whether results are shown live, only after closing, or hidden,
--       - whether only verified college emails can vote,
--       - whether voters must be at the venue (they type or scan a code shown
--         on the stage screen that changes every 30 seconds).
--   * One vote per person per competition. A voter may change their mind up to
--     3 times before voting closes, then the vote is locked.
--   * Votes are added only through cast_vote(), which runs every check.
--     Nobody can see who voted for whom (except organisers, for fraud review).
--   * poll_results shows counts and percentages only when the competition's
--     visibility setting allows it (organisers always see them).

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

-- ---------------------------------------------------------------- tables
create table public.polls (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null unique references public.events (id) on delete cascade,
  title              text not null default 'Audience vote' check (char_length(title) <= 80),
  enabled            boolean not null default false,
  opens_at           timestamptz,                 -- null = opens as soon as enabled
  closes_at          timestamptz,                 -- null = stays open until disabled
  results_visibility text not null default 'live' check (results_visibility in ('live', 'after_close', 'hidden')),
  college_only       boolean not null default true,
  require_code       boolean not null default false,
  secret             bytea not null default gen_random_bytes(32),   -- never readable by clients
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (opens_at is null or closes_at is null or closes_at > opens_at)
);

create table public.contestants (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid not null references public.polls (id) on delete cascade,
  name      text not null check (char_length(name) between 1 and 80),
  subtitle  text check (char_length(subtitle) <= 80),        -- college, department or team members
  photo_url text,
  sort      int not null default 0,
  active    boolean not null default true
);
create index contestants_poll_idx on public.contestants (poll_id, sort);

create table public.votes (
  poll_id       uuid not null references public.polls (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  contestant_id uuid not null references public.contestants (id) on delete cascade,
  change_count  int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create index votes_contestant_idx on public.votes (contestant_id);

create trigger polls_touch before update on public.polls
  for each row execute function public.touch_updated_at();   -- defined in schema.sql

-- ---------------------------------------------------------------- helpers
create or replace function public.poll_open(p public.polls)
returns boolean language sql stable as $$
  select p.enabled
     and (p.opens_at is null or now() >= p.opens_at)
     and (p.closes_at is null or now() <= p.closes_at);
$$;

create or replace function public.vote_code(p_poll uuid, p_window bigint)
returns text
language sql stable security definer set search_path = public, extensions
as $$
  select upper(substr(encode(hmac(convert_to(p_poll::text || ':' || p_window::text, 'UTF8'), p.secret, 'sha256'), 'hex'), 1, 6))
  from public.polls p where p.id = p_poll;
$$;
revoke execute on function public.vote_code(uuid, bigint) from public, anon, authenticated;

create or replace function public.vote_window()
returns bigint language sql stable as $$
  select floor(extract(epoch from now()) / 30)::bigint;
$$;

-- For the stage screen when require_code is on (volunteers and organisers).
create or replace function public.get_vote_code(p_poll uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions
as $$
begin
  if not public.is_volunteer() then
    raise exception 'Not allowed';
  end if;
  return jsonb_build_object(
    'code', public.vote_code(p_poll, public.vote_window()),
    'expires_in', 30 - (floor(extract(epoch from now()))::bigint % 30)
  );
end;
$$;

-- ---------------------------------------------------------------- voting
create or replace function public.cast_vote(p_poll uuid, p_contestant uuid, p_code text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  uid  uuid := auth.uid();
  p    public.polls;
  c    public.contestants;
  v    public.votes;
  prof public.profiles;
  w    bigint := public.vote_window();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'sign_in', 'message', 'Sign in to vote');
  end if;
  select * into p from public.polls where id = p_poll;
  if p.id is null or not public.poll_open(p) then
    return jsonb_build_object('ok', false, 'reason', 'closed', 'message', 'Voting is not open for this competition');
  end if;
  select * into c from public.contestants where id = p_contestant and poll_id = p.id and active;
  if c.id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown', 'message', 'That contestant is not in this vote');
  end if;
  if p.college_only then
    select * into prof from public.profiles where id = uid;
    if not coalesce(prof.college_verified, false) then
      return jsonb_build_object('ok', false, 'reason', 'college_only',
                                'message', 'Only college email accounts can vote in this competition');
    end if;
  end if;
  if p.require_code and (p_code is null or upper(p_code) not in (public.vote_code(p.id, w), public.vote_code(p.id, w - 1))) then
    return jsonb_build_object('ok', false, 'reason', 'code',
                              'message', 'Enter the code shown on the stage screen (it changes every 30 s)');
  end if;

  select * into v from public.votes where poll_id = p.id and user_id = uid;
  if v.poll_id is null then
    insert into public.votes (poll_id, user_id, contestant_id) values (p.id, uid, c.id)
    on conflict (poll_id, user_id) do nothing;
    return jsonb_build_object('ok', true, 'reason', 'voted', 'contestant', c.name, 'changes_left', 3);
  end if;
  if v.contestant_id = c.id then
    return jsonb_build_object('ok', true, 'reason', 'same', 'contestant', c.name, 'changes_left', 3 - v.change_count);
  end if;
  if v.change_count >= 3 then
    return jsonb_build_object('ok', false, 'reason', 'locked', 'message', 'You have changed your vote 3 times, so it is locked now');
  end if;
  if v.updated_at > now() - interval '10 seconds' then
    return jsonb_build_object('ok', false, 'reason', 'slow_down', 'message', 'Wait a few seconds before changing your vote');
  end if;
  update public.votes set contestant_id = c.id, change_count = change_count + 1, updated_at = now()
  where poll_id = p.id and user_id = uid;
  return jsonb_build_object('ok', true, 'reason', 'changed', 'contestant', c.name, 'changes_left', 2 - v.change_count);
end;
$$;

-- ---------------------------------------------------------------- results
-- Runs with the owner's rights (so it can count all votes) but reveals counts
-- only when the competition's visibility setting allows it, or to organisers.
create view public.poll_results as
with counts as (
  select c.poll_id, c.id as contestant_id, count(v.user_id)::int as n
  from public.contestants c
  left join public.votes v on v.contestant_id = c.id
  where c.active
  group by c.poll_id, c.id
)
select p.id as poll_id,
       p.event_id,
       c.id as contestant_id,
       c.name,
       c.subtitle,
       c.photo_url,
       c.sort,
       vis.visible,
       case when vis.visible then k.n end as votes,
       case when vis.visible then round(100.0 * k.n / nullif(sum(k.n) over (partition by p.id), 0))::int end as percent,
       case when vis.visible then (sum(k.n) over (partition by p.id))::int end as total_votes
from public.polls p
join public.contestants c on c.poll_id = p.id and c.active
join counts k on k.contestant_id = c.id
cross join lateral (
  select (p.results_visibility = 'live'
          or (p.results_visibility = 'after_close' and p.closes_at is not null and now() > p.closes_at)
          or public.is_organiser()) as visible
) vis
where p.enabled or public.is_organiser();
-- Order in the client: votes desc, then sort, then name.

-- ---------------------------------------------------------------- access
-- Supabase grants every new table to anon/authenticated by default: take that back first.
revoke all on public.polls, public.contestants, public.votes from anon, authenticated;

grant select (id, event_id, title, enabled, opens_at, closes_at, results_visibility, college_only, require_code, created_at, updated_at)
  on public.polls to anon, authenticated;                    -- secret stays hidden
grant insert, update, delete on public.polls to authenticated;
grant select on public.contestants to anon, authenticated;
grant insert, update, delete on public.contestants to authenticated;
grant select, delete on public.votes to authenticated;      -- no insert/update: only cast_vote()
grant select on public.poll_results to anon, authenticated;

alter table public.polls       enable row level security;
alter table public.contestants enable row level security;
alter table public.votes       enable row level security;

create policy polls_read on public.polls for select to anon, authenticated using (true);
create policy polls_write on public.polls for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy contestants_read on public.contestants for select to anon, authenticated using (true);
create policy contestants_write on public.contestants for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy votes_read on public.votes for select to authenticated
  using (user_id = auth.uid() or public.is_organiser());   -- your own vote only
create policy votes_delete on public.votes for delete to authenticated
  using (public.is_organiser());                            -- remove fraudulent votes

revoke execute on function public.cast_vote(uuid, uuid, text), public.get_vote_code(uuid) from public, anon;
grant execute on function public.cast_vote(uuid, uuid, text), public.get_vote_code(uuid) to authenticated;
grant execute on function public.poll_open(public.polls), public.vote_window() to anon, authenticated;

-- ================================================================ offline voting
-- For halls with no network (e.g. a mobile-signal blocker and no Wi-Fi):
--   1. Before the show, the stage-screen laptop downloads the codes for the whole
--      show with get_vote_codes() (one 6-character code per 30-second window), so it
--      can keep showing the rotating code with no network.
--   2. Phones that opened the vote page beforehand vote with no network: the app
--      saves { contestant, code typed, time, client_ref } and sends it later.
--   3. cast_vote_offline() checks that the code belongs to the 30-second window of
--      the vote's time (proof the voter saw the stage screen), that this time is
--      inside the voting window, and that the vote arrives within 2 hours of closing.
--   Offline votes are final (no changes) and idempotent by client_ref.

alter table public.votes add column if not exists source text not null default 'online'
  check (source in ('online', 'offline'));
alter table public.votes add column if not exists cast_at timestamptz;
alter table public.votes add column if not exists code_window bigint;
alter table public.votes add column if not exists client_ref uuid unique;

-- All codes for the next p_hours (volunteers and organisers only), for the stage screen.
create or replace function public.get_vote_codes(p_poll uuid, p_hours int default 6)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  w0 bigint := public.vote_window() - 20;              -- from 10 minutes ago
  w1 bigint := public.vote_window() + least(greatest(p_hours, 1), 12) * 120;
begin
  if not public.is_volunteer() then
    raise exception 'Not allowed';
  end if;
  return (select jsonb_agg(jsonb_build_object('w', w, 'code', public.vote_code(p_poll, w)) order by w)
          from generate_series(w0, w1) as w);
end;
$$;

create or replace function public.cast_vote_offline(p_poll uuid, p_contestant uuid, p_code text,
                                                     p_cast_at timestamptz, p_client_ref uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  uid  uuid := auth.uid();
  p    public.polls;
  c    public.contestants;
  v    public.votes;
  prof public.profiles;
  w    bigint;
  ok   boolean := false;
  k    int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'sign_in', 'message', 'Sign in to send your saved vote');
  end if;
  if p_client_ref is null or p_cast_at is null or p_code is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'message', 'This saved vote is incomplete');
  end if;
  -- retry of a vote we already stored
  select * into v from public.votes where client_ref = p_client_ref;
  if v.poll_id is not null then
    return jsonb_build_object('ok', true, 'reason', 'same', 'message', 'Already counted');
  end if;
  select * into p from public.polls where id = p_poll;
  if p.id is null or not p.enabled then
    return jsonb_build_object('ok', false, 'reason', 'closed', 'message', 'Voting is not on for this competition');
  end if;
  if p_cast_at > now() + interval '2 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'clock', 'message', 'Your phone clock looks wrong; the vote could not be checked');
  end if;
  if (p.opens_at is not null and p_cast_at < p.opens_at - interval '1 minute')
     or (p.closes_at is not null and p_cast_at > p.closes_at + interval '1 minute') then
    return jsonb_build_object('ok', false, 'reason', 'outside', 'message', 'This vote was made outside the voting time');
  end if;
  if p_cast_at < now() - interval '12 hours'
     or (p.closes_at is not null and now() > p.closes_at + interval '2 hours') then
    return jsonb_build_object('ok', false, 'reason', 'late', 'message', 'This saved vote arrived too late to count');
  end if;
  select * into c from public.contestants where id = p_contestant and poll_id = p.id and active;
  if c.id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown', 'message', 'That contestant is not in this vote');
  end if;
  if p.college_only then
    select * into prof from public.profiles where id = uid;
    if not coalesce(prof.college_verified, false) then
      return jsonb_build_object('ok', false, 'reason', 'college_only',
                                'message', 'Only college email accounts can vote in this competition');
    end if;
  end if;
  -- the code must belong to the time the vote was made (±1 minute for phone clocks)
  w := floor(extract(epoch from p_cast_at) / 30)::bigint;
  for k in -2..2 loop
    if upper(p_code) = public.vote_code(p.id, w + k) then
      ok := true; w := w + k; exit;
    end if;
  end loop;
  if not ok then
    return jsonb_build_object('ok', false, 'reason', 'code',
                              'message', 'The stage code does not match the time of your vote');
  end if;
  if exists (select 1 from public.votes where poll_id = p.id and user_id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'already', 'message', 'You already voted in this competition');
  end if;
  insert into public.votes (poll_id, user_id, contestant_id, source, cast_at, code_window, client_ref)
  values (p.id, uid, c.id, 'offline', p_cast_at, w, p_client_ref)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already', 'message', 'You already voted in this competition');
  end if;
  return jsonb_build_object('ok', true, 'reason', 'voted', 'contestant', c.name);
end;
$$;

revoke execute on function public.get_vote_codes(uuid, int), public.cast_vote_offline(uuid, uuid, text, timestamptz, uuid)
  from public, anon;
grant execute on function public.get_vote_codes(uuid, int), public.cast_vote_offline(uuid, uuid, text, timestamptz, uuid)
  to authenticated;

-- Fraud review helper (organisers): how many offline votes used each 30-second code.
-- A normal hall spreads votes over many windows; hundreds on one old window means a
-- photo of the code was shared outside.
create view public.offline_vote_windows with (security_invoker = true) as
select poll_id, code_window, to_timestamp(code_window * 30) as window_start, count(*)::int as votes
from public.votes where source = 'offline'
group by poll_id, code_window;
grant select on public.offline_vote_windows to authenticated;   -- RLS on votes: organisers see all, others only their own

-- -----------------------------------------------------------------------------
-- FILE: supabase/schema_stamps.sql
-- -----------------------------------------------------------------------------
-- Fest Live: Stamp Hunt add-on. Run AFTER schema.sql (and schema_voting.sql if you use it; the order between them doesn't matter).
--
-- How it works
--   * Each competition venue has a stamp point. A volunteer's phone shows a QR
--     whose code changes every 30 seconds (HMAC of point id + time window with a
--     secret only the database knows). A photo shared on WhatsApp expires fast.
--   * Students sign in (only for the hunt) and claim a stamp through
--     claim_stamp(); they can never insert stamps directly.
--   * Checks inside the database: hunt open, point active, its competition
--     running (10 min before to 15 min after), valid code, one stamp per point,
--     max 6 claims a minute.
--   * Backup printed code (in case the volunteer phone dies): works only while
--     that competition runs, and is worth fewer points.
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
  name            text not null default 'Fest Stamp Hunt',
  opens_at        timestamptz not null,
  closes_at       timestamptz not null,
  stamp_value     int not null default 10,   -- live (rotating) QR
  bonus_value     int not null default 5,    -- extra during a point's bonus window (finals, results)
  printed_value   int not null default 5,    -- backup printed QR
  complete_bonus  int not null default 20,   -- all active stamps collected
  check (closes_at > opens_at)
);

-- ---------------------------------------------------------------- stamp points
create table public.stamp_points (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  event_id    uuid references public.events (id) on delete set null,
  venue_id    uuid references public.venues (id) on delete set null,
  mascot      text not null default 'spark' check (mascot in ('spark', 'zap', 'beat', 'kick', 'doodle', 'buzz')),
  sort        int not null default 0,
  active      boolean not null default true,
  bonus_from  timestamptz,
  bonus_to    timestamptz,
  secret      bytea not null default gen_random_bytes(32),               -- never readable by clients
  print_code  text not null default encode(gen_random_bytes(5), 'hex'),  -- never readable by clients
  created_at  timestamptz not null default now()
);

create table public.stamps (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  point_id   uuid not null references public.stamp_points (id) on delete cascade,
  points     int not null,
  method     text not null check (method in ('live', 'printed')),
  scanned_at timestamptz not null default now(),
  primary key (user_id, point_id)
);
create index stamps_point_idx on public.stamps (point_id);
create index stamps_recent_idx on public.stamps (user_id, scanned_at desc);

-- Students may hide themselves from the leaderboard.
alter table public.profiles add column if not exists leaderboard_hidden boolean not null default false;
grant update (leaderboard_hidden) on public.profiles to authenticated;

-- ---------------------------------------------------------------- codes
-- Code for one point in one 30-second window.
create or replace function public.stamp_code(p_point uuid, p_window bigint)
returns text
language sql stable security definer set search_path = public, extensions
as $$
  select substr(encode(hmac(convert_to(p_point::text || ':' || p_window::text, 'UTF8'), sp.secret, 'sha256'), 'hex'), 1, 12)
  from public.stamp_points sp where sp.id = p_point;
$$;
revoke execute on function public.stamp_code(uuid, bigint) from public, anon, authenticated;

create or replace function public.current_window()
returns bigint language sql stable as $$
  select floor(extract(epoch from now()) / 30)::bigint;
$$;

-- For the volunteer's station screen: current code and seconds until it changes.
create or replace function public.get_live_code(p_point uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions
as $$
begin
  if not public.is_volunteer() then       -- volunteers, scorers, organisers, admins
    raise exception 'Not allowed';
  end if;
  return jsonb_build_object(
    'code', public.stamp_code(p_point, public.current_window()),
    'expires_in', 30 - (floor(extract(epoch from now()))::bigint % 30)
  );
end;
$$;

-- Printed backup code, for organisers printing standees.
create or replace function public.get_print_code(p_point uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_organiser() then
    raise exception 'Not allowed';
  end if;
  return (select print_code from public.stamp_points where id = p_point);
end;
$$;

-- ---------------------------------------------------------------- claiming
create or replace function public.claim_stamp(p_point uuid, p_code text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  uid     uuid := auth.uid();
  hunt    public.stamp_hunt;
  sp      public.stamp_points;
  ev      public.events;
  w       bigint := public.current_window();
  method  text;
  pts     int;
  done    int;
  total   int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'sign_in', 'message', 'Sign in to join the hunt');
  end if;
  select * into hunt from public.stamp_hunt where id = 1;
  if hunt.id is null or now() < hunt.opens_at or now() > hunt.closes_at then
    return jsonb_build_object('ok', false, 'reason', 'closed', 'message', 'The Stamp Hunt is not open right now');
  end if;
  select * into sp from public.stamp_points where id = p_point;
  if sp.id is null or not sp.active then
    return jsonb_build_object('ok', false, 'reason', 'unknown', 'message', 'This stamp is not active');
  end if;
  if sp.event_id is not null then
    select * into ev from public.events where id = sp.event_id;
    if ev.status = 'cancelled'
       or now() < ev.starts_at - interval '10 minutes'
       or now() > ev.ends_at + interval '15 minutes' then
      return jsonb_build_object('ok', false, 'reason', 'not_live',
                                'message', 'This stamp only works while the competition is on');
    end if;
  end if;
  if (select count(*) from public.stamps where user_id = uid and scanned_at > now() - interval '1 minute') >= 6 then
    return jsonb_build_object('ok', false, 'reason', 'slow_down', 'message', 'Slow down a little and try again');
  end if;

  if p_code is not null and (p_code = public.stamp_code(sp.id, w) or p_code = public.stamp_code(sp.id, w - 1)) then
    method := 'live';
    pts := hunt.stamp_value
           + case when sp.bonus_from is not null and now() between sp.bonus_from and coalesce(sp.bonus_to, sp.bonus_from)
                  then hunt.bonus_value else 0 end;
  elsif p_code is not null and p_code = sp.print_code then
    method := 'printed';
    pts := hunt.printed_value;
  else
    return jsonb_build_object('ok', false, 'reason', 'expired', 'message', 'Code expired. Scan the screen again');
  end if;

  insert into public.stamps (user_id, point_id, points, method)
  values (uid, sp.id, pts, method)
  on conflict (user_id, point_id) do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already', 'message', 'You already have this stamp');
  end if;

  select count(*), coalesce(sum(points), 0) into done, total from public.stamps where user_id = uid;
  return jsonb_build_object('ok', true, 'points', pts, 'method', method, 'mascot', sp.mascot,
                            'stamps', done, 'total', total,
                            'of', (select count(*) from public.stamp_points where active));
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
       p.college_verified as verified,
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
grant insert, update, delete on public.stamp_hunt, public.stamp_points to authenticated;
grant select (id, name, event_id, venue_id, mascot, sort, active, bonus_from, bonus_to)
  on public.stamp_points to anon, authenticated;            -- secret and print_code stay hidden
grant select, delete on public.stamps to authenticated;    -- no insert: only claim_stamp() adds stamps

create policy hunt_read on public.stamp_hunt for select to anon, authenticated using (true);
create policy hunt_write on public.stamp_hunt for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy points_read on public.stamp_points for select to anon, authenticated using (true);
create policy points_write on public.stamp_points for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy stamps_read on public.stamps for select to authenticated
  using (user_id = auth.uid() or public.is_organiser());
create policy stamps_delete on public.stamps for delete to authenticated
  using (public.is_organiser());                            -- organisers remove suspicious stamps

revoke execute on function public.get_live_code(uuid), public.get_print_code(uuid), public.claim_stamp(uuid, text)
  from public, anon;
grant execute on function public.get_live_code(uuid), public.get_print_code(uuid), public.claim_stamp(uuid, text)
  to authenticated;
grant execute on function public.current_window() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- FILE: supabase/schema_ops.sql
-- -----------------------------------------------------------------------------
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
              writes_paused, banner_message, banner_level) on public.app_config to authenticated;
alter table public.app_config enable row level security;
create policy config_read on public.app_config for select to anon, authenticated using (true);
create policy config_update on public.app_config for update to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

grant execute on function public.current_mode(), public.app_status() to anon, authenticated;
