import type { Step } from '../model/useCheckInState';
import { resolveNextArrivalJourneyStep } from './resolveNextArrivalJourneyStep';

const CHECK_IN_CTA_KEY = 'directions.checkInToContinue';

const STEP_BUTTON_KEYS: Record<Step, string> = {
  info: 'preTrip.actionButton',
  route: 'directions.actionButton',
  arrival: 'arrival.actionButton',
  register: 'register.actionButton',
  settlement: 'settlement.actionButton',
};

export function resolveArrivalJourneyPrimaryButtonKey(
  activeStepId: Step,
  isRegistered: boolean,
  routesAvailable: boolean,
  tourismRegistrationRequired: boolean
): string {
  const nextStep = resolveNextArrivalJourneyStep(
    activeStepId,
    routesAvailable,
    tourismRegistrationRequired
  );

  if (
    !isRegistered &&
    nextStep !== null &&
    (nextStep === 'arrival' || nextStep === 'register' || nextStep === 'settlement')
  ) {
    return CHECK_IN_CTA_KEY;
  }

  if (activeStepId === 'info' && !routesAvailable && isRegistered) {
    return STEP_BUTTON_KEYS.arrival;
  }

  return STEP_BUTTON_KEYS[activeStepId];
}
