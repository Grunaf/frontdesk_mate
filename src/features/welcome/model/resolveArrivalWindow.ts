import { isWithinStayArrivalCalendarWindow } from '@/entities/guest-stay';

export function isWithinArrivalWindow(checkInAt: string | null | undefined, now = new Date()): boolean {
  return isWithinStayArrivalCalendarWindow(checkInAt, now);
}
