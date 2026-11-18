/**
 * Generates public/schedule.json at build time from Supabase (with automatic
 * fallback to templates/fiesta26_events.csv if Supabase is unreachable).
 * Ensures the app still serves all real Fiesta'26 events in backup/offline mode.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
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
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

function fallbackFromCsv() {
  const csvPath = path.resolve(process.cwd(), 'templates/fiesta26_events.csv');
  if (!fs.existsSync(csvPath)) {
    return { generatedAt: new Date().toISOString(), source: 'empty', events: [], venues: [], announcements: [], results: [] };
  }
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const events = [];
  const venueSet = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const code = (cols[0] || '').trim();
    const title = (cols[1] || '').trim();
    if (!title) continue;
    const category = (cols[3] || 'cultural').trim();
    const venue = (cols[4] || '').trim() || 'Campus Venue (TBA)';
    const date = (cols[5] || '').trim() || '2026-11-25';
    const start = (cols[6] || '').trim() || '10:00';
    const end = (cols[7] || '').trim() || '12:00';
    const registration_url = (cols[8] || '').trim() || 'https://linktr.ee/sdmcetFiesta26';
    venueSet.add(venue);
    events.push({
      id: `fallback-${code.toLowerCase() || i}`,
      code,
      title,
      description: "Official Fiesta'26 competition at SDMCET Dharwad.",
      category,
      venue_id: null,
      venue_name: venue,
      starts_at: `${date}T${start}:00+05:30`,
      ends_at: `${date}T${end}:00+05:30`,
      status: 'scheduled',
      poster_url: null,
      registration_url,
      contact_info: "Fiesta'26 Committee · SDMCET",
      cover_url: null,
      host_name: null,
      host_coordinator: null,
      is_published: true,
    });
  }
  const venues = [...venueSet].map((name, idx) => ({
    id: `fallback-venue-${idx + 1}`,
    name,
    description: 'SDMCET Dharwad campus venue',
    maps_url: 'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad',
  }));
  return {
    generatedAt: new Date().toISOString(),
    source: 'csv',
    events,
    venues,
    announcements: [
      {
        id: 'fallback-ann-1',
        message:
          "Welcome to Fiesta'26 at SDMCET Dharwad (25–27 Nov)! Register at https://linktr.ee/sdmcetFiesta26",
        event_id: null,
        priority: 'normal',
        created_at: new Date().toISOString(),
      },
    ],
    results: [],
  };
}

async function main() {
  const outPath = path.resolve(process.cwd(), 'public/schedule.json');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anon) {
    try {
      const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const [evRes, vRes, annRes, rRes] = await Promise.all([
        supabase
          .from('events')
          .select('*, venues(id, name, maps_url)')
          .eq('is_published', true)
          .order('starts_at', { ascending: true }),
        supabase.from('venues').select('*').order('name', { ascending: true }),
        supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('results')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(30),
      ]);

      if (!evRes.error && evRes.data && evRes.data.length > 0) {
        const events = evRes.data.map((row) => {
          const v = Array.isArray(row.venues) ? row.venues[0] : row.venues;
          return {
            ...row,
            venue_name: v?.name ?? null,
            venue_maps_url: v?.maps_url ?? null,
          };
        });
        const snapshot = {
          generatedAt: new Date().toISOString(),
          source: 'db',
          events,
          venues: vRes.data ?? [],
          announcements: annRes.data ?? [],
          results: rRes.data ?? [],
        };
        fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
        console.log(
          `[schedule-snapshot] Wrote ${events.length} events from Supabase to public/schedule.json`
        );
        return;
      }
    } catch (err) {
      console.warn(
        '[schedule-snapshot] Supabase unreachable during build; using CSV fallback:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const fallback = fallbackFromCsv();
  fs.writeFileSync(outPath, JSON.stringify(fallback, null, 2));
  console.log(
    `[schedule-snapshot] Wrote ${fallback.events.length} fallback events from CSV to public/schedule.json`
  );
}

main().catch((err) => {
  console.error('[schedule-snapshot] Unexpected error:', err);
  process.exit(0); // Never fail build over optional snapshot generation
});
