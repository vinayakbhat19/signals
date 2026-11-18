/**
 * Loads the 21 real Fiesta'26 events into Supabase and wipes all dummy seed data
 * (dummy events, dummy scores/results, dummy announcements, dummy venues).
 *
 * Usage: node scripts/load-fiesta26.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MAPS_URL =
  'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad';

const VENUES = [
  {
    name: 'Admin Block',
    description:
      'Main Administrative Block courtyard & performance area, SDMCET Dharwad.',
    maps_url: MAPS_URL,
  },
  {
    name: 'Civil Seminar Hall',
    description:
      'Seminar Hall inside the Civil Engineering Department, SDMCET Dharwad.',
    maps_url: MAPS_URL,
  },
  {
    name: 'Room No. 23',
    description: 'Classroom No. 23, Main Academic Block, SDMCET Dharwad.',
    maps_url: MAPS_URL,
  },
  {
    name: 'Room No. 24',
    description: 'Classroom No. 24, Main Academic Block, SDMCET Dharwad.',
    maps_url: MAPS_URL,
  },
  {
    name: 'Campus Venue (TBA)',
    description:
      "Final venue to be announced by the Fiesta'26 committee. Check Updates or https://linktr.ee/sdmcetFiesta26.",
    maps_url: MAPS_URL,
  },
];

const EVENTS = [
  // Confirmed Schedule (6 events)
  {
    code: 'F01',
    title: 'StreetPlay',
    description:
      "Official Fiesta'26 StreetPlay competition at Admin Block. Register via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Admin Block',
    starts_at: '2026-11-25T17:00:00+05:30',
    ends_at: '2026-11-25T18:15:00+05:30',
    registration_url: 'https://forms.gle/6nCPmJd3th3H3YG89',
  },
  {
    code: 'F02',
    title: 'Painting and Pencil Sketching',
    description:
      "Official Fiesta'26 Painting and Pencil Sketching competition at Civil Seminar Hall. Register via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Civil Seminar Hall',
    starts_at: '2026-11-25T17:00:00+05:30',
    ends_at: '2026-11-25T18:00:00+05:30',
    registration_url: 'https://forms.gle/ixEhTstEdfUJ9C7V8',
  },
  {
    code: 'F04',
    title: 'Think Twice',
    description:
      "Official Fiesta'26 Think Twice tech challenge at Room No. 23. Register via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'tech',
    venue: 'Room No. 23',
    starts_at: '2026-11-25T17:00:00+05:30',
    ends_at: '2026-11-25T18:30:00+05:30',
    registration_url: 'https://forms.gle/sw1dxzLktUbGZt65A',
  },
  {
    code: 'F06',
    title: 'GDG Event',
    description:
      "Official Fiesta'26 GDG tech event at Room No. 24. Register via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'tech',
    venue: 'Room No. 24',
    starts_at: '2026-11-26T17:00:00+05:30',
    ends_at: '2026-11-26T19:00:00+05:30',
    registration_url: 'https://forms.gle/id1V9wVign6Gx9n69',
  },
  {
    code: 'F08',
    title: 'Cultural Clash',
    description:
      "Official Fiesta'26 Cultural Clash at Admin Block. Register via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Admin Block',
    starts_at: '2026-11-26T18:30:00+05:30',
    ends_at: '2026-11-26T19:00:00+05:30',
    registration_url: 'https://forms.gle/1NT5rYPE7BD8abvo8',
  },
  {
    code: 'F11',
    title: 'Technical Anonymous',
    description:
      "Official Fiesta'26 Technical Anonymous event at Room No. 24. Register via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'tech',
    venue: 'Room No. 24',
    starts_at: '2026-11-27T11:00:00+05:30',
    ends_at: '2026-11-27T13:00:00+05:30',
    registration_url: 'https://forms.gle/Q6EuD2ZCoQecbZ6F6',
  },

  // Official Events with exact time & venue TBA (15 events)
  {
    code: 'F03',
    title: 'Technical QWERTY',
    description:
      "Official Fiesta'26 tech competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'tech',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-25T10:00:00+05:30',
    ends_at: '2026-11-25T12:00:00+05:30',
    registration_url: 'https://forms.gle/rXSKDi2UCgrbms3y6',
  },
  {
    code: 'F05',
    title: 'Mic Drop',
    description:
      "Official Fiesta'26 cultural event. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-25T11:00:00+05:30',
    ends_at: '2026-11-25T13:00:00+05:30',
    registration_url: 'https://forms.gle/MjvGYAm2nfYL7JA96',
  },
  {
    code: 'F09',
    title: 'Advertisement',
    description:
      "Official Fiesta'26 cultural competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-25T14:00:00+05:30',
    ends_at: '2026-11-25T16:00:00+05:30',
    registration_url: 'https://forms.gle/4hj5Cv5zjQkhULLz7',
  },
  {
    code: 'F10',
    title: 'Picture to Story',
    description:
      "Official Fiesta'26 cultural competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-25T14:30:00+05:30',
    ends_at: '2026-11-25T16:30:00+05:30',
    registration_url: 'https://forms.gle/H1mECn7u8DV6SFNZ8',
  },
  {
    code: 'F20',
    title: 'Mad Ads',
    description:
      "Official Fiesta'26 Mad Ads competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-25T15:00:00+05:30',
    ends_at: '2026-11-25T17:00:00+05:30',
    registration_url: 'https://forms.gle/gWKfA7cW2jXtRM7w6',
  },
  {
    code: 'F07',
    title: 'Face-Off',
    description:
      "Official Fiesta'26 fun event. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'fun',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-26T10:30:00+05:30',
    ends_at: '2026-11-26T12:30:00+05:30',
    registration_url: 'https://forms.gle/7MJLD7LFCAMAiKSv8',
  },
  {
    code: 'F12',
    title: 'Instrumental Solo',
    description:
      "Official Fiesta'26 Instrumental Solo competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-26T11:00:00+05:30',
    ends_at: '2026-11-26T13:00:00+05:30',
    registration_url: 'https://forms.gle/bxf1rfZ4pCZvWRMP8',
  },
  {
    code: 'F13',
    title: 'Western Vocals Solo',
    description:
      "Official Fiesta'26 Western Vocals Solo competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-26T14:00:00+05:30',
    ends_at: '2026-11-26T15:30:00+05:30',
    registration_url: 'https://forms.gle/cKR8PiQhkcRi5mYV9',
  },
  {
    code: 'F14',
    title: 'Eastern Vocals Solo',
    description:
      "Official Fiesta'26 Eastern Vocals Solo competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-26T15:30:00+05:30',
    ends_at: '2026-11-26T17:00:00+05:30',
    registration_url: 'https://forms.gle/NNm1E9vVnqP4orjS6',
  },
  {
    code: 'F19',
    title: 'Group Vocals',
    description:
      "Official Fiesta'26 Group Vocals competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-26T16:00:00+05:30',
    ends_at: '2026-11-26T17:30:00+05:30',
    registration_url: 'https://forms.gle/mUimXCb4GuVWP2mA7',
  },
  {
    code: 'F15',
    title: 'Western Solo Dance',
    description:
      "Official Fiesta'26 Western Solo Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-27T10:00:00+05:30',
    ends_at: '2026-11-27T12:00:00+05:30',
    registration_url: 'https://forms.gle/ezE7appjMh5MSFWa8',
  },
  {
    code: 'F16',
    title: 'Eastern Solo Dance',
    description:
      "Official Fiesta'26 Eastern Solo Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-27T12:00:00+05:30',
    ends_at: '2026-11-27T14:00:00+05:30',
    registration_url: 'https://forms.gle/A1tZWdKXe1YcTWpG9',
  },
  {
    code: 'F21',
    title: 'Duet',
    description:
      "Official Fiesta'26 Duet performance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-28T14:00:00+05:30',
    ends_at: '2026-11-28T15:30:00+05:30',
    registration_url: 'https://forms.gle/XpG3V7YVuzxXAwVv6',
  },
  {
    code: 'F17',
    title: 'Western Group Dance',
    description:
      "Official Fiesta'26 Western Group Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-28T15:30:00+05:30',
    ends_at: '2026-11-28T17:30:00+05:30',
    registration_url: 'https://forms.gle/vAophKYDRveQC6Ho8',
  },
  {
    code: 'F18',
    title: 'Eastern Group Dance',
    description:
      "Official Fiesta'26 Eastern Group Dance competition. Exact time & venue TBA — register now via the official form or https://linktr.ee/sdmcetFiesta26.",
    category: 'cultural',
    venue: 'Campus Venue (TBA)',
    starts_at: '2026-11-28T17:30:00+05:30',
    ends_at: '2026-11-28T19:30:00+05:30',
    registration_url: 'https://forms.gle/Xqc3SDnHeQbLgLpK6',
  },
];

async function clearTable(table, optional = false) {
  const { error } = await supabase
    .from(table)
    .delete()
    .not('id', 'is', null);
  if (error) {
    if (
      optional &&
      (error.code === '42P01' || error.code === 'PGRST205')
    ) {
      return;
    }
    throw new Error(`Failed clearing ${table}: ${error.message} (${error.code})`);
  }
}

async function main() {
  console.log('1. Removing dummy seed data...');
  await clearTable('event_changes', true);
  await clearTable('results');
  await clearTable('announcements');
  await clearTable('events');
  await clearTable('venues');

  console.log('2. Inserting 5 real Fiesta\'26 venues...');
  const { data: insertedVenues, error: venueErr } = await supabase
    .from('venues')
    .insert(VENUES)
    .select('id, name');
  if (venueErr) {
    throw new Error(`Venue insert failed: ${venueErr.message}`);
  }
  const venueMap = new Map(insertedVenues.map((v) => [v.name, v.id]));

  console.log('3. Inserting 21 real Fiesta\'26 competitions (F01-F21)...');
  const eventRows = EVENTS.map((ev) => ({
    code: ev.code,
    title: ev.title,
    description: ev.description,
    category: ev.category,
    venue_id: venueMap.get(ev.venue) ?? null,
    starts_at: ev.starts_at,
    ends_at: ev.ends_at,
    status: 'scheduled',
    registration_url: ev.registration_url,
    contact_info: "Fiesta'26 Committee · SDMCET",
    is_published: true,
  }));

  const { data: insertedEvents, error: evErr } = await supabase
    .from('events')
    .insert(eventRows)
    .select('id, code, title');
  if (evErr) {
    throw new Error(`Events insert failed: ${evErr.message}`);
  }

  console.log('4. Inserting official Fiesta\'26 welcome announcement...');
  const { error: annErr } = await supabase.from('announcements').insert({
    message:
      "Welcome to Fiesta'26 at SDMCET Dharwad (25–28 Nov)! Register for all 21 events right here or at https://linktr.ee/sdmcetFiesta26",
    priority: 'normal',
  });
  if (annErr) {
    throw new Error(`Announcement insert failed: ${annErr.message}`);
  }

  // Verify final counts
  const [evCount, vCount, rCount, aCount] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('venues').select('id', { count: 'exact', head: true }),
    supabase.from('results').select('id', { count: 'exact', head: true }),
    supabase.from('announcements').select('id', { count: 'exact', head: true }),
  ]);

  console.log('\nDone! Live Supabase counts:');
  console.log(`- Events:        ${evCount.count} (inserted ${insertedEvents.length})`);
  console.log(`- Venues:        ${vCount.count}`);
  console.log(`- Results/Score: ${rCount.count} (all dummy scores removed)`);
  console.log(`- Announcements: ${aCount.count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
