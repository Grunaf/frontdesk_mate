import { getPublicProtocol, SITE_CONFIG } from './site';

export type TenantPublicSite = 'landing' | 'app' | 'reception';

function joinLocalePath(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') {
    return `/${locale}`;
  }
  return `/${locale}${normalized}`;
}

export function normalizeTenantSlugInput(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

export function getTenantPublicUrl(
  tenantSlug: string,
  site: TenantPublicSite,
  locale: string,
  path = '/'
): string {
  const protocol = getPublicProtocol();
  const base = SITE_CONFIG.baseDomain;

  if (site === 'reception') {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${protocol}${tenantSlug}.reception.${base}${normalizedPath === '/' ? '' : normalizedPath}`;
  }

  const localePath = joinLocalePath(locale, path);

  if (site === 'app') {
    return `${protocol}${tenantSlug}.app.${base}${localePath}`;
  }

  return `${protocol}${tenantSlug}.${base}${localePath}`;
}

export function getPlatformRootUrl(locale: string): string {
  const protocol = getPublicProtocol();
  const base = SITE_CONFIG.baseDomain;
  return `${protocol}${base}/${locale}`;
}
