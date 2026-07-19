import { describe, expect, it } from 'vitest';
import { resolveSettlementBannerProgress } from './resolveSettlementBannerProgress';

describe('resolveSettlementBannerProgress', () => {
  it('uses 3 steps with 1 completed when registration is done only', () => {
    expect(
      resolveSettlementBannerProgress({
        registrationComplete: true,
        essentialsDone: false,
        roomDone: false,
      })
    ).toEqual({
      totalSteps: 3,
      completedSteps: 1,
      isComplete: false,
    });
  });

  it('counts essentials and room after registration complete', () => {
    expect(
      resolveSettlementBannerProgress({
        registrationComplete: true,
        essentialsDone: true,
        roomDone: false,
      })
    ).toEqual({
      totalSteps: 3,
      completedSteps: 2,
      isComplete: false,
    });

    expect(
      resolveSettlementBannerProgress({
        registrationComplete: true,
        essentialsDone: true,
        roomDone: true,
      })
    ).toEqual({
      totalSteps: 3,
      completedSteps: 3,
      isComplete: true,
    });
  });

  it('keeps 3 steps while registration is incomplete', () => {
    expect(
      resolveSettlementBannerProgress({
        registrationComplete: false,
        essentialsDone: false,
        roomDone: false,
        registrationStatus: {
          tourismRequired: true,
          tourismComplete: false,
          entryDateComplete: false,
          contactComplete: false,
        },
      })
    ).toEqual({
      totalSteps: 3,
      completedSteps: 0,
      isComplete: false,
    });
  });
});
