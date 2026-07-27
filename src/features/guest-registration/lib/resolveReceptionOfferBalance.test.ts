import { describe, expect, it } from 'vitest';
import type { TenantSettings } from '@/entities/tenant';
import { resolveReceptionOfferBalance } from './resolveReceptionOfferBalance';

const settings = {
  currency: { primary: 'EUR' },
} as TenantSettings;

describe('resolveReceptionOfferBalance', () => {
  it('prefills unit × nights × guests for bed offers', () => {
    expect(
      resolveReceptionOfferBalance({
        settings,
        offer: { basePriceEur: 20 },
        checkInDate: '2026-07-27',
        checkOutDate: '2026-07-29',
        guestCount: 2,
      })
    ).toBe('80.00');
  });

  it('prefills unit × nights for room offers (formula A, ignores guest multiplier)', () => {
    expect(
      resolveReceptionOfferBalance({
        settings,
        offer: { basePriceEur: 55, bookingUnit: 'room' },
        checkInDate: '2026-07-27',
        checkOutDate: '2026-07-29',
        guestCount: 2,
      })
    ).toBe('110.00');
  });

  it('returns null when offer has no base price', () => {
    expect(
      resolveReceptionOfferBalance({
        settings,
        offer: {},
        checkInDate: '2026-07-27',
        checkOutDate: '2026-07-29',
        guestCount: 2,
      })
    ).toBeNull();
  });

  it('returns null for invalid nights or guest count', () => {
    expect(
      resolveReceptionOfferBalance({
        settings,
        offer: { basePriceEur: 20 },
        checkInDate: '2026-07-29',
        checkOutDate: '2026-07-27',
        guestCount: 2,
      })
    ).toBeNull();
    expect(
      resolveReceptionOfferBalance({
        settings,
        offer: { basePriceEur: 20 },
        checkInDate: '2026-07-27',
        checkOutDate: '2026-07-29',
        guestCount: 0,
      })
    ).toBeNull();
  });
});
