import type {
  CityPackContentKeys,
  PlaceCategory,
  PlaceIconId,
  RecommendedTaxi,
  RouteId,
} from '@/entities/hostel';

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

export interface CityPackContent {
  places?: CityPackAdminPlace[];
  enabledRoutes?: RouteId[];
  categories?: { id: string; label: string }[];
  contentKeys?: Partial<CityPackContentKeys>;
  recommendedTaxi?: RecommendedTaxi;
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
