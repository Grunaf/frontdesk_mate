import { describe, expect, it } from 'vitest';
import { shouldShowStaySetupPrimaryButton } from './resolveStaySetupPrimaryButtonKey';
import type { StaySetupCompletion } from './resolveStaySetupSteps';

const completeVerified: StaySetupCompletion = {
  tourismRequired: true,
  tourismComplete: true,
  entryDateComplete: true,
  contactComplete: true,
  passportVerified: true,
};

describe('shouldShowStaySetupPrimaryButton', () => {
  it('hides on registration while waiting for passport verify', () => {
    expect(
      shouldShowStaySetupPrimaryButton('registration', true, {
        ...completeVerified,
        passportVerified: false,
      })
    ).toBe(false);
  });

  it('shows on registration when complete and passport verified', () => {
    expect(shouldShowStaySetupPrimaryButton('registration', true, completeVerified)).toBe(true);
  });

  it('hides on registration while contact is being edited', () => {
    expect(
      shouldShowStaySetupPrimaryButton('registration', true, completeVerified, {
        contactEditing: true,
      })
    ).toBe(false);
  });

  it('hides on registration while prerequisites incomplete', () => {
    expect(
      shouldShowStaySetupPrimaryButton('registration', true, {
        ...completeVerified,
        contactComplete: false,
        passportVerified: false,
      })
    ).toBe(false);
  });
});
