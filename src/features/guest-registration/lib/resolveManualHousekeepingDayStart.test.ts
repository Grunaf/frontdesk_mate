import { describe, expect, it } from 'vitest';
import { resolveManualHousekeepingDayStartView } from './resolveManualHousekeepingDayStart';

describe('resolveManualHousekeepingDayStartView', () => {
  it('is before_start prior to operational start', () => {
    const view = resolveManualHousekeepingDayStartView({
      now: new Date('2026-07-30T06:00:00.000Z'),
      operationalDayStartTime: '08:00',
      alreadyRolledForTarget: false,
    });
    expect(view.kind).toBe('before_start');
    expect(view.operationalDate).toBe('2026-07-29');
    expect(view.calendarToday).toBe('2026-07-30');
    expect(view.targetOperationalDate).toBe('2026-07-30');
    expect(view.startTimeLabel).toBe('08:00');
  });

  it('is ready after start when not rolled', () => {
    const view = resolveManualHousekeepingDayStartView({
      now: new Date('2026-07-30T09:00:00.000Z'),
      operationalDayStartTime: '08:00',
      alreadyRolledForTarget: false,
    });
    expect(view.kind).toBe('ready');
    expect(view.operationalDate).toBe('2026-07-30');
    expect(view.targetOperationalDate).toBe('2026-07-30');
  });

  it('is already_rolled when ledger has target date', () => {
    const view = resolveManualHousekeepingDayStartView({
      now: new Date('2026-07-30T09:00:00.000Z'),
      operationalDayStartTime: '08:00',
      alreadyRolledForTarget: true,
    });
    expect(view.kind).toBe('already_rolled');
  });
});
