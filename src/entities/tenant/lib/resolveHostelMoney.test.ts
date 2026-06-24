import { describe, expect, it } from 'vitest';
import { resolveCityTaxAmount, resolveCityTaxDisplay, resolveTenantCurrency, formatLandingRoomPrice } from './resolveHostelMoney';
import type { TenantSettings } from '../model/settings';

describe('resolveHostelMoney', () => {
  it('reads structured city tax from hostel settings', () => {
    const settings: TenantSettings = {
      hostel: {
        currency: { primary: 'EUR', displayMode: 'primary' },
        cityTax: { amount: 1.5, currency: 'EUR' },
      },
    };

    expect(resolveCityTaxAmount(settings)).toEqual({ amount: 1.5, currency: 'EUR' });
    expect(resolveCityTaxDisplay(settings, 'en')).toContain('1.5');
  });

  it('migrates legacy city tax string', () => {
    const settings: TenantSettings = {
      cityTax: '2.50 KM',
    };

    expect(resolveCityTaxAmount(settings)).toEqual({ amount: 2.5, currency: 'BAM' });
    expect(resolveTenantCurrency(settings).primary).toBe('BAM');
  });

  it('defaults primary currency to EUR', () => {
    expect(resolveTenantCurrency({}).primary).toBe('EUR');
  });

  it('formats landing room price in tenant currency', () => {
    expect(formatLandingRoomPrice({ hostel: { currency: { primary: 'BAM' } } }, 25)).toBe('25.00 KM');
    expect(formatLandingRoomPrice({}, undefined)).toBeNull();
  });
});
