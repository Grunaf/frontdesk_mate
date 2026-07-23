import { describe, expect, it } from 'vitest';

import { hasAdultGuestOnCheckIn } from './hasAdultGuestOnCheckIn';

describe('hasAdultGuestOnCheckIn', () => {
  it('is true when at least one guest is 18+ on check-in', () => {
    expect(
      hasAdultGuestOnCheckIn(
        [
          { dateOfBirth: '2015-01-01' },
          { dateOfBirth: '1990-06-15' },
        ],
        '2026-07-01'
      )
    ).toBe(true);
  });

  it('is false when all guests are under 18', () => {
    expect(
      hasAdultGuestOnCheckIn([{ dateOfBirth: '2015-01-01' }], '2026-07-01')
    ).toBe(false);
  });
});
