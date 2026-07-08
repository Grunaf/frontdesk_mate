import type {
  CityPackContentKeys,
  PlaceCategory,
  PlaceIconId,
  RecommendedTaxi,
  RouteCategory,
  RouteId,
  RouteMode,
} from '@/entities/hostel';
import type { LocalizedText } from './localized';

export type { LocalizedText, LocalizedField, AppLocale } from './localized';
export {
  applyTemplate,
  isLocalizedText,
  resolveLocalizedText,
  toLocalizedText,
} from './localized';

export type CityPackStatus = 'draft' | 'ready';

export type CityPackWizardStepId =
  | 'identity'
  | 'places'
  | 'city-settings'
  | 'routes'
  | 'preview';

export interface CityPackAdminPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  description?: string;
  walkHint?: string;
  lat?: number;
  lng?: number;
  iconId?: PlaceIconId;
  googleMapsUrl?: string;
  isTopPick?: boolean;
  needNow?: boolean;
}

export interface CityPackRouteCopy {
  publicTitle: LocalizedText;
  publicSummary: LocalizedText;
  publicPreview: LocalizedText;
  publicText: LocalizedText;
  publicGetOffAt: LocalizedText;
  publicWalkToHostel: LocalizedText;
  /** AI research-based schedule advice lines (1-2). */
  transitScheduleAdvice?: LocalizedText[];
  /** AI research-based ticket/payment advice lines (1-2). */
  transitTicketPayment?: LocalizedText[];
  taxiCost: LocalizedText;
  taxiPickupPoint: LocalizedText;
  /** Taxi backup sheet operational tips (max 2); not shown in route Good to know. */
  taxiTips?: LocalizedText[];
}

export interface CityPackRouteTransit {
  durationMin: number;
  stops?: number;
  ticketPrice?: { kioskKM: number; driverKM: number };
  fareLabel?: LocalizedText;
  officialRouteUrl?: string;
}

export interface CityPackRouteTaxi {
  priceKM: { min: number; max: number };
  priceEUR: { min: number; max: number };
  durationMin: { min: number; max: number };
}

/**
 * Who owns guest legs for this hub:
 * - city_shared (default): city transit/walk_only to shared get-off; tenant last mile + Maps
 * - tenant_local: city only hub meta; tenant owns full hub→door path
 */
export type HubArrivalKind = 'city_shared' | 'tenant_local';

export interface CityPackRouteContent {
  category: RouteCategory;
  routeMode?: RouteMode;
  /** Defaults to city_shared when missing (legacy packs). */
  hubArrivalKind?: HubArrivalKind;
  isActive?: boolean;
  hint?: LocalizedText;
  locationLabel: LocalizedText;
  copy: CityPackRouteCopy;
  /** Optional short tips for guest modal (max 5); not part of publish gate. */
  tips?: LocalizedText[];
  transit: CityPackRouteTransit;
  taxi: CityPackRouteTaxi;
}

export interface CityPackContentWarnings {
  taxiStand?: LocalizedText;
  taxiMeter?: LocalizedText;
  busClarification?: LocalizedText;
}

export type CityPackTransportCurrencyMode = 'eur_only' | 'local_and_eur';

export interface CityPackTransportCurrency {
  mode: CityPackTransportCurrencyMode;
  /** Present when mode is local_and_eur (Bosnia). */
  localCurrencyCode?: 'BAM';
  localCurrencySymbol?: 'KM';
}

export interface CityPackContent {
  places?: CityPackAdminPlace[];
  enabledRoutes?: RouteId[];
  routes?: Partial<Record<RouteId, CityPackRouteContent>>;
  categories?: { id: string; label: string }[];
  contentKeys?: Partial<CityPackContentKeys>;
  recommendedTaxi?: RecommendedTaxi;
  warnings?: CityPackContentWarnings;
  preTripTips?: ('sundayClosure')[];
  transportCurrency?: CityPackTransportCurrency;
}

export interface CityPackRecord {
  id: string;
  label: string;
  status: CityPackStatus;
  content: CityPackContent;
  tenantCount: number;
  updatedAt: string | null;
}

export interface CityPackListItem {
  id: string;
  label: string;
  status: CityPackStatus;
  placesCount: number;
  placesGateMet: boolean;
  routesGateMet: boolean;
  readyForTenants: boolean;
  notReadyReason: string | null;
  tenantCount: number;
}

export interface CityPackSelectOption {
  id: string;
  label: string;
  status: CityPackStatus;
  placesCount: number;
  readyForTenants: boolean;
  notReadyReason?: string;
}
