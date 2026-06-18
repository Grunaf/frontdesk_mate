import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { SITE_CONFIG } from './shared/config/site';

const handleI18nRouting = createMiddleware({
  locales: ['en', 'ru'],
  defaultLocale: 'en',
  localePrefix: 'always', // или 'as-needed', в зависимости от ваших настроек
});

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStaticFile = /\.[a-z0-9]+$/i.test(pathname);

  if (isStaticFile) {
    return NextResponse.next();
  }

  const response = handleI18nRouting(request);
  if (response.status === 307 || response.status === 308) {
    return response;
  }

  const hostname = request.headers.get('host') || '';
  const currentHost = hostname.replace(`.${SITE_CONFIG.baseDomain}`, '');

  const pathnameWithLocale = request.nextUrl.pathname;

  const { internalFolders, subdomains } = SITE_CONFIG;
  if (
    pathnameWithLocale.startsWith(`/${internalFolders.app}`) ||
    pathnameWithLocale.startsWith(`/${internalFolders.landing}`)
  ) {
    return response;
  }

  const targetFolder =
    currentHost === subdomains.app ? internalFolders.app : internalFolders.landing;
  const targetPath = `/${targetFolder}${pathnameWithLocale}`;

  return NextResponse.rewrite(new URL(targetPath, request.url), {
    headers: response.headers,
  });
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
