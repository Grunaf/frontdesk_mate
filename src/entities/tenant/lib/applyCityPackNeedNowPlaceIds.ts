import {
  isCityPackNeedNowEligibleCategory,
  resolvePlaceCategoryFromLegacy,
  type Place,
} from '@/entities/hostel';
import type { TenantSettings } from '../model/settings';

type NeedNowSettings = Pick<TenantSettings, 'cityPackNeedNowPlaceIds'>;

export type PlaceNeedNowSource = {
  id: string;
  needNow?: boolean;
  category?: string;
};

function resolveEligibleCategory(category: string | undefined): string | undefined {
  if (!category) {
    return undefined;
  }

  return resolvePlaceCategoryFromLegacy(category) ?? category;
}

function isEligiblePlace(place: PlaceNeedNowSource): boolean {
  const category = resolveEligibleCategory(place.category);
  return category != null && isCityPackNeedNowEligibleCategory(category);
}

/** Apply tenant-owned first-visit essentials onto city pack places for guest runtime. */
export function applyCityPackNeedNowPlaceIds(
  places: Place[] | undefined,
  settings: NeedNowSettings
): Place[] | undefined {
  if (!places) {
    return places;
  }

  const ids = settings.cityPackNeedNowPlaceIds;
  if (ids === undefined) {
    return places.map((place) => ({
      ...place,
      needNow: place.needNow === true && isCityPackNeedNowEligibleCategory(place.category),
    }));
  }

  const needNowSet = new Set(ids);
  return places.map((place) => ({
    ...place,
    needNow:
      needNowSet.has(place.id) && isCityPackNeedNowEligibleCategory(place.category),
  }));
}

/**
 * Admin essentials seed: explicit tenant list when set, otherwise pack-level `needNow`.
 * Drops ids that are not in the current pack or not eligible categories (bars/sights).
 */
export function resolveCityPackNeedNowPlaceIdsForAdmin(
  settings: NeedNowSettings,
  places: PlaceNeedNowSource[]
): string[] {
  const eligiblePlaces = places.filter(
    (place) => Boolean(place.id) && isEligiblePlace(place)
  );
  const validIds = new Set(eligiblePlaces.map((place) => place.id));

  if (settings.cityPackNeedNowPlaceIds !== undefined) {
    return settings.cityPackNeedNowPlaceIds.filter((id) => validIds.has(id));
  }

  return eligiblePlaces.filter((place) => place.needNow === true).map((place) => place.id);
}
