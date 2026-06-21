import { getTenantPublicUrl } from '@/shared/config';

export function buildGuestMagicLinkUrl(
  tenantSlug: string,
  locale: string,
  token: string
): string {
  const base = getTenantPublicUrl(tenantSlug, 'app', locale, '/check-in');
  return `${base}?t=${encodeURIComponent(token)}`;
}
