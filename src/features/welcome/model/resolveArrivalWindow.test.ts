import { describe, expect, it } from 'vitest';
import { isWithinArrivalWindow, startOfLocalDay } from './resolveArrivalWindow';

describe('resolveArrivalWindow', () => {
  it('returns true on check-in day', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-10T20:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(true);
  });

  it('returns true on the day after check-in', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-11T09:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(true);
  });

  it('returns false before check-in day', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-09T20:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(false);
  });

  it('returns false two days after check-in', () => {
    const checkInAt = '2026-06-10T14:00:00.000Z';
    const now = new Date('2026-06-12T09:00:00.000Z');

    expect(isWithinArrivalWindow(checkInAt, now)).toBe(false);
  });

  it('normalizes to local day boundaries', () => {
    const day = startOfLocalDay(new Date('2026-06-10T23:59:00.000Z'));
    expect(day.getHours()).toBe(0);
    expect(day.getMinutes()).toBe(0);
  });
});
