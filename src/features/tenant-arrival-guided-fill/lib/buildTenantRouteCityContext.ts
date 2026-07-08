import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';

export function buildTenantRouteCityContext(
  cityRoute: CityPackRouteContent | undefined,
  options?: { getOffOverrideEn?: string }
): string | undefined {
  if (!cityRoute) {
    return undefined;
  }

  const parts: string[] = [];
  const cityGetOff = resolveLocalizedText(cityRoute.copy.publicGetOffAt, 'en').trim();
  const getOff = options?.getOffOverrideEn?.trim() || cityGetOff;
  const summary = resolveLocalizedText(cityRoute.copy.publicSummary, 'en').trim();

  if (getOff) {
    parts.push(
      options?.getOffOverrideEn?.trim()
        ? `Hostel get-off override: ${getOff}`
        : `Typical get-off: ${getOff}`
    );
  }
  if (summary) {
    parts.push(`City route summary: ${summary}`);
  }

  return parts.length > 0 ? parts.join('\n') : undefined;
}

export function buildTenantRouteCityContextForRouteId(
  cityRoutes: Partial<Record<RouteId, CityPackRouteContent>>,
  routeId: RouteId,
  options?: { getOffOverrideEn?: string }
): string | undefined {
  return buildTenantRouteCityContext(cityRoutes[routeId], options);
}
