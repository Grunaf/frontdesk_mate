import { SITE_CONFIG } from '@/shared/config';

export function shouldShowGuestCheckInChip(input: {
  cleanPath: string;
  isRegistered: boolean;
}): boolean {
  if (input.isRegistered) {
    return false;
  }

  return input.cleanPath === SITE_CONFIG.routes.app.concierge.path;
}
