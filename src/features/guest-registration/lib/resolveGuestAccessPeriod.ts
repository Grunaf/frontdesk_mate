/**
 * Preview of access timestamps for reception forms.
 * checkInAt uses calendar date + checkInTime with a Z suffix — not the property timezone (v1).
 */
export function resolveGuestAccessPeriod(
  checkInDate: string,
  checkOutDate: string,
  checkInTime = '14:00'
): { checkInAt: string; checkOutAt: string } {
  const time = checkInTime.trim() || '14:00';
  const [hours, minutes = '00'] = time.split(':');
  return {
    checkInAt: `${checkInDate.trim()}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`,
    checkOutAt: `${checkOutDate.trim()}T23:59:59.999Z`,
  };
}
