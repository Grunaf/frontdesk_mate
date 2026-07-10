export type RegistrationStandalonePrimary =
  | { kind: 'hidden' }
  | { kind: 'checkIn' }
  | { kind: 'concierge' }
  | { kind: 'continueEssentials' };

/** Footer primary on standalone `/registration` (not wizard / arrival). */
export function resolveRegistrationStandalonePrimary(input: {
  isRegistered: boolean;
  checkInDayOrLater: boolean;
  registrationComplete: boolean;
}): RegistrationStandalonePrimary {
  if (!input.isRegistered) {
    return { kind: 'checkIn' };
  }

  if (!input.registrationComplete) {
    return { kind: 'hidden' };
  }

  if (!input.checkInDayOrLater) {
    return { kind: 'concierge' };
  }

  return { kind: 'continueEssentials' };
}
