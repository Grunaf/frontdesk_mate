import { describe, expect, it } from 'vitest';
import { resolvePreCheckInBannerProgress } from './resolvePreCheckInBannerProgress';

describe('resolvePreCheckInBannerProgress', () => {
  it('uses 3 steps when tourism is required', () => {
    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: false,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 3, completedSteps: 0, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 3, completedSteps: 1, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 3, completedSteps: 2, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: true,
      })
    ).toEqual({ totalSteps: 3, completedSteps: 3, isComplete: true });
  });

  it('uses 1 step when tourism is not required', () => {
    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: false,
        tourismComplete: false,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toEqual({ totalSteps: 1, completedSteps: 0, isComplete: false });

    expect(
      resolvePreCheckInBannerProgress({
        tourismRequired: false,
        tourismComplete: false,
        entryDateComplete: false,
        contactComplete: true,
      })
    ).toEqual({ totalSteps: 1, completedSteps: 1, isComplete: true });
  });
});
