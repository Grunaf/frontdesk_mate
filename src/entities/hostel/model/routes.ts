import { LucideIcon } from 'lucide-react';

export type { CityPackId, CityPack, CityPackContentKeys, RecommendedTaxi } from './city-packs';
export {
  CODE_CITY_PACK_IDS,
  CITY_PACK_LIST,
  getCityPack,
  isCityPackId,
  isCodeCityPackId,
} from './city-packs';
export {
  SARAJEVO_ROUTES as ARRIVAL_ROUTES_CONFIG,
  SARAJEVO_ROUTE_CATEGORIES as ROUTE_CATEGORIES,
} from './city-packs/sarajevo';

export type RouteCategory = 'airport' | 'bus' | 'train';
export type RouteId = 'airport' | 'bus_central' | 'bus_istochno' | 'train_station';
export type RouteMode = 'transit' | 'walk_only';
/** Who owns guest legs — mirrors city-pack HubArrivalKind. */
export type HubArrivalKind = 'city_shared' | 'tenant_local';

/** Public-transit metadata. Omit stops/ticketPrice/officialRouteUrl when not applicable. */
export interface PublicTransportConfig {
  durationMin: number;
  stops?: number;
  ticketPrice?: {
    kioskKM: number;
    driverKM: number;
  };
  /** Full i18n key for a custom fare chip (e.g. free transit, shuttle flat fare). */
  fareLabelKey?: string;
  officialRouteUrl?: string;
}

export function hasOfficialRouteSchedule(route: RouteConfig): boolean {
  return Boolean(route.metadata.publicTransport.officialRouteUrl);
}

export function isRouteActive(route: RouteConfig): boolean {
  return route.isActive !== false;
}

export function getRouteMode(route: RouteConfig): RouteMode {
  return route.routeMode ?? 'transit';
}

export function isWalkOnlyRoute(route: RouteConfig): boolean {
  return getRouteMode(route) === 'walk_only';
}

export function getHubArrivalKind(route: RouteConfig): HubArrivalKind {
  return route.hubArrivalKind === 'tenant_local' ? 'tenant_local' : 'city_shared';
}

export function isTenantLocalRoute(route: RouteConfig): boolean {
  return getHubArrivalKind(route) === 'tenant_local';
}

export function getActiveRoutes(
  routes: Partial<Record<RouteId, RouteConfig>>
): RouteConfig[] {
  return Object.values(routes).filter(
    (route): route is RouteConfig => route != null && isRouteActive(route)
  );
}

export interface CategoryConfig {
  id: RouteCategory;
  icon: LucideIcon;
  labelKey: string;
  defaultRouteId: RouteId;
}

export interface RouteGuestCopy {
  publicTitle: string;
  publicSummary: string;
  publicPreview: string;
  publicText: string;
  publicGetOffAt: string;
  publicWalkToHostel: string;
  /** AI research-based schedule advice (1-2 short lines). */
  transitScheduleAdvice?: string[];
  /** AI research-based ticket/payment advice (1-2 short lines). */
  transitTicketPayment?: string[];
  taxiCost: string;
  taxiPickupPoint: string;
  /** Hub taxi operational tips for backup sheet (max 2). */
  taxiTips?: string[];
  fareLabel?: string;
  hint?: string;
  /** Resolved hub tips for active locale (city pack / tenant). */
  tips?: string[];
}

export interface RouteConfig {
  id: RouteId;
  category: RouteCategory;
  /** When false, route is omitted from picker UI (placeholder slots for unused hubs). */
  isActive?: boolean;
  /** Walk-only routes skip the transit leg and use a footprints icon. */
  routeMode?: RouteMode;
  /** city_shared (default): city owns transit/get-off; tenant_local: tenant owns full path. */
  hubArrivalKind?: HubArrivalKind;
  titleKey: string;
  hintKey?: string;
  locationKey: string;
  translationKeys: {
    publicTitle: string;
    publicSummary: string;
    publicPreview: string;
    publicText: string;
    publicGetOffAt: string;
    publicWalkToHostel: string;
    taxiCost: string;
    taxiPickupPoint: string;
  };
  metadata: {
    taxiPriceKM: { min: number; max: number };
    taxiPriceEUR: { min: number; max: number };
    taxiDurationMin: { min: number; max: number };
    publicTransport: PublicTransportConfig;
  };
  /** DB-resolved guest copy for the active locale (overrides translationKeys in UI). */
  guestCopy?: RouteGuestCopy;
}
