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
