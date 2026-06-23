import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { BedInventorySnapshot } from './resolveBedInventory';
import { flattenBedInventory } from './resolveBedInventory';
import { groupIssuedAccess } from './guestAccessDates';

export interface ReceptionDeskStats {
  inUse: number;
  free: number;
  arrivingToday: number;
}

export function resolveReceptionDeskStats(
  inventory: BedInventorySnapshot,
  stays: GuestStayRecordWithLink[],
  now: Date = new Date()
): ReceptionDeskStats {
  const beds = flattenBedInventory(inventory);
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
