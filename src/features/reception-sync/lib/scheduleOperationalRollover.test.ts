import { describe, expect, it, vi } from 'vitest';
import {
  OPERATIONAL_ROLLOVER_JITTER_MAX_MS,
  randomOperationalRolloverJitterMs,
  scheduleNextRolloverAt,
} from './scheduleOperationalRollover';

describe('scheduleNextRolloverAt', () => {
  it('computes delay until endsAt plus jitter', () => {
    const now = new Date('2026-07-09T07:00:00.000Z');
    const endsAt = '2026-07-09T08:00:00.000Z';
    const jitterMs = 500;

    const schedule = scheduleNextRolloverAt(endsAt, now, jitterMs);

    expect(schedule).toEqual({
      delayMs: 3_600_000 + jitterMs,
      fireAtMs: Date.parse(endsAt) + jitterMs,
    });
  });

  it('returns zero delay when rollover time has passed', () => {
    const now = new Date('2026-07-09T09:00:00.000Z');
    const endsAt = '2026-07-09T08:00:00.000Z';

    const schedule = scheduleNextRolloverAt(endsAt, now, 250);

    expect(schedule?.delayMs).toBe(0);
    expect(schedule?.fireAtMs).toBe(Date.parse(endsAt) + 250);
  });

  it('returns null for invalid endsAt', () => {
    expect(scheduleNextRolloverAt('not-a-date', new Date(), 0)).toBeNull();
  });

  it('recalculates delay when endsAt changes', () => {
    const now = new Date('2026-07-09T07:30:00.000Z');
    const first = scheduleNextRolloverAt('2026-07-09T08:00:00.000Z', now, 0);
    const second = scheduleNextRolloverAt('2026-07-10T08:00:00.000Z', now, 0);

    expect(first?.delayMs).toBe(30 * 60 * 1000);
    expect(second?.delayMs).toBe(24.5 * 60 * 60 * 1000);
  });

  it('schedules refresh callback after computed delay (fake timer)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T07:00:00.000Z'));

    try {
      const refresh = vi.fn(async () => undefined);
      const schedule = scheduleNextRolloverAt('2026-07-09T08:00:00.000Z', new Date(), 0);
      expect(schedule?.delayMs).toBe(3_600_000);

      setTimeout(() => {
        void refresh();
      }, schedule!.delayMs);

      await vi.advanceTimersByTimeAsync(3_600_000 - 1);
      expect(refresh).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('randomOperationalRolloverJitterMs', () => {
  it('stays within 0–2s inclusive', () => {
    vi.useFakeTimers();
    try {
      expect(randomOperationalRolloverJitterMs(() => 0)).toBe(0);
      expect(randomOperationalRolloverJitterMs(() => 0.999999)).toBe(
        OPERATIONAL_ROLLOVER_JITTER_MAX_MS
      );
      expect(randomOperationalRolloverJitterMs(() => 0.5)).toBe(1000);
    } finally {
      vi.useRealTimers();
    }
  });
});
