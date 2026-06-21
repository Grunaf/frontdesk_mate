/**
 * Keep in sync with src/entities/city-pack/lib/migrateCityPackPlaceV3.ts
 */

const LEGACY_CITY_PACK_PLACE_KEYS = [
  'tag',
  'isSurvival',
  'recommendedBy',
  'photoUrl',
  'priority',
  'subCategory',
];

function readBoolean(value) {
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

function resolveIsTopPickFromLegacy(place) {
  const explicit = readBoolean(place.isTopPick);
  if (explicit != null) {
    return explicit;
  }

  return place.tag === 'TOP PICK';
}

function resolveNeedNowFromLegacy(place) {
  const explicit = readBoolean(place.needNow);
  if (explicit != null) {
    return explicit;
  }

  if (readBoolean(place.isSurvival) === true) {
    return true;
  }

  return place.tag === 'LATE NIGHT BITES';
}

function migrateCityPackAdminPlaceV3(place) {
  const migrated = { ...place };

  migrated.isTopPick = resolveIsTopPickFromLegacy(place);
  migrated.needNow = resolveNeedNowFromLegacy(place);

  for (const key of LEGACY_CITY_PACK_PLACE_KEYS) {
    delete migrated[key];
  }

  return migrated;
}

function migrateCityPackContentV3(content) {
  const places = content.places;

  if (!Array.isArray(places)) {
    return { ...content };
  }

  return {
    ...content,
    places: places.map((place) =>
      migrateCityPackAdminPlaceV3(place && typeof place === 'object' ? place : {})
    ),
  };
}

function findLegacyCityPackPlaceKeys(place) {
  return LEGACY_CITY_PACK_PLACE_KEYS.filter((key) => key in place);
}

function contentHasLegacyCityPackPlaces(content) {
  const places = content.places;
  if (!Array.isArray(places)) {
    return false;
  }

  return places.some(
    (place) =>
      place && typeof place === 'object' && findLegacyCityPackPlaceKeys(place).length > 0
  );
}

module.exports = {
  LEGACY_CITY_PACK_PLACE_KEYS,
  migrateCityPackAdminPlaceV3,
  migrateCityPackContentV3,
  findLegacyCityPackPlaceKeys,
  contentHasLegacyCityPackPlaces,
};
