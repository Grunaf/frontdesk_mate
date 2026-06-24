import type { RouteId } from '@/entities/hostel';
import type {
  CityPackContent,
  CityPackContentWarnings,
  CityPackRouteContent,
  CityPackRouteCopy,
} from '../model/types';
import { toLocalizedText, type LocalizedText } from '../model/localized';

function trimLocalized(value: LocalizedText | undefined): LocalizedText | undefined {
  if (!value) {
    return undefined;
  }

  return toLocalizedText(value);
}

function trimCopy(copy: CityPackRouteCopy | undefined): CityPackRouteCopy | undefined {
  if (!copy) {
    return undefined;
  }

  const publicTitle = trimLocalized(copy.publicTitle);
  const publicSummary = trimLocalized(copy.publicSummary);
  const publicPreview = trimLocalized(copy.publicPreview);
  const publicText = trimLocalized(copy.publicText);
  const publicGetOffAt = trimLocalized(copy.publicGetOffAt);
  const publicWalkToHostel = trimLocalized(copy.publicWalkToHostel);
  const taxiCost = trimLocalized(copy.taxiCost);
  const taxiPickupPoint = trimLocalized(copy.taxiPickupPoint);

  if (
    !publicTitle ||
    !publicSummary ||
    !publicPreview ||
    !publicText ||
    !publicGetOffAt ||
    !publicWalkToHostel ||
    !taxiCost ||
    !taxiPickupPoint
  ) {
    return undefined;
  }

  return {
    publicTitle,
    publicSummary,
    publicPreview,
    publicText,
    publicGetOffAt,
    publicWalkToHostel,
    taxiCost,
    taxiPickupPoint,
  };
}

function normalizeRouteContent(route: CityPackRouteContent): CityPackRouteContent | undefined {
  const copy = trimCopy(route.copy);
  if (!copy || !route.category || !route.transit?.durationMin) {
    return undefined;
  }

  return {
    category: route.category,
    routeMode: route.routeMode,
    isActive: route.isActive,
    hint: trimLocalized(route.hint),
    locationLabel: trimLocalized(route.locationLabel) ?? { en: route.category },
    copy,
    transit: {
      durationMin: Number(route.transit.durationMin) || 0,
      stops: route.transit.stops != null ? Number(route.transit.stops) : undefined,
      ticketPrice: route.transit.ticketPrice,
      fareLabel: trimLocalized(route.transit.fareLabel),
      officialRouteUrl: route.transit.officialRouteUrl?.trim() || undefined,
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

    const next = normalizeRouteContent(route);
    if (next) {
      normalized[routeId] = next;
    }
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
    taxiStand: trimLocalized(warnings.taxiStand),
    taxiMeter: trimLocalized(warnings.taxiMeter),
    busClarification: trimLocalized(warnings.busClarification),
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
