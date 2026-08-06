import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  listGuestStayBedIds,
  stayRecordCheckInDate,
  stayRecordCheckOutDate,
} from '@/entities/guest-stay';
import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';
import type { TenantSettings } from '@/entities/tenant';
import { addNights } from './guestAccessDates';
import { isPlanCalendarOccupancyStay } from './resolvePlanStayCalendarPresentation';
import { listWholeRoomBlockedBedIdsForDateRange } from './resolveRoomOccupancyBlocks';

function bedFreeForStayNights(input: {
  bedId: string;
  stay: Pick<
    GuestStayRecordWithLink,
    'check_in_at' | 'check_out_at' | 'check_in_date' | 'check_out_date'
  >;
  others: GuestStayRecordWithLink[];
}): boolean {
  const start = stayRecordCheckInDate(input.stay);
  const end = stayRecordCheckOutDate(input.stay);
  if (!start || !end || end <= start) return false;

  for (let night = start; night < end; night = addNights(night, 1)) {
    const occupied = input.others.some(
      (other) => other.bed_id === input.bedId && guestStayCoversNight(other, night)
    );
    if (occupied) return false;
  }
  return true;
}

/**
 * Beds where `stay` can move vertically (same nights, different bedId).
 * Excludes current bed, hard occupancy overlaps, and whole-room sibling holds.
 */
export function listValidVerticalMoveTargetBedIds(input: {
  settings: TenantSettings;
  stays: GuestStayRecordWithLink[];
  stay: GuestStayRecordWithLink;
  /** Defaults to configured guest-stay bed ids. */
  bedIds?: string[];
}): string[] {
  const checkInDate = stayRecordCheckInDate(input.stay);
  const checkOutDate = stayRecordCheckOutDate(input.stay);
  const candidates = (input.bedIds ?? listGuestStayBedIds(input.settings)).filter(
    (bedId) => bedId !== input.stay.bed_id
  );
  if (candidates.length === 0) return [];

  const others = input.stays.filter(
    (entry) => entry.id !== input.stay.id && isPlanCalendarOccupancyStay(entry)
  );

  const wholeRoomBlocked = listWholeRoomBlockedBedIdsForDateRange({
    settings: input.settings,
    stays: others,
    checkInDate,
    checkOutDate,
  });

  return candidates.filter((bedId) => {
    if (wholeRoomBlocked.has(bedId)) return false;
    return bedFreeForStayNights({ bedId, stay: input.stay, others });
  });
}
