import { normalizeEnabledRoutes } from './resolveCityPackGate';
import {
  buildCityPackRoutesFromCode,
  isCodeCityPackRouteSeedAvailable,
} from './buildCityPackRouteContentFromCode';
import type { CityPackId, RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '../model/types';
import { resolveLocalizedText, toLocalizedText, type LocalizedText } from '../model/localized';

export function resolveAdminCityPackRoutes(
  packId: CityPackId,
  content?: CityPackContent
): Partial<Record<RouteId, CityPackRouteContent>> {
  const dbRoutes = content?.routes;
  if (dbRoutes && Object.keys(dbRoutes).length > 0) {
    return dbRoutes;
  }

  if (isCodeCityPackRouteSeedAvailable(packId)) {
    return buildCityPackRoutesFromCode(packId);
  }

  return {};
}

export function resolveAdminCityPackEnabledRoutes(
  packId: CityPackId,
  content?: CityPackContent
): RouteId[] {
  const enabled = normalizeEnabledRoutes(content?.enabledRoutes ?? []);
  if (enabled.length > 0) {
    return enabled;
  }

  const routes = resolveAdminCityPackRoutes(packId, content);
  return Object.keys(routes) as RouteId[];
}

export function resolveCityDefaultWalkLabel(
  routes: Partial<Record<RouteId, CityPackRouteContent>>,
  routeId: RouteId,
  locale: 'en' | 'ru' = 'en'
): string | undefined {
  const walk = routes[routeId]?.copy.publicWalkToHostel;
  if (!walk) {
    return undefined;
  }

  const text = resolveLocalizedText(walk, locale).trim();
  return text || undefined;
}

export function readLocalizedFormValue(
  en?: string,
  ru?: string
): LocalizedText | undefined {
  return toLocalizedText({ en: en ?? '', ru });
}
