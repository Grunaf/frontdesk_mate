import { HOSTEL_CONFIG } from '@/shared/config';
import { createWhatsappLink } from '@/shared/lib';

export interface GetMessengerUpgradeLinkArgs {
  checkin: string | null | undefined;
  checkout: string | null | undefined;
}

export const getMessengerUpgradeLink = ({
  checkin,
  checkout,
}: GetMessengerUpgradeLinkArgs): string => {
  let message =
    'Hello! I would like to book 2 beds in the dorm and upgrade them to a Double bed layout.';

  if (checkin && checkout) {
    message += ` Dates: from ${checkin} to ${checkout}.`;
  }

  return createWhatsappLink(HOSTEL_CONFIG.contacts.phone.raw ?? '', message);
};
