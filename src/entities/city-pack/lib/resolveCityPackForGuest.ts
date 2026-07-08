import {
  getCityPack,
  type CityPack,
  type CityPackGuestWarnings,
  type CityPackId,
  type RecommendedTaxi,
  type RouteConfig,
  type RouteId,
} from '@/entities/hostel';
import { applyEnabledRoutesToCityPack } from './applyEnabledRoutesToCityPack';
import {
  buildCityPackContentWarningsFromCode,
  buildCityPackRoutesFromCode,
  isCodeCityPackRouteSeedAvailable,
} from './buildCityPackRouteContentFromCode';
import { mergeDbRouteOntoCodeRoute } from './buildRouteGuestCopy';
import { resolveCityPackTransportReadiness } from './resolveCityPackTransportReadiness';
import type { AppLocale, CityPackContent, CityPackContentWarnings, CityPackStatus } from '../model/types';
import { resolveLocalizedText } from '../model/localized';

function mergeRecommendedTaxi(
  codeTaxi: RecommendedTaxi | undefined,
  dbTaxi: RecommendedTaxi | undefined
): RecommendedTaxi | undefined {
  const name = dbTaxi?.name?.trim() || codeTaxi?.name?.trim();
  if (!name) {
    return undefined;
  }

  return {
    name,
    phoneRaw: dbTaxi?.phoneRaw?.trim() || codeTaxi?.phoneRaw,
    phoneMask: dbTaxi?.phoneMask?.trim() || codeTaxi?.phoneMask,
    phoneFormatPreset: dbTaxi?.phoneFormatPreset || codeTaxi?.phoneFormatPreset,
  };
}

function resolveContentRoutes(
  packId: CityPackId,
  content?: CityPackContent
): Partial<Record<RouteId, import('../model/types').CityPackRouteContent>> {
  const dbRoutes = content?.routes;
  if (dbRoutes && Object.keys(dbRoutes).length > 0) {
    return dbRoutes;
  }

  if (isCodeCityPackRouteSeedAvailable(packId)) {
    return buildCityPackRoutesFromCode(packId);
  }

  return {};
}

function resolveContentWarnings(
  packId: CityPackId,
  content?: CityPackContent
): CityPackContentWarnings | undefined {
  if (content?.warnings && Object.keys(content.warnings).length > 0) {
    return content.warnings;
  }

  if (isCodeCityPackRouteSeedAvailable(packId)) {
    return buildCityPackContentWarningsFromCode(packId);
  }

  return undefined;
}

function resolveGuestWarnings(
  warnings: CityPackContentWarnings | undefined,
  locale: AppLocale
): CityPackGuestWarnings | undefined {
  if (!warnings) {
    return undefined;
  }

  const taxiStandWarning = warnings.taxiStand
    ? resolveLocalizedText(warnings.taxiStand, locale)
    : '';
  const taxiMeterWarning = warnings.taxiMeter
    ? resolveLocalizedText(warnings.taxiMeter, locale)
    : '';

  if (!taxiStandWarning && !taxiMeterWarning && !warnings.busClarification) {
    return undefined;
  }

  return {
    taxiStandWarning,
    taxiMeterWarning,
    busClarificationQuestion: warnings.busClarification
      ? resolveLocalizedText(warnings.busClarification, locale)
      : undefined,
  };
}

function mergeRoutesWithContent(
  baseRoutes: Partial<Record<RouteId, RouteConfig>>,
  contentRoutes: Partial<Record<RouteId, import('../model/types').CityPackRouteContent>>,
  locale: AppLocale
): Partial<Record<RouteId, RouteConfig>> {
  const merged: Partial<Record<RouteId, RouteConfig>> = { ...baseRoutes };

  for (const [routeId, dbRoute] of Object.entries(contentRoutes) as [
    RouteId,
    import('../model/types').CityPackRouteContent | undefined,
  ][]) {
    if (!dbRoute) {
      continue;
    }

    const codeRoute = baseRoutes[routeId];
    if (codeRoute) {
      merged[routeId] = mergeDbRouteOntoCodeRoute(codeRoute, dbRoute, locale);
      continue;
    }

    merged[routeId] = mergeDbRouteOntoCodeRoute(
      {
        id: routeId,
        category: dbRoute.category,
        routeMode: dbRoute.routeMode,
        hubArrivalKind: dbRoute.hubArrivalKind,
        isActive: dbRoute.isActive,
        titleKey: '',
        locationKey: '',
        translationKeys: {
          publicTitle: '',
          publicSummary: '',
          publicPreview: '',
          publicText: '',
          publicGetOffAt: '',
          publicWalkToHostel: '',
          taxiCost: '',
          taxiPickupPoint: '',
        },
        metadata: {
          taxiPriceKM: dbRoute.taxi.priceKM,
          taxiPriceEUR: dbRoute.taxi.priceEUR,
          taxiDurationMin: dbRoute.taxi.durationMin,
          publicTransport: {
            durationMin: dbRoute.transit.durationMin,
            stops: dbRoute.transit.stops,
            ticketPrice: dbRoute.transit.ticketPrice,
            officialRouteUrl: dbRoute.transit.officialRouteUrl,
          },
        },
      },
      dbRoute,
      locale
    );
  }

  return merged;
}

export function resolveCityPackForGuest(input: {
  packId: CityPackId;
  locale: AppLocale;
  content?: CityPackContent;
  packStatus?: CityPackStatus;
  places?: CityPack['places'];
  enabledRoutes?: RouteId[];
}): CityPack {
  const base = getCityPack(input.packId);
  const packIsReady = input.packStatus === 'ready';
  const transportReady =
    packIsReady &&
    resolveCityPackTransportReadiness({
      packId: input.packId,
      content: input.content,
    }).ready;
  const enabledRoutes = transportReady ? (input.enabledRoutes ?? []) : [];
  const contentRoutes = transportReady ? resolveContentRoutes(input.packId, input.content) : {};
  const warnings = transportReady ? resolveContentWarnings(input.packId, input.content) : undefined;

  const withMergedRoutes: CityPack = {
    ...base,
    places: input.places ?? [],
    recommendedTaxi: transportReady
      ? mergeRecommendedTaxi(base.recommendedTaxi, input.content?.recommendedTaxi)
      : base.recommendedTaxi,
    preTripTips: input.content?.preTripTips ?? base.preTripTips,
    routes: transportReady
      ? mergeRoutesWithContent(base.routes, contentRoutes, input.locale)
      : base.routes,
    guestWarnings: transportReady ? resolveGuestWarnings(warnings, input.locale) : undefined,
  };

  if (!enabledRoutes.length) {
    return { ...withMergedRoutes, routes: {}, categories: [] };
  }

  return applyEnabledRoutesToCityPack(withMergedRoutes, enabledRoutes);
}
