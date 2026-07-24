import { describe, expect, it } from 'vitest';
import type { HousekeepingLaundryRunRecord } from '@/entities/housekeeping';
import {
  countLaundryUnloadDue,
  resolveCleaningWashSummaryLabel,
  shouldShowCleaningWashSection,
} from './resolveCleaningWashVisibility';

function run(
  partial: Partial<HousekeepingLaundryRunRecord> & Pick<HousekeepingLaundryRunRecord, 'id' | 'ends_at'>
): HousekeepingLaundryRunRecord {
  return {
    tenant_id: 't1',
    machine_id: 'm1',
    program: 'wash',
    status: 'running',
    started_at: '2026-07-24T08:00:00.000Z',
    completed_at: null,
    started_by_reception_user_id: null,
    created_at: '2026-07-24T08:00:00.000Z',
    updated_at: '2026-07-24T08:00:00.000Z',
    ...partial,
  };
}

describe('shouldShowCleaningWashSection', () => {
  it('hides when no machines', () => {
    expect(
      shouldShowCleaningWashSection({ makeCount: 3, activeRuns: [], machineCount: 0 })
    ).toBe(false);
  });

  it('hides when no stripped linen and no active runs', () => {
    expect(
      shouldShowCleaningWashSection({ makeCount: 0, activeRuns: [], machineCount: 2 })
    ).toBe(false);
  });

  it('shows when stripped linen exists', () => {
    expect(
      shouldShowCleaningWashSection({ makeCount: 1, activeRuns: [], machineCount: 1 })
    ).toBe(true);
  });

  it('shows when a machine is running even without stripped', () => {
    expect(
      shouldShowCleaningWashSection({
        makeCount: 0,
        activeRuns: [run({ id: 'r1', ends_at: '2026-07-24T09:00:00.000Z' })],
        machineCount: 1,
      })
    ).toBe(true);
  });
});

describe('countLaundryUnloadDue / summary', () => {
  it('counts unload-due runs', () => {
    const now = new Date('2026-07-24T09:00:00.000Z');
    expect(
      countLaundryUnloadDue(
        [
          run({ id: 'a', ends_at: '2026-07-24T08:59:00.000Z' }),
          run({ id: 'b', ends_at: '2026-07-24T09:30:00.000Z' }),
        ],
        now
      )
    ).toBe(1);
  });

  it('prefers unload label', () => {
    expect(
      resolveCleaningWashSummaryLabel({ makeCount: 2, unloadDueCount: 1, runningCount: 1 })
    ).toBe('Wash · unload 1');
    expect(
      resolveCleaningWashSummaryLabel({ makeCount: 2, unloadDueCount: 0, runningCount: 0 })
    ).toBe('Wash · 2 stripped');
  });
});
