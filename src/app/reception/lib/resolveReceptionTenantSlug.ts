import { NextResponse, type NextRequest } from 'next/server';
import { resolveTenantSlugFromHost } from '@/entities/tenant/lib/resolveTenantSlugFromHost';
import { isProd } from '@/shared/lib/env';

const DEFAULT_SLUG = 'default';

function resolveRequestHost(request: NextRequest): string {
  return request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || request.headers.get('host')
    || request.nextUrl.host;
}

export function receptionOriginUrl(request: NextRequest, pathname: string): URL {
  const host = resolveRequestHost(request);
  const protocol = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return new URL(pathname, `${protocol}://${host}`);
}

export function receptionRedirect(request: NextRequest, pathname: string, error?: string): NextResponse {
  const url = receptionOriginUrl(request, pathname);
  if (error) {
    url.searchParams.set('error', error);
  }
  return NextResponse.redirect(url, 303);
}

export function resolveReceptionTenantSlug(request: NextRequest): string | null {
  const host = resolveRequestHost(request);
  const { tenantSlug, site } = resolveTenantSlugFromHost(host);

  if (site !== 'reception') {
    return null;
  }

  if (tenantSlug) {
    return tenantSlug;
  }

  if (!isProd) {
    return process.env.NEXT_PUBLIC_TENANT_SLUG?.trim() || DEFAULT_SLUG;
  }

  return null;
}

export function receptionLoginUrl(request: NextRequest, error?: string): URL {
  const url = receptionOriginUrl(request, '/login');
  if (error) {
    url.searchParams.set('error', error);
  }
  return url;
}
