import { createWhatsappLink } from '@/shared/lib';

export interface GetHeroWhatsappBookingLinkArgs {
  phoneRaw: string | null | undefined;
  hostelName: string;
  checkin?: string | null;
  checkout?: string | null;
  guests?: string | null;
}

export function getHeroWhatsappBookingLink({
  phoneRaw,
  hostelName,
  checkin,
  checkout,
  guests,
}: GetHeroWhatsappBookingLinkArgs): string | null {
  const phone = phoneRaw?.trim();
  if (!phone) {
    return null;
  }

  let message = `Hello! I would like to book a stay at ${hostelName}.`;
  if (checkin && checkout) {
    message += ` Dates: from ${checkin} to ${checkout}.`;
  } else if (checkin) {
    message += ` Check-in: ${checkin}.`;
  }
  if (guests) {
    message += ` Guests: ${guests}.`;
  }

  return createWhatsappLink(phone, message);
}

export const LANDING_WA_FOLLOWUP_STORAGE_KEY = 'frontdesk:landing-wa-followup';

export function markLandingWhatsappFollowup(): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(LANDING_WA_FOLLOWUP_STORAGE_KEY, '1');
  window.dispatchEvent(new Event('landing-wa-followup'));
}
