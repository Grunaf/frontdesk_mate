import type { CityPackId, RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '../model/types';
import { ROUTE_PRESETS } from './constants';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
} from './resolveAdminCityPackTransport';
import { isLocalizedFilled } from './resolveLocalizedLocaleStatus';

export interface CityPackTransportReadinessResult {
  ready: boolean;
  detail?: string;
  missingRouteLabels?: string[];
}

function isRouteGuestReadyEn(route: CityPackRouteContent | undefined): boolean {
  if (!route) {
    return false;
  }

  const { copy, locationLabel } = route;

  return (
    isLocalizedFilled(locationLabel, 'en') &&
    isLocalizedFilled(copy.publicTitle, 'en') &&
    isLocalizedFilled(copy.publicSummary, 'en') &&
    isLocalizedFilled(copy.publicText, 'en') &&
    isLocalizedFilled(copy.publicGetOffAt, 'en')
  );
}

function routeLabel(routeId: RouteId): string {
  return ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId;
}

export function resolveCityPackTransportReadiness(input: {
  packId: CityPackId | string;
  content?: CityPackContent;
}): CityPackTransportReadinessResult {
  const packId = input.packId as CityPackId;
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(packId, input.content);

  if (enabledRoutes.length === 0) {
    return {
      ready: false,
      detail: 'City pack has no arrival routes enabled.',
      missingRouteLabels: [],
    };
  }

  const routes = resolveAdminCityPackRoutes(packId, input.content);
  const missingRouteLabels: string[] = [];

  for (const routeId of enabledRoutes) {
    if (!isRouteGuestReadyEn(routes[routeId])) {
      missingRouteLabels.push(routeLabel(routeId));
    }
  }

  if (missingRouteLabels.length === 0) {
    return { ready: true, missingRouteLabels: [] };
  }

  return {
    ready: false,
    missingRouteLabels,
    detail: `Fill route content for: ${missingRouteLabels.join(', ')}`,
  };
}

/** @deprecated Use resolveCityPackTransportReadiness — kept as alias for routes gate naming. */
export function hasRouteContentGate(input: {
  packId: CityPackId | string;
  content?: CityPackContent;
}): boolean {
  return resolveCityPackTransportReadiness(input).ready;
}
