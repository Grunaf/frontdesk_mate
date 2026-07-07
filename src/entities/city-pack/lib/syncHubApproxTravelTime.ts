import type { CityPackRouteContent } from '../model/types';

export function resolveHubApproxTravelMinutes(route: CityPackRouteContent): number {
  const fromTransit = Math.max(0, Number(route.transit.durationMin) || 0);
  if (fromTransit > 0) {
    return fromTransit;
  }

  const { min, max } = route.taxi.durationMin;
  return Math.max(0, min, max);
}

export function applyHubApproxTravelMinutes(
  route: CityPackRouteContent,
  minutes: number
): CityPackRouteContent {
  const n = Math.max(0, Math.floor(Number(minutes)) || 0);

  return {
    ...route,
    transit: { ...route.transit, durationMin: n },
    taxi: { ...route.taxi, durationMin: { min: n, max: n } },
  };
}

/** Align transit duration and taxi backup duration chips to one approximate minute value. */
export function syncHubApproxTravelTime(route: CityPackRouteContent): CityPackRouteContent {
  return applyHubApproxTravelMinutes(route, resolveHubApproxTravelMinutes(route));
}
