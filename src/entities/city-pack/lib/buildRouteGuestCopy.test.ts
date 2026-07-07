import { describe, expect, it } from 'vitest';
import { buildRouteGuestCopy } from './buildRouteGuestCopy';
import type { CityPackRouteContent } from '../model/types';

function minimalRoute(partial: Partial<CityPackRouteContent>): CityPackRouteContent {
  return {
    category: 'airport',
    locationLabel: { en: '' },
    copy: {
      publicTitle: { en: '' },
      publicSummary: { en: '' },
      publicPreview: { en: '' },
      publicText: { en: '' },
      publicGetOffAt: { en: '' },
      publicWalkToHostel: { en: '' },
      taxiCost: { en: '' },
      taxiPickupPoint: { en: '' },
    },
    transit: { durationMin: 0 },
    taxi: {
      priceKM: { min: 0, max: 0 },
      priceEUR: { min: 0, max: 0 },
      durationMin: { min: 0, max: 0 },
    },
    ...partial,
  };
}

describe('buildRouteGuestCopy', () => {
  it('uses taxiPickupPoint copy when set', () => {
    const guest = buildRouteGuestCopy(
      minimalRoute({
        copy: {
          ...minimalRoute({}).copy,
          taxiPickupPoint: { en: 'Arrivals taxi desk' },
        },
        locationLabel: { en: 'Tivat Airport' },
      }),
      'en'
    );
    expect(guest.taxiPickupPoint).toBe('Arrivals taxi desk');
  });

  it('falls back to locationLabel when pickup copy is empty', () => {
    const guest = buildRouteGuestCopy(
      minimalRoute({
        locationLabel: { en: 'Tivat Airport' },
      }),
      'en'
    );
    expect(guest.taxiPickupPoint).toBe('Tivat Airport');
  });
});
