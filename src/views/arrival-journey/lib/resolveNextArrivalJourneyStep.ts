import type { Step } from '../model/useCheckInState';

export function resolveNextArrivalJourneyStep(
  currentStep: Step,
  routesAvailable: boolean,
  tourismRegistrationRequired: boolean
): Step | null {
  switch (currentStep) {
    case 'info':
      return routesAvailable ? 'route' : 'arrival';
    case 'route':
      return 'arrival';
    case 'arrival':
      return tourismRegistrationRequired ? 'register' : 'settlement';
    case 'register':
      return 'settlement';
    case 'settlement':
      return null;
    default:
      return null;
  }
}

/** Public tab to show when a locked step was requested without guest session. */
export function resolvePublicArrivalJourneyTab(routesAvailable: boolean): Step {
  return routesAvailable ? 'route' : 'info';
}
