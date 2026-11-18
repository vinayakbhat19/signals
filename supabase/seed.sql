-- Sample data for development only. Times are relative to "now" so Home always
-- has something live and something next. Delete before the fest:
--   delete from public.events; delete from public.venues; delete from public.announcements;
insert into public.venues (name, description, maps_url) values
  ('Main Stage', 'Open-air stage near the main gate', null),
  ('Seminar Hall 1', 'Ground floor, Academic Block A', null),
  ('Computer Lab 3', 'Second floor, IT Block', null),
  ('Sports Ground', 'Behind the hostels', null);

insert into public.events (code, title, description, category, venue_id, starts_at, ends_at, registration_url, contact_info)
select v.code, v.title, v.description, v.category, (select id from public.venues where name = v.venue),
       now() + v.start_offset, now() + v.end_offset, v.reg, v.contact
from (values
  ('T01', '24-hour Hackathon (ongoing)', 'Build anything. Teams of 2-4.', 'tech', 'Computer Lab 3', interval '-2 hours', interval '22 hours', 'https://example.com/register', 'Tech Committee'),
  ('C01', 'Battle of Bands', 'Inter-college band competition.', 'cultural', 'Main Stage', interval '-30 minutes', interval '90 minutes', null, 'Cultural Committee'),
  ('W01', 'Intro to Flutter Workshop', 'Bring a laptop with Flutter installed.', 'workshop', 'Seminar Hall 1', interval '45 minutes', interval '165 minutes', 'https://example.com/flutter', 'App Dev Club'),
  ('S01', 'Inter-college Cricket Final', 'Final match, 15 overs a side.', 'sports', 'Sports Ground', interval '2 hours', interval '5 hours', null, 'Sports Council'),
  ('K01', 'Startup Talk: Building in College', 'Alumni founders share their story.', 'talk', 'Seminar Hall 1', interval '3 hours', interval '4 hours', null, 'E-Cell'),
  ('F01', 'Treasure Hunt', 'Clues all over campus.', 'fun', 'Main Stage', interval '5 hours', interval '7 hours', null, 'Fun Committee')
) as v(code, title, description, category, venue, start_offset, end_offset, reg, contact);

insert into public.announcements (message, priority) values
  ('Welcome to the fest! Scan any QR code around campus to see what''s on.', 'normal'),
  ('Flutter workshop moved to Seminar Hall 1.', 'urgent');

insert into public.results (event_id, title, body, is_live)
select id, 'Live score', 'Team A 102/3 (11.2) vs Team B', true from public.events where code = 'S01';
