import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { generateAccessToken, hashAccessToken } from './accessToken';
import { buildGuestSessionPayload, verifyGuestSessionValue } from './guestSession';

describe('accessToken', () => {
  it('hashes tokens deterministically', () => {
    expect(hashAccessToken('abc')).toBe(hashAccessToken('abc'));
    expect(hashAccessToken('abc')).not.toBe(hashAccessToken('def'));
  });

  it('generates unique tokens', () => {
    expect(generateAccessToken()).not.toBe(generateAccessToken());
  });
});

describe('guestSession', () => {
  it('round-trips signed session payload', () => {
    process.env.GUEST_SESSION_SECRET = 'test-secret';

    const payload = buildGuestSessionPayload({
      stayId: 'stay-1',
      tenantSlug: 'vega',
      bedId: '4B',
      checkOutAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const body = `${payload.stayId}.${payload.tenantSlug}.${payload.bedId}.${payload.exp}`;
    const signature = createHmac('sha256', 'test-secret').update(body).digest('hex');
    const signed = `${body}.${signature}`;

    expect(verifyGuestSessionValue(signed)).toEqual(payload);
  });
});
