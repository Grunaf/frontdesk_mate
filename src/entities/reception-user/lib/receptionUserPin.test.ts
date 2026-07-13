import { describe, expect, it } from 'vitest';

import { isReceptionLoginValid, normalizeReceptionLogin } from './normalizeReceptionLogin';
import {
  RECEPTION_USER_PIN_MIN_LENGTH,
  hashReceptionUserPin,
  isReceptionUserPinValid,
  verifyReceptionUserPin,
} from './receptionUserPin';

describe('normalizeReceptionLogin', () => {
  it('trims and lowercases login', () => {
    expect(normalizeReceptionLogin('  Front.Desk  ')).toBe('front.desk');
  });

  it('validates allowed login shape', () => {
    expect(isReceptionLoginValid('desk-1')).toBe(true);
    expect(isReceptionLoginValid('')).toBe(false);
    expect(isReceptionLoginValid('bad login')).toBe(false);
    expect(isReceptionLoginValid('a'.repeat(65))).toBe(false);
  });
});

describe('receptionUserPin', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  it('verifies matching PIN for tenant slug and user id', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const hash = hashReceptionUserPin('vega', userId, '123456');
    expect(verifyReceptionUserPin('vega', userId, '123456', hash)).toBe(true);
    expect(verifyReceptionUserPin('vega', userId, '999999', hash)).toBe(false);
    expect(verifyReceptionUserPin('kotor', userId, '123456', hash)).toBe(false);
    expect(verifyReceptionUserPin('vega', '22222222-2222-2222-2222-222222222222', '123456', hash)).toBe(
      false
    );
  });

  it('requires min PIN length', () => {
    expect(RECEPTION_USER_PIN_MIN_LENGTH).toBe(6);
    expect(isReceptionUserPinValid('12345')).toBe(false);
    expect(isReceptionUserPinValid('123456')).toBe(true);
    expect(isReceptionUserPinValid(' 123456 ')).toBe(true);
  });
});
