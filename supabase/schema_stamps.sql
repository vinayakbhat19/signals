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
