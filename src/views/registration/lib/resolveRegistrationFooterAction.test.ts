import { describe, expect, it } from 'vitest';
import { resolveRegistrationStandalonePrimary } from './resolveRegistrationFooterAction';

describe('resolveRegistrationStandalonePrimary', () => {
  it('asks for check-in when guest is not registered', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: false,
        checkInDayOrLater: true,
        registrationComplete: false,
        passportVerified: false,
      })
    ).toEqual({ kind: 'checkIn' });
  });

  it('hides primary while registration incomplete', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: true,
        registrationComplete: false,
        passportVerified: false,
      })
    ).toEqual({ kind: 'hidden' });
  });

  it('sends guest to concierge before check-in day', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: false,
        registrationComplete: true,
        passportVerified: false,
      })
    ).toEqual({ kind: 'concierge' });
  });

  it('hides primary until passport verified on check-in day', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: true,
        registrationComplete: true,
        passportVerified: false,
      })
    ).toEqual({ kind: 'hidden' });
  });

  it('continues to essentials when registration and passport are done', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: true,
        registrationComplete: true,
        passportVerified: true,
      })
    ).toEqual({ kind: 'continueEssentials' });
  });
});
