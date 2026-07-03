import { describe, expect, it } from 'vitest';
import { shouldShowGuestCheckInChip } from './shouldShowGuestCheckInChip';

describe('shouldShowGuestCheckInChip', () => {
  it('shows on concierge when not registered', () => {
    expect(
      shouldShowGuestCheckInChip({
        cleanPath: '/',
        isRegistered: false,
      })
    ).toBe(true);
  });

  it('hides when registered', () => {
    expect(
      shouldShowGuestCheckInChip({
        cleanPath: '/',
        isRegistered: true,
      })
    ).toBe(false);
  });

  it('hides on arrival guide and drill-down routes', () => {
    expect(
      shouldShowGuestCheckInChip({
        cleanPath: '/welcome',
        isRegistered: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestCheckInChip({
        cleanPath: '/guide',
        isRegistered: false,
      })
    ).toBe(false);
  });

  it('hides on check-in routes', () => {
    expect(
      shouldShowGuestCheckInChip({
        cleanPath: '/check-in',
        isRegistered: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestCheckInChip({
        cleanPath: '/check-in/intent',
        isRegistered: false,
      })
    ).toBe(false);
  });
});
