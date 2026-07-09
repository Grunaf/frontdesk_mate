import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import { flattenBedInventory, resolveBedInventory } from './resolveBedInventory';
import { resolveReceptionHubSnapshot } from './resolveReceptionHubSnapshot';

export interface ReceptionDeskStats {
  inUse: number;
  free: number;
  arrivingToday: number;
}

/**
 * Header stats use the **current operational day** night map and hub arrival buckets.
 * `arrivingToday` = count of *Expected today* (same source as Desk hub).
 */
export function resolveReceptionDeskStats(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[],
  now: Date = new Date()
): ReceptionDeskStats {
  const hub = resolveReceptionHubSnapshot(settings, stays, now);
  const operationalNight = hub.operational.operationalDate;

  const inventory = resolveBedInventory(settings, stays, {
    nightDate: operationalNight,
    now,
  });
  const beds = flattenBedInventory(inventory);
  const inUse = beds.filter((entry) => entry.status === 'occupied').length;
  const free = hub.freeBedEntries.length;

  return {
    inUse,
    free,
    arrivingToday: hub.expectedToday.length,
  };
}

export function formatReceptionDeskStats(stats: ReceptionDeskStats): string {
  const parts = [`${stats.inUse} in use`, `${stats.free} free`];
  if (stats.arrivingToday > 0) {
    parts.push(`${stats.arrivingToday} arriving today`);
  }
  return parts.join(' · ');
}
