import type { TenantRecord } from '../model/settings';
import type { TenantGuestShell } from '../model/guest-shell';
import { isCityPackId, type CityPackId } from '@/entities/hostel';
import { buildHostelConfig } from './buildHostelConfig';
import { resolveCapabilities } from './resolveCapabilities';
import {
  isTenantAppAccessible,
  resolveTenantLifecycleStatus,
} from './resolveTenantLifecycle';
import type { TenantSettings } from '../model/settings';
import type { TenantConfig } from '../model/tenant-config';

const DEFAULT_CITY_PACK: CityPackId = 'sarajevo';

function mapRecordToConfig(record: TenantRecord): TenantConfig {
  const settings = (record.settings ?? {}) as TenantSettings;
  let cityPackId: CityPackId = DEFAULT_CITY_PACK;

  if (isCityPackId(record.city_pack_id)) {
    cityPackId = record.city_pack_id;
  }

  const lifecycleStatus = resolveTenantLifecycleStatus(record);

  return {
    slug: record.slug,
    name: record.name,
    cityPackId,
    lifecycleStatus,
    subscriptionStartsAt: record.subscription_starts_at ?? null,
    hostel: buildHostelConfig(settings),
    capabilities: resolveCapabilities({ cityPackId, settings, lifecycleStatus }),
    settings,
    source: 'database',
  };
}

export function buildTenantGuestShell(record: TenantRecord): TenantGuestShell | null {
  if (isTenantAppAccessible(record)) {
    return null;
  }

  const lifecycleStatus = resolveTenantLifecycleStatus(record);
  if (lifecycleStatus === 'active') {
    return null;
  }

  const settings = (record.settings ?? {}) as TenantSettings;
  const hostel = buildHostelConfig(settings);

  return {
    slug: record.slug,
    name: record.name,
    lifecycleStatus,
    subscriptionStartsAt: record.subscription_starts_at ?? null,
    contacts: {
      phone: hostel.contacts.phone,
      email: hostel.contacts.email,
      receptionWhatsapp: hostel.reception.whatsapp,
      whatsappEnabled: hostel.reception.whatsappEnabled,
    },
  };
}

export type TenantAccessResult =
  | { kind: 'active'; config: TenantConfig }
  | { kind: 'offline'; shell: TenantGuestShell }
  | { kind: 'missing' };

export function resolveTenantAccessFromLookup(input: {
  slug: string | null;
  record: TenantRecord | null;
  site: 'landing' | 'app';
  isProdEnv: boolean;
}): TenantAccessResult {
  if (!input.slug || !input.record) {
    return { kind: 'missing' };
  }

  if (!input.isProdEnv) {
    return { kind: 'active', config: mapRecordToConfig(input.record) };
  }

  const lifecycleStatus = resolveTenantLifecycleStatus(input.record);

  if (lifecycleStatus === 'active') {
    return { kind: 'active', config: mapRecordToConfig(input.record) };
  }

  if (
    input.site === 'landing' &&
    (lifecycleStatus === 'expired' || lifecycleStatus === 'scheduled')
  ) {
    return { kind: 'active', config: mapRecordToConfig(input.record) };
  }

  const shell = buildTenantGuestShell(input.record);
  if (!shell) {
    return { kind: 'missing' };
  }

  return { kind: 'offline', shell };
}
