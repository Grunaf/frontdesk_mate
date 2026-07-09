import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPERATIONAL_DAY_START_TIME,
  isBeforeTodaysOperationalRollover,
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from './resolveOperationalDay';

describe('resolveOperationalDay', () => {
  const startTime = '08:00';

  it('uses 08:00 as default operational day start', () => {
    expect(DEFAULT_OPERATIONAL_DAY_START_TIME).toBe('08:00');
    expect(resolveOperationalDayStartTime(undefined)).toBe('08:00');
    expect(resolveOperationalDayStartTime({})).toBe('08:00');
    expect(resolveOperationalDayStartTime({ operationalDayStartTime: '06:30' })).toBe('06:30');
    expect(resolveOperationalDayStartTime({ operationalDayStartTime: 'invalid' })).toBe('08:00');
  });

  it('before 08:00 UTC belongs to previous operational calendar day', () => {
    const now = new Date('2026-07-09T07:59:00.000Z');
    const window = resolveOperationalDay(now, startTime);

    expect(window.operationalDate).toBe('2026-07-08');
    expect(window.startsAt.toISOString()).toBe('2026-07-08T08:00:00.000Z');
    expect(window.endsAt.toISOString()).toBe('2026-07-09T08:00:00.000Z');
    expect(isBeforeTodaysOperationalRollover(now, startTime)).toBe(true);
  });

  it('at 08:00 UTC starts the new operational day', () => {
    const now = new Date('2026-07-09T08:00:00.000Z');
    const window = resolveOperationalDay(now, startTime);

    expect(window.operationalDate).toBe('2026-07-09');
    expect(window.startsAt.toISOString()).toBe('2026-07-09T08:00:00.000Z');
    expect(window.endsAt.toISOString()).toBe('2026-07-10T08:00:00.000Z');
    expect(isBeforeTodaysOperationalRollover(now, startTime)).toBe(false);
  });

  it('after 08:00 UTC stays on current operational day', () => {
    const now = new Date('2026-07-09T15:30:00.000Z');
    const window = resolveOperationalDay(now, startTime);

    expect(window.operationalDate).toBe('2026-07-09');
    expect(isBeforeTodaysOperationalRollover(now, startTime)).toBe(false);
  });
});
