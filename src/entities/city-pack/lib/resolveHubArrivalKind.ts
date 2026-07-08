import type { CityPackRouteContent, HubArrivalKind } from '../model/types';

export function resolveHubArrivalKind(
  route: CityPackRouteContent | undefined | Pick<CityPackRouteContent, 'hubArrivalKind'>
): HubArrivalKind {
  return route?.hubArrivalKind === 'tenant_local' ? 'tenant_local' : 'city_shared';
}

export function isTenantLocalHub(
  route: CityPackRouteContent | undefined | Pick<CityPackRouteContent, 'hubArrivalKind'>
): boolean {
  return resolveHubArrivalKind(route) === 'tenant_local';
}
