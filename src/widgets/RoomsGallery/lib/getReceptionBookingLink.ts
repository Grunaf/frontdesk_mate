import { createWhatsappLink } from '@/shared/lib';

export interface GetReceptionBookingLinkArgs {
  phoneRaw: string | null | undefined;
  roomTitle: string;
  checkin?: string | null;
  checkout?: string | null;
  /** When true, message asks for the whole room (private / room-unit offer). */
  wholeRoom?: boolean;
}

export function getReceptionBookingLink({
  phoneRaw,
  roomTitle,
  checkin,
  checkout,
  wholeRoom = false,
}: GetReceptionBookingLinkArgs): string | null {
  const phone = phoneRaw?.trim();
  if (!phone) {
    return null;
  }

  let message = wholeRoom
    ? `Hello! I would like to book the whole room: ${roomTitle}.`
    : `Hello! I would like to book ${roomTitle}.`;
  if (checkin && checkout) {
    message += ` Dates: from ${checkin} to ${checkout}.`;
  }

  return createWhatsappLink(phone, message);
}
