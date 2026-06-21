import { describe, expect, it } from 'vitest';
import {
  generateGuestPin,
  hashGuestPin,
  isGuestPinFormatValid,
  normalizeGuestPin,
  verifyGuestPin,
} from './guestPin';

describe('guestPin', () => {
  it('generates a 6-digit PIN', () => {
    const pin = generateGuestPin();
    expect(pin).toMatch(/^\d{6}$/);
  });

  it('normalizes non-digit input', () => {
    expect(normalizeGuestPin('48 2-193')).toBe('482193');
    expect(normalizeGuestPin('48219399')).toBe('482193');
  });

  it('validates PIN format', () => {
    expect(isGuestPinFormatValid('482193')).toBe(true);
    expect(isGuestPinFormatValid('48219')).toBe(false);
    expect(isGuestPinFormatValid('abc123')).toBe(false);
  });

  it('verifies matching PIN for tenant slug', () => {
    process.env.GUEST_SESSION_SECRET = 'test-secret';

    const hash = hashGuestPin('vega', '482193');
    expect(verifyGuestPin('vega', '482193', hash)).toBe(true);
    expect(verifyGuestPin('vega', '111111', hash)).toBe(false);
    expect(verifyGuestPin('kotor', '482193', hash)).toBe(false);
  });
});
