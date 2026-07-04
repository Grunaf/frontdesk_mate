import { resolvePlaceCategoryFromLegacy, type PlaceCategory } from '@/entities/hostel';
import { migrateCityPackAdminPlaceV3 } from './migrateCityPackPlaceV3';
import type { CityPackAdminPlace } from '../model/types';

function toCityPackAdminPlace(migrated: ReturnType<typeof migrateCityPackAdminPlaceV3>): CityPackAdminPlace {
  const category = resolvePlaceCategoryFromLegacy(migrated.category) ?? (migrated.category as PlaceCategory);

  return {
    id: String(migrated.id ?? ''),
    name: String(migrated.name ?? ''),
    category,
    description: typeof migrated.description === 'string' ? migrated.description : undefined,
    walkHint: typeof migrated.walkHint === 'string' ? migrated.walkHint : undefined,
    lat: typeof migrated.lat === 'number' ? migrated.lat : undefined,
    lng: typeof migrated.lng === 'number' ? migrated.lng : undefined,
    iconId: migrated.iconId as CityPackAdminPlace['iconId'],
    googleMapsUrl:
      typeof migrated.googleMapsUrl === 'string' ? migrated.googleMapsUrl : undefined,
    isTopPick: migrated.isTopPick === true,
    needNow: migrated.needNow === true,
  };
}

export function normalizeCityPackAdminPlace(place: CityPackAdminPlace): CityPackAdminPlace {
  return toCityPackAdminPlace(
    migrateCityPackAdminPlaceV3(place as unknown as Record<string, unknown>)
  );
}

export function serializeCityPackAdminPlace(place: CityPackAdminPlace): CityPackAdminPlace {
  return normalizeCityPackAdminPlace(place);
}
