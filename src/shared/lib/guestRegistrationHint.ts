import { isLocalBaseDomain, SITE_CONFIG } from '@/shared/config/site';

export const GUEST_REGISTRATION_HINT_COOKIE = 'fdm_guest_registration_hint';

export interface GuestRegistrationIndex {
  tenantSlug: string;
  bedId: string;
  exp: number;
  guestName?: string;
}

export function getGuestAppSharedCookieDomain(): string {
  const host = SITE_CONFIG.baseDomain.split(':')[0] ?? SITE_CONFIG.baseDomain;
  return `.app.${host}`;
}

export function isGuestRegistrationIndexValid(
  index: GuestRegistrationIndex | null | undefined
): index is GuestRegistrationIndex {
  if (!index?.tenantSlug?.trim() || !index.bedId?.trim()) return false;
  return Number.isFinite(index.exp) && index.exp > Date.now();
}

export function serializeGuestRegistrationHint(index: GuestRegistrationIndex): string {
  return encodeURIComponent(JSON.stringify(index));
}

export function parseGuestRegistrationHint(raw: string | null | undefined): GuestRegistrationIndex | null {
  if (!raw?.trim()) return null;

  const candidates = [raw.trim()];
  try {
    candidates.push(decodeURIComponent(raw.trim()));
  } catch {
    // keep raw only
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as GuestRegistrationIndex;
      if (isGuestRegistrationIndexValid(parsed)) {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

export function getGuestRegistrationHintMaxAgeSec(index: GuestRegistrationIndex): number {
  return Math.max(60, Math.floor((index.exp - Date.now()) / 1000));
}

export function getGuestRegistrationHintCookieAttributes(maxAgeSec: number): string {
  const domain = getGuestAppSharedCookieDomain();
  const secure = !isLocalBaseDomain() ? '; Secure' : '';
  return `Path=/; Domain=${domain}; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}
