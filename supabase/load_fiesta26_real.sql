-- =====================================================================
-- Fiesta'26 Live — Wipe Dummy Seed Data & Load 21 Real SDMCET Events
-- =====================================================================
-- Safe & idempotent: removes all sample/dummy events, results/scores,
-- announcements, and venues, then inserts the real SDMCET Fiesta'26
-- venues, all 21 official competitions (F01-F21) with their Google Forms
-- registration URLs, and an official registration hub announcement
-- linking back to https://linktr.ee/sdmcetFiesta26.
-- =====================================================================

begin;

-- 1. Remove all dummy seed data
delete from public.results;
delete from public.announcements;
delete from public.events;
delete from public.venues;

-- 2. Insert real Fiesta'26 campus venues
insert into public.venues (name, description, maps_url) values
  ('Admin Block', 'Main Administrative Block courtyard & performance area, SDMCET Dharwad.', 'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad'),
  ('Civil Seminar Hall', 'Seminar Hall inside the Civil Engineering Department, SDMCET Dharwad.', 'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad'),
  ('Room No. 23', 'Classroom No. 23, Main Academic Block, SDMCET Dharwad.', 'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad'),
  ('Room No. 24', 'Classroom No. 24, Main Academic Block, SDMCET Dharwad.', 'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad'),
  ('Campus Venue (TBA)', 'Final venue to be announced by the Fiesta''26 committee. Check Updates or https://linktr.ee/sdmcetFiesta26.', 'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad');

-- 3. Insert all 21 official Fiesta'26 competitions (F01-F21)
insert into public.events (
  code,
  title,
  description,
  category,
  venue_id,
  starts_at,
  ends_at,
  status,
  registration_url,
  contact_info,
  is_published
)
select
  e.code,
  e.title,
  e.description,
  e.category,
  v.id,
  e.starts_at::timestamptz,
  e.ends_at::timestamptz,
  'scheduled',
  e.registration_url,
  'Fiesta''26 Committee · SDMCET',
  true
from (
  values
    -- Confirmed Schedule (6 events from fiesta26_events.csv)
    ('F01', 'StreetPlay', 'Official Fiesta''26 StreetPlay competition at Admin Block. Register via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Admin Block', '2026-11-25 17:00:00+05:30', '2026-11-25 18:15:00+05:30', 'https://forms.gle/6nCPmJd3th3H3YG89'),
    ('F02', 'Painting and Pencil Sketching', 'Official Fiesta''26 Painting and Pencil Sketching competition at Civil Seminar Hall. Register via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Civil Seminar Hall', '2026-11-25 17:00:00+05:30', '2026-11-25 18:00:00+05:30', 'https://forms.gle/ixEhTstEdfUJ9C7V8'),
    ('F04', 'Think Twice', 'Official Fiesta''26 Think Twice tech challenge at Room No. 23. Register via the official form or https://linktr.ee/sdmcetFiesta26.', 'tech', 'Room No. 23', '2026-11-25 17:00:00+05:30', '2026-11-25 18:30:00+05:30', 'https://forms.gle/sw1dxzLktUbGZt65A'),
    ('F06', 'GDG Event', 'Official Fiesta''26 GDG tech event at Room No. 24. Register via the official form or https://linktr.ee/sdmcetFiesta26.', 'tech', 'Room No. 24', '2026-11-26 17:00:00+05:30', '2026-11-26 19:00:00+05:30', 'https://forms.gle/id1V9wVign6Gx9n69'),
    ('F08', 'Cultural Clash', 'Official Fiesta''26 Cultural Clash at Admin Block. Register via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Admin Block', '2026-11-26 18:30:00+05:30', '2026-11-26 19:00:00+05:30', 'https://forms.gle/1NT5rYPE7BD8abvo8'),
    ('F11', 'Technical Anonymous', 'Official Fiesta''26 Technical Anonymous event at Room No. 24. Register via the official form or https://linktr.ee/sdmcetFiesta26.', 'tech', 'Room No. 24', '2026-11-27 11:00:00+05:30', '2026-11-27 13:00:00+05:30', 'https://forms.gle/Q6EuD2ZCoQecbZ6F6'),

    -- Official Fiesta'26 Events with exact time & venue TBA (15 events from fiesta26_events.csv)
    ('F03', 'Technical QWERTY', 'Official Fiesta''26 tech competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'tech', 'Campus Venue (TBA)', '2026-11-25 10:00:00+05:30', '2026-11-25 12:00:00+05:30', 'https://forms.gle/rXSKDi2UCgrbms3y6'),
    ('F05', 'Mic Drop', 'Official Fiesta''26 cultural event. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-25 11:00:00+05:30', '2026-11-25 13:00:00+05:30', 'https://forms.gle/MjvGYAm2nfYL7JA96'),
    ('F09', 'Advertisement', 'Official Fiesta''26 cultural competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-25 14:00:00+05:30', '2026-11-25 16:00:00+05:30', 'https://forms.gle/4hj5Cv5zjQkhULLz7'),
    ('F10', 'Picture to Story', 'Official Fiesta''26 cultural competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-25 14:30:00+05:30', '2026-11-25 16:30:00+05:30', 'https://forms.gle/H1mECn7u8DV6SFNZ8'),
    ('F20', 'Mad Ads', 'Official Fiesta''26 Mad Ads competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-25 15:00:00+05:30', '2026-11-25 17:00:00+05:30', 'https://forms.gle/gWKfA7cW2jXtRM7w6'),

    ('F07', 'Face-Off', 'Official Fiesta''26 fun event. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'fun', 'Campus Venue (TBA)', '2026-11-26 10:30:00+05:30', '2026-11-26 12:30:00+05:30', 'https://forms.gle/7MJLD7LFCAMAiKSv8'),
    ('F12', 'Instrumental Solo', 'Official Fiesta''26 Instrumental Solo competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-26 11:00:00+05:30', '2026-11-26 13:00:00+05:30', 'https://forms.gle/bxf1rfZ4pCZvWRMP8'),
    ('F13', 'Western Vocals Solo', 'Official Fiesta''26 Western Vocals Solo competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-26 14:00:00+05:30', '2026-11-26 15:30:00+05:30', 'https://forms.gle/cKR8PiQhkcRi5mYV9'),
    ('F14', 'Eastern Vocals Solo', 'Official Fiesta''26 Eastern Vocals Solo competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-26 15:30:00+05:30', '2026-11-26 17:00:00+05:30', 'https://forms.gle/NNm1E9vVnqP4orjS6'),
    ('F19', 'Group Vocals', 'Official Fiesta''26 Group Vocals competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-26 16:00:00+05:30', '2026-11-26 17:30:00+05:30', 'https://forms.gle/mUimXCb4GuVWP2mA7'),

    ('F15', 'Western Solo Dance', 'Official Fiesta''26 Western Solo Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-27 10:00:00+05:30', '2026-11-27 12:00:00+05:30', 'https://forms.gle/ezE7appjMh5MSFWa8'),
    ('F16', 'Eastern Solo Dance', 'Official Fiesta''26 Eastern Solo Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-27 12:00:00+05:30', '2026-11-27 14:00:00+05:30', 'https://forms.gle/A1tZWdKXe1YcTWpG9'),
    ('F21', 'Duet', 'Official Fiesta''26 Duet performance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-27 14:00:00+05:30', '2026-11-27 15:30:00+05:30', 'https://forms.gle/XpG3V7YVuzxXAwVv6'),
    ('F17', 'Western Group Dance', 'Official Fiesta''26 Western Group Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-27 15:30:00+05:30', '2026-11-27 17:30:00+05:30', 'https://forms.gle/vAophKYDRveQC6Ho8'),
    ('F18', 'Eastern Group Dance', 'Official Fiesta''26 Eastern Group Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.', 'cultural', 'Campus Venue (TBA)', '2026-11-27 17:30:00+05:30', '2026-11-27 19:30:00+05:30', 'https://forms.gle/Xqc3SDnHeQbLgLpK6')
) as e(code, title, description, category, venue_name, starts_at, ends_at, registration_url)
join public.venues v on v.name = e.venue_name;

-- 4. Insert clean official Fiesta'26 announcement (no dummy notices)
insert into public.announcements (message, priority) values
  ('Welcome to Fiesta''26 at SDMCET Dharwad (25–27 Nov)! Register for all 21 events right here or at https://linktr.ee/sdmcetFiesta26', 'normal');

commit;
