import type {
  EntryDetailsStatus,
  EntryTransportType,
  GuestTourismRegistrationSummary,
} from '../model/types';

const ENTRY_STAMP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ENTRY_TRANSPORT_TYPES = [
  'plane',
  'bus',
  'car',
  'train',
  'other',
] as const satisfies readonly EntryTransportType[];

const ENTRY_TRANSPORT_SET = new Set<string>(ENTRY_TRANSPORT_TYPES);

export const ENTRY_DETAILS_STATUSES = [
  'incomplete',
  'complete',
  'skipped',
] as const satisfies readonly EntryDetailsStatus[];

const ENTRY_DETAILS_STATUS_SET = new Set<string>(ENTRY_DETAILS_STATUSES);

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

export function isEntryTransportType(value: string): value is EntryTransportType {
  return ENTRY_TRANSPORT_SET.has(value);
}

export function isEntryDetailsStatus(value: string): value is EntryDetailsStatus {
  return ENTRY_DETAILS_STATUS_SET.has(value);
}

export function parseEntryStampPage(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    return null;
  }
  return n;
}

function hasAllEntryDates(summary: GuestTourismRegistrationSummary): boolean {
  return (
    summary.guests.length >= 1 &&
    summary.guests.every((guest) => Boolean(guest.entry_stamp_date?.trim()))
  );
}

/**
 * Step is done when explicitly skipped/complete, or (legacy) every guest has a date.
 */
export function isEntryDateComplete(summary: GuestTourismRegistrationSummary): boolean {
  if (summary.guests.length < 1) {
    return false;
  }
  if (summary.entry_details_status === 'skipped') {
    return true;
  }
  if (summary.entry_details_status === 'complete') {
    return true;
  }
  if (summary.entry_details_status === 'incomplete') {
    return false;
  }
  return hasAllEntryDates(summary);
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
