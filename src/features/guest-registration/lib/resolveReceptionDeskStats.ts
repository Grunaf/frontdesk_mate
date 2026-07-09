import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import { resolveBedInventory, flattenBedInventory } from './resolveBedInventory';
import { groupIssuedAccess, todayUtcDate } from './guestAccessDates';

export interface ReceptionDeskStats {
  inUse: number;
  free: number;
  arrivingToday: number;
}

/**
 * Header stats always use **tonight** (UTC nightDate), not the Beds tab segment or in-window access.
 * `arrivingToday` follows `groupIssuedAccess` (check-in date === today UTC).
 */
export function resolveReceptionDeskStats(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[],
  now: Date = new Date()
): ReceptionDeskStats {
  const tonightInventory = resolveBedInventory(settings, stays, {
    nightDate: todayUtcDate(now),
    now,
  });
  const beds = flattenBedInventory(tonightInventory);
  const inUse = beds.filter((entry) => entry.status === 'occupied').length;
  const free = beds.length - inUse;
  const grouped = groupIssuedAccess(stays, now);

  return {
    inUse,
    free,
    arrivingToday: grouped.arrivingToday.length,
  };
}

export function formatReceptionDeskStats(stats: ReceptionDeskStats): string {
  const parts = [`${stats.inUse} in use`, `${stats.free} free`];
  if (stats.arrivingToday > 0) {
    parts.push(`${stats.arrivingToday} arriving today`);
  }
  return parts.join(' · ');
}
