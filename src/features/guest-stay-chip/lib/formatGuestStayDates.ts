import { formatStayCalendarDayLabel } from '@/entities/guest-stay';

export function formatGuestStayDateRange(
  checkInAt: string,
  checkOutAt: string,
  locale: string
): string | null {
  const checkIn = formatStayCalendarDayLabel(checkInAt, locale);
  const checkOut = formatStayCalendarDayLabel(checkOutAt, locale);

  if (!checkIn || !checkOut) {
    return null;
  }

  return `${checkIn} – ${checkOut}`;
}

export function formatGuestStayCheckoutShort(checkOutAt: string, locale: string): string | null {
  return formatStayCalendarDayLabel(checkOutAt, locale);
}
