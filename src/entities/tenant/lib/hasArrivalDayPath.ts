import { normalizeAccessPoints } from './normalizeAccessPoints';
import type { TenantSettings } from '../model/settings';

/** At least one access point with a photo or guide text for the day check-in path. */
export function hasArrivalDayPath(settings: TenantSettings): boolean {
  return normalizeAccessPoints(settings).some(
    (point) => Boolean(point.guideKey?.trim() || point.image?.trim())
  );
}
