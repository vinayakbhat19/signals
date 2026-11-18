-- Fest Live: Stamp Hunt test data (development only). Run after schema_stamps.sql and seed.sql.
-- Opens the hunt now for 12 hours and creates one stamp point per seeded event plus a help-desk point.
-- On fest day, replace with the real competitions in /admin/hunt.

insert into public.stamp_hunt (id, name, opens_at, closes_at)
values (1, 'Fest Stamp Hunt', now() - interval '1 hour', now() + interval '12 hours')
on conflict (id) do update set opens_at = excluded.opens_at, closes_at = excluded.closes_at;

insert into public.stamp_points (name, event_id, venue_id, mascot, sort, bonus_from, bonus_to)
select e.title, e.id, e.venue_id,
       (array['zap', 'beat', 'doodle', 'kick', 'spark', 'buzz'])[row_number() over (order by e.starts_at)],
       row_number() over (order by e.starts_at),
       e.ends_at - interval '10 minutes', e.ends_at
from public.events e
where e.is_published and e.status <> 'cancelled'
  and not exists (select 1 from public.stamp_points sp where sp.event_id = e.id);

insert into public.stamp_points (name, mascot, sort)
select 'Help desk', 'spark', 99
where not exists (select 1 from public.stamp_points where name = 'Help desk');
