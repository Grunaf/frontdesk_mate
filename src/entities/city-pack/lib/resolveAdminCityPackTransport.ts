import { normalizeEnabledRoutes } from './resolveCityPackGate';
import {
  buildCityPackRoutesFromCode,
  isCodeCityPackRouteSeedAvailable,
  readCodeI18nRouteWalkTemplate,
} from './buildCityPackRouteContentFromCode';
import type { CityPackId, RouteCategory, RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '../model/types';
import { resolveLocalizedText, toLocalizedText, type LocalizedText } from '../model/localized';
import { autofillTaxiCostFromMetadata } from './autofillTaxiCostFromMetadata';
import { inferCityPackTransportCurrencyMode } from './inferCityPackTransportCurrency';
import { mergeRouteMetadataDefaults } from './resolveRouteMetadataDefaults';
import { ROUTE_PRESETS } from './constants';
import { isLocalizedFilled } from './resolveLocalizedLocaleStatus';

const ROUTE_META: Record<RouteId, { category: RouteCategory }> = {
  airport: { category: 'airport' },
  bus_central: { category: 'bus' },
  bus_istochno: { category: 'bus' },
  train_station: { category: 'train' },
};

function emptyLocalized(): LocalizedText {
  return { en: '' };
}

export function createBlankCityPackRouteContent(routeId: RouteId): CityPackRouteContent {
  const meta = ROUTE_META[routeId];

  return {
    category: meta.category,
    routeMode: 'transit',
    hubArrivalKind: 'city_shared',
    locationLabel: emptyLocalized(),
    copy: {
      publicTitle: emptyLocalized(),
      publicSummary: emptyLocalized(),
      publicPreview: emptyLocalized(),
      publicText: emptyLocalized(),
      publicGetOffAt: emptyLocalized(),
      publicWalkToHostel: emptyLocalized(),
      taxiCost: emptyLocalized(),
      taxiPickupPoint: emptyLocalized(),
    },
    transit: { durationMin: 0 },
    taxi: {
      priceKM: { min: 0, max: 0 },
      priceEUR: { min: 0, max: 0 },
      durationMin: { min: 0, max: 0 },
    },
  };
}

export function resolveCodeCityPackRouteSeed(
  packId: string,
  routeId: RouteId
): CityPackRouteContent | undefined {
  if (!isCodeCityPackRouteSeedAvailable(packId)) {
    return undefined;
  }

  return buildCityPackRoutesFromCode(packId)[routeId];
}

function routePresetLabel(routeId: RouteId): string {
  return ROUTE_PRESETS.find((entry) => entry.id === routeId)?.label ?? routeId;
}

/** Fills EN hub label from code seed or route preset when empty (not a publish gate field). */
export function autofillCityPackRouteLocationLabel(
  packId: string,
  routeId: RouteId,
  route: CityPackRouteContent
): CityPackRouteContent {
  if (isLocalizedFilled(route.locationLabel, 'en')) {
    return route;
  }

  const seed = resolveCodeCityPackRouteSeed(packId, routeId);
  const seedEn = seed?.locationLabel?.en?.trim();
  if (seedEn) {
    return {
      ...route,
      locationLabel: {
        en: seedEn,
        ru: route.locationLabel.ru?.trim() || seed?.locationLabel?.ru,
      },
    };
  }

  const presetEn = routePresetLabel(routeId);
  return {
    ...route,
    locationLabel: {
      en: presetEn,
      ru: route.locationLabel.ru,
    },
  };
}

/** Prefer current body, then per-route code seed, then blank shell. */
export function ensureCityPackRouteContent(
  packId: string,
  routeId: RouteId,
  current?: CityPackRouteContent,
  content?: CityPackContent
): CityPackRouteContent {
  const currencyMode = inferCityPackTransportCurrencyMode(packId, content);
  const body =
    current ?? resolveCodeCityPackRouteSeed(packId, routeId) ?? createBlankCityPackRouteContent(routeId);

  let next = autofillCityPackRouteLocationLabel(packId, routeId, body);
  next = mergeRouteMetadataDefaults(packId, routeId, next, currencyMode);
  next = autofillTaxiCostFromMetadata(next, currencyMode);
  return next;
}

export function ensureEnabledCityPackRoutes(
  packId: string,
  enabledRoutes: RouteId[],
  routes: Partial<Record<RouteId, CityPackRouteContent>>,
  content?: CityPackContent
): Partial<Record<RouteId, CityPackRouteContent>> {
  const next = { ...routes };
  for (const routeId of enabledRoutes) {
    next[routeId] = ensureCityPackRouteContent(packId, routeId, next[routeId], content);
  }
  return next;
}

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
  packId: string,
  routeId: RouteId,
  locale: 'en' | 'ru' = 'en'
): string | undefined {
  const walk = readCodeI18nRouteWalkTemplate(packId, routeId);
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
