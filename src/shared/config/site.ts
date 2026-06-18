import { isProd } from '../lib/env';

export function getCleanPath(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
}

export interface RouteInfo {
  path: string;
  titleKey: string;
}

export const SITE_CONFIG = {
  baseDomain: (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, ''),
  isAnalyticsEnabled: isProd,
  subdomains: {
    app: 'app',
    landing: 'landing',
  },
  internalFolders: {
    app: 'app-site',
    landing: 'landing-site',
  },
  routes: {
    landing: {
      home: { path: '/', titleKey: 'home' },
    } as Record<string, RouteInfo>,

    app: {
      concierge: { path: '/', titleKey: 'concierge' },
      welcome: { path: '/welcome', titleKey: 'arrivalGuide' },
    } as Record<string, RouteInfo>,
  },
};

const getProtocol = () => (process.env.NODE_ENV === 'production' ? 'https://' : 'http://');

export function getSubdomainUrl(
  subdomain: keyof typeof SITE_CONFIG.subdomains,
  routeKey: string,
  locale: string
): string {
  const protocol = getProtocol();
  const base = SITE_CONFIG.baseDomain;

  const routePath = SITE_CONFIG.routes[subdomain][routeKey]?.path || '/';

  if (SITE_CONFIG.subdomains[subdomain] === SITE_CONFIG.subdomains.landing) {
    return `${protocol}${base}/${locale}${routePath}`;
  }

  const sub = SITE_CONFIG.subdomains[subdomain];
  return `${protocol}${sub}.${base}/${locale}${routePath}`;
}
