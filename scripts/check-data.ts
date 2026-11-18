import fs from 'node:fs';
import path from 'node:path';
import { listAnnouncements } from '../lib/data/announcements';
import { getEvent, listEvents, listEventsByVenue } from '../lib/data/events';
import { getLiveData } from '../lib/data/live';
import { listResults } from '../lib/data/results';
import { getVenue, listVenues } from '../lib/data/venues';
import { formatRange } from '../lib/time';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();

  console.log('Checking Supabase public data connection...\n');

  const venues = await listVenues();
  console.log(`Venues (${venues.length}):`);
  for (const v of venues) {
    console.log(`  - ${v.name} (${v.id})`);
  }

  const events = await listEvents();
  console.log(`\nPublished events (${events.length}):`);
  for (const e of events) {
    console.log(
      `  - [${e.category}] ${e.title} | ${formatRange(e.starts_at, e.ends_at)} | ${e.venue_name ?? 'TBA'} (${e.status})`
    );
  }

  if (events.length === 0) {
    console.log(
      '\nNo events returned! Please run supabase/seed.sql in your Supabase SQL Editor first.'
    );
  } else {
    const firstEvent = await getEvent(events[0].id);
    console.log(
      `\ngetEvent(${events[0].id}): ${firstEvent?.title ?? 'null'} (results: ${firstEvent?.results.length ?? 0})`
    );
  }

  if (venues.length > 0) {
    const firstVenue = await getVenue(venues[0].id);
    const venueEvents = await listEventsByVenue(venues[0].id);
    console.log(
      `getVenue(${venues[0].id}): ${firstVenue?.name ?? 'null'} (events: ${venueEvents.length})`
    );
  }

  const announcements = await listAnnouncements(5);
  console.log(`\nAnnouncements (${announcements.length}):`);
  for (const a of announcements) {
    console.log(`  - [${a.priority}] ${a.message}`);
  }

  const results = await listResults();
  console.log(`\nResults (${results.length}):`);
  for (const r of results) {
    console.log(
      `  - ${r.event_title} — ${r.title}${r.is_live ? ' [LIVE]' : ''}: ${r.body}`
    );
  }

  const live = await getLiveData();
  console.log('\ngetLiveData():');
  console.log(`  serverTime: ${live.serverTime}`);
  console.log(`  now (${live.now.length}): ${live.now.map((e) => e.title).join(', ') || '(none)'}`);
  console.log(`  next (${live.next.length}): ${live.next.map((e) => e.title).join(', ') || '(none)'}`);
  console.log(`  urgent: ${live.urgent ? live.urgent.message : '(none)'}`);
  console.log(`  announcements: ${live.announcements.length}`);
}

main().catch((err) => {
  console.error('\nData check failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
