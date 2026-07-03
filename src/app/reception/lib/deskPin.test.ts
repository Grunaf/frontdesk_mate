import { describe, expect, it } from 'vitest';
import { hashDeskPin, isNewDeskPinValid, verifyDeskPin } from './deskPin';

describe('deskPin', () => {
  it('verifies matching PIN for tenant slug', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const hash = hashDeskPin('vega', '123456');
    expect(verifyDeskPin('vega', '123456', hash)).toBe(true);
    expect(verifyDeskPin('vega', '999999', hash)).toBe(false);
    expect(verifyDeskPin('kotor', '123456', hash)).toBe(false);
  });

  it('allows blank desk PIN draft and requires min length when set', () => {
    expect(isNewDeskPinValid('')).toBe(true);
    expect(isNewDeskPinValid('12345')).toBe(false);
    expect(isNewDeskPinValid('123456')).toBe(true);
  });
});
