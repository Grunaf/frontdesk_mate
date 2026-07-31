import { stayRecordCheckOutDate } from '@/entities/guest-stay';

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
  return Boolean(stay.desk_checked_in_at);
}

/**
 * Admitted stays checking out on `operationalDate` (exclusive checkout day), keyed by bed.
 * Hostel does not mid-stay linen-change — Vacant / Still here only for early leave on departure day.
 */
export function resolveBedStayPresenceLinks(
  stays: PresenceEligibleStay[],
  operationalDate: string
): Record<string, BedStayPresenceLink> {
  const byBed: Record<string, BedStayPresenceLink> = {};

  for (const stay of stays) {
    if (stay.revoked_at || stay.is_archived) continue;
    if (!isAdmitted(stay)) continue;
    const bedId = stay.bed_id.trim();
    if (!bedId || byBed[bedId]) continue;

    if (stayRecordCheckOutDate(stay) !== operationalDate) continue;

    byBed[bedId] = {
      stayId: stay.id,
      guestName: stay.guest_name?.trim() || 'Guest',
    };
  }

  return byBed;
}
