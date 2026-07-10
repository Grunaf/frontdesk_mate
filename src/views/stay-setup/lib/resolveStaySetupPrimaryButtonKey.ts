import type { StaySetupStep } from './resolveStaySetupSteps';
import {
  isStaySetupRegistrationComplete,
  type StaySetupCompletion,
} from './resolveStaySetupSteps';

const STEP_BUTTON_KEYS: Record<StaySetupStep, string> = {
  registration: 'essentials.actionButton',
  essentials: 'essentials.actionButton',
  room: 'settlement.actionButton',
};

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

  return STEP_BUTTON_KEYS[activeStepId];
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
