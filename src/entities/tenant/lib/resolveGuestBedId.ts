import type { TenantSettings } from '../model/settings';

export function resolveGuestBedId(
  settings: TenantSettings,
  bedFromRuntime?: string | null
): string | null {
  const fromRuntime = bedFromRuntime?.trim();
  if (fromRuntime) {
    return fromRuntime;
  }

  const fromSettings = settings.highlightedBedId?.trim();
  if (fromSettings) {
    return fromSettings;
  }

  return null;
}

export function readGuestBedIdFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>
): string | null {
  return searchParams.get('bed')?.trim() || searchParams.get('bedId')?.trim() || null;
}
