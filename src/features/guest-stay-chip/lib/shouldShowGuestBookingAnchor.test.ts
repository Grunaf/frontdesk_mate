import { describe, expect, it } from 'vitest';
import { shouldShowGuestBookingAnchor } from './shouldShowGuestBookingAnchor';

describe('shouldShowGuestBookingAnchor', () => {
  it('shows on arrival-guide paths when session exists', () => {
    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/welcome',
        hasSession: true,
        hasForeignRegistration: false,
      })
    ).toBe(true);

    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/stay-setup',
        hasSession: true,
        hasForeignRegistration: false,
      })
    ).toBe(true);

    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/registration',
        hasSession: true,
        hasForeignRegistration: false,
      })
    ).toBe(true);
  });

  it('hides on hub and other routes', () => {
    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/',
        hasSession: true,
        hasForeignRegistration: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/guide',
        hasSession: true,
        hasForeignRegistration: false,
      })
    ).toBe(false);
  });

  it('hides without session or on foreign stay', () => {
    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/stay-setup',
        hasSession: false,
        hasForeignRegistration: false,
      })
    ).toBe(false);

    expect(
      shouldShowGuestBookingAnchor({
        cleanPath: '/stay-setup',
        hasSession: true,
        hasForeignRegistration: true,
      })
    ).toBe(false);
  });
});
