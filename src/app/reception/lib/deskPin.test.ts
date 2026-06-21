import { describe, expect, it } from 'vitest';
import { hashDeskPin, verifyDeskPin } from './deskPin';

describe('deskPin', () => {
  it('verifies matching PIN for tenant slug', () => {
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
    const hash = hashDeskPin('vega', '1234');
    expect(verifyDeskPin('vega', '1234', hash)).toBe(true);
    expect(verifyDeskPin('vega', '9999', hash)).toBe(false);
    expect(verifyDeskPin('kotor', '1234', hash)).toBe(false);
  });
});
