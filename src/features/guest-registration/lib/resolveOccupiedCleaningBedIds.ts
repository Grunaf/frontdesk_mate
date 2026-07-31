import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';

export type OccupiedCleaningStay = {
  bed_id: string;
  revoked_at?: string | null;
  is_archived?: boolean | null;
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
  check_in_at: string;
  check_out_at: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
};

function isAdmitted(stay: OccupiedCleaningStay): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

/**
 * Bed ids with an admitted guest covering `nightDate` (mid-stay occupancy).
 * Checkout day is exclusive — those beds are not occupied for tonight and stay cleanable.
 */
export function resolveOccupiedCleaningBedIds(
  stays: readonly OccupiedCleaningStay[],
  nightDate: string
): Set<string> {
  const occupied = new Set<string>();

  for (const stay of stays) {
    if (stay.revoked_at || stay.is_archived) continue;
    if (!isAdmitted(stay)) continue;
    const bedId = stay.bed_id.trim();
    if (!bedId || occupied.has(bedId)) continue;

    if (
      !guestStayCoversNight(
        {
          check_in_at: stay.check_in_at,
          check_out_at: stay.check_out_at,
          check_in_date: stay.check_in_date,
          check_out_date: stay.check_out_date,
          is_archived: Boolean(stay.is_archived),
        },
        nightDate
      )
    ) {
      continue;
    }

    occupied.add(bedId);
  }

  return occupied;
}
