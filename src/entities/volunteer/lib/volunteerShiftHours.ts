import { addStayCalendarDays, compareStayCalendarDays } from '@/entities/guest-stay';

const CALENDAR_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ISO_WEEKDAYS_MON_FRI: IsoWeekday[] = [1, 2, 3, 4, 5];
export const ISO_WEEKDAYS_ALL: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Monday (ISO) of the week containing `calendarDay` (YYYY-MM-DD). */
export function startOfIsoWeekCalendarDay(calendarDay: string): string | null {
  const day = calendarDay.trim();
  if (!CALENDAR_DAY_RE.test(day)) return null;

  const [year, month, date] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  const weekday = utc.getUTCDay(); // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addStayCalendarDays(day, offset);
}

export function endOfIsoWeekCalendarDay(weekStartMonday: string): string | null {
  if (!CALENDAR_DAY_RE.test(weekStartMonday.trim())) return null;
  return addStayCalendarDays(weekStartMonday.trim(), 6);
}

/** ISO weekday 1–7 for a calendar day (UTC date math). */
export function isoWeekdayOfCalendarDay(calendarDay: string): IsoWeekday | null {
  const day = calendarDay.trim();
  if (!CALENDAR_DAY_RE.test(day)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  const sundayBased = utc.getUTCDay();
  return (sundayBased === 0 ? 7 : sundayBased) as IsoWeekday;
}

/** Seven calendar days Mon→Sun for an ISO week start. */
export function listIsoWeekCalendarDays(weekStartMonday: string): string[] | null {
  const start = startOfIsoWeekCalendarDay(weekStartMonday);
  if (!start) return null;
  return Array.from({ length: 7 }, (_, index) => addStayCalendarDays(start, index));
}

/**
 * Expand inclusive [from, until] to matching ISO weekdays (1=Mon…7=Sun).
 * Caps at 366 dates to avoid runaway ranges.
 */
export function expandRepeatWorkDates(input: {
  from: string;
  until: string;
  weekdays: IsoWeekday[];
}): string[] {
  const from = input.from.trim();
  const until = input.until.trim();
  if (!CALENDAR_DAY_RE.test(from) || !CALENDAR_DAY_RE.test(until)) return [];
  if (compareStayCalendarDays(from, until) > 0) return [];

  const wanted = new Set(input.weekdays.filter((day) => day >= 1 && day <= 7));
  if (wanted.size === 0) return [];

  const dates: string[] = [];
  let cursor = from;
  while (compareStayCalendarDays(cursor, until) <= 0 && dates.length < 366) {
    const weekday = isoWeekdayOfCalendarDay(cursor);
    if (weekday && wanted.has(weekday)) {
      dates.push(cursor);
    }
    cursor = addStayCalendarDays(cursor, 1);
  }
  return dates;
}

/** Property-local YYYY-MM-DD for a shift instant. */
export function shiftPropertyCalendarDay(
  startsAtIso: string,
  propertyTimeZone: string
): string | null {
  const ms = Date.parse(startsAtIso);
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: propertyTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ms));
  } catch {
    return null;
  }
}

/** Property-local HH:mm for a shift instant. */
export function shiftPropertyClockHhMm(
  iso: string,
  propertyTimeZone: string
): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: propertyTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms));
    const hour = parts.find((part) => part.type === 'hour')?.value;
    const minute = parts.find((part) => part.type === 'minute')?.value;
    if (!hour || !minute) return null;
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/** Duration in hours (fractional), rounded to 2 decimals. */
export function shiftDurationHours(startsAtIso: string, endsAtIso: string): number {
  const startMs = Date.parse(startsAtIso);
  const endMs = Date.parse(endsAtIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return Math.round(((endMs - startMs) / 3_600_000) * 100) / 100;
}

export function sumShiftHours(
  shifts: Array<{ starts_at: string; ends_at: string }>
): number {
  const total = shifts.reduce(
    (sum, shift) => sum + shiftDurationHours(shift.starts_at, shift.ends_at),
    0
  );
  return Math.round(total * 100) / 100;
}

export function formatHoursLabel(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
}
