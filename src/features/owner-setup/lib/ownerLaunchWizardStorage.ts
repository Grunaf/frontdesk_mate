import type { LaunchBookingPath, LaunchStepId } from '@/entities/tenant/lib/resolveGuestPathReadiness';

const STEP_PREFIX = 'owner-launch-step:';
const BOOKING_PREFIX = 'owner-launch-booking-path:';

export function readStoredOwnerLaunchStep(slug: string): LaunchStepId | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(`${STEP_PREFIX}${slug}`);
  const allowed: LaunchStepId[] = [
    'identity',
    'contacts-landing',
    'booking',
    'arrival',
    'room-map',
    'rules-wifi',
    'preview',
  ];
  return allowed.includes(value as LaunchStepId) ? (value as LaunchStepId) : null;
}

export function writeStoredOwnerLaunchStep(slug: string, stepId: LaunchStepId): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${STEP_PREFIX}${slug}`, stepId);
}

export function readStoredOwnerLaunchBookingPath(slug: string): LaunchBookingPath | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(`${BOOKING_PREFIX}${slug}`);
  return value === 'engine' || value === 'wa' ? value : null;
}

export function writeStoredOwnerLaunchBookingPath(slug: string, path: LaunchBookingPath): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${BOOKING_PREFIX}${slug}`, path);
}
