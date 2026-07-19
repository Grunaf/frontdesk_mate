export type StaySetupStep = 'registration' | 'essentials' | 'room';

export type StaySetupCompletion = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  /** Required when tourism is on; entry stamp date for guests on the stay. */
  entryDateComplete: boolean;
  contactComplete: boolean;
  /** Desk admitted guest (`passport_checked_at`). Independent of tourism form complete. */
  passportVerified: boolean;
};

const LEGACY_URL_STEP_ALIASES: Record<string, StaySetupStep> = {
  settlement: 'room',
  register: 'registration',
  contact: 'registration',
};

export function isStaySetupRegistrationComplete(completion: StaySetupCompletion): boolean {
  const tourismOk =
    !completion.tourismRequired ||
    (completion.tourismComplete && completion.entryDateComplete);
  return tourismOk && completion.contactComplete;
}

/** Bed / room unlock: registration aggregate + desk passport admit. */
export function isStaySetupSettlementUnlocked(completion: StaySetupCompletion): boolean {
  return isStaySetupRegistrationComplete(completion) && completion.passportVerified;
}

export function normalizeStaySetupUrlStep(step: string | null): StaySetupStep | null {
  if (!step) {
    return null;
  }

  const normalized = LEGACY_URL_STEP_ALIASES[step] ?? step;
  if (normalized === 'registration' || normalized === 'essentials' || normalized === 'room') {
    return normalized;
  }

  return null;
}

export function resolveNextStaySetupStep(
  currentStep: StaySetupStep,
  _tourismRequired: boolean,
  completion: StaySetupCompletion
): StaySetupStep | null {
  if (currentStep === 'registration' && !isStaySetupRegistrationComplete(completion)) {
    return null;
  }

  if (currentStep === 'registration' && !completion.passportVerified) {
    return null;
  }

  const steps = resolveStaySetupStepOrder(_tourismRequired, completion);
  const index = steps.indexOf(currentStep);
  if (index === -1) {
    return null;
  }

  for (let i = index + 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step === 'registration' && isStaySetupRegistrationComplete(completion)) {
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
  _tourismRequired: boolean,
  _completion: StaySetupCompletion
): StaySetupStep[] {
  return ['registration', 'essentials', 'room'];
}

export function resolveFirstIncompleteStaySetupStep(
  _tourismRequired: boolean,
  completion: StaySetupCompletion
): StaySetupStep {
  if (!isStaySetupRegistrationComplete(completion)) {
    return 'registration';
  }

  if (!completion.passportVerified) {
    return 'registration';
  }

  return 'essentials';
}

/** Wizard step when registration is done but check-in day has not started yet. */
export function resolveStaySetupCoordinatorStep(
  tourismRequired: boolean,
  completion: StaySetupCompletion,
  checkInDayOrLater: boolean
): StaySetupStep {
  if (isStaySetupRegistrationComplete(completion) && !checkInDayOrLater) {
    return 'registration';
  }

  return resolveFirstIncompleteStaySetupStep(tourismRequired, completion);
}

export function isStaySetupStepLocked(
  step: StaySetupStep,
  isRegistered: boolean,
  _tourismRequired: boolean,
  completion: StaySetupCompletion,
  checkInDayOrLater: boolean
): boolean {
  if (!isRegistered) {
    return false;
  }

  if (step === 'registration') {
    return false;
  }

  if (step === 'essentials' || step === 'room') {
    if (!checkInDayOrLater) {
      return true;
    }
    return !isStaySetupSettlementUnlocked(completion);
  }

  return false;
}

export function isValidStaySetupUrlStep(
  step: string | null,
  _tourismRequired: boolean,
  _contactComplete: boolean
): step is StaySetupStep {
  const normalized = normalizeStaySetupUrlStep(step);
  if (!normalized) {
    return false;
  }

  return true;
}
