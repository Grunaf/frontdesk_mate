import { describe, expect, it } from 'vitest';
import { MIN_PLACES_FOR_PACK } from './constants';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import {
  countGatePlaces,
  hasRouteGate,
  isPackReadyForTenants,
  resolveHasPlacesPack,
  resolvePackNotReadyReason,
} from './resolveCityPackGate';

describe('city pack gate', () => {
  it('requires ready status, minimum places, and route content', () => {
    const sarajevoRoutes = buildCityPackRoutesFromCode('sarajevo');
    const content = {
      places: Array.from({ length: MIN_PLACES_FOR_PACK }, (_, index) => ({
        id: `p-${index}`,
        name: `Place ${index}`,
        category: 'restaurants' as const,
      })),
      enabledRoutes: ['airport' as const],
      routes: { airport: sarajevoRoutes.airport },
    };

    expect(
      resolveHasPlacesPack({
        status: 'draft',
        content,
        packId: 'sarajevo',
      })
    ).toBe(false);

    expect(
      resolveHasPlacesPack({
        status: 'ready',
        content,
        packId: 'sarajevo',
      })
    ).toBe(true);
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
          { id: '2', name: ' ', category: 'restaurants' },
        ],
      })
    ).toBe(1);
  });

  it('requires route content for enabled routes', () => {
    expect(hasRouteGate({ places: [] }, 'tivat')).toBe(false);
    expect(
      hasRouteGate({ places: [], enabledRoutes: ['airport'] }, 'tivat')
    ).toBe(false);

    const routes = buildCityPackRoutesFromCode('sarajevo');
    expect(
      hasRouteGate(
        { places: [], enabledRoutes: ['airport'], routes: { airport: routes.airport } },
        'sarajevo'
      )
    ).toBe(true);
  });

  it('marks pack ready only when places and routes gates pass', () => {
    expect(
      isPackReadyForTenants({
        status: 'ready',
        content: {
          places: [{ id: '1', name: 'One', category: 'restaurants' }],
          enabledRoutes: ['airport'],
        },
        packId: 'tivat',
      })
    ).toBe(false);
  });
});
