import { createWhatsappLink } from '@/shared/lib';

export interface GetMessengerUpgradeLinkArgs {
  phoneRaw: string | null | undefined;
  checkin?: string | null;
  checkout?: string | null;
}

export const getMessengerUpgradeLink = ({
  phoneRaw,
  checkin,
  checkout,
}: GetMessengerUpgradeLinkArgs): string => {
  let message =
    'Hello! I would like to book 2 beds in the dorm and upgrade them to a Double bed layout.';

  if (checkin && checkout) {
    message += ` Dates: from ${checkin} to ${checkout}.`;
  }

  return createWhatsappLink(phoneRaw ?? '', message);
};
