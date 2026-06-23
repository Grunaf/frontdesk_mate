import { NextResponse, type NextRequest } from 'next/server';
import {
  getReceptionSessionCookieOptions,
  RECEPTION_SESSION_COOKIE_NAME,
} from '@/app/reception/lib/receptionSession';
import { receptionLoginUrl } from '@/app/reception/lib/resolveReceptionTenantSlug';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(receptionLoginUrl(request), 303);
  response.cookies.set(RECEPTION_SESSION_COOKIE_NAME, '', {
    ...getReceptionSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
