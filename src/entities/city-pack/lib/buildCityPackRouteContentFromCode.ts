import { getCityPack, isCodeCityPackId, type CodeCityPackId, type RouteConfig, type RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackContentWarnings, CityPackRouteContent } from '../model/types';
import type { LocalizedText } from '../model/localized';
import en from '@/shared/i18n/en.json';
import ru from '@/shared/i18n/ru.json';

const ROUTE_I18N_SLUG: Record<RouteId, string> = {
  airport: 'airport',
  bus_central: 'busMain',
  bus_istochno: 'busIstochno',
  train_station: 'train',
};

type RoutesTree = Record<string, unknown>;

function getRoutesTree(locale: 'en' | 'ru', packId: CodeCityPackId): RoutesTree | null {
  const root =
    locale === 'en'
      ? en.domains.hostel.cityPacks
      : (ru.domains.hostel.cityPacks as Record<string, { routes?: RoutesTree }>);

  const pack = root[packId as keyof typeof root] as { routes?: RoutesTree } | undefined;
  return pack?.routes ?? null;
}

function readLocalized(
  packId: CodeCityPackId,
  read: (routes: RoutesTree) => string | undefined
): LocalizedText | undefined {
  const enRoutes = getRoutesTree('en', packId);
  const ruRoutes = getRoutesTree('ru', packId);
  if (!enRoutes) {
    return undefined;
  }

  const enValue = read(enRoutes)?.trim();
  if (!enValue) {
    return undefined;
  }

  const ruValue = ruRoutes ? read(ruRoutes)?.trim() : undefined;
  return ruValue ? { en: enValue, ru: ruValue } : { en: enValue };
}

function buildRouteCopy(packId: CodeCityPackId, routeId: RouteId): CityPackRouteContent['copy'] | null {
  const slug = ROUTE_I18N_SLUG[routeId];

  const publicTitle = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.public as RoutesTree | undefined)?.title as string | undefined;
  });
  const publicSummary = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.public as RoutesTree | undefined)?.summary as string | undefined;
  });
  const publicPreview = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.public as RoutesTree | undefined)?.walkToStop as string | undefined;
  });
  const publicText = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.public as RoutesTree | undefined)?.text as string | undefined;
  });
  const publicGetOffAt = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.public as RoutesTree | undefined)?.getOffAt as string | undefined;
  });
  const publicWalkToHostel = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.public as RoutesTree | undefined)?.walkToHostel as string | undefined;
  });
  const taxiCost = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.taxi as RoutesTree | undefined)?.costEstimation as string | undefined;
  });
  const taxiPickupPoint = readLocalized(packId, (routes) => {
    const section = routes[slug] as RoutesTree | undefined;
    return (section?.taxi as RoutesTree | undefined)?.pickupPoint as string | undefined;
  });

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
    return null;
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

function buildRouteContentFromCode(
  packId: CodeCityPackId,
  routeId: RouteId,
  route: RouteConfig
): CityPackRouteContent | null {
  const copy = buildRouteCopy(packId, routeId);
  if (!copy) {
    return null;
  }

  const fareLabel = readLocalized(packId, (routes) => {
    const slug = ROUTE_I18N_SLUG[routeId];
    const routeSection = routes[slug] as RoutesTree | undefined;
    return (routeSection?.public as RoutesTree | undefined)?.fareLabel as string | undefined;
  });

  const locationLabel =
    readLocalized(packId, (routes) => {
      const slug = ROUTE_I18N_SLUG[routeId];
      const routeSection = routes[slug] as RoutesTree | undefined;
      return routeSection?.locationGenitive as string | undefined;
    }) ?? { en: routeId };

  let hint: LocalizedText | undefined;
  if (route.hintKey?.includes('centralHint')) {
    hint = readLocalized(packId, (routes) => (routes.bus as RoutesTree)?.centralHint as string);
  } else if (route.hintKey?.includes('istochnoHint')) {
    hint = readLocalized(packId, (routes) => (routes.bus as RoutesTree)?.istochnoHint as string);
  }

  const { publicTransport, taxiPriceKM, taxiPriceEUR, taxiDurationMin } = route.metadata;

  return {
    category: route.category,
    routeMode: route.routeMode,
    isActive: route.isActive,
    hint,
    locationLabel,
    copy,
    transit: {
      durationMin: publicTransport.durationMin,
      stops: publicTransport.stops,
      ticketPrice: publicTransport.ticketPrice,
      fareLabel: fareLabel ?? undefined,
      officialRouteUrl: publicTransport.officialRouteUrl,
    },
    taxi: {
      priceKM: taxiPriceKM,
      priceEUR: taxiPriceEUR,
      durationMin: taxiDurationMin,
    },
  };
}

export function buildCityPackContentWarningsFromCode(
  packId: CodeCityPackId
): CityPackContentWarnings | undefined {
  const taxiStand = readLocalized(
    packId,
    (routes) => (routes.taxiService as RoutesTree | undefined)?.standWarning as string | undefined
  );
  const taxiMeter = readLocalized(
    packId,
    (routes) => (routes.taxiService as RoutesTree | undefined)?.meterWarning as string | undefined
  );
  const busClarification = readLocalized(
    packId,
    (routes) => (routes.bus as RoutesTree | undefined)?.clarificationQuestion as string | undefined
  );

  if (!taxiStand && !taxiMeter && !busClarification) {
    return undefined;
  }

  return {
    taxiStand,
    taxiMeter,
    busClarification,
  };
}

export function buildCityPackRoutesFromCode(
  packId: CodeCityPackId
): Partial<Record<RouteId, CityPackRouteContent>> {
  const pack = getCityPack(packId);
  const routes: Partial<Record<RouteId, CityPackRouteContent>> = {};

  for (const [routeId, route] of Object.entries(pack.routes) as [RouteId, RouteConfig | undefined][]) {
    if (!route) {
      continue;
    }

    const content = buildRouteContentFromCode(packId, routeId, route);
    if (content) {
      routes[routeId] = content;
    }
  }

  return routes;
}

export function buildCityPackRouteSeedContent(packId: CodeCityPackId): Pick<
  CityPackContent,
  'routes' | 'warnings' | 'preTripTips'
> {
  const pack = getCityPack(packId);

  return {
    routes: buildCityPackRoutesFromCode(packId),
    warnings: buildCityPackContentWarningsFromCode(packId),
    preTripTips: pack.preTripTips,
  };
}

export function isCodeCityPackRouteSeedAvailable(packId: string): packId is CodeCityPackId {
  return isCodeCityPackId(packId);
}

/** Static i18n walk starter for tenant pre-fill — not editable in city pack admin. */
export function readCodeI18nRouteWalkTemplate(
  packId: string,
  routeId: RouteId
): LocalizedText | undefined {
  if (!isCodeCityPackRouteSeedAvailable(packId)) {
    return undefined;
  }

  const walk = buildCityPackRoutesFromCode(packId)[routeId]?.copy.publicWalkToHostel;
  if (!walk?.en?.trim() && !walk?.ru?.trim()) {
    return undefined;
  }

  return walk;
}
