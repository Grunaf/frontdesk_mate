import type { GuestTourismRegistrationSummary } from '../model/types';

const ENTRY_STAMP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidEntryStampDate(value: string): boolean {
  if (!ENTRY_STAMP_DATE_RE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** True when every listed guest has a persisted entry stamp date. */
export function isEntryDateComplete(summary: GuestTourismRegistrationSummary): boolean {
  return (
    summary.guests.length >= 1 &&
    summary.guests.every((guest) => Boolean(guest.entry_stamp_date?.trim()))
  );
}

/** Shared date across guests when all match; otherwise first non-empty, else null. */
export function resolveSharedEntryStampDate(
  summary: GuestTourismRegistrationSummary
): string | null {
  const dates = summary.guests
    .map((guest) => guest.entry_stamp_date?.trim() || null)
    .filter((value): value is string => Boolean(value));

  if (dates.length === 0) {
    return null;
  }

  const first = dates[0];
  return dates.every((value) => value === first) ? first : first;
}
