import { describe, expect, it } from 'vitest';
import {
  buildWalkingMapsDestinationOnlyUrl,
  resolveWalkingMapsUrlFromSettings,
} from './buildWalkingMapsUrl';
import type { RouteConfig } from '@/entities/hostel';

describe('buildWalkingMapsDestinationOnlyUrl', () => {
  it('builds walking directions with destination only', () => {
    const url = buildWalkingMapsDestinationOnlyUrl('12 Main St, City');
    expect(url).toContain('travelmode=walking');
    expect(url).toContain('destination=12');
    expect(url).not.toContain('origin=');
  });

  it('returns undefined without destination', () => {
    expect(buildWalkingMapsDestinationOnlyUrl('  ')).toBeUndefined();
  });
});

describe('resolveWalkingMapsUrlFromSettings', () => {
  const walkOnlyRoute = {
    id: 'bus_central',
    routeMode: 'walk_only',
  } as RouteConfig;

  it('returns saved full Maps URL', () => {
    const saved =
      'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=Station&destination=Hostel';
    expect(
      resolveWalkingMapsUrlFromSettings(walkOnlyRoute, {
        arrivalWalkMapsUrlByRoute: { bus_central: saved },
      })
    ).toBe(saved);
  });

  it('does not invent a URL when unset', () => {
    expect(resolveWalkingMapsUrlFromSettings(walkOnlyRoute, {})).toBeUndefined();
  });

  it('returns Maps URL for tenant_local transit hubs', () => {
    const localRoute = {
      id: 'airport',
      routeMode: 'transit',
      hubArrivalKind: 'tenant_local',
    } as RouteConfig;
    const saved = 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=Hostel';
    expect(
      resolveWalkingMapsUrlFromSettings(localRoute, {
        arrivalWalkMapsUrlByRoute: { airport: saved },
      })
    ).toBe(saved);
  });

  it('hides Maps CTA for shared transit hubs', () => {
    const sharedTransit = {
      id: 'airport',
      routeMode: 'transit',
      hubArrivalKind: 'city_shared',
    } as RouteConfig;
    expect(
      resolveWalkingMapsUrlFromSettings(sharedTransit, {
        arrivalWalkMapsUrlByRoute: {
          airport: 'https://www.google.com/maps/dir/?api=1&destination=Hostel',
        },
      })
    ).toBeUndefined();
  });
});
