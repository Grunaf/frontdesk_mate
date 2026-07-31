import { describe, expect, it } from 'vitest';
import {
  isBedReadyForGuestVisibility,
  resolveIsBedVisible,
  resolveIsStayAdmitted,
  resolveShowUnlockBedAction,
} from './resolveBedVisible';

describe('resolveIsStayAdmitted', () => {
  it('uses desk check-in only', () => {
    expect(resolveIsStayAdmitted({})).toBe(false);
    expect(resolveIsStayAdmitted({ desk_checked_in_at: '2026-07-01T12:00:00.000Z' })).toBe(true);
    expect(resolveIsStayAdmitted({ passport_checked_at: '2026-07-01T12:00:00.000Z' })).toBe(false);
  });
});

describe('isBedReadyForGuestVisibility', () => {
  it('requires explicit ready', () => {
    expect(isBedReadyForGuestVisibility(undefined)).toBe(false);
    expect(isBedReadyForGuestVisibility('needs_strip')).toBe(false);
    expect(isBedReadyForGuestVisibility('stripped')).toBe(false);
    expect(isBedReadyForGuestVisibility('ready')).toBe(true);
  });
});

describe('resolveIsBedVisible', () => {
  const base = {
    check_in_at: '2026-07-30T14:00:00.000Z',
    check_in_date: '2026-07-30',
    propertyTimeZone: 'UTC',
    checkInTimeFallback: '14:00',
  };

  it('hides when bed not ready even after unlock', () => {
    expect(
      resolveIsBedVisible({
        ...base,
        bedStatus: 'stripped',
        bed_unlocked_at: '2026-07-30T10:00:00.000Z',
        now: new Date('2026-07-30T15:00:00.000Z'),
      })
    ).toBe(false);
  });

  it('shows after check-in time when ready', () => {
    expect(
      resolveIsBedVisible({
        ...base,
        bedStatus: 'ready',
        now: new Date('2026-07-30T14:00:00.000Z'),
      })
    ).toBe(true);
  });

  it('shows early when unlocked and ready', () => {
    expect(
      resolveIsBedVisible({
        ...base,
        bedStatus: 'ready',
        bed_unlocked_at: '2026-07-30T10:00:00.000Z',
        now: new Date('2026-07-30T10:30:00.000Z'),
      })
    ).toBe(true);
  });

  it('hides before check-in time without unlock', () => {
    expect(
      resolveIsBedVisible({
        ...base,
        bedStatus: 'ready',
        now: new Date('2026-07-30T10:00:00.000Z'),
      })
    ).toBe(false);
  });
});

describe('resolveShowUnlockBedAction', () => {
  it('shows only before check-in when not unlocked', () => {
    expect(
      resolveShowUnlockBedAction({
        stayEnded: false,
        stay: {
          check_in_at: '2026-07-30T14:00:00.000Z',
          check_in_date: '2026-07-30',
        },
        propertyTimeZone: 'UTC',
        checkInTimeFallback: '14:00',
        now: new Date('2026-07-30T10:00:00.000Z'),
      })
    ).toBe(true);

    expect(
      resolveShowUnlockBedAction({
        stayEnded: false,
        stay: {
          check_in_at: '2026-07-30T14:00:00.000Z',
          check_in_date: '2026-07-30',
          bed_unlocked_at: '2026-07-30T09:00:00.000Z',
        },
        propertyTimeZone: 'UTC',
        checkInTimeFallback: '14:00',
        now: new Date('2026-07-30T10:00:00.000Z'),
      })
    ).toBe(false);
  });
});
