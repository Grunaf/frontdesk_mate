import type { StaySetupStep } from './resolveStaySetupSteps';
import { resolveNextStaySetupStep, type StaySetupCompletion } from './resolveStaySetupSteps';

const STEP_BUTTON_KEYS: Record<StaySetupStep, string> = {
  register: 'register.actionButton',
  contact: 'contact.actionButton',
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
