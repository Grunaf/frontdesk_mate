import { describe, expect, it } from 'vitest';
import { resolvePreCheckInBannerProgress } from './resolvePreCheckInBannerProgress';

describe('resolvePreCheckInBannerProgress', () => {
  it('uses 2 steps when tourism is required', () => {
    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 2, completedSteps: 0, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 2, completedSteps: 1, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toEqual({ totalSteps: 2, completedSteps: 2, isComplete: true });
  });

  it('uses 1 step when tourism is not required', () => {
    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: false,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 1, completedSteps: 0, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: false,
        tourismComplete: false,
        contactComplete: true,
      })
    ).toEqual({ totalSteps: 1, completedSteps: 1, isComplete: true });
  });
});
