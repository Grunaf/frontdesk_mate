import { NextResponse, type NextRequest } from 'next/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { verifyReceptionStaffLogin } from '@/entities/reception-user/server';
import {
  buildReceptionSessionCookieValue,
  getReceptionSessionCookieOptions,
  RECEPTION_SESSION_COOKIE_NAME,
} from '@/app/reception/lib/receptionSession';
import {
  receptionOriginUrl,
  receptionRedirect,
  resolveReceptionTenantSlug,
} from '@/app/reception/lib/resolveReceptionTenantSlug';
import { sanitizeReceptionLoginNext } from '@/app/reception/lib/sanitizeReceptionLoginNext';
import {
  getRequestClientIp,
  isPinAttemptRateLimited,
  recordPinAttemptFailure,
} from '@/shared/lib/pinRateLimit';

export async function POST(request: NextRequest) {
  const tenantSlug = resolveReceptionTenantSlug(request);
  const formData = await request.formData();
  const next = sanitizeReceptionLoginNext(formData.get('next')?.toString());

  if (!tenantSlug) {
    return receptionRedirect(request, '/login', 'no_tenant', next);
  }

  const clientIp = getRequestClientIp(request.headers);
  const login = (formData.get('login')?.toString() ?? '').trim();
  const pin = formData.get('pin')?.toString() ?? '';
  const rateLimitSubject = login || undefined;

  if (
    await isPinAttemptRateLimited({
      scope: 'reception',
      tenantSlug,
      clientIp,
      rateLimitSubject,
    })
  ) {
    return receptionRedirect(request, '/login', 'rate_limited', next);
  }

  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    return receptionRedirect(request, '/login', 'no_tenant', next);
  }

  if (!login) {
    await recordPinAttemptFailure({
      scope: 'reception',
      tenantSlug,
      clientIp,
      rateLimitSubject,
    });
    return receptionRedirect(request, '/login', 'invalid_credentials', next);
  }

  const staffResult = await verifyReceptionStaffLogin(tenantSlug, login, pin);
  if (!staffResult.ok) {
    await recordPinAttemptFailure({
      scope: 'reception',
      tenantSlug,
      clientIp,
      rateLimitSubject,
    });
    const errorCode =
      staffResult.error === 'user_disabled' ? 'user_disabled' : 'invalid_credentials';
    return receptionRedirect(request, '/login', errorCode, next);
  }

  const destination = next ?? '/';
  const response = NextResponse.redirect(receptionOriginUrl(request, destination), 303);
  response.cookies.set(
    RECEPTION_SESSION_COOKIE_NAME,
    buildReceptionSessionCookieValue(tenantSlug, staffResult.receptionUserId),
    getReceptionSessionCookieOptions()
  );

  return response;
}
