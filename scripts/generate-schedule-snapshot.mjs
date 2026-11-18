/**
 * Generates public/live-fallback.json at build time from Supabase (live_feed()
 * or direct table reads, falling back to templates/fiesta26_events.csv).
 * Used when Supabase is unreachable so Cloudflare Pages static hosting keeps
 * serving the full Fiesta'26 schedule in Backup Mode.
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

const DEFAULT_STATUS = {
  mode: 'fest',
  fest_name: process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26",
  fest_starts_at: '2026-11-25T00:00:00+05:30',
  fest_ends_at: '2026-11-27T23:59:59+05:30',
  campus_from: '2026-11-28T00:00:00+05:30',
  writes_paused: false,
  banner: null,
  banner_level: 'info',
  version: 1,
  poll_seconds: 30,
  server_time: new Date().toISOString(),
};

function fallbackFromCsv() {
  const csvPath = path.resolve(process.cwd(), 'templates/fiesta26_events.csv');
  const events = [];
  const venueMap = new Map();
  if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const code = (cols[0] || '').trim();
      const title = (cols[1] || '').trim();
      if (!title) continue;
      const category = (cols[3] || 'cultural').trim();
      const venueName = (cols[4] || '').trim() || 'Campus Venue (TBA)';
      if (!venueMap.has(venueName)) {
        venueMap.set(venueName, {
          id: `fallback-venue-${venueMap.size + 1}`,
          name: venueName,
          maps_url:
            'https://maps.google.com/?q=SDM+College+of+Engineering+and+Technology+Dharwad',
        });
      }
      const date = (cols[5] || '').trim() || '2026-11-25';
      const start = (cols[6] || '').trim() || '10:00';
      const end = (cols[7] || '').trim() || '12:00';
      const registration_url =
        (cols[8] || '').trim() || 'https://linktr.ee/sdmcetFiesta26';
      events.push({
        id: `fallback-${code.toLowerCase() || i}`,
        code,
        title,
        category,
        venue_id: venueMap.get(venueName).id,
        starts_at: `${date}T${start}:00+05:30`,
        ends_at: `${date}T${end}:00+05:30`,
        status: 'scheduled',
        cover_url: null,
        host_name: null,
        registration_url,
        registration_opens_at: null,
        registration_closes_at: null,
      });
    }
  }
  return {
    status: DEFAULT_STATUS,
    venues: [...venueMap.values()],
    events,
    changes: [],
    notices: [
      {
        id: 'fallback-ann-1',
        message:
          "Welcome to Fiesta'26 at SDMCET Dharwad (25–27 Nov)! Register at https://linktr.ee/sdmcetFiesta26",
        priority: 'normal',
        event_id: null,
        created_at: new Date().toISOString(),
      },
    ],
    polls: [],
    server_time: new Date().toISOString(),
  };
}

async function main() {
  const outPath = path.resolve(process.cwd(), 'public/live-fallback.json');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anon) {
    try {
      const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Prefer live_feed() RPC if UPGRADE_CLOUDFLARE_STATIC.sql has been applied
      const rpcRes = await supabase.rpc('live_feed');
      if (!rpcRes.error && rpcRes.data && Array.isArray(rpcRes.data.events)) {
        fs.writeFileSync(outPath, JSON.stringify(rpcRes.data, null, 2));
        console.log(
          `[live-fallback] Wrote ${rpcRes.data.events.length} events from live_feed() to public/live-fallback.json`
        );
        return;
      }

      // Otherwise compose the same shape from base tables
      const [evRes, vRes, annRes] = await Promise.all([
        supabase
          .from('events')
          .select(
            'id, code, title, category, venue_id, starts_at, ends_at, status, cover_url, host_name, registration_url'
          )
          .eq('is_published', true)
          .order('starts_at', { ascending: true }),
        supabase
          .from('venues')
          .select('id, name, maps_url')
          .order('name', { ascending: true }),
        supabase
          .from('announcements')
          .select('id, message, priority, event_id, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (!evRes.error && evRes.data && evRes.data.length > 0) {
        const snapshot = {
          status: DEFAULT_STATUS,
          venues: vRes.data ?? [],
          events: evRes.data,
          changes: [],
          notices: annRes.data ?? [],
          polls: [],
          server_time: new Date().toISOString(),
        };
        fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
        console.log(
          `[live-fallback] Wrote ${evRes.data.length} events from Supabase tables to public/live-fallback.json`
        );
        return;
      }
    } catch (err) {
      console.warn(
        '[live-fallback] Supabase unreachable during build; using CSV fallback:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const fb = fallbackFromCsv();
  fs.writeFileSync(outPath, JSON.stringify(fb, null, 2));
  console.log(
    `[live-fallback] Wrote ${fb.events.length} CSV fallback events to public/live-fallback.json`
  );
}

main().catch((err) => {
  console.error('[live-fallback] Unexpected error:', err);
  process.exit(0);
});
