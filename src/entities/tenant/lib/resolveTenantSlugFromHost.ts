import { SITE_CONFIG } from '@/shared/config/site';

const RESERVED_LABELS = new Set(['www', 'admin', 'app', 'reception', 'dashboard']);

export type TenantSiteKind = 'app' | 'landing' | 'reception';

export interface TenantHostResolution {
  tenantSlug: string | null;
  site: TenantSiteKind;
}

function stripPort(hostname: string): string {
  return hostname.split(':')[0] ?? hostname;
}

function labelsWithoutBaseDomain(hostname: string, baseDomain: string): string[] {
  const host = stripPort(hostname).toLowerCase();
  const base = stripPort(baseDomain).toLowerCase();

  if (host === base || host === 'localhost') {
    return [];
  }

  if (host.endsWith(`.${base}`)) {
    const prefix = host.slice(0, -(base.length + 1));
    return prefix ? prefix.split('.') : [];
  }

  if (base.startsWith('localhost') && host.endsWith('.localhost')) {
    const prefix = host.slice(0, -'.localhost'.length);
    return prefix ? prefix.split('.') : [];
  }

  return [];
}

function isReservedSlug(label: string): boolean {
  return RESERVED_LABELS.has(label);
}

/**
 * Resolves tenant slug and site kind from the request hostname.
 * Env fallback is applied later in getTenantConfig when tenantSlug is null.
 */
export function resolveTenantSlugFromHost(
  hostname: string,
  baseDomain = SITE_CONFIG.baseDomain
): TenantHostResolution {
  const labels = labelsWithoutBaseDomain(hostname, baseDomain);

  if (labels.length === 0) {
    return { tenantSlug: null, site: 'landing' };
  }

  if (labels.length === 1) {
    const label = labels[0]!;
    if (label === 'app') {
      return { tenantSlug: null, site: 'app' };
    }
    if (label === 'reception') {
      return { tenantSlug: null, site: 'reception' };
    }
    if (isReservedSlug(label)) {
      return { tenantSlug: null, site: 'landing' };
    }
    return { tenantSlug: label, site: 'landing' };
  }

  if (labels[labels.length - 1] === 'app') {
    const slug = labels.slice(0, -1).join('.');
    if (!slug || isReservedSlug(slug.split('.')[0]!)) {
      return { tenantSlug: null, site: 'app' };
    }
    return { tenantSlug: slug, site: 'app' };
  }

  if (labels[labels.length - 1] === 'reception') {
    const slug = labels.slice(0, -1).join('.');
    if (!slug || isReservedSlug(slug.split('.')[0]!)) {
      return { tenantSlug: null, site: 'reception' };
    }
    return { tenantSlug: slug, site: 'reception' };
  }

  const slug = labels.join('.');
  if (isReservedSlug(labels[0]!)) {
    return { tenantSlug: null, site: 'landing' };
  }

  return { tenantSlug: slug, site: 'landing' };
}
