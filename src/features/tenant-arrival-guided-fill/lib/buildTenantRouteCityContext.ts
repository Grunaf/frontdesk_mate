import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';

export function buildTenantRouteCityContext(
  cityRoute: CityPackRouteContent | undefined
): string | undefined {
  if (!cityRoute) {
    return undefined;
  }

  const parts: string[] = [];
  const getOff = resolveLocalizedText(cityRoute.copy.publicGetOffAt, 'en').trim();
  const summary = resolveLocalizedText(cityRoute.copy.publicSummary, 'en').trim();

  if (getOff) {
    parts.push(`Typical get-off: ${getOff}`);
  }
  if (summary) {
    parts.push(`City route summary: ${summary}`);
  }

  return parts.length > 0 ? parts.join('\n') : undefined;
}

export function buildTenantRouteCityContextForRouteId(
  cityRoutes: Partial<Record<RouteId, CityPackRouteContent>>,
  routeId: RouteId
): string | undefined {
  return buildTenantRouteCityContext(cityRoutes[routeId]);
}
