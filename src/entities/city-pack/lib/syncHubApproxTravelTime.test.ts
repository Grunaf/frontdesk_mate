import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from './resolveAdminCityPackTransport';
import {
  applyHubApproxTravelMinutes,
  resolveHubApproxTravelMinutes,
  syncHubApproxTravelTime,
} from './syncHubApproxTravelTime';

describe('syncHubApproxTravelTime', () => {
  it('apply sets transit and taxi duration to the same value', () => {
    const route = createBlankCityPackRouteContent('airport');
    const next = applyHubApproxTravelMinutes(route, 22);

    expect(next.transit.durationMin).toBe(22);
    expect(next.taxi.durationMin).toEqual({ min: 22, max: 22 });
  });

  it('resolve prefers transit when set', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.transit.durationMin = 15;
    route.taxi.durationMin = { min: 5, max: 30 };

    expect(resolveHubApproxTravelMinutes(route)).toBe(15);
  });

  it('sync promotes taxi range when transit is zero', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.taxi.durationMin = { min: 8, max: 18 };

    const next = syncHubApproxTravelTime(route);

    expect(next.transit.durationMin).toBe(18);
    expect(next.taxi.durationMin).toEqual({ min: 18, max: 18 });
  });
});
