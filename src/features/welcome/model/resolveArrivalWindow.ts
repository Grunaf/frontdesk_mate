import { isWithinStayArrivalCalendarWindow } from '@/entities/guest-stay';

export function isWithinArrivalWindow(
  checkInAt: string | null | undefined,
  now = new Date(),
  propertyTimeZone?: string | null
): boolean {
  return isWithinStayArrivalCalendarWindow(checkInAt, now, propertyTimeZone);
}
