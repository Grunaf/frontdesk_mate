import {
  isStaySetupRegistrationComplete,
  type StaySetupCompletion,
  type StaySetupStep,
} from './resolveStaySetupSteps';

export type StaySetupStepSegmentState = 'completed' | 'current' | 'upcoming' | 'locked';

export function resolveStaySetupStepSegmentState(
  step: StaySetupStep,
  currentStep: StaySetupStep,
  completion: StaySetupCompletion,
  locked: boolean
): StaySetupStepSegmentState {
  if (step === currentStep) {
    return 'current';
  }

  if (locked) {
    return 'locked';
  }

  if (step === 'registration' && isStaySetupRegistrationComplete(completion)) {
    return 'completed';
  }

  if (step === 'essentials' && currentStep === 'room') {
    return 'completed';
  }

  return 'upcoming';
}
