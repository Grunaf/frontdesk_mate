import { formatPropertyLocalCheckInIso } from '@/entities/guest-stay';

/**
 * Preview of stay period for reception forms.
 * checkInAt is a derived UTC instant (stay check-in date + tenant checkInTime in property TZ).
 * Calendar nights use the YYYY-MM-DD prefix only.
 */
export function resolveGuestAccessPeriod(
  checkInDate: string,
  checkOutDate: string,
  checkInTime = '14:00',
  propertyTimeZone?: string | null
): { checkInAt: string; checkOutAt: string } {
  const time = (checkInTime ?? '14:00').trim() || '14:00';
  const [hours, minutes = '00'] = time.split(':');
  const checkInAt =
    formatPropertyLocalCheckInIso(checkInDate.trim(), time, propertyTimeZone) ??
    `${checkInDate.trim()}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;

  return {
    checkInAt,
    checkOutAt: `${checkOutDate.trim()}T23:59:59.999Z`,
  };
}
