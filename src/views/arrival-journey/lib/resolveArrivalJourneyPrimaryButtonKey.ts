import type { Step } from '../model/useCheckInState';

export function resolveArrivalJourneyPrimaryButtonKey(
  activeStepId: Step,
  isRegistered: boolean
): string {
  if (!isRegistered && activeStepId === 'route') {
    return 'directions.checkInToContinue';
  }

  const buttonKeys: Record<Step, string> = {
    info: 'preTrip.actionButton',
    route: 'directions.actionButton',
    arrival: 'arrival.actionButton',
    register: 'register.actionButton',
    settlement: 'settlement.actionButton',
  };

  return buttonKeys[activeStepId];
}
