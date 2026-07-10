export type PreCheckInBannerStatusInput = {
  tourismRequired: boolean;
  tourismComplete: boolean;
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
  const totalSteps = input.tourismRequired ? 2 : 1;
  let completedSteps = 0;

  if (input.tourismRequired && input.tourismComplete) {
    completedSteps += 1;
  }
  if (input.contactComplete) {
    completedSteps += 1;
  }

  const isComplete =
    (!input.tourismRequired || input.tourismComplete) && input.contactComplete;

  return { totalSteps, completedSteps, isComplete };
}
