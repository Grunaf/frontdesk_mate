import type { Place, PlaceIconId } from '@/entities/hostel';
import type { HostelPlace } from '@/entities/tenant/model/hostelPlaces';
import { HOSTEL_PLACE_CATEGORIES } from '@/entities/tenant/model/hostelPlaces';
import {
  LOCAL_GUIDE_CATEGORY_TAB_IDS,
  type LocalGuideCategoryTabId,
} from './localGuideConstants';
import { sortByTopPickThenName } from '@/entities/city-pack';
import { resolvePlaceWhy } from './resolvePlaceWhy';

export type RecommendationScope = 'hostel' | 'city';

export interface GuestRecommendation {
  id: string;
  scope: RecommendationScope;
  name: string;
  category: string;
  why?: string;
  walkHint?: string;
  mapsUrl?: string;
  iconId?: PlaceIconId;
  isTopPick?: boolean;
  needNow?: boolean;
}

type TranslateFn = (key: string) => string;

function hostelCategoryLabel(category: HostelPlace['category']): string {
  return HOSTEL_PLACE_CATEGORIES.find((entry) => entry.id === category)?.label ?? category;
}

export function placeToGuestRecommendation(
  place: Place,
  translate: TranslateFn
): GuestRecommendation {
  return {
    id: place.id,
    scope: 'city',
    name: place.name,
    category: place.category,
    why: resolvePlaceWhy(place, translate),
    walkHint: place.walkHint?.trim() || undefined,
    mapsUrl: place.googleMapsUrl?.trim() || undefined,
    iconId: place.iconId,
    isTopPick: place.isTopPick,
    needNow: place.needNow,
  };
}

export function hostelPlaceToGuestRecommendation(place: HostelPlace): GuestRecommendation {
  return {
    id: place.id,
    scope: 'hostel',
    name: place.name.trim(),
    category: place.category,
    why: place.note?.trim() || hostelCategoryLabel(place.category),
    walkHint: place.walkHint?.trim() || undefined,
    mapsUrl: place.mapsUrl?.trim() || undefined,
  };
}

export function isUtilityRecommendation(recommendation: GuestRecommendation): boolean {
  return recommendation.scope === 'city' && recommendation.needNow === true;
}

export function splitCityRecommendations(recommendations: GuestRecommendation[]): {
  utilities: GuestRecommendation[];
  explore: GuestRecommendation[];
} {
  const utilities: GuestRecommendation[] = [];
  const explore: GuestRecommendation[] = [];

  for (const recommendation of recommendations) {
    if (isUtilityRecommendation(recommendation)) {
      utilities.push(recommendation);
      continue;
    }

    explore.push(recommendation);
  }

  return {
    utilities: sortGuestRecommendations(utilities),
    explore: sortGuestRecommendations(explore),
  };
}

export function isTopPickRecommendation(recommendation: GuestRecommendation): boolean {
  return recommendation.isTopPick === true;
}

export function sortGuestRecommendations(items: GuestRecommendation[]): GuestRecommendation[] {
  return sortByTopPickThenName(items);
}

export interface BuildMetaLineOptions {
  activeTab?: string;
  categoryLabel?: string;
}

export function buildMetaLine(
  recommendation: GuestRecommendation,
  options?: BuildMetaLineOptions
): string | undefined {
  const showCategoryLabel =
    recommendation.scope === 'city' &&
    (options?.activeTab ?? 'all') === 'all' &&
    Boolean(options?.categoryLabel);

  const parts: string[] = [];

  if (showCategoryLabel && options?.categoryLabel) {
    parts.push(options.categoryLabel);
  }

  if (recommendation.walkHint) {
    parts.push(recommendation.walkHint);
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.slice(0, 2).join(' · ');
}

export type PrimaryBadge = { kind: 'topPick'; label: string } | null;

export function resolvePrimaryBadge(
  recommendation: GuestRecommendation,
  topPickLabel?: string
): PrimaryBadge {
  if (recommendation.isTopPick && topPickLabel) {
    return { kind: 'topPick', label: topPickLabel };
  }

  return null;
}

export interface LimitRecommendationsForAllTabResult {
  visible: GuestRecommendation[];
  hasMore: boolean;
  total: number;
}

export function limitRecommendationsForAllTab(
  items: GuestRecommendation[],
  activeTab: string,
  expanded: boolean,
  limit: number
): LimitRecommendationsForAllTabResult {
  if (activeTab !== 'all' || expanded || items.length <= limit) {
    return { visible: items, hasMore: false, total: items.length };
  }

  return {
    visible: items.slice(0, limit),
    hasMore: true,
    total: items.length,
  };
}

function isLocalGuideCategoryTabId(category: string): category is LocalGuideCategoryTabId {
  return LOCAL_GUIDE_CATEGORY_TAB_IDS.includes(category as LocalGuideCategoryTabId);
}

export function getVisibleTabIds(recommendations: GuestRecommendation[]): string[] {
  if (recommendations.length === 0) {
    return [];
  }

  const tabs = ['all'];

  for (const categoryId of LOCAL_GUIDE_CATEGORY_TAB_IDS) {
    if (recommendations.some((recommendation) => recommendation.category === categoryId)) {
      tabs.push(categoryId);
    }
  }

  return tabs;
}

export function resolveActiveLocalGuideTab(
  activeTab: string,
  visibleTabIds: string[],
  preferredTab?: string
): string {
  if (visibleTabIds.length === 0) {
    return 'all';
  }

  if (visibleTabIds.includes(activeTab)) {
    return activeTab;
  }

  if (preferredTab && visibleTabIds.includes(preferredTab)) {
    return preferredTab;
  }

  return visibleTabIds.find((tabId) => tabId !== 'all') ?? 'all';
}

export function getCategoryCounts(
  recommendations: GuestRecommendation[]
): Partial<Record<LocalGuideCategoryTabId, number>> {
  const counts: Partial<Record<LocalGuideCategoryTabId, number>> = {};

  for (const recommendation of recommendations) {
    if (!isLocalGuideCategoryTabId(recommendation.category)) {
      continue;
    }

    counts[recommendation.category] = (counts[recommendation.category] ?? 0) + 1;
  }

  return counts;
}
