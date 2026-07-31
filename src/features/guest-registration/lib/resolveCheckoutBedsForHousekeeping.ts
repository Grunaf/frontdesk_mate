import {
  addStayCalendarDays,
  stayRecordCheckOutDate,
} from '@/entities/guest-stay';
import type { HousekeepingBedStatus } from '@/entities/housekeeping';

export type CheckoutHousekeepingStay = {
  bed_id: string;
  revoked_at?: string | null;
  is_archived?: boolean | null;
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
  check_out_at: string;
  check_out_date?: string | null;
};

/** True when stay was admitted at reception (passport or legacy desk check-in). */
export function isCheckoutHousekeepingAdmitted(
  stay: Pick<CheckoutHousekeepingStay, 'passport_checked_at' | 'desk_checked_in_at'>
): boolean {
  return Boolean(stay.desk_checked_in_at);
}

/**
 * Checkout-only: last occupied night equals `targetNight`
 * (exclusive check-out day = targetNight + 1).
 */
export function isCheckoutNightStay(
  stay: CheckoutHousekeepingStay,
  targetNight: string
): boolean {
  if (stay.revoked_at || stay.is_archived) return false;
  if (!stay.bed_id.trim()) return false;
  if (!isCheckoutHousekeepingAdmitted(stay)) return false;

  const checkOutDay = stayRecordCheckOutDate(stay);
  const lastNight = addStayCalendarDays(checkOutDay, -1);
  return lastNight === targetNight;
}

/** Apply Needs strip only when unset or Ready — never regress Strip/Make progress. */
export function shouldMarkBedNeedsStrip(
  current: HousekeepingBedStatus | undefined
): boolean {
  return current === undefined || current === 'ready';
}

/**
 * Unique bed ids from admitted checkout-night stays that should become Needs strip.
 */
export function collectCheckoutBedIdsToMark(
  stays: CheckoutHousekeepingStay[],
  targetNight: string,
  bedStatuses: Record<string, HousekeepingBedStatus | undefined> = {}
): string[] {
  const bedIds = new Set<string>();

  for (const stay of stays) {
    if (!isCheckoutNightStay(stay, targetNight)) continue;
    const bedId = stay.bed_id.trim();
    if (!shouldMarkBedNeedsStrip(bedStatuses[bedId])) continue;
    bedIds.add(bedId);
  }

  return [...bedIds];
}

export type GuestStayBedInventory = {
  beds?: Array<{ id: string }> | null;
};

/** Physical bed ids from guestStay inventory. */
export function listHousekeepingInventoryBedIds(
  guestStay: GuestStayBedInventory | null | undefined
): string[] {
  const ids: string[] = [];
  for (const bed of guestStay?.beds ?? []) {
    const id = bed.id.trim();
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Empty tonight (not mid-stay occupied) beds that should become Needs strip.
 * Keeps Strip→Make progress: never marks already needs_strip / stripped.
 */
export function collectEmptyBedIdsToMark(
  inventoryBedIds: readonly string[],
  occupiedBedIds: ReadonlySet<string>,
  bedStatuses: Record<string, HousekeepingBedStatus | undefined> = {}
): string[] {
  const result: string[] = [];
  for (const rawId of inventoryBedIds) {
    const bedId = rawId.trim();
    if (!bedId || occupiedBedIds.has(bedId)) continue;
    if (!shouldMarkBedNeedsStrip(bedStatuses[bedId])) continue;
    result.push(bedId);
  }
  return result;
}
