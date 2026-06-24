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

export type CityPackWizardStepId = 'identity' | 'places' | 'routes' | 'preview';

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
  taxiCost: LocalizedText;
  taxiPickupPoint: LocalizedText;
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

export interface CityPackRouteContent {
  category: RouteCategory;
  routeMode?: RouteMode;
  isActive?: boolean;
  hint?: LocalizedText;
  locationLabel: LocalizedText;
  copy: CityPackRouteCopy;
  transit: CityPackRouteTransit;
  taxi: CityPackRouteTaxi;
}

export interface CityPackContentWarnings {
  taxiStand?: LocalizedText;
  taxiMeter?: LocalizedText;
  busClarification?: LocalizedText;
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
