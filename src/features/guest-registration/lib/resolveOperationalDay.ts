import type { TenantSettings } from '@/entities/tenant';
import { isValidTimeValue } from '@/shared/lib/time';
import { addNights, todayUtcDate } from './guestAccessDates';

export const DEFAULT_OPERATIONAL_DAY_START_TIME = '08:00';

export interface OperationalDayWindow {
  /** UTC calendar date string for the active operational day. */
  operationalDate: string;
  startsAt: Date;
  endsAt: Date;
}

function parseOperationalStartOnDate(dateStr: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

export function resolveOperationalDayStartTime(
  settings?: Pick<TenantSettings, 'operationalDayStartTime'> | null
): string {
  const trimmed = settings?.operationalDayStartTime?.trim();
  if (trimmed && isValidTimeValue(trimmed)) {
    return trimmed;
  }
  return DEFAULT_OPERATIONAL_DAY_START_TIME;
}

/**
 * Operational day boundary in UTC v1 (wall clock from tenant setting + UTC calendar dates).
 * TODO: tenant IANA timezone — convert `now` and boundaries.
 */
export function resolveOperationalDay(
  now: Date,
  operationalDayStartTime: string = DEFAULT_OPERATIONAL_DAY_START_TIME
): OperationalDayWindow {
  const time = isValidTimeValue(operationalDayStartTime)
    ? operationalDayStartTime.trim()
    : DEFAULT_OPERATIONAL_DAY_START_TIME;

  const calendarToday = todayUtcDate(now);
  const todaysOperationalStart = parseOperationalStartOnDate(calendarToday, time);

  const operationalDate =
    now.getTime() < todaysOperationalStart.getTime()
      ? addNights(calendarToday, -1)
      : calendarToday;

  const startsAt = parseOperationalStartOnDate(operationalDate, time);
  const endsAt = parseOperationalStartOnDate(addNights(operationalDate, 1), time);

  return { operationalDate, startsAt, endsAt };
}

/** True while the previous operational day is still active (before today's start time). */
export function isBeforeTodaysOperationalRollover(
  now: Date,
  operationalDayStartTime: string = DEFAULT_OPERATIONAL_DAY_START_TIME
): boolean {
  const time = isValidTimeValue(operationalDayStartTime)
    ? operationalDayStartTime.trim()
    : DEFAULT_OPERATIONAL_DAY_START_TIME;
  const calendarToday = todayUtcDate(now);
  const todaysOperationalStart = parseOperationalStartOnDate(calendarToday, time);
  return now.getTime() < todaysOperationalStart.getTime();
}
