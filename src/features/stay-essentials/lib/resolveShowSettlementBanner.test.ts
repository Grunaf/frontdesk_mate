import { describe, expect, it } from 'vitest';
import {
  isCheckInDayOrLater,
  resolveShowPreCheckInRegistrationBanner,
  resolveShowSettlementBanner,
} from './resolveShowSettlementBanner';

describe('isCheckInDayOrLater', () => {
  it('uses stay calendar night, not local instant day', () => {
    const checkInAt = '2026-07-10T22:22:00.000Z';
    expect(isCheckInDayOrLater(checkInAt, new Date('2026-07-09T23:00:00.000Z'))).toBe(false);
    expect(isCheckInDayOrLater(checkInAt, new Date('2026-07-10T12:00:00.000Z'))).toBe(true);
  });
});

describe('resolveShowPreCheckInRegistrationBanner', () => {
  it('shows before check-in calendar night', () => {
    expect(
      resolveShowPreCheckInRegistrationBanner({
        isRegistered: true,
        tenantSlug: 'demo',
        checkInAt: '2026-07-10T22:22:00.000Z',
        registrationComplete: false,
        now: new Date('2026-07-09T12:00:00.000Z'),
      })
    ).toBe(true);
  });

  it('hides on check-in calendar night', () => {
    expect(
      resolveShowPreCheckInRegistrationBanner({
        isRegistered: true,
        tenantSlug: 'demo',
        checkInAt: '2026-07-10T22:22:00.000Z',
        registrationComplete: false,
        now: new Date('2026-07-10T12:00:00.000Z'),
      })
    ).toBe(false);
  });
});

describe('resolveShowSettlementBanner', () => {
  it('shows on check-in calendar night when settlement not closed', () => {
    expect(
      resolveShowSettlementBanner({
        isRegistered: true,
        tenantSlug: 'demo',
        stayId: 'stay-1',
        checkInAt: '2026-07-10T22:22:00.000Z',
        settlementProgress: { essentialsDone: false, roomDone: false },
        now: new Date('2026-07-10T12:00:00.000Z'),
      })
    ).toBe(true);
  });
});
