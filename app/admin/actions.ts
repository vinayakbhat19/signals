'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOrganiser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { istToUtc } from '@/lib/time';
import {
  ANNOUNCEMENT_PRIORITIES,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  type EventCategory,
  type EventStatus,
  type ResultsVisibility,
} from '@/lib/types';

function revalidatePublic(eventId?: string) {
  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath('/venues');
  revalidatePath('/updates');
  revalidatePath('/announcements');
  revalidatePath('/results');
  revalidatePath('/vote');
  revalidatePath('/hunt');
  revalidatePath('/api/live');
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/vote/${eventId}`);
  }
}

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().max(24).optional().nullable(),
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(EVENT_CATEGORIES),
  venue_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)'),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)'),
  status: z.enum(EVENT_STATUSES).default('scheduled'),
  registration_url: z.string().trim().url().optional().or(z.literal('')).nullable(),
  contact_info: z.string().trim().max(120).optional().nullable(),
  host_name: z.string().trim().max(80).optional().nullable(),
  host_coordinator: z.string().trim().max(80).optional().nullable(),
  cover_url: z.string().trim().url().optional().or(z.literal('')).nullable(),
  is_published: z.boolean().default(true),
});

export async function saveEventAction(raw: z.infer<typeof eventSchema>) {
  await requireOrganiser();
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? 'Invalid event fields',
    };
  }

  const d = parsed.data;
  const startsAt = istToUtc(d.date, d.start);
  let endsAt = istToUtc(d.date, d.end);
  if (endsAt <= startsAt) {
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }

  const payload = {
    code: d.code || null,
    title: d.title,
    description: d.description || null,
    category: d.category as EventCategory,
    venue_id: d.venue_id || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: d.status as EventStatus,
    registration_url: d.registration_url || null,
    contact_info: d.contact_info || null,
    host_name: d.host_name || null,
    host_coordinator: d.host_coordinator || null,
    cover_url: d.cover_url || null,
    is_published: d.is_published,
  };

  const supabase = await createClient();
  if (d.id) {
    const { error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', d.id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePublic(d.id);
    revalidatePath('/admin');
    return { ok: true as const, id: d.id };
  }

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select('id')
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(data.id);
  revalidatePath('/admin');
  return { ok: true as const, id: data.id };
}

export async function quickDelayEventAction(eventId: string, minutes = 15) {
  await requireOrganiser();
  const idParsed = z.string().uuid().safeParse(eventId);
  if (!idParsed.success) return { ok: false as const, error: 'Invalid ID' };

  const supabase = await createClient();
  const { data: ev, error: readErr } = await supabase
    .from('events')
    .select('starts_at, ends_at')
    .eq('id', idParsed.data)
    .single();
  if (readErr || !ev) return { ok: false as const, error: 'Event not found' };

  const deltaMs = minutes * 60_000;
  const { error } = await supabase
    .from('events')
    .update({
      starts_at: new Date(new Date(ev.starts_at).getTime() + deltaMs).toISOString(),
      ends_at: new Date(new Date(ev.ends_at).getTime() + deltaMs).toISOString(),
      status: 'delayed',
    })
    .eq('id', idParsed.data);

  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(idParsed.data);
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function setEventStatusAction(eventId: string, status: EventStatus) {
  await requireOrganiser();
  const idParsed = z.string().uuid().safeParse(eventId);
  const statusParsed = z.enum(EVENT_STATUSES).safeParse(status);
  if (!idParsed.success || !statusParsed.success) {
    return { ok: false as const, error: 'Invalid request' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .update({ status: statusParsed.data })
    .eq('id', idParsed.data);

  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(idParsed.data);
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function deleteEventAction(eventId: string) {
  await requireOrganiser();
  const idParsed = z.string().uuid().safeParse(eventId);
  if (!idParsed.success) return { ok: false as const, error: 'Invalid ID' };

  const supabase = await createClient();
  const { error } = await supabase.from('events').delete().eq('id', idParsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(idParsed.data);
  revalidatePath('/admin');
  return { ok: true as const };
}

const venueSchema = z.object({
  name: z.string().trim().min(1, 'Venue name required').max(80),
  description: z.string().trim().max(240).optional().nullable(),
  maps_url: z.string().trim().url().optional().or(z.literal('')).nullable(),
});

export async function createVenueAction(raw: z.infer<typeof venueSchema>) {
  await requireOrganiser();
  const parsed = venueSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid venue' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('venues').insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    maps_url: parsed.data.maps_url || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic();
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function deleteVenueAction(venueId: string) {
  await requireOrganiser();
  const idParsed = z.string().uuid().safeParse(venueId);
  if (!idParsed.success) return { ok: false as const, error: 'Invalid ID' };
  const supabase = await createClient();
  const { error } = await supabase.from('venues').delete().eq('id', idParsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic();
  revalidatePath('/admin');
  return { ok: true as const };
}

const announcementSchema = z.object({
  message: z.string().trim().min(1, 'Message required').max(280),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default('normal'),
  event_id: z.string().uuid().optional().or(z.literal('')).nullable(),
});

export async function createAnnouncementAction(
  raw: z.infer<typeof announcementSchema>
) {
  const profile = await requireOrganiser();
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid notice' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').insert({
    message: parsed.data.message,
    priority: parsed.data.priority,
    event_id: parsed.data.event_id || null,
    created_by: profile.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(parsed.data.event_id || undefined);
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function deleteAnnouncementAction(id: string) {
  await requireOrganiser();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false as const, error: 'Invalid ID' };
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic();
  revalidatePath('/admin');
  return { ok: true as const };
}

const resultSchema = z.object({
  event_id: z.string().uuid('Pick an event'),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
  is_live: z.boolean().default(false),
});

export async function createResultAction(raw: z.infer<typeof resultSchema>) {
  await requireOrganiser();
  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid result' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('results').insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(parsed.data.event_id);
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function deleteResultAction(id: string) {
  await requireOrganiser();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false as const, error: 'Invalid ID' };
  const supabase = await createClient();
  const { error } = await supabase.from('results').delete().eq('id', parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic();
  revalidatePath('/admin');
  return { ok: true as const };
}

const csvRowSchema = z.object({
  code: z.string().trim().min(1).max(24),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  category: z.enum(EVENT_CATEGORIES),
  venue: z.string().trim().max(80).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  registration_url: z.string().trim().url().optional().or(z.literal('')).default(''),
  contact_info: z.string().trim().max(120).optional().default(''),
  host_name: z.string().trim().max(80).optional().default(''),
  host_coordinator: z.string().trim().max(80).optional().default(''),
});

export async function importScheduleCsvAction(rows: z.infer<typeof csvRowSchema>[]) {
  await requireOrganiser();
  const parsed = z.array(csvRowSchema).min(1).max(200).safeParse(rows);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? 'Validation failed',
    };
  }

  const supabase = await createClient();
  const { data: existingVenues } = await supabase
    .from('venues')
    .select('id, name');
  const venueMap = new Map<string, string>(
    (existingVenues ?? []).map((v) => [v.name.toLowerCase(), v.id])
  );

  // Create any missing venues
  const missingVenueNames = Array.from(
    new Set(
      parsed.data
        .map((r) => r.venue.trim())
        .filter((v) => v.length > 0 && !venueMap.has(v.toLowerCase()))
    )
  );

  if (missingVenueNames.length > 0) {
    const { data: insertedVenues, error: vErr } = await supabase
      .from('venues')
      .insert(missingVenueNames.map((name) => ({ name })))
      .select('id, name');
    if (vErr) return { ok: false as const, error: vErr.message };
    for (const v of insertedVenues ?? []) {
      venueMap.set(v.name.toLowerCase(), v.id);
    }
  }

  const { data: existingEvents } = await supabase
    .from('events')
    .select('code');
  const existingCodes = new Set(
    (existingEvents ?? []).map((e) => e.code).filter(Boolean)
  );

  let created = 0;
  let updated = 0;

  const upsertRows = parsed.data.map((r) => {
    if (existingCodes.has(r.code)) updated++;
    else created++;

    const startsAt = istToUtc(r.date, r.start);
    let endsAt = istToUtc(r.date, r.end);
    if (endsAt <= startsAt) {
      endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      code: r.code,
      title: r.title,
      description: r.description || null,
      category: r.category,
      venue_id: r.venue ? (venueMap.get(r.venue.toLowerCase()) ?? null) : null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      registration_url: r.registration_url || null,
      contact_info: r.contact_info || null,
      host_name: r.host_name || null,
      host_coordinator: r.host_coordinator || null,
      is_published: true,
    };
  });

  const { error } = await supabase
    .from('events')
    .upsert(upsertRows, { onConflict: 'code' });

  if (error) return { ok: false as const, error: error.message };

  revalidatePublic();
  revalidatePath('/admin');
  return { ok: true as const, created, updated };
}

// ---------------------------------------------------------------- Voting admin actions

const pollSettingsSchema = z.object({
  event_id: z.string().uuid(),
  title: z.string().trim().min(1).max(80).default('Audience vote'),
  enabled: z.boolean(),
  results_visibility: z.enum(['live', 'after_close', 'hidden']),
  college_only: z.boolean(),
  require_code: z.boolean(),
});

export async function upsertPollAction(raw: z.infer<typeof pollSettingsSchema>) {
  await requireOrganiser();
  const parsed = pollSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid poll settings' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('polls')
    .upsert(
      {
        event_id: parsed.data.event_id,
        title: parsed.data.title,
        enabled: parsed.data.enabled,
        results_visibility: parsed.data.results_visibility as ResultsVisibility,
        college_only: parsed.data.college_only,
        require_code: parsed.data.require_code,
      },
      { onConflict: 'event_id' }
    )
    .select('id')
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(parsed.data.event_id);
  revalidatePath('/admin/voting');
  return { ok: true as const, pollId: data.id };
}

const contestantSchema = z.object({
  poll_id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Name required').max(80),
  subtitle: z.string().trim().max(80).optional().nullable(),
});

export async function addContestantAction(raw: z.infer<typeof contestantSchema>) {
  await requireOrganiser();
  const parsed = contestantSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid contestant' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('contestants').insert({
    poll_id: parsed.data.poll_id,
    name: parsed.data.name,
    subtitle: parsed.data.subtitle || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(parsed.data.event_id);
  revalidatePath('/admin/voting');
  return { ok: true as const };
}

export async function deleteContestantAction(contestantId: string, eventId: string) {
  await requireOrganiser();
  const idParsed = z.string().uuid().safeParse(contestantId);
  if (!idParsed.success) return { ok: false as const, error: 'Invalid ID' };
  const supabase = await createClient();
  const { error } = await supabase.from('contestants').delete().eq('id', idParsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePublic(eventId);
  revalidatePath('/admin/voting');
  return { ok: true as const };
}
