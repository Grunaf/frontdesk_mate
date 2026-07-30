import { getTenantPublicUrl } from '@/shared/config/tenant-urls';

/** Absolute reception desk URL that opens stay detail via `?stayId=`. */
export function buildReceptionStayDetailUrl(
  tenantSlug: string,
  stayId: string,
  locale = 'en'
): string {
  const trimmedSlug = tenantSlug.trim();
  const trimmedStayId = stayId.trim();
  if (!trimmedSlug || !trimmedStayId) {
    return '';
  }

  return getTenantPublicUrl(
    trimmedSlug,
    'reception',
    locale,
    `/?tab=plan&stayId=${encodeURIComponent(trimmedStayId)}`
  );
}
