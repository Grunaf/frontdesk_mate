import type { StaySetupStatus } from '@/features/guest-stay-contact';

export type TourismSummaryFromStaySetupStatus =
  | { kind: 'not_started' }
  | { kind: 'in_progress'; guestCount: number }
  | { kind: 'complete'; guestCount: number };

/** Map shared stay-setup status → My Stay tourism summary card (no guest list). */
export function resolveTourismSummaryFromStaySetupStatus(
  status: Pick<StaySetupStatus, 'tourismComplete' | 'tourismGuestCount'>
): TourismSummaryFromStaySetupStatus {
  if (status.tourismComplete) {
    return { kind: 'complete', guestCount: status.tourismGuestCount };
  }
  if (status.tourismGuestCount === 0) {
    return { kind: 'not_started' };
  }
  return { kind: 'in_progress', guestCount: status.tourismGuestCount };
}
