import { describe, expect, it } from 'vitest';
import {
  shouldShowPreTripCheckIn,
  shouldShowPreTripCityTax,
  shouldShowPreTripLuggage,
  shouldShowRoomDescription,
  shouldShowTimedGuestBanner,
} from './resolveGuestFieldPresentation';
import type { TenantSettings } from '../model/settings';

describe('resolveGuestFieldPresentation', () => {
  it('hides pre-trip rows when check-in is empty', () => {
    expect(shouldShowPreTripCheckIn({})).toBe(false);
    expect(shouldShowPreTripLuggage({})).toBe(false);
    expect(shouldShowPreTripCheckIn({ checkInTime: '14:00' })).toBe(true);
  });

  it('hides city tax row when no tax configured', () => {
    expect(shouldShowPreTripCityTax({})).toBe(false);
    expect(shouldShowPreTripCityTax({ cityTax: '2.50' })).toBe(true);
    expect(
      shouldShowPreTripCityTax({
        hostel: { cityTax: { amount: 1.5, currency: 'EUR' } },
      })
    ).toBe(true);
  });

  it('hides empty room descriptions', () => {
    expect(shouldShowRoomDescription('')).toBe(false);
    expect(shouldShowRoomDescription('  ')).toBe(false);
    expect(shouldShowRoomDescription('Shared dorm')).toBe(true);
  });

  it('hides timed banners without a time value', () => {
    expect(shouldShowTimedGuestBanner('')).toBe(false);
    expect(shouldShowTimedGuestBanner('23:00')).toBe(true);
  });
});
