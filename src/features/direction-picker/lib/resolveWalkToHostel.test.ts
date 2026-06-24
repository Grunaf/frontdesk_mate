import { describe, expect, it } from 'vitest';
import type { RouteConfig } from '@/entities/hostel';
import { buildCityPackRoutesFromCode } from '@/entities/city-pack/lib/buildCityPackRouteContentFromCode';
import { resolveCityPackForGuest } from '@/entities/city-pack/lib/resolveCityPackForGuest';
import { resolveWalkToHostelText } from './resolveWalkToHostel';

function sarajevoAirportRoute(): RouteConfig {
  const content = buildCityPackRoutesFromCode('sarajevo').airport!;
  const pack = resolveCityPackForGuest({
    packId: 'sarajevo',
    locale: 'en',
    packStatus: 'ready',
    enabledRoutes: ['airport'],
    content: { routes: { airport: content } },
  });
  return pack.routes.airport!;
}

describe('resolveWalkToHostelText', () => {
  const routes = (key: string, values?: Record<string, string>) =>
    `${key}:${values?.address ?? ''}`;

  it('uses tenant per-route override', () => {
    const route = sarajevoAirportRoute();
    const text = resolveWalkToHostelText({
      route,
      routes,
      settings: { arrivalWalkToHostelByRoute: { airport: 'Use side entrance' } },
      address: 'Test 1',
      locale: 'en',
    });

    expect(text).toBe('Use side entrance');
  });

  it('uses city guestCopy with address substitution', () => {
    const route = sarajevoAirportRoute();
    const text = resolveWalkToHostelText({
      route,
      routes,
      settings: {},
      address: 'Dalmatinska 6',
      locale: 'en',
    });

    expect(text).toContain('Dalmatinska');
  });
});
