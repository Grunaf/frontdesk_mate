import type { StaySetupStep } from './resolveStaySetupSteps';
import {
  isStaySetupRegistrationComplete,
  resolveNextStaySetupStep,
  type StaySetupCompletion,
} from './resolveStaySetupSteps';

const STEP_BUTTON_KEYS: Record<StaySetupStep, string> = {
  registration: 'registration.cta',
  essentials: 'essentials.actionButton',
  room: 'settlement.actionButton',
};

const CHECK_IN_CTA_KEY = 'guestCheckIn.checkInToContinue';

export function resolveStaySetupPrimaryButtonKey(
  activeStepId: StaySetupStep,
  isRegistered: boolean,
  tourismRequired: boolean,
  completion: StaySetupCompletion
): string {
  if (!isRegistered) {
    return CHECK_IN_CTA_KEY;
  }

  if (activeStepId === 'registration') {
    if (!isStaySetupRegistrationComplete(completion)) {
      return 'registration.cta';
    }
    return 'essentials.actionButton';
  }

  return STEP_BUTTON_KEYS[activeStepId];
}

export function resolveStaySetupPrimaryAction(
  activeStepId: StaySetupStep,
  tourismRequired: boolean,
  completion: StaySetupCompletion
): 'next' | 'finish' {
  const next = resolveNextStaySetupStep(activeStepId, tourismRequired, completion);
  return next === null ? 'finish' : 'next';
}
