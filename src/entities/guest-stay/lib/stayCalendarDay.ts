const CALENDAR_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar stay night (check-in / check-out label), aligned with reception desk and bed-night overlap.
 * Uses the YYYY-MM-DD prefix of the stored timestamp — not the guest browser's local instant.
 *
 * The time portion of check_in_at (from tenant checkInTime + "Z" suffix) is for access instants only;
 * it is not the hostel's IANA timezone (property TZ is not in settings v1).
 */
export function stayCalendarDay(isoTimestamp: string | null | undefined): string | null {
  const trimmed = isoTimestamp?.trim();
  if (!trimmed || trimmed.length < 10) {
    return null;
  }

  const day = trimmed.slice(0, 10);
  return CALENDAR_DAY_RE.test(day) ? day : null;
}

function parseStayCalendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatStayCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** UTC calendar "today", same basis as reception issued-access filters. */
export function todayStayCalendarDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addStayCalendarDays(fromDay: string, days: number): string {
  const date = parseStayCalendarDate(fromDay);
  date.setUTCDate(date.getUTCDate() + days);
  return formatStayCalendarDate(date);
}

export function compareStayCalendarDays(a: string, b: string): number {
  return a.localeCompare(b);
}

/** True when UTC calendar today is on or after the stay check-in calendar night. */
export function isStayCheckInCalendarDayOrLater(
  checkInAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const checkInDay = stayCalendarDay(checkInAt);
  if (!checkInDay) {
    return false;
  }

  const today = todayStayCalendarDay(now);
  return compareStayCalendarDays(today, checkInDay) >= 0;
}

/** True on the stay check-in calendar night (UTC date line). */
export function isStayCheckInCalendarDay(
  checkInAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const checkInDay = stayCalendarDay(checkInAt);
  if (!checkInDay) {
    return false;
  }

  return todayStayCalendarDay(now) === checkInDay;
}

/** Check-in calendar night through the following calendar night (inclusive). */
export function isWithinStayArrivalCalendarWindow(
  checkInAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const checkInDay = stayCalendarDay(checkInAt);
  if (!checkInDay) {
    return false;
  }

  const today = todayStayCalendarDay(now);
  const lastArrivalDay = addStayCalendarDays(checkInDay, 1);
  return compareStayCalendarDays(today, checkInDay) >= 0 && compareStayCalendarDays(today, lastArrivalDay) <= 0;
}

export function formatStayCalendarDayLabel(isoTimestamp: string, locale: string): string | null {
  const day = stayCalendarDay(isoTimestamp);
  if (!day) {
    return null;
  }

  const date = parseStayCalendarDate(day);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}
