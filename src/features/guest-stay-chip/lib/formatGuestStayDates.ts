import { formatStayCalendarDayLabel } from '@/entities/guest-stay';

/** Prefer calendar YYYY-MM-DD; fall back to ISO timestamp (UTC prefix). */
export function formatGuestStayDateRange(
  checkInAt: string,
  checkOutAt: string,
  locale: string,
  calendar?: { checkInDate?: string | null; checkOutDate?: string | null }
): string | null {
  const checkIn = formatStayCalendarDayLabel(calendar?.checkInDate || checkInAt, locale);
  const checkOut = formatStayCalendarDayLabel(calendar?.checkOutDate || checkOutAt, locale);

  if (!checkIn || !checkOut) {
    return null;
  }

  return `${checkIn} – ${checkOut}`;
}

export function formatGuestStayCheckoutShort(
  checkOutAt: string,
  locale: string,
  checkOutDate?: string | null
): string | null {
  return formatStayCalendarDayLabel(checkOutDate || checkOutAt, locale);
}
