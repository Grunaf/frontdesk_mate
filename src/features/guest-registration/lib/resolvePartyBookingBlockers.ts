import type { TourismStatusBadge } from './resolveStayDetailTabBadge';

export type PartyBookingBlockersInput = {
  partyStays: Array<{
    id: string;
    passport_checked_at?: string | null;
    desk_checked_in_at?: string | null;
  }>;
  showTourismSummary: boolean;
  tourismByStayId: Record<string, TourismStatusBadge>;
};

function isStayAdmitted(stay: {
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
}): boolean {
  return Boolean(stay.desk_checked_in_at);
}

/**
 * Short desk copy for party Booking readiness blockers.
 * Returns null when nothing is blocking group check-in readiness.
 */
export function resolvePartyBookingBlockers(
  input: PartyBookingBlockersInput
): string | null {
  const total = input.partyStays.length;
  if (total === 0) return null;

  const parts: string[] = [];

  if (input.showTourismSummary) {
    const needTourism = input.partyStays.filter(
      (member) => (input.tourismByStayId[member.id] ?? 'not_started') !== 'complete'
    ).length;
    if (needTourism > 0) {
      parts.push(
        needTourism === 1
          ? '1 bed needs tourism'
          : `${needTourism} beds need tourism`
      );
    }
  }

  const expected = input.partyStays.filter((member) => !isStayAdmitted(member)).length;
  if (expected > 0) {
    parts.push(expected === 1 ? '1 expected' : `${expected} expected`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
