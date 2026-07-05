import { isCityPackNeedNowEligibleCategory } from '@/entities/hostel';
import type { CityPackContent } from '../model/types';
import { normalizeCityPackAdminPlace } from './normalizeCityPackAdminPlace';

export function validateCityPackNeedNowPlaceIds(
  content: CityPackContent | undefined,
  ids: string[]
): { ok: true } | { ok: false; message: string } {
  if (ids.length === 0) {
    return { ok: true };
  }

  const eligibleIds = new Set(
    (content?.places ?? [])
      .map((place) => normalizeCityPackAdminPlace(place))
      .filter((place) => place.id && place.name.trim() && place.category)
      .filter((place) => isCityPackNeedNowEligibleCategory(place.category))
      .map((place) => place.id)
  );

  for (const id of ids) {
    if (!eligibleIds.has(id)) {
      return {
        ok: false,
        message: 'One or more essential place ids are not allowed for this city pack.',
      };
    }
  }

  return { ok: true };
}
