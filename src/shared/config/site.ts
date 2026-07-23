import { isProd } from '../lib/env';

export function getCleanPath(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
}

export interface RouteInfo {
  path: string;
  titleKey: string;
}

const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

function stripPort(hostname: string): string {
  return hostname.split(':')[0] ?? hostname;
}

/** Local dev hosts never use TLS, even under `next start` (NODE_ENV=production). */
export function isLocalBaseDomain(baseDomainValue = baseDomain): boolean {
  const host = stripPort(baseDomainValue).toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1';
}

export function getPublicProtocol(baseDomainValue = baseDomain): string {
  if (isLocalBaseDomain(baseDomainValue)) {
    return 'http://';
  }

  return isProd ? 'https://' : 'http://';
}

export const SITE_CONFIG = {
  baseDomain,
  /** Public site URL for share links (memories upload success, etc.). */
  publicSiteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? `${getPublicProtocol()}${baseDomain}`,
  googleMapsViewerPrefix: 'https://www.google.com/maps/d/viewer?mid=',
  isAnalyticsEnabled: isProd,
  subdomains: {
    app: 'app',
    landing: 'landing',
    reception: 'reception',
    /** Owner portal: dashboard.{baseDomain} / dashboard.localhost (dev). */
    dashboard: 'dashboard',
  },
  internalFolders: {
    app: 'app-site',
    landing: 'landing-site',
    platform: 'platform-site',
    reception: 'reception-site',
    owner: 'owner-site',
  },
  routes: {
    landing: {
      home: { path: '/', titleKey: 'home' },
    } as Record<string, RouteInfo>,

    app: {
      concierge: { path: '/', titleKey: 'concierge' },
      welcome: { path: '/welcome', titleKey: 'arrivalGuide' },
      staySetup: { path: '/stay-setup', titleKey: 'staySetup' },
      /** AppHeader title overridden in getRouteTranslations → staySetup.tabs.registration */
      registration: { path: '/registration', titleKey: 'staySetup' },
      guide: { path: '/guide', titleKey: 'guide' },
      services: { path: '/services', titleKey: 'services' },
      faq: { path: '/faq', titleKey: 'faq' },
    } as Record<string, RouteInfo>,
  },
};

const getProtocol = () => getPublicProtocol();

export function getSubdomainUrl(
  subdomain: 'app' | 'landing',
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

/** Public URL on dashboard.{baseDomain} (owner portal). Path should include locale when using i18n, e.g. `/en/login`. */
export function getOwnerPortalUrl(path = '/'): string {
  const protocol = getPublicProtocol();
  const base = SITE_CONFIG.baseDomain;
  const sub = SITE_CONFIG.subdomains.dashboard;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}${sub}.${base}${normalized}`;
}
