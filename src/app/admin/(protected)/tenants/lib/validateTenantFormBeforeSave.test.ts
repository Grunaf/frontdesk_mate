import { describe, expect, it } from 'vitest';
import {
  findGuestExtrasMissingPriceLabel,
  validateTenantFormBeforeSave,
} from './validateTenantFormBeforeSave';

describe('validateTenantFormBeforeSave', () => {
  it('blocks save when subscription dates are missing', () => {
    expect(
      validateTenantFormBeforeSave({
        subscriptionStartsAt: '',
        subscriptionEndsAt: '2026-12-31',
        mergedSettings: {},
      })
    ).toEqual({
      code: 'subscription_dates',
      message: 'Set subscription start and end dates in step 1 before saving.',
    });
  });

  it('blocks save when enabled extras lack price label', () => {
    expect(
      validateTenantFormBeforeSave({
        subscriptionStartsAt: '2026-01-01',
        subscriptionEndsAt: '2026-12-31',
        mergedSettings: {
          guestExtras: [
            { presetId: 'laundry', enabled: true, priceLabel: '30€' },
            { presetId: 'late_checkout', enabled: true },
          ],
        },
      })
    ).toEqual({
      code: 'guest_extra_price',
      message: 'Fill price label for 1 enabled extra (Guest app → Extras).',
    });
  });

  it('allows save when draft is valid', () => {
    expect(
      validateTenantFormBeforeSave({
        subscriptionStartsAt: '2026-01-01',
        subscriptionEndsAt: '2026-12-31',
        mergedSettings: {
          guestExtras: [{ presetId: 'laundry', enabled: false }],
        },
      })
    ).toBeNull();
  });
});

describe('findGuestExtrasMissingPriceLabel', () => {
  it('ignores disabled extras and whitespace-only prices', () => {
    expect(
      findGuestExtrasMissingPriceLabel([
        { presetId: 'laundry', enabled: false },
        { presetId: 'early_checkin', enabled: true, priceLabel: '  ' },
        { presetId: 'late_checkout', enabled: true, priceLabel: '15€' },
      ])
    ).toEqual([{ presetId: 'early_checkin', enabled: true, priceLabel: '  ' }]);
  });
});
