import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatDay,
  formatHourLabel,
  formatRange,
  formatTime,
  formatTimeAgo,
  isLive,
  istToUtc,
  isUpNext,
  minutesUntil,
  toGoogleCalendarUtc,
  toIstDateKey,
  toIstHourKey,
} from './time';

describe('lib/time (Asia/Kolkata)', () => {
  it('formats time and day in IST regardless of UTC timestamps', () => {
    // 2026-11-25T11:00:00Z === 2026-11-25 16:30 IST (Wed)
    const utcTimestamp = '2026-11-25T11:00:00.000Z';
    expect(formatTime(utcTimestamp)).toBe('4:30 PM');
    expect(formatDay(utcTimestamp)).toBe('Wed, 25 Nov');
    expect(toIstDateKey(utcTimestamp)).toBe('2026-11-25');
  });

  it('handles UTC timestamps that fall on the next calendar day in IST', () => {
    // 2026-11-24T19:00:00Z === 2026-11-25 00:30 IST (Wed, 25 Nov)
    const afterUtcEvening = '2026-11-24T19:00:00.000Z';
    expect(toIstDateKey(afterUtcEvening)).toBe('2026-11-25');
    expect(formatDay(afterUtcEvening)).toBe('Wed, 25 Nov');
    expect(formatTime(afterUtcEvening)).toBe('12:30 AM');
  });

  it('converts IST date + 24h time to exact UTC instant', () => {
    const utc = istToUtc('2026-11-25', '16:30');
    expect(utc.toISOString()).toBe('2026-11-25T11:00:00.000Z');

    // Midnight IST (00:00 on 25 Nov IST === 18:30 on 24 Nov UTC)
    const midnightIst = istToUtc('2026-11-25', '00:00');
    expect(midnightIst.toISOString()).toBe('2026-11-24T18:30:00.000Z');
  });

  it('rejects malformed dateKey or timeHHMM in istToUtc', () => {
    expect(() => istToUtc('25-11-2026', '10:00')).toThrow();
    expect(() => istToUtc('2026-11-25', '25:00')).toThrow();
    expect(() => istToUtc('2026-11-25', '9:00')).toThrow();
  });

  it('handles an event crossing midnight IST accurately on a UTC server', () => {
    // Overnight hackathon sprint: 25 Nov 23:00 IST -> 26 Nov 01:30 IST
    const startsAt = istToUtc('2026-11-25', '23:00'); // 2026-11-25T17:30:00Z
    const endsAt = istToUtc('2026-11-26', '01:30'); // 2026-11-25T20:00:00Z
    const event = {
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'scheduled' as const,
    };

    expect(formatRange(event.starts_at, event.ends_at)).toBe(
      '11:00 PM – 1:30 AM'
    );
    expect(toIstDateKey(event.starts_at)).toBe('2026-11-25');
    expect(toIstDateKey(event.ends_at)).toBe('2026-11-26');

    // 25 Nov 22:59 IST -> not live yet, is up next
    const before = istToUtc('2026-11-25', '22:59');
    expect(isLive(event, before)).toBe(false);
    expect(isUpNext(event, before)).toBe(true);

    // Exactly 25 Nov 23:00 IST -> live
    expect(isLive(event, startsAt)).toBe(true);
    expect(isUpNext(event, startsAt)).toBe(false);

    // 26 Nov 00:15 IST (after midnight IST, still 25 Nov in UTC) -> live
    const afterMidnightIst = new Date('2026-11-25T18:45:00.000Z');
    expect(toIstDateKey(afterMidnightIst)).toBe('2026-11-26');
    expect(isLive(event, afterMidnightIst)).toBe(true);

    // Exactly 26 Nov 01:30 IST -> ends_at is exclusive, no longer live
    expect(isLive(event, endsAt)).toBe(false);
    expect(isUpNext(event, endsAt)).toBe(false);
  });

  it('treats cancelled and done events as neither live nor up next', () => {
    const startsAt = istToUtc('2026-11-25', '10:00').toISOString();
    const endsAt = istToUtc('2026-11-25', '12:00').toISOString();
    const during = istToUtc('2026-11-25', '11:00');
    const before = istToUtc('2026-11-25', '09:00');

    expect(isLive({ starts_at: startsAt, ends_at: endsAt, status: 'cancelled' }, during)).toBe(false);
    expect(isLive({ starts_at: startsAt, ends_at: endsAt, status: 'done' }, during)).toBe(false);
    expect(isLive({ starts_at: startsAt, ends_at: endsAt, status: 'delayed' }, during)).toBe(true);

    expect(isUpNext({ starts_at: startsAt, status: 'cancelled' }, before)).toBe(false);
    expect(isUpNext({ starts_at: startsAt, status: 'done' }, before)).toBe(false);
    expect(isUpNext({ starts_at: startsAt, status: 'delayed' }, before)).toBe(true);
  });

  it('computes minutesUntil accurately', () => {
    const now = new Date('2026-11-25T10:00:00.000Z');
    expect(minutesUntil('2026-11-25T10:25:00.000Z', now)).toBe(25);
    expect(minutesUntil('2026-11-25T10:00:30.000Z', now)).toBe(1);
    expect(minutesUntil('2026-11-25T10:00:00.000Z', now)).toBe(0);
    expect(minutesUntil('2026-11-25T09:50:00.000Z', now)).toBe(-10);
  });

  it('formats hour labels, Google Calendar UTC, countdowns, and time ago', () => {
    const ts = '2026-11-25T11:15:00.000Z'; // 16:45 IST
    expect(formatHourLabel(ts)).toBe('4:00 PM');
    expect(toIstHourKey(ts)).toBe('2026-11-25-16');
    expect(toGoogleCalendarUtc(ts)).toBe('20261125T111500Z');

    const now = new Date('2026-11-25T10:00:00.000Z');
    expect(formatCountdown('2026-11-25T10:25:00.000Z', now)).toBe('in 25 min');
    expect(formatCountdown('2026-11-25T12:15:00.000Z', now)).toBe('in 2h 15m');

    expect(formatTimeAgo('2026-11-25T09:59:30.000Z', now)).toBe('just now');
    expect(formatTimeAgo('2026-11-25T09:45:00.000Z', now)).toBe('15m ago');
    expect(formatTimeAgo('2026-11-25T07:00:00.000Z', now)).toBe('3h ago');
  });
});
