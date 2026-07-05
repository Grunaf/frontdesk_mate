import { SITE_CONFIG } from '@/shared/config/site';

export type OwnerPortalHostResolution = {
  site: 'dashboard';
};

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

/** Bare dashboard host (no tenant slug in DNS). Dev: dashboard.localhost:3000 */
export function resolveOwnerPortalFromHost(
  hostname: string,
  baseDomain = SITE_CONFIG.baseDomain
): OwnerPortalHostResolution | null {
  const labels = labelsWithoutBaseDomain(hostname, baseDomain);
  const dashboardLabel = SITE_CONFIG.subdomains.dashboard;

  if (labels.length === 1 && labels[0] === dashboardLabel) {
    return { site: 'dashboard' };
  }

  return null;
}
