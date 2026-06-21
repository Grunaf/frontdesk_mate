import {
  getGuestRegistrationHintCookieAttributes,
  getGuestRegistrationHintMaxAgeSec,
  GUEST_REGISTRATION_HINT_COOKIE,
  isGuestRegistrationIndexValid,
  parseGuestRegistrationHint,
  serializeGuestRegistrationHint,
  type GuestRegistrationIndex,
} from './guestRegistrationHint';

export type { GuestRegistrationIndex };

const STORAGE_KEY = 'fdm_guest_registration';

function readGuestRegistrationHintFromDocumentCookie(): GuestRegistrationIndex | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${GUEST_REGISTRATION_HINT_COOKIE}=`;
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!entry) return null;

  return parseGuestRegistrationHint(entry.slice(prefix.length));
}

function writeGuestRegistrationHintDocumentCookie(index: GuestRegistrationIndex): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${GUEST_REGISTRATION_HINT_COOKIE}=${serializeGuestRegistrationHint(index)}; ${getGuestRegistrationHintCookieAttributes(getGuestRegistrationHintMaxAgeSec(index))}`;
}

function clearGuestRegistrationHintDocumentCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${GUEST_REGISTRATION_HINT_COOKIE}=; ${getGuestRegistrationHintCookieAttributes(0)}`;
}

export { isGuestRegistrationIndexValid };

export function readGuestRegistrationIndex(): GuestRegistrationIndex | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const fromStorage = parseGuestRegistrationHint(raw);
      if (fromStorage) {
        writeGuestRegistrationHintDocumentCookie(fromStorage);
        return fromStorage;
      }
    }
  } catch {
    // fall through to shared cookie
  }

  return readGuestRegistrationHintFromDocumentCookie();
}

export function writeGuestRegistrationIndex(index: GuestRegistrationIndex): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  writeGuestRegistrationHintDocumentCookie(index);
}

export function clearGuestRegistrationIndex(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
  clearGuestRegistrationHintDocumentCookie();
}

export function getCrossHostelDismissKey(currentTenantSlug: string, registeredTenantSlug: string): string {
  return `fdm_cross_hostel_dismiss_${currentTenantSlug}_${registeredTenantSlug}`;
}

export function isCrossHostelBannerDismissed(
  currentTenantSlug: string,
  registeredTenantSlug: string
): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(getCrossHostelDismissKey(currentTenantSlug, registeredTenantSlug)) === '1';
}

export function dismissCrossHostelBanner(currentTenantSlug: string, registeredTenantSlug: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getCrossHostelDismissKey(currentTenantSlug, registeredTenantSlug), '1');
}
