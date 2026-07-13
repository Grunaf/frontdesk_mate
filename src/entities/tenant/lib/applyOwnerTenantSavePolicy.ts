import type { TenantSettings } from '../model/settings';

/**
 * Top-level settings keys owners must never change via form tampering.
 * Add platform-only keys here when introduced.
 *
 * Owner-editable overlays (not on denylist): `hostelPlaces`, `cityPackNeedNowPlaceIds`.
 * City pack catalog content lives in `city_packs`, not in `TenantSettings`.
 */
export const OWNER_TENANT_SETTINGS_DENYLIST: (keyof TenantSettings)[] = [];

function stripLegacyDeskPinHash(
  reception: TenantSettings['reception']
): TenantSettings['reception'] {
  if (!reception) return reception;
  const { deskPinHash: _ignored, ...rest } = reception as TenantSettings['reception'] & {
    deskPinHash?: string;
  };
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/**
 * After merge, restore owner-forbidden fields from the previous snapshot.
 * Strips legacy `deskPinHash` from reception (staff accounts replaced shared desk PIN).
 */
export function applyOwnerTenantSavePolicy(
  merged: TenantSettings,
  previous: TenantSettings | undefined
): TenantSettings {
  if (!previous) {
    return {
      ...merged,
      reception: stripLegacyDeskPinHash(merged.reception),
    };
  }

  let result: TenantSettings = { ...merged };

  for (const key of OWNER_TENANT_SETTINGS_DENYLIST) {
    if (Object.prototype.hasOwnProperty.call(previous, key)) {
      result = { ...result, [key]: previous[key] };
    }
  }

  if (merged.reception || previous.reception) {
    result.reception = stripLegacyDeskPinHash(merged.reception);
  }

  return result;
}
