import type { Step } from '../model/useCheckInState';
import { resolveNextArrivalJourneyStep } from './resolveNextArrivalJourneyStep';

const CHECK_IN_CTA_KEY = 'directions.checkInToContinue';

const STEP_BUTTON_KEYS: Record<Step, string> = {
  info: 'preTrip.actionButton',
  route: 'directions.actionButton',
  arrival: 'arrival.actionButton',
};

export function resolveArrivalJourneyPrimaryButtonKey(
  activeStepId: Step,
  isRegistered: boolean,
  routesAvailable: boolean
): string {
  const nextStep = resolveNextArrivalJourneyStep(activeStepId, routesAvailable);

  if (!isRegistered && nextStep === 'arrival') {
    return CHECK_IN_CTA_KEY;
  }

  if (activeStepId === 'info' && !routesAvailable && isRegistered) {
    return STEP_BUTTON_KEYS.arrival;
  }

  return STEP_BUTTON_KEYS[activeStepId];
}
