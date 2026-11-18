-- Fest Live: sports add-on (football first; works for any goals-based sport).
-- LATER: not part of the first launch. Run AFTER schema.sql when you add sports.
--
-- Design
--   * A match's score is never typed in: it is recomputed from match_events
--     (goals, own goals, penalties) by a trigger, so an "Undo" (deleting the
--     last event) always gives the right score.
--   * client_ref makes every scorer tap idempotent: a phone that retries after
--     a bad connection cannot add the same goal twice.
--   * The points table (standings) is a view over finished matches, so it is
--     always consistent with the results. Points: win 3, draw 1, loss 0.
--   * New role "scorer": can run matches, nothing else.

-- ---------------------------------------------------------------- scorer role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'volunteer', 'scorer', 'organiser', 'admin'));

create or replace function public.is_scorer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('scorer', 'organiser', 'admin')
  );
$$;
grant execute on function public.is_scorer() to anon, authenticated;

-- ---------------------------------------------------------------- tables
create table public.tournaments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sport      text not null default 'football',
  points_win  int not null default 3,
  points_draw int not null default 1,
  created_at timestamptz not null default now()
);

create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  short_name    text not null check (char_length(short_name) between 1 and 5),
  group_name    text,                                -- e.g. 'A'; null for knockout-only
  color         text not null default '#22D3EE',
  unique (tournament_id, name)
);

create table public.matches (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid not null references public.tournaments (id) on delete cascade,
  stage            text not null default 'group' check (stage in ('group', 'quarter', 'semi', 'third', 'final')),
  group_name       text,
  home_team_id     uuid not null references public.teams (id),
  away_team_id     uuid not null references public.teams (id),
  venue_id         uuid references public.venues (id) on delete set null,
  starts_at        timestamptz not null,
  status           text not null default 'scheduled'
                   check (status in ('scheduled', 'live', 'half_time', 'full_time', 'postponed', 'cancelled')),
  period           text,                              -- '1st half', '2nd half', 'extra time', 'penalties'
  clock_started_at timestamptz,                       -- when the current period's clock started
  clock_offset_min int not null default 0,            -- minutes already played before this period (0 or 45...)
  home_score       int not null default 0,
  away_score       int not null default 0,
  home_pens        int,                               -- penalty shoot-out, if any
  away_pens        int,
  updated_at       timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index matches_starts_idx on public.matches (starts_at);
create index matches_status_idx on public.matches (status);

create table public.match_events (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  team_id    uuid not null references public.teams (id),
  type       text not null check (type in ('goal', 'penalty_goal', 'own_goal', 'yellow', 'red', 'note')),
  player     text check (char_length(player) <= 60),
  minute     int check (minute between 0 and 150),
  note       text check (char_length(note) <= 140),
  client_ref uuid not null unique,                    -- generated on the phone; makes retries safe
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index match_events_match_idx on public.match_events (match_id, created_at);

-- An event's team must be one of the two teams in the match.
create or replace function public.check_event_team()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.matches m
                 where m.id = new.match_id and new.team_id in (m.home_team_id, m.away_team_id)) then
    raise exception 'Team is not playing in this match';
  end if;
  return new;
end;
$$;
create trigger match_events_team before insert or update on public.match_events
  for each row execute function public.check_event_team();

-- Recompute the score from the events (an own goal counts for the other team).
create or replace function public.recompute_score()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  mid uuid := coalesce(new.match_id, old.match_id);
begin
  update public.matches m set
    home_score = (select count(*) from public.match_events e
                  where e.match_id = m.id and (
                    (e.type in ('goal', 'penalty_goal') and e.team_id = m.home_team_id) or
                    (e.type = 'own_goal' and e.team_id = m.away_team_id))),
    away_score = (select count(*) from public.match_events e
                  where e.match_id = m.id and (
                    (e.type in ('goal', 'penalty_goal') and e.team_id = m.away_team_id) or
                    (e.type = 'own_goal' and e.team_id = m.home_team_id))),
    updated_at = now()
  where m.id = mid;
  return null;
end;
$$;
create trigger match_events_score after insert or update or delete on public.match_events
  for each row execute function public.recompute_score();

create trigger matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();   -- defined in schema.sql

-- ---------------------------------------------------------------- points table
create view public.standings with (security_invoker = true) as
with results as (
  select m.tournament_id, m.group_name, m.home_team_id as team_id,
         m.home_score as gf, m.away_score as ga
  from public.matches m where m.status = 'full_time' and m.stage = 'group'
  union all
  select m.tournament_id, m.group_name, m.away_team_id,
         m.away_score, m.home_score
  from public.matches m where m.status = 'full_time' and m.stage = 'group'
)
select t.tournament_id,
       t.group_name,
       t.id as team_id,
       t.name,
       t.short_name,
       t.color,
       count(r.team_id)::int                                        as played,
       count(*) filter (where r.gf > r.ga)::int                     as won,
       count(*) filter (where r.gf = r.ga and r.team_id is not null)::int as drawn,
       count(*) filter (where r.gf < r.ga)::int                     as lost,
       coalesce(sum(r.gf), 0)::int                                  as goals_for,
       coalesce(sum(r.ga), 0)::int                                  as goals_against,
       (coalesce(sum(r.gf), 0) - coalesce(sum(r.ga), 0))::int       as goal_diff,
       (count(*) filter (where r.gf > r.ga) * tr.points_win
        + count(*) filter (where r.gf = r.ga and r.team_id is not null) * tr.points_draw)::int as points
from public.teams t
join public.tournaments tr on tr.id = t.tournament_id
left join results r on r.team_id = t.id
group by t.tournament_id, t.group_name, t.id, t.name, t.short_name, t.color, tr.points_win, tr.points_draw;
-- Order in the client: points desc, goal_diff desc, goals_for desc, name.

-- ---------------------------------------------------------------- access
grant select on public.tournaments, public.teams, public.matches, public.match_events, public.standings
  to anon, authenticated;
grant insert, update, delete on public.tournaments, public.teams, public.matches, public.match_events
  to authenticated;

alter table public.tournaments  enable row level security;
alter table public.teams        enable row level security;
alter table public.matches      enable row level security;
alter table public.match_events enable row level security;

create policy tournaments_read on public.tournaments for select to anon, authenticated using (true);
create policy tournaments_write on public.tournaments for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy teams_read on public.teams for select to anon, authenticated using (true);
create policy teams_write on public.teams for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy matches_read on public.matches for select to anon, authenticated using (true);
-- organisers create and delete fixtures; scorers run them (status, clock, penalties)
create policy matches_insert on public.matches for insert to authenticated with check (public.is_organiser());
create policy matches_delete on public.matches for delete to authenticated using (public.is_organiser());
create policy matches_update on public.matches for update to authenticated
  using (public.is_scorer()) with check (public.is_scorer());

create policy events_read on public.match_events for select to anon, authenticated using (true);
create policy events_insert on public.match_events for insert to authenticated
  with check (public.is_scorer() and created_by = auth.uid());
create policy events_delete on public.match_events for delete to authenticated using (public.is_scorer());
-- events are never edited, only added or undone (deleted)

-- Scores come only from match_events: nobody can type them in directly.
revoke update on public.matches from authenticated;
grant update (stage, group_name, home_team_id, away_team_id, venue_id, starts_at, status, period,
              clock_started_at, clock_offset_min, home_pens, away_pens)
  on public.matches to authenticated;
