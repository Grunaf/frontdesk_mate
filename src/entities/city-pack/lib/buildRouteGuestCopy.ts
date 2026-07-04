import type { RouteConfig, RouteGuestCopy } from '@/entities/hostel';
import type { AppLocale } from '../model/types';
import type { CityPackRouteContent } from '../model/types';
import { applyTemplate, resolveLocalizedText } from '../model/localized';
import { resolveRouteTipsForGuest } from './resolveRouteTipsForGuest';

function resolveTaxiCost(
  copy: CityPackRouteContent['copy'],
  taxi: CityPackRouteContent['taxi'],
  locale: AppLocale
): string {
  const template = resolveLocalizedText(copy.taxiCost, locale);
  return applyTemplate(template, {
    minKM: taxi.priceKM.min,
    maxKM: taxi.priceKM.max,
    minEUR: taxi.priceEUR.min,
    maxEUR: taxi.priceEUR.max,
  });
}

export function buildRouteGuestCopy(
  content: CityPackRouteContent,
  locale: AppLocale
): RouteGuestCopy {
  const { copy, transit, taxi } = content;

  return {
    publicTitle: resolveLocalizedText(copy.publicTitle, locale),
    publicSummary: resolveLocalizedText(copy.publicSummary, locale),
    publicPreview: resolveLocalizedText(copy.publicPreview, locale),
    publicText: resolveLocalizedText(copy.publicText, locale),
    publicGetOffAt: resolveLocalizedText(copy.publicGetOffAt, locale),
    publicWalkToHostel: resolveLocalizedText(copy.publicWalkToHostel, locale),
    taxiCost: resolveTaxiCost(copy, taxi, locale),
    taxiPickupPoint: resolveLocalizedText(copy.taxiPickupPoint, locale),
    fareLabel: transit.fareLabel ? resolveLocalizedText(transit.fareLabel, locale) : undefined,
    hint: content.hint ? resolveLocalizedText(content.hint, locale) : undefined,
    tips: resolveRouteTipsForGuest(content.tips, locale),
  };
}

export function mergeDbRouteOntoCodeRoute(
  codeRoute: RouteConfig,
  dbRoute: CityPackRouteContent,
  locale: AppLocale
): RouteConfig {
  const { transit, taxi } = dbRoute;

  return {
    ...codeRoute,
    category: dbRoute.category,
    routeMode: dbRoute.routeMode ?? codeRoute.routeMode,
    isActive: dbRoute.isActive ?? codeRoute.isActive,
    metadata: {
      taxiPriceKM: taxi.priceKM,
      taxiPriceEUR: taxi.priceEUR,
      taxiDurationMin: taxi.durationMin,
      publicTransport: {
        durationMin: transit.durationMin,
        stops: transit.stops,
        ticketPrice: transit.ticketPrice,
        officialRouteUrl: transit.officialRouteUrl,
        fareLabelKey: transit.fareLabel ? undefined : codeRoute.metadata.publicTransport.fareLabelKey,
      },
    },
    guestCopy: buildRouteGuestCopy(dbRoute, locale),
  };
}

export function resolveCityDefaultWalkToHostel(
  route: RouteConfig,
  locale: AppLocale,
  address: string
): string {
  const template = route.guestCopy?.publicWalkToHostel;
  if (!template) {
    return '';
  }

  return applyTemplate(template, { address });
}
