function formatStayDay(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatGuestStayDateRange(
  checkInAt: string,
  checkOutAt: string,
  locale: string
): string | null {
  const checkIn = formatStayDay(checkInAt, locale);
  const checkOut = formatStayDay(checkOutAt, locale);

  if (!checkIn || !checkOut) {
    return null;
  }

  return `${checkIn} – ${checkOut}`;
}

export function formatGuestStayCheckoutShort(checkOutAt: string, locale: string): string | null {
  return formatStayDay(checkOutAt, locale);
}
