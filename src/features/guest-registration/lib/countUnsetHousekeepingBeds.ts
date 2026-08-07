import type { HousekeepingBedStatus } from '@/entities/housekeeping';

/** Beds in inventory that still have no housekeeping status set. */
export function countUnsetHousekeepingBeds(
  bedIds: readonly string[],
  bedStatuses: Record<string, HousekeepingBedStatus | undefined> | undefined
): number {
  if (!bedStatuses || bedIds.length === 0) return 0;
  return bedIds.reduce((count, bedId) => (bedStatuses[bedId] == null ? count + 1 : count), 0);
}
