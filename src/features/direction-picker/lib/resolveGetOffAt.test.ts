import { describe, expect, it } from 'vitest';
import type { RouteConfig } from '@/entities/hostel';
import { resolveGetOffAtEn, resolveGetOffAtForGuest } from './resolveGetOffAt';

const cityRoute = {
  id: 'airport',
  guestCopy: { publicGetOffAt: 'City square stop' },
  translationKeys: { publicGetOffAt: 'unused.getOff' },
} as unknown as RouteConfig;

describe('resolveGetOffAtEn', () => {
  it('uses tenant override when set', () => {
    expect(
      resolveGetOffAtEn({
        routeId: 'airport',
        cityGetOffEn: 'City square stop',
        arrivalGetOffAtByRoute: { airport: { en: 'Earlier side stop' } },
      })
    ).toBe('Earlier side stop');
  });

  it('falls back to city when override empty', () => {
    expect(
      resolveGetOffAtEn({
        routeId: 'airport',
        cityGetOffEn: 'City square stop',
        arrivalGetOffAtByRoute: {},
      })
    ).toBe('City square stop');
  });
});

describe('resolveGetOffAtForGuest', () => {
  it('prefers override over route guestCopy', () => {
    expect(
      resolveGetOffAtForGuest({
        route: cityRoute,
        routes: () => 'translated city',
        settings: { arrivalGetOffAtByRoute: { airport: { en: 'Hostel curb' } } },
        locale: 'en',
      })
    ).toBe('Hostel curb');
  });

  it('uses city copy when no override', () => {
    expect(
      resolveGetOffAtForGuest({
        route: cityRoute,
        routes: () => 'translated city',
        settings: {},
        locale: 'en',
      })
    ).toBe('City square stop');
  });
});
