import type { StaySetupStep } from './resolveStaySetupSteps';
import {
  isStaySetupRegistrationComplete,
  type StaySetupCompletion,
} from './resolveStaySetupSteps';

const CHECK_IN_CTA_KEY = 'guestCheckIn.checkInToContinue';

export function resolveStaySetupPrimaryButtonKey(
  activeStepId: StaySetupStep,
  isRegistered: boolean,
  _tourismRequired: boolean,
  completion: StaySetupCompletion
): string {
  if (!isRegistered) {
    return CHECK_IN_CTA_KEY;
  }

  if (activeStepId === 'registration' && !isStaySetupRegistrationComplete(completion)) {
    return CHECK_IN_CTA_KEY;
  }

  if (activeStepId === 'registration') {
    return 'registration.continueSettlingIn';
  }

  if (activeStepId === 'essentials') {
    return 'essentials.actionButtonRoom';
  }

  return 'settlement.actionButton';
}

export function shouldShowStaySetupPrimaryButton(
  activeStepId: StaySetupStep,
  isRegistered: boolean,
  completion: StaySetupCompletion
): boolean {
  if (!isRegistered) {
    return true;
  }

  if (activeStepId === 'registration' && !isStaySetupRegistrationComplete(completion)) {
    return false;
  }

  return true;
}

export function isStaySetupEssentialsPrimaryDisabled(
  activeStepId: StaySetupStep,
  hasHouseRules: boolean,
  rulesAcknowledged: boolean
): boolean {
  if (activeStepId !== 'essentials' || !hasHouseRules) {
    return false;
  }

  return !rulesAcknowledged;
}
