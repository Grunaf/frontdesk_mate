import {
  isStaySetupRegistrationComplete,
  resolveStaySetupCoordinatorStep,
  type StaySetupCompletion,
  type StaySetupStep,
} from './resolveStaySetupSteps';

const STAY_SETUP_STEP_ORDER: StaySetupStep[] = ['registration', 'essentials', 'room'];

function staySetupStepIndex(step: StaySetupStep): number {
  return STAY_SETUP_STEP_ORDER.indexOf(step);
}

function isRoomOrEssentialsStep(step: StaySetupStep): boolean {
  return step === 'essentials' || step === 'room';
}

/** Ignore URL step that disagrees with UI during async URL replace (essentials ↔ room). */
export function shouldIgnoreConflictingUrlStep(
  urlStep: StaySetupStep,
  currentStep: StaySetupStep
): boolean {
  if (urlStep === currentStep) {
    return false;
  }

  if (currentStep === 'registration' && urlStep === 'essentials') {
    return true;
  }

  if (isRoomOrEssentialsStep(currentStep) && isRoomOrEssentialsStep(urlStep)) {
    return true;
  }

  return false;
}

/**
 * Completion sync may update registration flags; it must not rewind wizard steps
 * because of a stale ?step= query still in the address bar.
 */
export function reconcileStepAfterCompletionSync(
  step: StaySetupStep,
  tourismRegistrationRequired: boolean,
  nextCompletion: StaySetupCompletion,
  checkInDayOrLater: boolean
): StaySetupStep {
  const regComplete = isStaySetupRegistrationComplete(nextCompletion);
  const settlementUnlocked = regComplete && nextCompletion.passportVerified;

  if (!settlementUnlocked || !checkInDayOrLater) {
    if (isRoomOrEssentialsStep(step)) {
      return 'registration';
    }
    if (step === 'registration') {
      return 'registration';
    }
    return resolveStaySetupCoordinatorStep(
      tourismRegistrationRequired,
      nextCompletion,
      checkInDayOrLater
    );
  }

  if (step === 'registration' || isRoomOrEssentialsStep(step)) {
    return step;
  }

  return resolveStaySetupCoordinatorStep(
    tourismRegistrationRequired,
    nextCompletion,
    checkInDayOrLater
  );
}

export function mergeRegistrationStatusMonotonic(
  current: {
    tourismComplete: boolean;
    entryDateComplete: boolean;
    contactComplete: boolean;
    passportVerified?: boolean;
  },
  incoming: {
    tourismComplete: boolean;
    entryDateComplete: boolean;
    contactComplete: boolean;
    passportVerified?: boolean;
  }
): {
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
  passportVerified: boolean;
} {
  return {
    tourismComplete: current.tourismComplete || incoming.tourismComplete,
    entryDateComplete: current.entryDateComplete || incoming.entryDateComplete,
    contactComplete: current.contactComplete || incoming.contactComplete,
    passportVerified: Boolean(current.passportVerified) || Boolean(incoming.passportVerified),
  };
}

export function resolveStaySetupStepFromUrl(input: {
  urlStep: StaySetupStep | null;
  isRegistered: boolean;
  tourismRegistrationRequired: boolean;
  completion: StaySetupCompletion;
  checkInDayOrLater: boolean;
  registrationComplete: boolean;
  contactComplete: boolean;
  currentStep: StaySetupStep;
  userIntentStep: StaySetupStep | null;
}): StaySetupStep | null {
  if (input.userIntentStep) {
    return input.userIntentStep;
  }

  const { urlStep } = input;

  if (!input.isRegistered) {
    if (urlStep === 'room' || urlStep === 'essentials') {
      return urlStep;
    }
    if (urlStep === 'registration') {
      return 'registration';
    }
    if (!urlStep) {
      return resolveStaySetupCoordinatorStep(
        input.tourismRegistrationRequired,
        input.completion,
        input.checkInDayOrLater
      );
    }
    return null;
  }

  if (urlStep === 'registration') {
    return 'registration';
  }

  if (urlStep && shouldIgnoreConflictingUrlStep(urlStep, input.currentStep)) {
    return null;
  }

  if (!urlStep) {
    return resolveStaySetupCoordinatorStep(
      input.tourismRegistrationRequired,
      input.completion,
      input.checkInDayOrLater
    );
  }

  if (urlStep === 'room' || urlStep === 'essentials') {
    if (!input.registrationComplete) {
      return 'registration';
    }
    if (!input.checkInDayOrLater) {
      return 'registration';
    }
    if (!input.completion.passportVerified) {
      return 'registration';
    }
    return urlStep;
  }

  return urlStep;
}

export function isStaySetupUrlSyncedWithStep(
  urlStep: StaySetupStep | null,
  step: StaySetupStep
): boolean {
  if (urlStep === null) {
    return staySetupStepIndex(step) === 0;
  }

  return urlStep === step;
}
