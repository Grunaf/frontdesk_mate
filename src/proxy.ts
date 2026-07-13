import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { resolveTenantSlugFromHost } from '@/entities/tenant/lib/resolveTenantSlugFromHost';
import { resolveOwnerPortalFromHost } from '@/entities/tenant/lib/resolveOwnerPortalFromHost';
import {
  applyRefreshedAuthCookies,
  refreshOwnerAuthSession,
} from '@/shared/lib/db/supabase-owner-server';
import { SITE_CONFIG } from './shared/config/site';
import { isProd } from './shared/lib/env';

const handleI18nRouting = createMiddleware({
  locales: ['en', 'ru'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

/** Owner portal (dashboard host): en + sr structure; sr copy in module 4. */
const handleOwnerI18nRouting = createMiddleware({
  locales: ['en', 'sr'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

const LOCALIZED_ADMIN_REGEX = /^\/(en|ru)(\/admin(?:\/.*)?)$/;

/** Admin routes live outside i18n at /admin/* (not /en/admin/*). */
function resolveAdminPath(pathname: string): string | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return pathname;
  }

  const match = pathname.match(LOCALIZED_ADMIN_REGEX);
  return match ? match[2] : null;
}

/** Dev panel lives outside i18n at /dev-panel/* */
function resolveDevPanelPath(pathname: string): string | null {
  if (pathname === '/dev-panel' || pathname.startsWith('/dev-panel/')) {
    return pathname;
  }

  return null;
}

function shouldUsePlatformSite(tenantSlug: string | null, site: string): boolean {
  return isProd && !tenantSlug && site !== 'reception';
}

function resolveInternalFolder(site: ReturnType<typeof resolveTenantSlugFromHost>['site']): string {
  const { internalFolders } = SITE_CONFIG;

  if (site === 'app') return internalFolders.app;
  if (site === 'reception') return internalFolders.reception;
  return internalFolders.landing;
}

/** Absolute-path `new URL(path, base)` drops search/hash — keep them for login errors etc. */
function rewriteUrl(pathname: string, request: NextRequest): URL {
  const url = new URL(pathname, request.url);
  url.search = request.nextUrl.search;
  url.hash = request.nextUrl.hash;
  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStaticFile = /\.[a-z0-9]+$/i.test(pathname);

  if (isStaticFile) {
    return NextResponse.next();
  }

  const adminPath = resolveAdminPath(pathname);
  if (adminPath) {
    if (pathname !== adminPath) {
      return NextResponse.redirect(new URL(adminPath, request.url));
    }
    return NextResponse.next();
  }

  const devPanelPath = resolveDevPanelPath(pathname);
  if (devPanelPath) {
    if (pathname !== devPanelPath) {
      return NextResponse.redirect(new URL(devPanelPath, request.url));
    }
    return NextResponse.next();
  }

  const hostname = request.headers.get('host') || '';
  const ownerPortal = resolveOwnerPortalFromHost(hostname);

  if (ownerPortal?.site === 'dashboard') {
    const ownerFolder = SITE_CONFIG.internalFolders.owner;
    const authResponse = await refreshOwnerAuthSession(request);

    if (pathname.startsWith(`/${ownerFolder}`)) {
      const response = NextResponse.next();
      applyRefreshedAuthCookies(authResponse, response);
      return response;
    }

    const response = handleOwnerI18nRouting(request);
    if (response.status === 307 || response.status === 308) {
      applyRefreshedAuthCookies(authResponse, response);
      return response;
    }

    const pathnameWithLocale = request.nextUrl.pathname;
    const targetPath = `/${ownerFolder}${pathnameWithLocale}`;

    const rewriteResponse = NextResponse.rewrite(rewriteUrl(targetPath, request));
    applyRefreshedAuthCookies(authResponse, rewriteResponse);
    return rewriteResponse;
  }

  const hostResolution = resolveTenantSlugFromHost(hostname);

  if (hostResolution.site === 'reception') {
    const { internalFolders } = SITE_CONFIG;
    if (pathname.startsWith(`/${internalFolders.reception}`)) {
      return NextResponse.next();
    }

    const rewriteHeaders = new Headers();
    if (hostResolution.tenantSlug) {
      rewriteHeaders.set('x-tenant-slug', hostResolution.tenantSlug);
    }

    const targetPath = `/${internalFolders.reception}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(
      rewriteUrl(targetPath || `/${internalFolders.reception}`, request),
      {
        headers: rewriteHeaders,
      }
    );
  }

  const response = handleI18nRouting(request);
  if (response.status === 307 || response.status === 308) {
    return response;
  }

  const pathnameWithLocale = request.nextUrl.pathname;

  const { internalFolders } = SITE_CONFIG;
  if (
    pathnameWithLocale.startsWith(`/${internalFolders.app}`) ||
    pathnameWithLocale.startsWith(`/${internalFolders.landing}`) ||
    pathnameWithLocale.startsWith(`/${internalFolders.platform}`) ||
    pathnameWithLocale.startsWith(`/${internalFolders.reception}`) ||
    pathnameWithLocale.startsWith(`/${internalFolders.owner}`)
  ) {
    return response;
  }

  const rewriteHeaders = new Headers(response.headers);

  if (shouldUsePlatformSite(hostResolution.tenantSlug, hostResolution.site)) {
    rewriteHeaders.set('x-platform-site', hostResolution.site);
    const localeRootMatch = pathnameWithLocale.match(/^\/(en|ru)(?:\/.*)?$/);
    const targetPath = localeRootMatch
      ? `/${internalFolders.platform}/${localeRootMatch[1]}`
      : `/${internalFolders.platform}${pathnameWithLocale}`;

    return NextResponse.rewrite(rewriteUrl(targetPath, request), {
      headers: rewriteHeaders,
    });
  }

  const targetFolder = resolveInternalFolder(hostResolution.site);
  const targetPath = `/${targetFolder}${pathnameWithLocale}`;

  if (hostResolution.tenantSlug) {
    rewriteHeaders.set('x-tenant-slug', hostResolution.tenantSlug);
  }

  return NextResponse.rewrite(rewriteUrl(targetPath, request), {
    headers: rewriteHeaders,
  });
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
