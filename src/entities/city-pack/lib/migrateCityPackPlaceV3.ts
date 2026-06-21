export const LEGACY_CITY_PACK_PLACE_KEYS = [
  'tag',
  'isSurvival',
  'recommendedBy',
  'photoUrl',
  'priority',
  'subCategory',
] as const;

export type LegacyCityPackPlaceKey = (typeof LEGACY_CITY_PACK_PLACE_KEYS)[number];

export type CityPackPlaceV3 = Record<string, unknown> & {
  id: string;
  isTopPick: boolean;
  needNow: boolean;
};

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

export function resolveIsTopPickFromLegacy(place: Record<string, unknown>): boolean {
  const explicit = readBoolean(place.isTopPick);
  if (explicit != null) {
    return explicit;
  }

  return place.tag === 'TOP PICK';
}

export function resolveNeedNowFromLegacy(place: Record<string, unknown>): boolean {
  const explicit = readBoolean(place.needNow);
  if (explicit != null) {
    return explicit;
  }

  if (readBoolean(place.isSurvival) === true) {
    return true;
  }

  return place.tag === 'LATE NIGHT BITES';
}

export function migrateCityPackAdminPlaceV3(
  place: Record<string, unknown>
): CityPackPlaceV3 {
  const migrated: Record<string, unknown> = { ...place };

  migrated.isTopPick = resolveIsTopPickFromLegacy(place);
  migrated.needNow = resolveNeedNowFromLegacy(place);

  for (const key of LEGACY_CITY_PACK_PLACE_KEYS) {
    delete migrated[key];
  }

  return migrated as CityPackPlaceV3;
}

export function migrateCityPackContentV3(content: Record<string, unknown>): Record<string, unknown> {
  const places = content.places;

  if (!Array.isArray(places)) {
    return { ...content };
  }

  return {
    ...content,
    places: places.map((place) =>
      migrateCityPackAdminPlaceV3(
        place && typeof place === 'object' ? (place as Record<string, unknown>) : {}
      )
    ),
  };
}

export function findLegacyCityPackPlaceKeys(place: Record<string, unknown>): LegacyCityPackPlaceKey[] {
  return LEGACY_CITY_PACK_PLACE_KEYS.filter((key) => key in place);
}

export function contentHasLegacyCityPackPlaces(content: Record<string, unknown>): boolean {
  const places = content.places;
  if (!Array.isArray(places)) {
    return false;
  }

  return places.some(
    (place) =>
      place &&
      typeof place === 'object' &&
      findLegacyCityPackPlaceKeys(place as Record<string, unknown>).length > 0
  );
}
