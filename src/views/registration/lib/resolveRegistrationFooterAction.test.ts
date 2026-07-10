import { describe, expect, it } from 'vitest';
import { resolveRegistrationStandalonePrimary } from './resolveRegistrationFooterAction';

describe('resolveRegistrationStandalonePrimary', () => {
  it('prompts check-in when guest is not registered', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: false,
        checkInDayOrLater: false,
        registrationComplete: false,
      })
    ).toEqual({ kind: 'checkIn' });
  });

  it('hides primary while registration is incomplete', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: true,
        registrationComplete: false,
      })
    ).toEqual({ kind: 'hidden' });
  });

  it('returns concierge before check-in day when complete', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: false,
        registrationComplete: true,
      })
    ).toEqual({ kind: 'concierge' });
  });

  it('continues to essentials on check-in day when complete', () => {
    expect(
      resolveRegistrationStandalonePrimary({
        isRegistered: true,
        checkInDayOrLater: true,
        registrationComplete: true,
      })
    ).toEqual({ kind: 'continueEssentials' });
  });
});
