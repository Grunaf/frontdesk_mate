import type { RouteCategory, RouteId } from '@/entities/hostel';
import type {
  CityPackContent,
  CityPackContentWarnings,
  CityPackRouteContent,
  CityPackRouteCopy,
} from '../model/types';
import { toLocalizedText, type LocalizedText } from '../model/localized';

const ROUTE_CATEGORY: Record<RouteId, RouteCategory> = {
  airport: 'airport',
  bus_central: 'bus',
  bus_istochno: 'bus',
  train_station: 'train',
};

function softLocalized(value: LocalizedText | undefined): LocalizedText {
  return toLocalizedText(value) ?? { en: '' };
}

function softCopy(copy: CityPackRouteCopy | undefined): CityPackRouteCopy {
  return {
    publicTitle: softLocalized(copy?.publicTitle),
    publicSummary: softLocalized(copy?.publicSummary),
    publicPreview: softLocalized(copy?.publicPreview),
    publicText: softLocalized(copy?.publicText),
    publicGetOffAt: softLocalized(copy?.publicGetOffAt),
    publicWalkToHostel: softLocalized(copy?.publicWalkToHostel),
    taxiCost: softLocalized(copy?.taxiCost),
    taxiPickupPoint: softLocalized(copy?.taxiPickupPoint),
  };
}

function normalizeRouteContent(
  route: CityPackRouteContent,
  routeId: RouteId
): CityPackRouteContent {
  const category = route.category ?? ROUTE_CATEGORY[routeId];

  return {
    category,
    routeMode: route.routeMode,
    isActive: route.isActive,
    hint: toLocalizedText(route.hint),
    locationLabel: softLocalized(route.locationLabel),
    copy: softCopy(route.copy),
    transit: {
      durationMin: Number(route.transit?.durationMin) || 0,
      stops: route.transit?.stops != null ? Number(route.transit.stops) : undefined,
      ticketPrice: route.transit?.ticketPrice,
      fareLabel: toLocalizedText(route.transit?.fareLabel),
      officialRouteUrl: route.transit?.officialRouteUrl?.trim() || undefined,
    },
    taxi: {
      priceKM: {
        min: Number(route.taxi?.priceKM?.min) || 0,
        max: Number(route.taxi?.priceKM?.max) || 0,
      },
      priceEUR: {
        min: Number(route.taxi?.priceEUR?.min) || 0,
        max: Number(route.taxi?.priceEUR?.max) || 0,
      },
      durationMin: {
        min: Number(route.taxi?.durationMin?.min) || 0,
        max: Number(route.taxi?.durationMin?.max) || 0,
      },
    },
  };
}

export function normalizeCityPackRoutes(
  routes: Partial<Record<RouteId, CityPackRouteContent>> | undefined
): Partial<Record<RouteId, CityPackRouteContent>> | undefined {
  if (!routes || typeof routes !== 'object') {
    return undefined;
  }

  const normalized: Partial<Record<RouteId, CityPackRouteContent>> = {};

  for (const [routeId, route] of Object.entries(routes) as [RouteId, CityPackRouteContent | undefined][]) {
    if (!route) {
      continue;
    }

    if (!ROUTE_CATEGORY[routeId]) {
      continue;
    }

    normalized[routeId] = normalizeRouteContent(route, routeId);
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeCityPackWarnings(
  warnings: CityPackContentWarnings | undefined
): CityPackContentWarnings | undefined {
  if (!warnings) {
    return undefined;
  }

  const next = {
    taxiStand: toLocalizedText(warnings.taxiStand),
    taxiMeter: toLocalizedText(warnings.taxiMeter),
    busClarification: toLocalizedText(warnings.busClarification),
  };

  if (!next.taxiStand && !next.taxiMeter && !next.busClarification) {
    return undefined;
  }

  return next;
}

export function parseCityPackRoutesJson(raw: string): Partial<Record<RouteId, CityPackRouteContent>> {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<RouteId, CityPackRouteContent>>;
    return normalizeCityPackRoutes(parsed) ?? {};
  } catch {
    return {};
  }
}

export function parseCityPackWarningsJson(raw: string): CityPackContentWarnings | undefined {
  try {
    const parsed = JSON.parse(raw) as CityPackContentWarnings;
    return normalizeCityPackWarnings(parsed);
  } catch {
    return undefined;
  }
}

export function mergeCityPackContentForSave(
  content: CityPackContent,
  enabledRoutes: RouteId[]
): CityPackContent {
  const routes = normalizeCityPackRoutes(content.routes);

  if (!routes) {
    return {
      ...content,
      routes: undefined,
    };
  }

  const filtered: Partial<Record<RouteId, CityPackRouteContent>> = {};
  for (const routeId of enabledRoutes) {
    if (routes[routeId]) {
      filtered[routeId] = routes[routeId];
    }
  }

  return {
    ...content,
    routes: Object.keys(filtered).length > 0 ? filtered : undefined,
  };
}
