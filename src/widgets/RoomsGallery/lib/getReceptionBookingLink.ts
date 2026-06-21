import { createWhatsappLink } from '@/shared/lib';

export interface GetReceptionBookingLinkArgs {
  phoneRaw: string | null | undefined;
  roomTitle: string;
  checkin?: string | null;
  checkout?: string | null;
}

export function getReceptionBookingLink({
  phoneRaw,
  roomTitle,
  checkin,
  checkout,
}: GetReceptionBookingLinkArgs): string | null {
  const phone = phoneRaw?.trim();
  if (!phone) {
    return null;
  }

  let message = `Hello! I would like to book ${roomTitle}.`;
  if (checkin && checkout) {
    message += ` Dates: from ${checkin} to ${checkout}.`;
  }

  return createWhatsappLink(phone, message);
}
