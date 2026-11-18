import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { EventWithVenue } from '@/lib/data/events';
import type { Announcement, Result, Venue } from '@/lib/types';

export interface BundledScheduleSnapshot {
  generatedAt: string;
  source: string;
  events: EventWithVenue[];
  venues: Venue[];
  announcements: Announcement[];
  results: Result[];
}

export interface EmergencyOverlay {
  updatedAt: string;
  announcements: Announcement[];
  eventOverrides: Record<
    string,
    { status?: 'delayed' | 'cancelled' | 'scheduled'; note?: string }
  >;
  log: Array<{ at: string; action: string; detail: string }>;
}

const EMERGENCY_FILE = path.join('/tmp', 'fiesta26-emergency-overlay.json');

export function readBundledSchedule(): BundledScheduleSnapshot | null {
  try {
    const filePath = path.resolve(process.cwd(), 'public/schedule.json');
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as BundledScheduleSnapshot;
  } catch {
    return null;
  }
}

export function readEmergencyOverlay(): EmergencyOverlay {
  try {
    if (fs.existsSync(EMERGENCY_FILE)) {
      const raw = fs.readFileSync(EMERGENCY_FILE, 'utf8');
      return JSON.parse(raw) as EmergencyOverlay;
    }
  } catch {
    // Ignore read error
  }
  return {
    updatedAt: new Date(0).toISOString(),
    announcements: [],
    eventOverrides: {},
    log: [],
  };
}

export function writeEmergencyOverlay(next: EmergencyOverlay): void {
  fs.writeFileSync(EMERGENCY_FILE, JSON.stringify(next, null, 2), 'utf8');
}

export function getSnapshotAgeSeconds(): number | null {
  const snap = readBundledSchedule();
  if (!snap?.generatedAt) return null;
  const ageMs = Date.now() - new Date(snap.generatedAt).getTime();
  return Math.max(0, Math.round(ageMs / 1000));
}
