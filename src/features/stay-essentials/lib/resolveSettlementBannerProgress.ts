import {
  resolvePreCheckInBannerProgress,
  type PreCheckInBannerStatusInput,
} from './resolvePreCheckInBannerProgress';

export type SettlementBannerProgressInput = {
  essentialsDone: boolean;
  roomDone: boolean;
};

export type SettlementBannerProgress = {
  totalSteps: number;
  completedSteps: number;
  /** Banner hidden when essentials + room are done (registration not part of close criteria). */
  isComplete: boolean;
};

export function isSettlementBannerClosed(input: SettlementBannerProgressInput): boolean {
  return input.essentialsDone && input.roomDone;
}

export function resolveSettlementBannerProgress(input: {
  essentialsDone: boolean;
  roomDone: boolean;
  registrationComplete: boolean;
  registrationStatus?: PreCheckInBannerStatusInput;
}): SettlementBannerProgress {
  const isComplete = isSettlementBannerClosed(input);

  if (input.registrationComplete) {
    let completedSteps = 0;
    if (input.essentialsDone) {
      completedSteps += 1;
    }
    if (input.roomDone) {
      completedSteps += 1;
    }

    return {
      totalSteps: 2,
      completedSteps,
      isComplete,
    };
  }

  let completedSteps = 0;
  if (input.registrationStatus) {
    const registrationProgress = resolvePreCheckInBannerProgress(input.registrationStatus);
    if (registrationProgress.isComplete) {
      completedSteps += 1;
    }
  }
  if (input.essentialsDone) {
    completedSteps += 1;
  }
  if (input.roomDone) {
    completedSteps += 1;
  }

  return {
    totalSteps: 3,
    completedSteps,
    isComplete,
  };
}

export function resolveFirstIncompleteSettlementStep(
  input: SettlementBannerProgressInput
): 'essentials' | 'room' | null {
  if (!input.essentialsDone) {
    return 'essentials';
  }
  if (!input.roomDone) {
    return 'room';
  }
  return null;
}
