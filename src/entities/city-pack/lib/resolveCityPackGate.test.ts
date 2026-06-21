import { describe, expect, it, beforeEach } from 'vitest';
import { MIN_PLACES_FOR_PACK } from './constants';
import {
  countGatePlaces,
  hasRouteGate,
  isPackReadyForTenants,
  resolveHasPlacesPack,
  resolvePackNotReadyReason,
} from './resolveCityPackGate';
import {
  clearCityPackRegistry,
  resolveHasPlacesPackFromRegistry,
  setCityPackRegistry,
} from './packRegistry';

describe('city pack gate', () => {
  beforeEach(() => {
    clearCityPackRegistry();
  });

  it('requires ready status and minimum places', () => {
    const content = {
      places: Array.from({ length: MIN_PLACES_FOR_PACK }, (_, index) => ({
        id: `p-${index}`,
        name: `Place ${index}`,
        category: 'food' as const,
      })),
      enabledRoutes: ['airport' as const],
    };

    expect(
      resolveHasPlacesPack({
        status: 'draft',
        content,
        packId: 'kotor',
      })
    ).toBe(false);

    expect(
      resolveHasPlacesPack({
        status: 'ready',
        content,
        packId: 'kotor',
      })
    ).toBe(true);
  });

  it('uses registry for tenant readiness when loaded', () => {
    setCityPackRegistry([
      {
        id: 'sarajevo',
        label: 'Sarajevo',
        status: 'ready',
        placesCount: 12,
        routesGateMet: true,
        readyForTenants: true,
        notReadyReason: null,
      },
      {
        id: 'kotor',
        label: 'Kotor',
        status: 'draft',
        placesCount: 2,
        routesGateMet: false,
        readyForTenants: false,
        notReadyReason: 'City pack is still draft — publish it in City packs admin.',
      },
    ]);

    expect(resolveHasPlacesPackFromRegistry('sarajevo')).toBe(true);
    expect(resolveHasPlacesPackFromRegistry('kotor')).toBe(false);
  });

  it('explains why a pack is not ready', () => {
    expect(
      resolvePackNotReadyReason({
        status: 'ready',
        content: { places: [], enabledRoutes: ['airport'] },
        packId: 'demo',
      })
    ).toContain('5 places');
  });

  it('counts only named places with category', () => {
    expect(
      countGatePlaces({
        places: [
          { id: '1', name: 'ATM', category: 'essential' },
          { id: '2', name: ' ', category: 'food' },
        ],
      })
    ).toBe(1);
  });

  it('accepts code routes for known packs when enabledRoutes empty', () => {
    expect(
      hasRouteGate({ places: [] }, 'sarajevo')
    ).toBe(true);
  });

  it('marks pack ready only when places and routes gates pass', () => {
    expect(
      isPackReadyForTenants({
        status: 'ready',
        content: {
          places: [{ id: '1', name: 'One', category: 'food' }],
          enabledRoutes: ['airport'],
        },
        packId: 'demo',
      })
    ).toBe(false);
  });
});
