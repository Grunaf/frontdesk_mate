import type { TenantSettings } from '../model/settings';

export type TenantSettingsAuditDiff = {
  changedKeys: string[];
  deskPinChanged: boolean;
};

const TOP_LEVEL_AUDIT_KEYS: (keyof TenantSettings)[] = [
  'booking',
  'checkInTime',
  'checkOutTime',
  'operationalDayStartTime',
  'cityTax',
  'selfCheckInTimeAfter',
  'laundryCost',
  'heroBgUrl',
  'reception',
  'recommendationMap',
  'wifi',
  'contacts',
  'brand',
  'logoUrl',
  'landing',
  'hostel',
  'guestStay',
  'arrivalAccess',
  'activeRulesKeys',
  'houseRules',
  'guestExtras',
  'hubTransfer',
  'hostelPlaces',
  'cityPackNeedNowPlaceIds',
  'faqPackId',
  'arrivalWalkToHostel',
  'arrivalWalkToHostelByRoute',
  'arrivalWalkMapsUrlByRoute',
  'arrivalGetOffAtByRoute',
  'arrivalLocalByRoute',
  'arrivalRouteTipsByRoute',
];

function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function redactSliceForCompare(key: keyof TenantSettings, value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (key === 'wifi' && value && typeof value === 'object') {
    const { password: _password, ...rest } = value as TenantSettings['wifi'] & {
      password?: string;
    };
    return rest;
  }

  if (key === 'reception' && value && typeof value === 'object') {
    const { deskPinHash: _hash, ...rest } = value as NonNullable<TenantSettings['reception']>;
    return rest;
  }

  return value;
}

function collectKeys(settings: TenantSettings | undefined): Set<keyof TenantSettings> {
  const keys = new Set<keyof TenantSettings>(TOP_LEVEL_AUDIT_KEYS);
  if (settings) {
    for (const key of Object.keys(settings) as (keyof TenantSettings)[]) {
      keys.add(key);
    }
  }
  return keys;
}

export function diffTenantSettingsForAudit(
  previous: TenantSettings | undefined,
  next: TenantSettings | undefined
): TenantSettingsAuditDiff {
  const prev = previous ?? {};
  const nxt = next ?? {};

  const prevHash = prev.reception?.deskPinHash ?? '';
  const nextHash = nxt.reception?.deskPinHash ?? '';
  const deskPinChanged = prevHash !== nextHash;

  const changedKeys: string[] = [];

  const allKeys = new Set<keyof TenantSettings>([
    ...collectKeys(prev),
    ...collectKeys(nxt),
  ]);

  for (const key of allKeys) {
    if (key === 'reception') {
      const prevSlice = redactSliceForCompare('reception', prev.reception);
      const nextSlice = redactSliceForCompare('reception', nxt.reception);
      if (stableStringify(prevSlice) !== stableStringify(nextSlice)) {
        changedKeys.push('reception');
      }
      continue;
    }

    if (key === 'wifi') {
      const prevWifi = prev.wifi;
      const nextWifi = nxt.wifi;
      const passwordChanged = (prevWifi?.password ?? '') !== (nextWifi?.password ?? '');
      const prevSlice = redactSliceForCompare('wifi', prevWifi);
      const nextSlice = redactSliceForCompare('wifi', nextWifi);
      if (stableStringify(prevSlice) !== stableStringify(nextSlice) || passwordChanged) {
        changedKeys.push('wifi');
      }
      continue;
    }

    const prevSlice = redactSliceForCompare(key, prev[key]);
    const nextSlice = redactSliceForCompare(key, nxt[key]);
    if (stableStringify(prevSlice) !== stableStringify(nextSlice)) {
      changedKeys.push(key);
    }
  }

  changedKeys.sort();

  return { changedKeys, deskPinChanged };
}
