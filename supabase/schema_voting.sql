-- Fest Live: audience voting. Run AFTER schema.sql.
--
-- How it works
--   * Voting is OFF by default. An organiser turns it on per competition
--     (singing, dancing, band battle...), adds the contestants, and chooses:
--       - when voting opens and closes,
--       - whether results are shown live, only after closing, or hidden,
--       - whether only verified college emails can vote,
--       - whether voters must be at the venue (they type or scan a code shown
--         on the stage screen that changes every 30 seconds). Fiesta'26 keeps these two OFF:
--         anyone signed in votes from the Vote button on the event page.
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
  college_only       boolean not null default false,   -- 'verified students only' (ID checked); off by default
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
                                'message', 'Only verified students can vote in this competition. Get your ID checked at the help desk');
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
          or public.is_organiser() or public.is_event_host(p.event_id)) as visible
) vis
where p.enabled or public.is_organiser() or public.is_event_host(p.event_id);
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
                                'message', 'Only verified students can vote in this competition. Get your ID checked at the help desk');
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
