import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import {
  RECEPTION_SESSION_COOKIE_NAME,
  buildReceptionSessionCookieValue,
  readReceptionSessionFromRequest,
} from './receptionSession';

function requestWithSessionCookie(value: string): NextRequest {
  return new NextRequest('http://vega.reception.localhost:3000/', {
    headers: {
      cookie: `${RECEPTION_SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    },
  });
}

describe('receptionSession cookie', () => {
  it('parses legacy desk session without receptionUserId', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const token = buildReceptionSessionCookieValue('vega');
    const session = readReceptionSessionFromRequest(requestWithSessionCookie(token));

    expect(session).toMatchObject({ tenantSlug: 'vega' });
    expect(session?.receptionUserId).toBeUndefined();
    expect(session?.exp).toBeGreaterThan(Date.now());
  });

  it('round-trips staff session with receptionUserId', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const userId = '11111111-1111-1111-1111-111111111111';
    const token = buildReceptionSessionCookieValue('vega', userId);
    const session = readReceptionSessionFromRequest(requestWithSessionCookie(token));

    expect(session).toMatchObject({
      tenantSlug: 'vega',
      receptionUserId: userId,
    });
    expect(session?.exp).toBeGreaterThan(Date.now());
  });

  it('rejects tampered staff session token', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const userId = '11111111-1111-1111-1111-111111111111';
    const token = buildReceptionSessionCookieValue('vega', userId);
    const tampered = token.replace(userId, '22222222-2222-2222-2222-222222222222');
    const session = readReceptionSessionFromRequest(requestWithSessionCookie(tampered));

    expect(session).toBeNull();
  });
});
