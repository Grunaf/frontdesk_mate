import { describe, expect, it } from 'vitest';
import { shouldShowGuestStayChip } from './shouldShowGuestStayChip';

describe('shouldShowGuestStayChip', () => {
  it('shows on concierge when registered', () => {
    expect(
      shouldShowGuestStayChip({
        cleanPath: '/',
        isRegistered: true,
        hasForeignRegistration: false,
      })
    ).toBe(true);
  });

  it('hides on arrival guide and drill-down routes', () => {
    expect(
      shouldShowGuestStayChip({
        cleanPath: '/welcome',
        isRegistered: true,
        hasForeignRegistration: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestStayChip({
        cleanPath: '/guide',
        isRegistered: true,
        hasForeignRegistration: false,
      })
    ).toBe(false);
  });

  it('hides on check-in routes', () => {
    expect(
      shouldShowGuestStayChip({
        cleanPath: '/check-in',
        isRegistered: true,
        hasForeignRegistration: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestStayChip({
        cleanPath: '/check-in/intent',
        isRegistered: true,
        hasForeignRegistration: false,
      })
    ).toBe(false);
  });

  it('hides when not registered or foreign stay', () => {
    expect(
      shouldShowGuestStayChip({
        cleanPath: '/',
        isRegistered: false,
        hasForeignRegistration: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestStayChip({
        cleanPath: '/',
        isRegistered: true,
        hasForeignRegistration: true,
      })
    ).toBe(false);
  });
});
