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
