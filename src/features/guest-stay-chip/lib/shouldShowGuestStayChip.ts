import { SITE_CONFIG } from '@/shared/config';

export function shouldShowGuestStayChip(input: {
  cleanPath: string;
  isRegistered: boolean;
  hasForeignRegistration: boolean;
}): boolean {
  if (!input.isRegistered || input.hasForeignRegistration) {
    return false;
  }

  return input.cleanPath === SITE_CONFIG.routes.app.concierge.path;
}
