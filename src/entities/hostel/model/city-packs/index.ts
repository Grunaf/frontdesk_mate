import type { CategoryConfig, RouteConfig, RouteId } from '../routes';
import { buildCityPackLocale, buildGenericCityPackLocale, cityPackRoutesNamespace } from './locale';
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
  CITY_PACK_NEED_NOW_ELIGIBLE_CATEGORIES,
  isPlaceCategory,
  isCityPackNeedNowEligibleCategory,
  resolvePlaceCategoryFromLegacy,
  resolvePlaceCategoryAdminLabel,
  resolvePlaceCategoryGuideTabKey,
  resolvePlaceCategoryLucideIcon,
  resolvePlaceCategoryUtilityLabelKey,
} from './place-category-registry';
export { buildCityPackLocale, cityPackRoutesNamespace, type CityPackLocale } from './locale';

/** Packs with arrival routes authored in code (until routes move to DB). */
export const CODE_CITY_PACK_IDS = ['sarajevo', 'kotor'] as const;
export type CodeCityPackId = (typeof CODE_CITY_PACK_IDS)[number];

export type CityPackId = string;

const CITY_PACK_ID_PATTERN = /^[a-z][a-z0-9-]{1,48}$/;

export interface CityPackContentKeys {
  taxiStandWarning: string;
  taxiMeterWarning: string;
  busClarificationQuestion?: string;
}

export interface RecommendedTaxi {
  name: string;
  phoneRaw?: string;
  phoneMask?: string;
  phoneFormatPreset?: string;
}

export type PreTripTipId = 'sundayClosure';

export interface CityPackGuestWarnings {
  taxiStandWarning: string;
  taxiMeterWarning: string;
  busClarificationQuestion?: string;
}

export interface CityPack {
  id: CityPackId;
  label: string;
  routes: Partial<Record<RouteId, RouteConfig>>;
  categories: CategoryConfig[];
  contentKeys: CityPackContentKeys;
  places: Place[];
  locale: ReturnType<typeof buildCityPackLocale>;
  preTripTips?: PreTripTipId[];
  /** City-default taxi; tenant `taxiPhoneRaw` overrides the number. */
  recommendedTaxi?: RecommendedTaxi;
  /** DB-resolved warning copy for the active locale. */
  guestWarnings?: CityPackGuestWarnings;
}

interface CodeCityPackDefinition {
  id: CodeCityPackId;
  label: string;
  routes: Partial<Record<RouteId, RouteConfig>>;
  categories: CategoryConfig[];
  contentKeys: CityPackContentKeys;
  preTripTips?: PreTripTipId[];
  recommendedTaxi?: RecommendedTaxi;
}

function defineCodeCityPack(definition: CodeCityPackDefinition): CityPack {
  return {
    ...definition,
    places: [],
    locale: buildCityPackLocale(definition.id),
  };
}

export const CITY_PACK_LIST: { id: CodeCityPackId; label: string }[] = [
  { id: 'sarajevo', label: 'Sarajevo (Bosnia)' },
  { id: 'kotor', label: 'Kotor Bay (Montenegro)' },
];

const CODE_CITY_PACKS: Record<CodeCityPackId, CityPack> = {
  sarajevo: defineCodeCityPack({
    id: 'sarajevo',
    label: 'Sarajevo (Bosnia)',
    routes: SARAJEVO_ROUTES,
    categories: SARAJEVO_ROUTE_CATEGORIES,
    contentKeys: SARAJEVO_CONTENT_KEYS,
    preTripTips: ['sundayClosure'],
    recommendedTaxi: { name: 'Zuti Taxi' },
  }),
  kotor: defineCodeCityPack({
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
  return CITY_PACK_ID_PATTERN.test(value.trim());
}

export function isCodeCityPackId(value: string): value is CodeCityPackId {
  return CODE_CITY_PACK_IDS.includes(value as CodeCityPackId);
}

function createDynamicCityPack(id: CityPackId): CityPack {
  const routesNamespace = cityPackRoutesNamespace(id);

  return {
    id,
    label: id,
    routes: {},
    categories: [],
    contentKeys: {
      taxiStandWarning: `${routesNamespace}.taxiService.standWarning`,
      taxiMeterWarning: `${routesNamespace}.taxiService.meterWarning`,
    },
    places: [],
    locale: buildGenericCityPackLocale(),
  };
}

export function getCityPack(cityPackId: CityPackId): CityPack {
  if (isCodeCityPackId(cityPackId)) {
    return CODE_CITY_PACKS[cityPackId];
  }

  if (!isCityPackId(cityPackId)) {
    throw new Error(`Invalid city pack id: ${cityPackId}`);
  }

  return createDynamicCityPack(cityPackId.trim());
}

export function getCodeCityPackLabel(cityPackId: CodeCityPackId): string {
  return CODE_CITY_PACKS[cityPackId].label;
}
