import { describe, expect, it } from 'vitest';
import { resolveGuestPinActivationError } from './resolveGuestPinActivationError';

describe('resolveGuestPinActivationError', () => {
  const futureCheckout = new Date(Date.now() + 86_400_000).toISOString();
  const pastCheckout = new Date(Date.now() - 86_400_000).toISOString();

  it('returns invalid_pin when stay is missing', () => {
    expect(resolveGuestPinActivationError(null)).toBe('invalid_pin');
  });

  it('returns revoked when stay was cancelled', () => {
    expect(
      resolveGuestPinActivationError({
        revoked_at: new Date().toISOString(),
        check_out_at: futureCheckout,
      })
    ).toBe('revoked');
  });

  it('returns expired when checkout passed', () => {
    expect(
      resolveGuestPinActivationError({
        revoked_at: null,
        check_out_at: pastCheckout,
      })
    ).toBe('expired');
  });

  it('returns null for an active stay', () => {
    expect(
      resolveGuestPinActivationError({
        revoked_at: null,
        check_out_at: futureCheckout,
      })
    ).toBeNull();
  });
});
