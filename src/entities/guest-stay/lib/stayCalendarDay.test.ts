import { describe, expect, it } from 'vitest';
import {
  formatStayCalendarDayLabel,
  isStayCheckInCalendarDay,
  isStayCheckInCalendarDayOrLater,
  isWithinStayArrivalCalendarWindow,
  stayCalendarDay,
  todayStayCalendarDay,
} from './stayCalendarDay';

describe('stayCalendarDay', () => {
  it('reads calendar day from ISO Z timestamp', () => {
    expect(stayCalendarDay('2026-07-10T22:22:00.000Z')).toBe('2026-07-10');
  });

  it('reads calendar day from Postgres-style timestamp', () => {
    expect(stayCalendarDay('2026-07-10 22:22:00+00')).toBe('2026-07-10');
  });

  it('returns null for invalid input', () => {
    expect(stayCalendarDay('')).toBeNull();
    expect(stayCalendarDay('bad')).toBeNull();
  });
});


describe('isStayCheckInCalendarDayOrLater', () => {
  const checkInAt = '2026-07-10T22:22:00.000Z';

  it('is false before check-in calendar day', () => {
    expect(isStayCheckInCalendarDayOrLater(checkInAt, new Date('2026-07-09T23:00:00.000Z'))).toBe(false);
  });

  it('is true on check-in calendar day despite late instant', () => {
    expect(isStayCheckInCalendarDayOrLater(checkInAt, new Date('2026-07-10T12:00:00.000Z'))).toBe(true);
  });

  it('is true after check-in calendar day', () => {
    expect(isStayCheckInCalendarDayOrLater(checkInAt, new Date('2026-07-11T00:00:00.000Z'))).toBe(true);
  });
});

describe('isWithinStayArrivalCalendarWindow', () => {
  const checkInAt = '2026-07-10T14:00:00.000Z';

  it('includes check-in day and the next calendar day', () => {
    expect(isWithinStayArrivalCalendarWindow(checkInAt, new Date('2026-07-10T20:00:00.000Z'))).toBe(true);
    expect(isWithinStayArrivalCalendarWindow(checkInAt, new Date('2026-07-11T09:00:00.000Z'))).toBe(true);
  });

  it('excludes day before and two days after', () => {
    expect(isWithinStayArrivalCalendarWindow(checkInAt, new Date('2026-07-09T20:00:00.000Z'))).toBe(false);
    expect(isWithinStayArrivalCalendarWindow(checkInAt, new Date('2026-07-12T09:00:00.000Z'))).toBe(false);
  });
});

describe('isStayCheckInCalendarDay', () => {
  it('matches UTC calendar day only', () => {
    const checkInAt = '2026-07-10T22:22:00.000Z';
    expect(isStayCheckInCalendarDay(checkInAt, new Date('2026-07-10T01:00:00.000Z'))).toBe(true);
    expect(isStayCheckInCalendarDay(checkInAt, new Date('2026-07-11T01:00:00.000Z'))).toBe(false);
  });
});

describe('formatStayCalendarDayLabel', () => {
  it('formats from calendar prefix not local instant', () => {
    expect(formatStayCalendarDayLabel('2026-07-10T22:22:00.000Z', 'en')).toBe('Jul 10');
  });

  it('formats checkout at end-of-day UTC without next-day shift', () => {
    expect(formatStayCalendarDayLabel('2026-07-11T23:59:59.999Z', 'en')).toBe('Jul 11');
  });
});

describe('todayStayCalendarDay', () => {
  it('uses UTC date line', () => {
    expect(todayStayCalendarDay(new Date('2026-07-10T23:30:00.000Z'))).toBe('2026-07-10');
    expect(todayStayCalendarDay(new Date('2026-07-11T00:30:00.000Z'))).toBe('2026-07-11');
  });
});
