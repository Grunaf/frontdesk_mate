/**
 * Public owner-portal URL from Host / x-forwarded-*, not from rewrite-internal request.url.
 * Same pattern as reception logout/login redirects.
 */
export function ownerPortalOriginUrl(request: Request, pathname: string): URL {
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host') ||
    new URL(request.url).host;

  const protocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    new URL(request.url).protocol.replace(':', '') ||
    'http';

  return new URL(pathname, `${protocol}://${host}`);
}
