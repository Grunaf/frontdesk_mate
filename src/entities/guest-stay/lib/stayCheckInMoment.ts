import { stayCalendarDay } from './stayCalendarDay';

export const DEFAULT_PROPERTY_TIME_ZONE = 'UTC';

const TIME_HH_MM_RE = /^(\d{1,2}):(\d{2})$/;

export function isValidPropertyTimeZone(timeZone: string): boolean {
  const trimmed = timeZone.trim();
  if (!trimmed) {
    return false;
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function normalizePropertyTimeZone(timeZone?: string | null): string {
  const trimmed = timeZone?.trim();
  if (trimmed && isValidPropertyTimeZone(trimmed)) {
    return trimmed;
  }

  return DEFAULT_PROPERTY_TIME_ZONE;
}

export function parseStayCheckInTimeFromIso(checkInAt: string): string | null {
  const trimmed = checkInAt.trim();
  if (trimmed.length < 16) {
    return null;
  }

  const hours = trimmed.slice(11, 13);
  const minutes = trimmed.slice(14, 16);
  if (!/^\d{2}$/.test(hours) || !/^\d{2}$/.test(minutes)) {
    return null;
  }

  return `${hours}:${minutes}`;
}

export function resolveStayCheckInTimeLabel(
  checkInAt: string | null | undefined,
  checkInTimeFallback?: string | null
): string {
  const fromIso = checkInAt?.trim() ? parseStayCheckInTimeFromIso(checkInAt) : null;
  if (fromIso) {
    return fromIso;
  }

  const fallback = checkInTimeFallback?.trim();
  if (fallback && TIME_HH_MM_RE.test(fallback)) {
    return fallback;
  }

  return '14:00';
}

type ZonedWallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function readZonedWallClock(utcMs: number, timeZone: string): ZonedWallClock {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? '';
    return Number(value);
  };

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
  };
}

/** Property-local calendar day + HH:mm → UTC epoch ms. */
export function propertyLocalDateTimeToUtcMs(
  calendarDay: string,
  timeHhMm: string,
  timeZone: string
): number | null {
  if (!isValidPropertyTimeZone(timeZone)) {
    return null;
  }

  const day = calendarDay.trim();
  if (!stayCalendarDay(`${day}T00:00:00.000Z`)) {
    return null;
  }

  const timeMatch = TIME_HH_MM_RE.exec(timeHhMm.trim());
  if (!timeMatch) {
    return null;
  }

  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(dayOfMonth) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const target: ZonedWallClock = {
    year,
    month,
    day: dayOfMonth,
    hour,
    minute,
  };

  let utcMs = Date.UTC(year, month - 1, dayOfMonth, hour, minute, 0, 0);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const actual = readZonedWallClock(utcMs, timeZone);
    if (
      actual.year === target.year &&
      actual.month === target.month &&
      actual.day === target.day &&
      actual.hour === target.hour &&
      actual.minute === target.minute
    ) {
      return utcMs;
    }

    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      0,
      0
    );
    const targetAsUtc = Date.UTC(year, month - 1, dayOfMonth, hour, minute, 0, 0);
    utcMs += targetAsUtc - actualAsUtc;
  }

  return null;
}

export function formatPropertyLocalCheckInIso(
  calendarDay: string,
  timeHhMm: string,
  propertyTimeZone?: string | null
): string | null {
  const utcMs = propertyLocalDateTimeToUtcMs(
    calendarDay,
    timeHhMm,
    normalizePropertyTimeZone(propertyTimeZone)
  );

  if (utcMs == null) {
    return null;
  }

  return new Date(utcMs).toISOString();
}

export type ResolveStayCheckInInstantInput = {
  checkInAt: string | null | undefined;
  propertyTimeZone?: string | null;
  checkInTimeFallback?: string | null;
};

/** Check-in moment from stay calendar day + wall time in property TZ (ignores legacy Z semantics). */
export function resolveStayCheckInInstantMs(input: ResolveStayCheckInInstantInput): number | null {
  const calendarDay = stayCalendarDay(input.checkInAt);
  if (!calendarDay) {
    return null;
  }

  const timeLabel = resolveStayCheckInTimeLabel(input.checkInAt, input.checkInTimeFallback);
  return propertyLocalDateTimeToUtcMs(
    calendarDay,
    timeLabel,
    normalizePropertyTimeZone(input.propertyTimeZone)
  );
}

export type IsStayCheckInStartedInput = ResolveStayCheckInInstantInput & {
  now?: Date;
};

export function isStayCheckInStarted(input: IsStayCheckInStartedInput): boolean {
  const instantMs = resolveStayCheckInInstantMs(input);
  if (instantMs == null) {
    return false;
  }

  const now = input.now ?? new Date();
  return now.getTime() >= instantMs;
}

/** UTC property timezone: legacy comparison when tenant TZ is unset. */
export function isStayCheckInInstantOrLater(
  checkInAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  return isStayCheckInStarted({
    checkInAt,
    propertyTimeZone: DEFAULT_PROPERTY_TIME_ZONE,
    now,
  });
}
