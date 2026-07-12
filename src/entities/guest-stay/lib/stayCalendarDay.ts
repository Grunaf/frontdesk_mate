const CALENDAR_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar stay night (check-in / check-out label), aligned with reception desk and bed-night overlap.
 * Uses the YYYY-MM-DD prefix of the stored timestamp — not the guest browser's local instant.
 *
 * The time portion of check_in_at pairs with tenant checkInTime and propertyTimeZone for guest access gates;
 * calendar night labels still use the YYYY-MM-DD prefix (reception desk v1).
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

/** UTC calendar "today", same basis as reception issued-access filters when property TZ is unset. */
export function todayStayCalendarDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Calendar YYYY-MM-DD for "now" in the property timezone (en-CA locale formatting). */
export function todayPropertyStayCalendarDay(
  now: Date = new Date(),
  propertyTimeZone?: string | null
): string {
  const trimmed = propertyTimeZone?.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) {
    return todayStayCalendarDay(now);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: trimmed,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Wall-clock minutes since local midnight in property timezone (fallback: UTC). */
export function propertyLocalMinutesSinceMidnight(
  now: Date = new Date(),
  propertyTimeZone?: string | null
): number {
  const trimmed = propertyTimeZone?.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: trimmed,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? '0';
    return Number(value);
  };

  const hour = read('hour') % 24;
  const minute = read('minute');
  return hour * 60 + minute;
}

function resolveTodayStayCalendarDay(now: Date, propertyTimeZone?: string | null): string {
  return propertyTimeZone?.trim()
    ? todayPropertyStayCalendarDay(now, propertyTimeZone)
    : todayStayCalendarDay(now);
}

export function addStayCalendarDays(fromDay: string, days: number): string {
  const date = parseStayCalendarDate(fromDay);
  date.setUTCDate(date.getUTCDate() + days);
  return formatStayCalendarDate(date);
}

export function compareStayCalendarDays(a: string, b: string): number {
  return a.localeCompare(b);
}

/** True when property-local calendar today is on or after the stay check-in calendar night. */
export function isStayCheckInCalendarDayOrLater(
  checkInAt: string | null | undefined,
  now: Date = new Date(),
  propertyTimeZone?: string | null
): boolean {
  const checkInDay = stayCalendarDay(checkInAt);
  if (!checkInDay) {
    return false;
  }

  const today = resolveTodayStayCalendarDay(now, propertyTimeZone);
  return compareStayCalendarDays(today, checkInDay) >= 0;
}

/** True on the stay check-in calendar night in property-local (or UTC) calendar. */
export function isStayCheckInCalendarDay(
  checkInAt: string | null | undefined,
  now: Date = new Date(),
  propertyTimeZone?: string | null
): boolean {
  const checkInDay = stayCalendarDay(checkInAt);
  if (!checkInDay) {
    return false;
  }

  return resolveTodayStayCalendarDay(now, propertyTimeZone) === checkInDay;
}

/** Check-in calendar night through the following calendar night (inclusive). */
export function isWithinStayArrivalCalendarWindow(
  checkInAt: string | null | undefined,
  now: Date = new Date(),
  propertyTimeZone?: string | null
): boolean {
  const checkInDay = stayCalendarDay(checkInAt);
  if (!checkInDay) {
    return false;
  }

  const today = resolveTodayStayCalendarDay(now, propertyTimeZone);
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
