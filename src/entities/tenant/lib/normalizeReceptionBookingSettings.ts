import type { TenantSettings } from '../model/settings';
import type { BookingPlatformOption, ReceptionBookingSettings } from '../model/receptionBooking';

const PLATFORM_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const RECEPTION_BOOKING_EXTERNAL_ID_MAX = 128;

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

export function normalizeReceptionBookingForSave(
  receptionBooking: ReceptionBookingSettings | undefined
): ReceptionBookingSettings | undefined {
  if (!receptionBooking?.platforms?.length) {
    return undefined;
  }

  const seen = new Set<string>();
  const platforms: BookingPlatformOption[] = [];

  for (const raw of receptionBooking.platforms) {
    const normalized = normalizePlatformEntry(raw);
    if (!normalized || seen.has(normalized.id)) {
      continue;
    }
    seen.add(normalized.id);
    platforms.push(normalized);
  }

  return platforms.length > 0 ? { platforms } : undefined;
}

export function normalizeReceptionBookingOnRead(
  settings: TenantSettings | undefined
): TenantSettings['receptionBooking'] {
  const raw = settings?.receptionBooking;
  if (!raw?.platforms?.length) {
    return undefined;
  }

  return normalizeReceptionBookingForSave(raw);
}

export function listReceptionBookingPlatforms(
  settings: TenantSettings | undefined
): BookingPlatformOption[] {
  return settings?.receptionBooking?.platforms ?? [];
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

  return null;
}
