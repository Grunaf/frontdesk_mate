import type { GuestTourismRegistrationSummary } from '../model/types';

export function isTourismRegistrationComplete(
  summary: GuestTourismRegistrationSummary
): boolean {
  return (
    summary.tourism_registration_completed_at != null && summary.guests.length >= 1
  );
}
