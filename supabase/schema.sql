-- Fest Live: database schema for Supabase (Postgres).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- No college email domain is needed. 'college_domain' below is OPTIONAL: leave it empty unless
-- the college gives you an email domain. In the Fiesta'26 setup nobody is verified: anyone
-- signed in can vote and play. The college_verified/verify_* columns are unused leftovers
-- (see ADDRESS_AND_PEOPLE.md).
--
-- Security model
--   * Row Level Security (RLS) is on for every table.
--   * Public data (venues, events, announcements, results, open signals) can be read by anyone.
--   * Only organisers/admins can change fest data (checked by public.is_organiser()).
--   * Users can never change their own role (column privileges).
--   * A signal's contact is not readable directly; it comes from get_signal_contact(),
--     which returns it only to the poster, accepted responders and organisers.
--     => Clients must list columns explicitly when selecting from signals (never select *).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- settings
create table public.app_settings (
  key   text primary key,
  value text not null
);
insert into public.app_settings (key, value) values ('college_domain', '');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text,
  avatar_url       text,
  email            text,
  role             text not null default 'student' check (role in ('student', 'organiser', 'admin')),
  college_verified boolean not null default false,       -- 'verified student': ID checked, on the roster, or college email
  verified_by      uuid references public.profiles (id) on delete set null,
  verified_at      timestamptz,
  verify_method    text check (verify_method in ('email_domain', 'roster', 'id_check')),
  created_at       timestamptz not null default now()
);

create or replace function public.is_organiser()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('organiser', 'admin')
  );
$$;

-- Create a profile for every new sign-in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  domain text;
begin
  select value into domain from public.app_settings where key = 'college_domain';
  insert into public.profiles (id, full_name, avatar_url, email, college_verified, verify_method, verified_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    -- Verified only once the email is confirmed (codes confirm the email;
    -- email/password sign-ups are confirmed by the link Supabase emails them).
    coalesce(domain, '') <> '' and new.email_confirmed_at is not null
      and lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(domain),
    case when coalesce(domain, '') <> '' and new.email_confirmed_at is not null
          and lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(domain) then 'email_domain' end,
    case when coalesce(domain, '') <> '' and new.email_confirmed_at is not null
          and lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(domain) then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When an email/password user clicks the confirmation link, grant the badge.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  domain text;
begin
  select value into domain from public.app_settings where key = 'college_domain';
  if coalesce(domain, '') <> '' and lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(domain) then
    update public.profiles
       set college_verified = true, verify_method = coalesce(verify_method, 'email_domain'),
           verified_at = coalesce(verified_at, now())
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

-- ---------------------------------------------------------------- fest data
create table public.venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  maps_url    text,
  created_at  timestamptz not null default now()
);

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  code             text unique,                       -- from the CSV, lets re-imports update rows
  title            text not null check (char_length(title) between 1 and 120),
  description      text,
  category         text not null check (category in ('tech', 'cultural', 'sports', 'workshop', 'talk', 'fun', 'official')),
  venue_id         uuid references public.venues (id) on delete set null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           text not null default 'scheduled' check (status in ('scheduled', 'delayed', 'cancelled', 'done')),
  poster_url       text,
  registration_url text,
  contact_info     text,                              -- shown publicly; only what the committee agrees to publish
  cover_url        text,                              -- public URL in the event-covers storage bucket
  host_name        text check (char_length(host_name) <= 80),   -- club or committee running it
  host_coordinator text check (char_length(host_coordinator) <= 80),
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_starts_at_idx on public.events (starts_at);
create index events_venue_idx on public.events (venue_id);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (char_length(message) between 1 and 280),
  event_id   uuid references public.events (id) on delete set null,
  priority   text not null default 'normal' check (priority in ('normal', 'urgent')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index announcements_created_idx on public.announcements (created_at desc);

create table public.results (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  title      text not null default 'Results' check (char_length(title) <= 80),
  body       text not null check (char_length(body) <= 2000),
  is_live    boolean not null default false,
  updated_at timestamptz not null default now()
);
create index results_event_idx on public.results (event_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
create trigger results_touch before update on public.results
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- personal schedule
create table public.stars (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------------------------------------------------------------- signals
create table public.signals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  display_name text not null default '',            -- filled by trigger from the profile
  verified     boolean not null default false,       -- filled by trigger from the profile
  type         text not null check (type in ('need_teammate', 'open_to_connect', 'want_to_build', 'open_to_work')),
  body         text not null check (char_length(body) between 1 and 200),
  tags         text[] not null default '{}' check (cardinality(tags) <= 3),
  event_id     uuid references public.events (id) on delete set null,
  contact      text not null check (char_length(contact) between 3 and 100),
  status       text not null default 'open' check (status in ('open', 'filled', 'hidden')),
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  check (expires_at <= created_at + interval '7 days')
);
create index signals_open_idx on public.signals (status, expires_at desc);

create table public.signal_responses (
  id           uuid primary key default gen_random_uuid(),
  signal_id    uuid not null references public.signals (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  display_name text not null default '',
  note         text check (char_length(note) <= 200),
  contact      text not null check (char_length(contact) between 3 and 100),
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  unique (signal_id, user_id)
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  signal_id   uuid not null references public.signals (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason      text check (char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  unique (signal_id, reporter_id)
);

-- Names and badges come from the profile, never from the client.
create or replace function public.fill_author()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = new.user_id;
  new.display_name := coalesce(nullif(p.full_name, ''), 'Student');
  if tg_table_name = 'signals' then
    new.verified := coalesce(p.college_verified, false);
  end if;
  return new;
end;
$$;
create trigger signals_author before insert on public.signals
  for each row execute function public.fill_author();
create trigger responses_author before insert on public.signal_responses
  for each row execute function public.fill_author();

-- At most 3 open, unexpired signals per user.
create or replace function public.limit_open_signals()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.signals
      where user_id = new.user_id and status = 'open' and expires_at > now()) >= 3 then
    raise exception 'You can have at most 3 open signals';
  end if;
  return new;
end;
$$;
create trigger signals_limit before insert on public.signals
  for each row execute function public.limit_open_signals();

-- Hide a signal automatically after 3 reports.
create or replace function public.auto_hide_reported()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.reports where signal_id = new.signal_id) >= 3 then
    update public.signals set status = 'hidden' where id = new.signal_id;
  end if;
  return new;
end;
$$;
create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.auto_hide_reported();

-- The poster's contact: only for the poster, accepted responders and organisers.
create or replace function public.get_signal_contact(p_signal_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select s.contact
  from public.signals s
  where s.id = p_signal_id
    and (
      s.user_id = auth.uid()
      or public.is_organiser()
      or exists (
        select 1 from public.signal_responses r
        where r.signal_id = s.id and r.user_id = auth.uid() and r.status = 'accepted'
      )
    );
$$;

-- ---------------------------------------------------------------- table access
-- Explicit grants (newer Supabase projects may not add them automatically).
-- Row Level Security below still decides which rows each user can touch.
grant usage on schema public to anon, authenticated;
grant select on public.venues, public.events, public.announcements, public.results to anon, authenticated;
grant insert, update, delete on public.venues, public.events, public.announcements, public.results to authenticated;
grant select, insert, delete on public.stars to authenticated;
grant select on public.app_settings, public.profiles to authenticated;
grant select on public.signals to anon, authenticated;            -- narrowed to safe columns below
grant insert, update, delete on public.signals to authenticated;  -- update narrowed below
grant select, insert, update, delete on public.signal_responses to authenticated;
grant select, insert on public.reports to authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.app_settings     enable row level security;
alter table public.profiles         enable row level security;
alter table public.venues           enable row level security;
alter table public.events           enable row level security;
alter table public.announcements    enable row level security;
alter table public.results          enable row level security;
alter table public.stars            enable row level security;
alter table public.signals          enable row level security;
alter table public.signal_responses enable row level security;
alter table public.reports          enable row level security;

-- app_settings: organisers only
create policy settings_read on public.app_settings for select to authenticated using (public.is_organiser());

-- profiles: see and edit your own (name/avatar only); organisers see all
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_organiser());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;
-- admins change roles in the Supabase dashboard (service role bypasses RLS)

-- fest data: everyone reads, organisers write
create policy venues_read on public.venues for select to anon, authenticated using (true);
create policy venues_write on public.venues for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy events_read on public.events for select to anon, authenticated
  using (is_published or public.is_organiser());
create policy events_write on public.events for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy announcements_read on public.announcements for select to anon, authenticated using (true);
create policy announcements_write on public.announcements for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

create policy results_read on public.results for select to anon, authenticated using (true);
create policy results_write on public.results for all to authenticated
  using (public.is_organiser()) with check (public.is_organiser());

-- stars: only your own
create policy stars_own on public.stars for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- signals
create policy signals_read on public.signals for select to anon, authenticated
  using ((status = 'open' and expires_at > now()) or user_id = auth.uid() or public.is_organiser());
create policy signals_insert on public.signals for insert to authenticated
  with check (user_id = auth.uid() and status = 'open');
create policy signals_update on public.signals for update to authenticated
  using (user_id = auth.uid() or public.is_organiser())
  with check (public.is_organiser() or (user_id = auth.uid() and status in ('open', 'filled')));
create policy signals_delete on public.signals for delete to authenticated
  using (user_id = auth.uid() or public.is_organiser());
-- contact is never readable directly (use get_signal_contact)
revoke select on public.signals from anon, authenticated;
grant select (id, user_id, display_name, verified, type, body, tags, event_id, status, expires_at, created_at)
  on public.signals to anon, authenticated;
-- users may only change status (and organisers hide); nothing else after posting
revoke update on public.signals from authenticated;
grant update (status) on public.signals to authenticated;

-- responses: the responder and the signal's poster can see them
create policy responses_read on public.signal_responses for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_organiser()
    or exists (select 1 from public.signals s where s.id = signal_id and s.user_id = auth.uid())
  );
create policy responses_insert on public.signal_responses for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.signals s
      where s.id = signal_id and s.status = 'open' and s.expires_at > now() and s.user_id <> auth.uid()
    )
  );
-- only the poster accepts or declines
create policy responses_update on public.signal_responses for update to authenticated
  using (exists (select 1 from public.signals s where s.id = signal_id and s.user_id = auth.uid()))
  with check (status in ('accepted', 'declined'));
revoke update on public.signal_responses from authenticated;
grant update (status) on public.signal_responses to authenticated;
create policy responses_delete on public.signal_responses for delete to authenticated
  using (user_id = auth.uid() or public.is_organiser());

-- reports: anyone signed in can report; organisers read
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_read on public.reports for select to authenticated using (public.is_organiser());

grant execute on function public.get_signal_contact(uuid) to authenticated;
grant execute on function public.is_organiser() to anon, authenticated;
