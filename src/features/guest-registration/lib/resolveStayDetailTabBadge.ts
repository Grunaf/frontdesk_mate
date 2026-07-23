import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import type { GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';

export type StayDetailTabId = 'access' | 'stay' | 'tourism';

export type StayDetailTabBadgeTone = 'none' | 'muted' | 'amber' | 'emerald';

export type TourismStatusBadge = 'not_started' | 'in_progress' | 'complete' | 'documents_purged';

export function isTourismDocumentsPurged(
  registration: GuestTourismRegistrationSummary | null
): boolean {
  if (!registration) return false;
  return (
    registration.tourism_registration_completed_at != null && registration.guests.length === 0
  );
}

export function resolveTourismStatusBadge(
  registration: GuestTourismRegistrationSummary | null
): TourismStatusBadge {
  if (isTourismDocumentsPurged(registration)) {
    return 'documents_purged';
  }
  if (!registration || registration.guests.length === 0) {
    return 'not_started';
  }
  if (isTourismRegistrationComplete(registration)) {
    return 'complete';
  }
  return 'in_progress';
}

export function tourismStatusBadgeLabel(status: TourismStatusBadge): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'complete':
      return 'Complete';
    case 'documents_purged':
      return 'Documents purged';
  }
}

export function resolveAccessTabBadge(input: {
  hasMagicLink: boolean;
  hasPinInSession: boolean;
}): StayDetailTabBadgeTone {
  if (!input.hasMagicLink) return 'muted';
  if (!input.hasPinInSession) return 'muted';
  return 'none';
}

export function resolveTourismTabBadge(
  status: TourismStatusBadge | null
): StayDetailTabBadgeTone {
  if (!status) return 'none';
  switch (status) {
    case 'not_started':
    case 'in_progress':
      return 'amber';
    case 'complete':
      return 'emerald';
    case 'documents_purged':
      return 'muted';
  }
}
