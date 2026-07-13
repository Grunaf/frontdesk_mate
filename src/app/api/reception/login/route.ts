import { NextResponse, type NextRequest } from 'next/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { verifyReceptionStaffLogin } from '@/entities/reception-user/server';
import { verifyDeskPin, isDeskPinConfigured } from '@/app/reception/lib/deskPin';
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
import {
  getRequestClientIp,
  isPinAttemptRateLimited,
  recordPinAttemptFailure,
} from '@/shared/lib/pinRateLimit';

export async function POST(request: NextRequest) {
  const tenantSlug = resolveReceptionTenantSlug(request);
  if (!tenantSlug) {
    return receptionRedirect(request, '/login', 'no_tenant');
  }

  const clientIp = getRequestClientIp(request.headers);
  const formData = await request.formData();
  const loginRaw = formData.get('login')?.toString() ?? '';
  const login = loginRaw.trim();
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
    return receptionRedirect(request, '/login', 'rate_limited');
  }

  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    return receptionRedirect(request, '/login', 'no_tenant');
  }

  if (login) {
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
      return receptionRedirect(request, '/login', errorCode);
    }

    const response = NextResponse.redirect(receptionOriginUrl(request, '/'), 303);
    response.cookies.set(
      RECEPTION_SESSION_COOKIE_NAME,
      buildReceptionSessionCookieValue(tenantSlug, staffResult.receptionUserId),
      getReceptionSessionCookieOptions()
    );

    return response;
  }

  // Legacy shared desk PIN: used when the login field is left blank (staff users optional).
  const storedHash = tenant.settings.reception?.deskPinHash;
  if (!isDeskPinConfigured(storedHash)) {
    return receptionRedirect(request, '/login', 'pin_not_configured');
  }

  if (!verifyDeskPin(tenantSlug, pin, storedHash)) {
    await recordPinAttemptFailure({ scope: 'reception', tenantSlug, clientIp });
    return receptionRedirect(request, '/login', 'invalid_pin');
  }

  const response = NextResponse.redirect(receptionOriginUrl(request, '/'), 303);
  response.cookies.set(
    RECEPTION_SESSION_COOKIE_NAME,
    buildReceptionSessionCookieValue(tenantSlug),
    getReceptionSessionCookieOptions()
  );

  return response;
}
