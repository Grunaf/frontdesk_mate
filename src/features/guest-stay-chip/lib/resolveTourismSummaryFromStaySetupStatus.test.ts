import { describe, expect, it } from 'vitest';
import { resolveTourismSummaryFromStaySetupStatus } from './resolveTourismSummaryFromStaySetupStatus';

describe('resolveTourismSummaryFromStaySetupStatus', () => {
  it('maps complete with guest count', () => {
    expect(
      resolveTourismSummaryFromStaySetupStatus({
        tourismComplete: true,
        tourismGuestCount: 2,
      })
    ).toEqual({ kind: 'complete', guestCount: 2 });
  });

  it('maps empty incomplete as not_started', () => {
    expect(
      resolveTourismSummaryFromStaySetupStatus({
        tourismComplete: false,
        tourismGuestCount: 0,
      })
    ).toEqual({ kind: 'not_started' });
  });

  it('maps partial as in_progress', () => {
    expect(
      resolveTourismSummaryFromStaySetupStatus({
        tourismComplete: false,
        tourismGuestCount: 1,
      })
    ).toEqual({ kind: 'in_progress', guestCount: 1 });
  });
});
