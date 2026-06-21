import type { Place } from '@/entities/hostel';
import { normalizePlaceIconId } from '@/entities/hostel';
import type { CityPackAdminPlace } from '../model/types';
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
  return {
    id: place.id,
    name: place.name.trim(),
    category: place.category,
    descriptionKey: '',
    description: place.description?.trim() || undefined,
    googleMapsUrl: resolvePlaceMapsUrl(place),
    isTopPick: place.isTopPick ?? false,
    needNow: place.needNow ?? false,
    walkHint: place.walkHint?.trim() || undefined,
    iconId:
      place.iconId != null && place.iconId.trim() !== ''
        ? normalizePlaceIconId(place.iconId)
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
