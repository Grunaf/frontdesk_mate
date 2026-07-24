import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';

export type PresenceEligibleStay = {
  id: string;
  bed_id: string;
  guest_name?: string | null;
  revoked_at?: string | null;
  is_archived?: boolean | null;
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
  check_in_at: string;
  check_out_at: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
};

export type BedStayPresenceLink = {
  stayId: string;
  guestName: string;
};

function isAdmitted(stay: PresenceEligibleStay): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

/**
 * Admitted stays covering `nightDate`, keyed by bed_id (first wins if clash).
 * Used by Cleaning to show Vacant / Still here only when a guest occupies the bed.
 */
export function resolveBedStayPresenceLinks(
  stays: PresenceEligibleStay[],
  nightDate: string
): Record<string, BedStayPresenceLink> {
  const byBed: Record<string, BedStayPresenceLink> = {};

  for (const stay of stays) {
    if (stay.revoked_at || stay.is_archived) continue;
    if (!isAdmitted(stay)) continue;
    const bedId = stay.bed_id.trim();
    if (!bedId || byBed[bedId]) continue;

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

    byBed[bedId] = {
      stayId: stay.id,
      guestName: stay.guest_name?.trim() || 'Guest',
    };
  }

  return byBed;
}
