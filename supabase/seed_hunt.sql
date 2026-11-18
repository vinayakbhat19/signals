-- Fest Live: treasure hunt test data (development only). Run after schema_stamps.sql.
-- Opens the hunt now for 12 hours with 10 sample places. On fest day, replace these in /admin/hunt
-- with the real places, clues and hints (see STAMP_HUNT.md for how to write good clues).

insert into public.stamp_hunt (id, name, opens_at, closes_at)
values (1, 'Fiesta Treasure Hunt', now() - interval '1 hour', now() + interval '12 hours')
on conflict (id) do update set opens_at = excluded.opens_at, closes_at = excluded.closes_at;

insert into public.stamp_points (name, clue, hint, found_text, mascot, sort)
select v.name, v.clue, v.hint, v.found, v.mascot, v.sort
from (values
  ('Library steps',  'Silence is loud here, and the stairs keep secrets.',          'Books live inside.',                'Shhh! You found the quiet place.', 'doodle', 1),
  ('Canteen',        'Chai o''clock. Follow your nose and your hunger.',           'It smells of samosas.',             'Chai and stamps. Perfect.',        'buzz',   2),
  ('Main gate',      'Every story of the fest starts and ends here.',               'You walked through it this morning.', 'The big entrance!',              'kick',   3),
  ('Fountain',       'Water, but not a lake. Wishes welcome.',                      'Near the garden.',                  'Splash!',                          'zap',    4),
  ('Notice board',   'Everything is announced here, even the things nobody reads.', 'Pins, paper and dates.',            'You read the notices. Rare!',      'spark',  5),
  ('Cycle stand',    'Two wheels sleep here all day.',                              'Rows of handlebars.',               'Nice parking skills.',             'kick',   6),
  ('Open air stage', 'Where the music comes out to play.',                          'Look for the big speakers.',        'Take a bow!',                      'beat',   7),
  ('Statue',         'He stands all day and never gets a seat.',                    'People take photos with him.',      'Stand tall. Stamp taken.',         'doodle', 8),
  ('Garden bench',   'Take a break, but not for too long.',                         'Green and quiet.',                  'Good spot for a selfie.',          'spark',  9),
  ('Help desk',      'Lost? Confused? This place has answers (and the last stamp).', 'Volunteers in bright shirts.',      'You finished the hunt!',           'zap',   10)
) as v(name, clue, hint, found, mascot, sort)
where not exists (select 1 from public.stamp_points);
