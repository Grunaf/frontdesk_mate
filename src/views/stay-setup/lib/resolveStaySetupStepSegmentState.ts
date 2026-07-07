import type { StaySetupCompletion, StaySetupStep } from './resolveStaySetupSteps';

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

  if (step === 'register' && completion.tourismRequired && completion.tourismComplete) {
    return 'completed';
  }

  if (step === 'contact' && completion.contactComplete) {
    return 'completed';
  }

  if (step === 'essentials' && currentStep === 'room') {
    return 'completed';
  }

  return 'upcoming';
}
