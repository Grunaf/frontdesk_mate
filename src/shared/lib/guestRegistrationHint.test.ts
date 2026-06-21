import { describe, expect, it } from 'vitest';
import {
  getGuestAppSharedCookieDomain,
  getGuestRegistrationHintMaxAgeSec,
  isGuestRegistrationIndexValid,
  parseGuestRegistrationHint,
  serializeGuestRegistrationHint,
  type GuestRegistrationIndex,
} from './guestRegistrationHint';

const validIndex: GuestRegistrationIndex = {
  tenantSlug: 'vega',
  bedId: '4B',
  exp: Date.now() + 60_000,
};

describe('guestRegistrationHint', () => {
  it('uses shared app subdomain cookie domain', () => {
    expect(getGuestAppSharedCookieDomain()).toBe('.app.localhost');
  });

  it('validates registration index expiry', () => {
    expect(isGuestRegistrationIndexValid(validIndex)).toBe(true);
    expect(isGuestRegistrationIndexValid({ ...validIndex, exp: Date.now() - 1 })).toBe(false);
  });

  it('round-trips serialized hint values', () => {
    const serialized = serializeGuestRegistrationHint(validIndex);
    expect(parseGuestRegistrationHint(serialized)).toEqual(validIndex);
  });

  it('parses plain JSON from localStorage-style values', () => {
    expect(parseGuestRegistrationHint(JSON.stringify(validIndex))).toEqual(validIndex);
  });

  it('computes positive max-age for cookie', () => {
    expect(getGuestRegistrationHintMaxAgeSec(validIndex)).toBeGreaterThan(0);
  });
});
