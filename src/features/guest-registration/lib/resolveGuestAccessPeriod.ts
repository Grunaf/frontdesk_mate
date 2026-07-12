import { formatPropertyLocalCheckInIso } from '@/entities/guest-stay';

/**
 * Preview of access timestamps for reception forms.
 * checkInAt is a UTC instant for property-local check-in date + time.
 */
export function resolveGuestAccessPeriod(
  checkInDate: string,
  checkOutDate: string,
  checkInTime = '14:00',
  propertyTimeZone?: string | null
): { checkInAt: string; checkOutAt: string } {
  const [hours, minutes = '00'] = time.split(':');
  const checkInAt =
    formatPropertyLocalCheckInIso(checkInDate.trim(), time, propertyTimeZone) ??
    `${checkInDate.trim()}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;

  return {
    checkInAt,
    checkOutAt: `${checkOutDate.trim()}T23:59:59.999Z`,
  };
}
