import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { EventStatus } from './types';

export const IST_TIMEZONE = 'Asia/Kolkata';

function toDate(input: Date | string): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${String(input)}`);
  }
  return date;
}

/**
 * Formats a timestamp in Asia/Kolkata, e.g. "4:30 PM".
 */
export function formatTime(input: Date | string): string {
  return formatInTimeZone(toDate(input), IST_TIMEZONE, 'h:mm a');
}

/**
 * Formats a timestamp as a short day label in Asia/Kolkata, e.g. "Wed, 25 Nov".
 */
export function formatDay(input: Date | string): string {
  return formatInTimeZone(toDate(input), IST_TIMEZONE, 'EEE, d MMM');
}

/**
 * Formats an event's start–end time range in Asia/Kolkata, e.g. "4:30 PM – 6:00 PM".
 */
export function formatRange(
  startsAt: Date | string,
  endsAt: Date | string
): string {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

/**
 * Formats the hour bucket label in Asia/Kolkata, e.g. "4:00 PM".
 */
export function formatHourLabel(input: Date | string): string {
  return formatInTimeZone(toDate(input), IST_TIMEZONE, 'h:00 a');
}

/**
 * Returns a sortable hour bucket key in Asia/Kolkata, e.g. "2026-11-25-16".
 */
export function toIstHourKey(input: Date | string): string {
  return formatInTimeZone(toDate(input), IST_TIMEZONE, 'yyyy-MM-dd-HH');
}

/**
 * Formats a timestamp as a Google Calendar UTC string: YYYYMMDDTHHMMSSZ.
 */
export function toGoogleCalendarUtc(input: Date | string): string {
  return formatInTimeZone(toDate(input), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Formats a relative "time ago" label, falling back to an IST date/time for older timestamps.
 */
export function formatTimeAgo(
  input: Date | string,
  now: Date | string = new Date()
): string {
  const date = toDate(input);
  const nowDate = toDate(now);
  const diffSec = Math.floor((nowDate.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${formatDay(date)} · ${formatTime(date)}`;
}

/**
 * Formats a friendly countdown string like "in 25 min" or "in 2h 15m".
 */
export function formatCountdown(
  target: Date | string,
  now: Date | string = new Date()
): string {
  const mins = minutesUntil(target, now);
  if (mins <= 0) return 'starting now';
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) {
    return rem === 0 ? `in ${hours}h` : `in ${hours}h ${rem}m`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

/**
 * Returns a Date shifted into the Asia/Kolkata wall clock (for date-fns local helpers).
 */
export function toIstDate(input: Date | string): Date {
  return toZonedTime(toDate(input), IST_TIMEZONE);
}

/**
 * Returns the calendar date key "YYYY-MM-DD" in Asia/Kolkata.
 */
export function toIstDateKey(input: Date | string): string {
  return formatInTimeZone(toDate(input), IST_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Converts an Asia/Kolkata date ("YYYY-MM-DD") and 24-hour time ("HH:MM" or "HH:MM:SS")
 * to a UTC Date instance.
 */
export function istToUtc(dateKey: string, timeHHMM: string): Date {
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(timeHHMM);
  if (!dateMatch) {
    throw new Error(`Invalid IST dateKey "${dateKey}". Expected YYYY-MM-DD.`);
  }
  if (!timeMatch) {
    throw new Error(
      `Invalid IST time "${timeHHMM}". Expected 24-hour HH:MM (or HH:MM:SS).`
    );
  }
  const normalizedTime = timeHHMM.length === 5 ? `${timeHHMM}:00` : timeHHMM;
  const utcDate = fromZonedTime(`${dateKey}T${normalizedTime}`, IST_TIMEZONE);
  if (Number.isNaN(utcDate.getTime())) {
    throw new Error(`Invalid IST date/time "${dateKey} ${timeHHMM}".`);
  }
  return utcDate;
}

export interface TimeBoundedEvent {
  starts_at: Date | string;
  ends_at: Date | string;
  status?: EventStatus;
}

/**
 * True when starts_at <= now < ends_at and the event is neither cancelled nor done.
 */
export function isLive(
  event: TimeBoundedEvent,
  now: Date | string = new Date()
): boolean {
  if (event.status === 'cancelled' || event.status === 'done') {
    return false;
  }
  const nowMs = toDate(now).getTime();
  const startMs = toDate(event.starts_at).getTime();
  const endMs = toDate(event.ends_at).getTime();
  return startMs <= nowMs && nowMs < endMs;
}

/**
 * True when starts_at > now and the event is neither cancelled nor done.
 */
export function isUpNext(
  event: Pick<TimeBoundedEvent, 'starts_at' | 'status'>,
  now: Date | string = new Date()
): boolean {
  if (event.status === 'cancelled' || event.status === 'done') {
    return false;
  }
  const nowMs = toDate(now).getTime();
  const startMs = toDate(event.starts_at).getTime();
  return startMs > nowMs;
}

/**
 * Whole minutes from `now` until `target`.
 * Positive for future timestamps (rounded up so 30 s away reads as 1 min),
 * 0 when equal, negative for past timestamps.
 */
export function minutesUntil(
  target: Date | string,
  now: Date | string = new Date()
): number {
  const diffMs = toDate(target).getTime() - toDate(now).getTime();
  if (diffMs === 0) return 0;
  return diffMs > 0 ? Math.ceil(diffMs / 60_000) : Math.floor(diffMs / 60_000);
}
