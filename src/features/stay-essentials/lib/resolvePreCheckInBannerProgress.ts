export type PreCheckInBannerStatusInput = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
};

export type PreCheckInBannerProgress = {
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
};

export function resolvePreCheckInBannerProgress(
  input: PreCheckInBannerStatusInput
): PreCheckInBannerProgress {
  const totalSteps = input.tourismRequired ? 3 : 1;
  let completedSteps = 0;

  if (input.tourismRequired && input.tourismComplete) {
    completedSteps += 1;
  }
  if (input.tourismRequired && input.entryDateComplete) {
    completedSteps += 1;
  }
  if (input.contactComplete) {
    completedSteps += 1;
  }

  const isComplete =
    (!input.tourismRequired ||
      (input.tourismComplete && input.entryDateComplete)) &&
    input.contactComplete;

  return { totalSteps, completedSteps, isComplete };
}
