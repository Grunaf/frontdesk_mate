export type StaySetupStep = 'register' | 'contact' | 'essentials' | 'room';

export type StaySetupCompletion = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
};

const LEGACY_URL_STEP_ALIASES: Record<string, StaySetupStep> = {
  settlement: 'room',
};

export function normalizeStaySetupUrlStep(step: string | null): StaySetupStep | null {
  if (!step) {
    return null;
  }

  const normalized = LEGACY_URL_STEP_ALIASES[step] ?? step;
  if (
    normalized === 'register' ||
    normalized === 'contact' ||
    normalized === 'essentials' ||
    normalized === 'room'
  ) {
    return normalized;
  }

  return null;
}

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

  for (let i = index + 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step === 'contact' && completion.contactComplete) {
      continue;
    }
    return step;
  }

  return null;
}

export function resolvePreviousStaySetupStep(
  currentStep: StaySetupStep,
  tourismRequired: boolean,
  completion: StaySetupCompletion
): StaySetupStep | null {
  const steps = resolveStaySetupStepOrder(tourismRequired, completion);
  const index = steps.indexOf(currentStep);
  if (index <= 0) {
    return null;
  }

  return steps[index - 1] ?? null;
}

export function resolveStaySetupStepOrder(
  tourismRequired: boolean,
  _completion: StaySetupCompletion
): StaySetupStep[] {
  const steps: StaySetupStep[] = [];

  if (tourismRequired) {
    steps.push('register');
  }

  steps.push('contact');
  steps.push('essentials');
  steps.push('room');

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

  return 'essentials';
}

export function isStaySetupStepLocked(
  step: StaySetupStep,
  isRegistered: boolean,
  tourismRequired: boolean,
  completion: StaySetupCompletion
): boolean {
  if (!isRegistered) {
    return false;
  }

  if (step === 'register') {
    return false;
  }

  if (step === 'contact') {
    return tourismRequired && !completion.tourismComplete;
  }

  if (step === 'essentials' || step === 'room') {
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
  _contactComplete: boolean
): step is StaySetupStep {
  const normalized = normalizeStaySetupUrlStep(step);
  if (!normalized) {
    return false;
  }

  if (normalized === 'register') {
    return tourismRequired;
  }

  return true;
}
