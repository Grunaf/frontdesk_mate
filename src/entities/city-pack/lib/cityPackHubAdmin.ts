import type { RouteCategory, RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '../model/types';
import { ROUTE_PRESETS } from './constants';
import { ensureCityPackRouteContent } from './resolveAdminCityPackTransport';

export const CITY_PACK_HUB_SLOT_ORDER: RouteId[] = [
  'airport',
  'bus_central',
  'bus_istochno',
  'train_station',
];

const SLOTS_BY_CATEGORY: Record<RouteCategory, RouteId[]> = {
  airport: ['airport'],
  bus: ['bus_central', 'bus_istochno'],
  train: ['train_station'],
};

export const CITY_PACK_HUB_TYPE_OPTIONS: { category: RouteCategory; label: string }[] = [
  { category: 'airport', label: 'Airport' },
  { category: 'bus', label: 'Bus station' },
  { category: 'train', label: 'Train station' },
];

export function listAdminCityPackHubRouteIds(
  routes: Partial<Record<RouteId, CityPackRouteContent>>
): RouteId[] {
  return CITY_PACK_HUB_SLOT_ORDER.filter((id) => routes[id] != null);
}

export function resolveNextCityPackHubSlot(
  category: RouteCategory,
  routes: Partial<Record<RouteId, CityPackRouteContent>>
): RouteId | null {
  for (const slot of SLOTS_BY_CATEGORY[category]) {
    if (routes[slot] == null) {
      return slot;
    }
  }
  return null;
}

export function canAddCityPackHub(
  category: RouteCategory,
  routes: Partial<Record<RouteId, CityPackRouteContent>>
): boolean {
  return resolveNextCityPackHubSlot(category, routes) != null;
}

export function applyCityPackHubDisplayName(
  route: CityPackRouteContent,
  displayNameEn: string
): CityPackRouteContent {
  const name = displayNameEn.trim();
  if (!name) {
    return route;
  }

  return {
    ...route,
    locationLabel: { ...route.locationLabel, en: name },
  };
}

export function resolveCityPackHubAdminLabel(
  routeId: RouteId,
  route: CityPackRouteContent | undefined
): string {
  const fromRoute =
    route?.locationLabel?.en?.trim() || route?.copy?.publicTitle?.en?.trim();
  if (fromRoute) {
    return fromRoute;
  }

  return ROUTE_PRESETS.find((preset) => preset.id === routeId)?.label ?? routeId;
}

export function countOfferedCityPackBusHubs(
  enabledRoutes: RouteId[],
  routes: Partial<Record<RouteId, CityPackRouteContent>>
): number {
  return enabledRoutes.filter((routeId) => routes[routeId]?.category === 'bus').length;
}

export function addCityPackArrivalHub(input: {
  packId: string;
  category: RouteCategory;
  displayNameEn: string;
  enabledRoutes: RouteId[];
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  content?: CityPackContent;
}):
  | {
      ok: true;
      routeId: RouteId;
      routes: Partial<Record<RouteId, CityPackRouteContent>>;
      enabledRoutes: RouteId[];
    }
  | { ok: false; reason: 'invalid_name' | 'no_slot' } {
  const name = input.displayNameEn.trim();
  if (name.length < 2) {
    return { ok: false, reason: 'invalid_name' };
  }

  const routeId = resolveNextCityPackHubSlot(input.category, input.routes);
  if (!routeId) {
    return { ok: false, reason: 'no_slot' };
  }

  let body = ensureCityPackRouteContent(input.packId, routeId, undefined, input.content);
  body = applyCityPackHubDisplayName(body, name);

  const routes = { ...input.routes, [routeId]: body };
  const enabledRoutes = input.enabledRoutes.includes(routeId)
    ? input.enabledRoutes
    : [...input.enabledRoutes, routeId];

  return { ok: true, routeId, routes, enabledRoutes };
}
