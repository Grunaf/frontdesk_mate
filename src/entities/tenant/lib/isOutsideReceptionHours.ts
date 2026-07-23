import { propertyLocalMinutesSinceMidnight } from '@/entities/guest-stay';

function parseHoursMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * True when reception is closed (outside [open, close) in property TZ).
 * If open or close is missing/invalid → false (treat as day / open).
 * Supports overnight windows when close ≤ open (e.g. 22:00–06:00).
 */
export function isOutsideReceptionHours(
  open: string | undefined,
  close: string | undefined,
  now: Date = new Date(),
  propertyTimeZone?: string | null
): boolean {
  const openMinutes = open ? parseHoursMinutes(open) : null;
  const closeMinutes = close ? parseHoursMinutes(close) : null;
  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  const nowMinutes = propertyLocalMinutesSinceMidnight(now, propertyTimeZone);

  if (openMinutes === closeMinutes) {
    return false;
  }

  if (closeMinutes > openMinutes) {
    return nowMinutes < openMinutes || nowMinutes >= closeMinutes;
  }

  // Overnight: open late, close next morning.
  return nowMinutes >= closeMinutes && nowMinutes < openMinutes;
}
