import type { TenantSettings } from '../model/settings';

/**
 * Top-level settings keys owners must never change via form tampering.
 * Add platform-only keys here when introduced.
 *
 * Owner-editable overlays (not on denylist): `hostelPlaces`, `cityPackNeedNowPlaceIds`.
 * City pack catalog content lives in `city_packs`, not in `TenantSettings`.
 */
export const OWNER_TENANT_SETTINGS_DENYLIST: (keyof TenantSettings)[] = [];

/**
 * After merge, restore owner-forbidden fields from the previous snapshot.
 * Desk PIN hash stays unchanged until owner PIN UI (Module 10).
 */
export function applyOwnerTenantSavePolicy(
  merged: TenantSettings,
  previous: TenantSettings | undefined
): TenantSettings {
  if (!previous) {
    return merged;
  }

  let result: TenantSettings = { ...merged };

  for (const key of OWNER_TENANT_SETTINGS_DENYLIST) {
    if (Object.prototype.hasOwnProperty.call(previous, key)) {
      result = { ...result, [key]: previous[key] };
    }
  }

  if (merged.reception || previous.reception) {
    const { deskPinHash: _ignored, ...mergedReceptionRest } = merged.reception ?? {};
    result.reception = {
      ...mergedReceptionRest,
      deskPinHash: previous.reception?.deskPinHash,
    };
  }

  return result;
}
