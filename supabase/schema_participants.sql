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
