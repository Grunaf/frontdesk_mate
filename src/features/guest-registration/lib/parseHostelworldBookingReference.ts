import { HOSTELWORLD_BOOKING_PREFIX_LENGTH } from '@/entities/tenant';

export type ParseHostelworldBookingReferenceResult =
  | {
      ok: true;
      unique: string;
      /** Set when input was a full number and no known prefix existed yet. */
      proposedPrefix?: string;
    }
  | {
      ok: false;
      error: 'empty' | 'too_short' | 'invalid_prefix' | 'unique_required';
    };

/** Hyphen is display-only between prefix and unique; never stored. */
export function stripHostelworldUniqueSeparators(value: string): string {
  return value.replace(/-/g, '');
}

/**
 * Hostelworld full booking number = 6-digit property prefix + unique suffix.
 * Optional hyphen between them is UI-only (shown on the prefix field).
 * Stay stores unique only (no hyphen); Inbox URL uses unique only.
 */
export function parseHostelworldBookingReference(
  raw: string,
  knownPrefix: string | null | undefined
): ParseHostelworldBookingReferenceResult {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) {
    return { ok: false, error: 'empty' };
  }

  const prefix = knownPrefix?.trim() ?? '';
  if (prefix) {
    if (!/^\d{6}$/.test(prefix)) {
      return { ok: false, error: 'invalid_prefix' };
    }
    const afterPrefix = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
    const unique = stripHostelworldUniqueSeparators(afterPrefix);
    if (!unique) {
      return { ok: false, error: 'unique_required' };
    }
    return { ok: true, unique };
  }

  // Digits-only length for first-time split (hyphen between prefix and unique is optional).
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length <= HOSTELWORLD_BOOKING_PREFIX_LENGTH) {
    return { ok: false, error: 'too_short' };
  }

  const proposedPrefix = digitsOnly.slice(0, HOSTELWORLD_BOOKING_PREFIX_LENGTH);
  if (!/^\d{6}$/.test(proposedPrefix)) {
    return { ok: false, error: 'invalid_prefix' };
  }

  const unique = digitsOnly.slice(HOSTELWORLD_BOOKING_PREFIX_LENGTH);
  if (!unique) {
    return { ok: false, error: 'unique_required' };
  }

  return { ok: true, unique, proposedPrefix };
}

export function buildHostelworldReservationUrl(uniqueBookingId: string): string | null {
  const unique = stripHostelworldUniqueSeparators(uniqueBookingId.trim());
  if (!unique) {
    return null;
  }
  return `https://inbox.hostelworld.com/booking/view/${encodeURIComponent(unique)}`;
}

export function formatHostelworldBookingReferenceDisplay(
  prefix: string | null | undefined,
  unique: string
): string {
  const cleanUnique = stripHostelworldUniqueSeparators(unique.trim());
  const cleanPrefix = prefix?.trim() ?? '';
  if (!cleanUnique) {
    return '';
  }
  if (cleanPrefix && /^\d{6}$/.test(cleanPrefix)) {
    return `${cleanPrefix}-${cleanUnique}`;
  }
  return cleanUnique;
}
