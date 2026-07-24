import { describe, expect, it } from 'vitest';
import { resolveHousekeepingBedRolloverGate } from './resolveHousekeepingBedRolloverGate';

describe('resolveHousekeepingBedRolloverGate', () => {
  const startsAt = new Date('2026-07-24T08:00:00.000Z');

  it('skips before operational day start', () => {
    expect(
      resolveHousekeepingBedRolloverGate({
        now: new Date('2026-07-24T07:59:59.000Z'),
        startsAt,
        alreadyRolled: false,
      })
    ).toBe('before_start');
  });

  it('skips when already rolled for this day', () => {
    expect(
      resolveHousekeepingBedRolloverGate({
        now: new Date('2026-07-24T08:15:00.000Z'),
        startsAt,
        alreadyRolled: true,
      })
    ).toBe('already_rolled');
  });

  it('runs at or after start when not yet rolled', () => {
    expect(
      resolveHousekeepingBedRolloverGate({
        now: new Date('2026-07-24T08:00:00.000Z'),
        startsAt,
        alreadyRolled: false,
      })
    ).toBe('run');
  });
});
