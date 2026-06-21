import { describe, expect, it } from 'vitest';
import { decryptAccessToken, encryptAccessToken, hashAccessToken } from './accessToken';

describe('accessToken encryption', () => {
  it('round-trips encrypted tokens', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const token = 'abc123token';
    const encrypted = encryptAccessToken(token);
    expect(decryptAccessToken(encrypted)).toBe(token);
    expect(decryptAccessToken(encrypted)).not.toBe(hashAccessToken(token));
  });
});
