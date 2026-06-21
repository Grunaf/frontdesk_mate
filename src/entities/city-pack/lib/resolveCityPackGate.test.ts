import { describe, expect, it } from 'vitest';
import { MIN_PLACES_FOR_PACK } from './constants';
import {
  countGatePlaces,
  hasRouteGate,
  isPackReadyForTenants,
  resolveHasPlacesPack,
  resolvePackNotReadyReason,
} from './resolveCityPackGate';

describe('city pack gate', () => {
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

  it('requires enabledRoutes in DB content', () => {
    expect(hasRouteGate({ places: [] })).toBe(false);
    expect(hasRouteGate({ places: [], enabledRoutes: ['airport'] })).toBe(true);
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
