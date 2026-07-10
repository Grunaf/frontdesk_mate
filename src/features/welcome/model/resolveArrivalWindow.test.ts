import { describe, expect, it } from 'vitest';
import { isWithinArrivalWindow } from './resolveArrivalWindow';

describe('resolveArrivalWindow', () => {
  it('returns true on check-in calendar day', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-10T20:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(true);
  });

  it('returns true on the calendar day after check-in', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-11T09:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(true);
  });

  it('returns false before check-in calendar day', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-09T20:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(false);
  });

  it('returns false two calendar days after check-in', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-12T09:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(false);
  });

  it('uses stay calendar night when check-in instant is late UTC', () => {
    const checkInAt = '2026-06-10T23:59:00.000Z';
    expect(isWithinArrivalWindow(checkInAt, new Date('2026-06-10T01:00:00.000Z'))).toBe(true);
    expect(isWithinArrivalWindow(checkInAt, new Date('2026-06-09T23:00:00.000Z'))).toBe(false);
  });
});
