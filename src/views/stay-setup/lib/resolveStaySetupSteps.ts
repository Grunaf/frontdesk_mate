export type StaySetupStep = 'register' | 'contact' | 'settlement';

export type StaySetupCompletion = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
};

export function resolveNextStaySetupStep(
  currentStep: StaySetupStep,
  tourismRequired: boolean,
  completion: StaySetupCompletion
): StaySetupStep | null {
  const steps = resolveStaySetupStepOrder(tourismRequired, completion);
  const index = steps.indexOf(currentStep);
  if (index === -1) {
    return null;
  }

  return steps[index + 1] ?? null;
}

export function resolveStaySetupStepOrder(
  tourismRequired: boolean,
  completion: StaySetupCompletion
): StaySetupStep[] {
  const steps: StaySetupStep[] = [];

  if (tourismRequired) {
    steps.push('register');
  }

  if (!completion.contactComplete) {
    steps.push('contact');
  }

  steps.push('settlement');

  return steps;
}

export function resolveFirstIncompleteStaySetupStep(
  tourismRequired: boolean,
  completion: StaySetupCompletion
): StaySetupStep {
  if (tourismRequired && !completion.tourismComplete) {
    return 'register';
  }

  if (!completion.contactComplete) {
    return 'contact';
  }

  return 'settlement';
}

export function isStaySetupStepLocked(
  step: StaySetupStep,
  isRegistered: boolean,
  tourismRequired: boolean,
  completion: StaySetupCompletion
): boolean {
  if (!isRegistered) {
    return true;
  }

  if (step === 'register') {
    return false;
  }

  if (step === 'contact') {
    return tourismRequired && !completion.tourismComplete;
  }

  if (step === 'settlement') {
    if (tourismRequired && !completion.tourismComplete) {
      return true;
    }
    return !completion.contactComplete;
  }

  return false;
}

export function isValidStaySetupUrlStep(
  step: string | null,
  tourismRequired: boolean,
  contactComplete: boolean
): step is StaySetupStep {
  if (!step) {
    return false;
  }

  if (step === 'register') {
    return tourismRequired;
  }

  if (step === 'contact') {
    return !contactComplete;
  }

  if (step === 'settlement') {
    return true;
  }

  return false;
}
