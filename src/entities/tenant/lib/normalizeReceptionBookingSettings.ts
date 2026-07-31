import type { TenantSettings } from '../model/settings';
import type { BookingPlatformOption, ReceptionBookingSettings } from '../model/receptionBooking';

const PLATFORM_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const BOOKING_COM_HOTEL_ID_PATTERN = /^[0-9]+$/;
const HOSTELWORLD_BOOKING_PREFIX_PATTERN = /^\d{6}$/;
export const RECEPTION_BOOKING_EXTERNAL_ID_MAX = 128;
export const RECEPTION_BOOKING_COM_HOTEL_ID_MAX = 32;
export const HOSTELWORLD_BOOKING_PREFIX_LENGTH = 6;

export function slugifyBookingPlatformId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'platform';
}

function normalizePlatformEntry(entry: BookingPlatformOption): BookingPlatformOption | null {
  const id = entry.id?.trim().toLowerCase() ?? '';
  const label = entry.label?.trim() ?? '';
  if (!id || !label || !PLATFORM_ID_PATTERN.test(id)) {
    return null;
  }

  return {
    id,
    label,
    ...(entry.requiresExternalId === true ? { requiresExternalId: true } : {}),
  };
}

export function normalizeBookingComHotelId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, RECEPTION_BOOKING_COM_HOTEL_ID_MAX);
}

export function normalizeHostelworldBookingPrefix(
  value: string | null | undefined
): string | undefined {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return undefined;
  }
  if (!HOSTELWORLD_BOOKING_PREFIX_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function normalizePlatforms(raw: BookingPlatformOption[] | undefined): BookingPlatformOption[] {
  if (!raw?.length) {
    return [];
  }

  const seen = new Set<string>();
  const platforms: BookingPlatformOption[] = [];

  for (const entry of raw) {
    const normalized = normalizePlatformEntry(entry);
    if (!normalized || seen.has(normalized.id)) {
      continue;
    }
    seen.add(normalized.id);
    platforms.push(normalized);
  }

  return platforms;
}

export function normalizeReceptionBookingForSave(
  receptionBooking: ReceptionBookingSettings | undefined
): ReceptionBookingSettings | undefined {
  if (!receptionBooking) {
    return undefined;
  }

  const platforms = normalizePlatforms(receptionBooking.platforms);
  const bookingComHotelId = normalizeBookingComHotelId(receptionBooking.bookingComHotelId);
  const hostelworldBookingPrefix = normalizeHostelworldBookingPrefix(
    receptionBooking.hostelworldBookingPrefix
  );

  if (platforms.length === 0 && !bookingComHotelId && !hostelworldBookingPrefix) {
    return undefined;
  }

  return {
    platforms,
    ...(bookingComHotelId ? { bookingComHotelId } : {}),
    ...(hostelworldBookingPrefix ? { hostelworldBookingPrefix } : {}),
  };
}

export function normalizeReceptionBookingOnRead(
  settings: TenantSettings | undefined
): TenantSettings['receptionBooking'] {
  return normalizeReceptionBookingForSave(settings?.receptionBooking);
}

export function listReceptionBookingPlatforms(
  settings: TenantSettings | undefined
): BookingPlatformOption[] {
  return settings?.receptionBooking?.platforms ?? [];
}

export function resolveBookingComHotelId(
  settings: TenantSettings | undefined
): string | null {
  return normalizeBookingComHotelId(settings?.receptionBooking?.bookingComHotelId) ?? null;
}

export function resolveHostelworldBookingPrefix(
  settings: TenantSettings | undefined
): string | null {
  return (
    normalizeHostelworldBookingPrefix(settings?.receptionBooking?.hostelworldBookingPrefix) ?? null
  );
}

export function resolveReceptionBookingPlatformLabel(
  settings: TenantSettings | undefined,
  platformId: string | null | undefined
): string | null {
  const id = platformId?.trim();
  if (!id) {
    return null;
  }

  const match = listReceptionBookingPlatforms(settings).find((entry) => entry.id === id);
  return match?.label ?? 'Unknown platform';
}

export function formatReceptionBookingSourceSummary(
  settings: TenantSettings | undefined,
  platformId: string | null | undefined,
  externalId: string | null | undefined
): string | null {
  const platformLabel = platformId?.trim()
    ? resolveReceptionBookingPlatformLabel(settings, platformId)
    : null;
  const ref = externalId?.trim() || null;

  if (platformLabel && ref) {
    return `${platformLabel} · #${ref}`;
  }
  if (platformLabel) {
    return platformLabel;
  }
  if (ref) {
    return `#${ref}`;
  }
  return null;
}

export function validateReceptionBookingPlatformsForAdmin(
  settings: TenantSettings
): string | null {
  const platforms = settings.receptionBooking?.platforms ?? [];
  const seen = new Set<string>();

  for (const entry of platforms) {
    const label = entry.label?.trim() ?? '';
    const id = entry.id?.trim().toLowerCase() ?? '';

    if (!label) {
      return 'Each reception booking platform needs a label.';
    }
    if (!id || !PLATFORM_ID_PATTERN.test(id)) {
      return 'Platform id must be a lowercase slug (letters, numbers, hyphens).';
    }
    if (seen.has(id)) {
      return 'Duplicate platform ids are not allowed.';
    }
    seen.add(id);
  }

  const hotelId = settings.receptionBooking?.bookingComHotelId?.trim() ?? '';
  if (hotelId) {
    if (hotelId.length > RECEPTION_BOOKING_COM_HOTEL_ID_MAX) {
      return `Booking.com hotel ID must be at most ${RECEPTION_BOOKING_COM_HOTEL_ID_MAX} characters.`;
    }
    if (!BOOKING_COM_HOTEL_ID_PATTERN.test(hotelId)) {
      return 'Booking.com hotel ID must be digits only.';
    }
  }

  const hwPrefix = settings.receptionBooking?.hostelworldBookingPrefix?.trim() ?? '';
  if (hwPrefix && !HOSTELWORLD_BOOKING_PREFIX_PATTERN.test(hwPrefix)) {
    return 'Hostelworld booking prefix must be exactly 6 digits.';
  }

  return null;
}
