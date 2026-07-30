import { SITE_CONFIG } from '@/shared/config';

const BOOKING_ANCHOR_PATHS = new Set([
  SITE_CONFIG.routes.app.welcome.path,
  SITE_CONFIG.routes.app.staySetup.path,
  SITE_CONFIG.routes.app.registration.path,
]);

/**
 * Show stay profile chip during onboarding (arrival guide),
 * not on hub (that uses GuestStayChip) or locked check-in routes.
 */
export function shouldShowGuestBookingAnchor(input: {
  cleanPath: string;
  hasSession: boolean;
  hasForeignRegistration: boolean;
}): boolean {
  if (!input.hasSession || input.hasForeignRegistration) {
    return false;
  }

  return BOOKING_ANCHOR_PATHS.has(input.cleanPath);
}
