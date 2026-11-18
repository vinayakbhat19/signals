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
