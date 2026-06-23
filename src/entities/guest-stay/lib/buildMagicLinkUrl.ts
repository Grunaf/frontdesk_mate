import { getTenantPublicUrl } from '@/shared/config';

export type GuestMagicLinkEntry = 'remote' | 'door' | 'desk';

export function buildGuestMagicLinkUrl(
  tenantSlug: string,
  locale: string,
  token: string,
  options?: { entry?: GuestMagicLinkEntry }
): string {
  const base = getTenantPublicUrl(tenantSlug, 'app', locale, '/check-in');
  const params = new URLSearchParams({ t: token });
  if (options?.entry) {
    params.set('entry', options.entry);
  }
  return `${base}?${params.toString()}`;
}

export function appendGuestEntryToMagicLink(url: string, entry: GuestMagicLinkEntry): string {
  const parsed = new URL(url);
  parsed.searchParams.set('entry', entry);
  return parsed.toString();
}
