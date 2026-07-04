import type { Place } from '@/entities/hostel';
import { normalizePlaceIconId } from '@/entities/hostel';
import type { CityPackAdminPlace } from '../model/types';
import { normalizeCityPackAdminPlace } from './normalizeCityPackAdminPlace';
import { sortByTopPickThenName } from './sortByTopPickThenName';

export function resolvePlaceMapsUrl(place: CityPackAdminPlace): string {
  return (
    place.googleMapsUrl?.trim() ||
    (place.lat != null && place.lng != null
      ? `https://maps.google.com/?q=${place.lat},${place.lng}`
      : '')
  );
}

export function adminPlaceToPlace(place: CityPackAdminPlace): Place {
  const normalized = normalizeCityPackAdminPlace(place);

  return {
    id: normalized.id,
    name: normalized.name.trim(),
    category: normalized.category,
    descriptionKey: '',
    description: normalized.description?.trim() || undefined,
    googleMapsUrl: resolvePlaceMapsUrl(normalized),
    isTopPick: normalized.isTopPick ?? false,
    needNow: normalized.needNow ?? false,
    walkHint: normalized.walkHint?.trim() || undefined,
    iconId:
      normalized.iconId != null && String(normalized.iconId).trim() !== ''
        ? normalizePlaceIconId(normalized.iconId)
        : undefined,
  };
}

export function sortMergedPlaces(places: Place[]): Place[] {
  return sortByTopPickThenName(places);
}

export function adminPlacesToPlaces(adminPlaces: CityPackAdminPlace[] | undefined): Place[] {
  if (!adminPlaces?.length) {
    return [];
  }

  return sortMergedPlaces(
    adminPlaces
      .filter((place) => place.name.trim() && place.category)
      .map(adminPlaceToPlace)
  );
}
