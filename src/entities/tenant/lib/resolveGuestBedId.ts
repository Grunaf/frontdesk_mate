import type { TenantSettings } from '../model/settings';

export function resolveGuestBedId(
  _settings: TenantSettings,
  bedFromRuntime?: string | null
): string | null {
  const fromRuntime = bedFromRuntime?.trim();
  return fromRuntime || null;
}
