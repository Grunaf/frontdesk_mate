import type { CategoryConfig, RouteConfig, RouteId } from '../routes';
import { buildCityPackLocale } from './locale';
import {
  KOTOR_CONTENT_KEYS,
  KOTOR_ROUTE_CATEGORIES,
  KOTOR_ROUTES,
} from './kotor';
import {
  SARAJEVO_CONTENT_KEYS,
  SARAJEVO_ROUTE_CATEGORIES,
  SARAJEVO_ROUTES,
} from './sarajevo';
import type { Place } from './places.types';

export type { Place, PlaceCategory, PlaceIconId } from './places.types';
export {
  PLACE_ICON_IDS,
  PLACE_ICON_PRESETS,
  isPlaceIconId,
  normalizePlaceIconId,
  resolvePlaceLucideIcon,
  resolvePlaceUtilityLabelKey,
} from './place-icons';
export {
  PLACE_CATEGORY_IDS,
  PLACE_CATEGORY_REGISTRY,
  isPlaceCategory,
  resolvePlaceCategoryAdminLabel,
  resolvePlaceCategoryGuideTabKey,
  resolvePlaceCategoryLucideIcon,
  resolvePlaceCategoryUtilityLabelKey,
} from './place-category-registry';
export { buildCityPackLocale, cityPackRoutesNamespace, type CityPackLocale } from './locale';

export const CITY_PACK_IDS = ['sarajevo', 'kotor'] as const;
export type CityPackId = (typeof CITY_PACK_IDS)[number];

export interface CityPackContentKeys {
  taxiStandWarning: string;
  taxiMeterWarning: string;
  busClarificationQuestion?: string;
}

export interface RecommendedTaxi {
  name: string;
  phoneRaw?: string;
  phoneMask?: string;
}

export type PreTripTipId = 'sundayClosure';

export interface CityPack {
  id: CityPackId;
  label: string;
  routes: Record<RouteId, RouteConfig>;
  categories: CategoryConfig[];
  contentKeys: CityPackContentKeys;
  places: Place[];
  locale: ReturnType<typeof buildCityPackLocale>;
  preTripTips?: PreTripTipId[];
  /** City-default taxi; tenant `taxiPhoneRaw` overrides the number. */
  recommendedTaxi?: RecommendedTaxi;
}

interface CityPackDefinition {
  id: CityPackId;
  label: string;
  routes: Record<RouteId, RouteConfig>;
  categories: CategoryConfig[];
  contentKeys: CityPackContentKeys;
  preTripTips?: PreTripTipId[];
  recommendedTaxi?: RecommendedTaxi;
}

function defineCityPack(definition: CityPackDefinition): CityPack {
  return {
    ...definition,
    places: [],
    locale: buildCityPackLocale(definition.id),
  };
}

export const CITY_PACK_LIST: { id: CityPackId; label: string }[] = [
  { id: 'sarajevo', label: 'Sarajevo (Bosnia)' },
  { id: 'kotor', label: 'Kotor Bay (Montenegro)' },
];

const CITY_PACKS: Record<CityPackId, CityPack> = {
  sarajevo: defineCityPack({
    id: 'sarajevo',
    label: 'Sarajevo (Bosnia)',
    routes: SARAJEVO_ROUTES,
    categories: SARAJEVO_ROUTE_CATEGORIES,
    contentKeys: SARAJEVO_CONTENT_KEYS,
    preTripTips: ['sundayClosure'],
    recommendedTaxi: { name: 'Zuti Taxi' },
  }),
  kotor: defineCityPack({
    id: 'kotor',
    label: 'Kotor Bay (Montenegro)',
    routes: KOTOR_ROUTES,
    categories: KOTOR_ROUTE_CATEGORIES,
    contentKeys: KOTOR_CONTENT_KEYS,
    recommendedTaxi: {
      name: 'Red Taxi',
      phoneRaw: '38267019719',
      phoneMask: '+382 67 019 719',
    },
  }),
};

export function isCityPackId(value: string): value is CityPackId {
  return CITY_PACK_IDS.includes(value as CityPackId);
}

export function getCityPack(cityPackId: CityPackId): CityPack {
  return CITY_PACKS[cityPackId];
}
