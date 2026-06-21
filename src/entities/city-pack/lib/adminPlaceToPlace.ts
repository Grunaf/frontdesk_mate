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

export function adminPlaceToPlace(place: CityPackAdminPlace, codeFallback?: Place): Place {
  const googleMapsUrl =
    resolvePlaceMapsUrl(place) || codeFallback?.googleMapsUrl || '';

  return {
    id: place.id,
    name: place.name.trim(),
    category: place.category,
    descriptionKey: codeFallback?.descriptionKey ?? '',
    description: place.description?.trim() || codeFallback?.description,
    googleMapsUrl,
    isTopPick: place.isTopPick ?? codeFallback?.isTopPick ?? false,
    needNow: place.needNow ?? codeFallback?.needNow ?? false,
    walkHint: place.walkHint?.trim() || codeFallback?.walkHint,
    iconId:
      place.iconId != null && place.iconId.trim() !== ''
        ? normalizePlaceIconId(place.iconId)
        : codeFallback?.iconId,
  };
}

export function sortMergedPlaces(places: Place[]): Place[] {
  return sortByTopPickThenName(places);
}

export function mergeCityPackPlaces(
  codePlaces: Place[],
  adminPlaces: CityPackAdminPlace[] | undefined
): Place[] {
  if (!adminPlaces?.length) {
    return sortMergedPlaces(codePlaces);
  }

  const codeById = new Map(codePlaces.map((place) => [place.id, place]));

  const merged = adminPlaces
    .filter((place) => place.name.trim() && place.category)
    .map((place) => adminPlaceToPlace(place, codeById.get(place.id)));

  return sortMergedPlaces(merged);
}
