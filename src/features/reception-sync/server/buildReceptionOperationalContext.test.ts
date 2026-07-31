import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/guest-stay/server', () => ({
  listActiveGuestStays: vi.fn(),
  listPlanGuestReservations: vi.fn(),
}));

vi.mock('@/entities/guest-issue/server', () => ({
  listGuestIssues: vi.fn(),
}));

vi.mock('@/entities/guest-hub-transfer/server', () => ({
  listGuestHubTransfers: vi.fn(),
}));

vi.mock('@/entities/housekeeping/server', () => ({
  hasHousekeepingBedRolloverRun: vi.fn(),
}));

vi.mock('@/entities/tenant/server', () => ({
  getTenantRecord: vi.fn(),
}));

vi.mock('@/features/guest-registration/lib/resolveReceptionStaffContext', () => ({
  resolveReceptionStaffContext: vi.fn(),
}));

import { listGuestHubTransfers } from '@/entities/guest-hub-transfer/server';
import { listGuestIssues } from '@/entities/guest-issue/server';
import { listActiveGuestStays, listPlanGuestReservations } from '@/entities/guest-stay/server';
import { hasHousekeepingBedRolloverRun } from '@/entities/housekeeping/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { resolveReceptionStaffContext } from '@/features/guest-registration/lib/resolveReceptionStaffContext';
import { buildReceptionOperationalContext } from './buildReceptionOperationalContext';

describe('buildReceptionOperationalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T07:59:00.000Z'));

    vi.mocked(getTenantRecord).mockResolvedValue({
      id: 'tenant-1',
      settings: { operationalDayStartTime: '08:00' },
    } as never);
    vi.mocked(listActiveGuestStays).mockResolvedValue([]);
    vi.mocked(listPlanGuestReservations).mockResolvedValue([]);
    vi.mocked(listGuestIssues).mockResolvedValue([]);
    vi.mocked(listGuestHubTransfers).mockResolvedValue([]);
    vi.mocked(hasHousekeepingBedRolloverRun).mockResolvedValue(false);
    vi.mocked(resolveReceptionStaffContext).mockResolvedValue({
      ok: true,
      ctx: {
        id: 'user-1',
        displayName: 'Anna',
        permissions: [],
        disabled: false,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves stable operational day meta from tenant settings and server clock', async () => {
    const context = await buildReceptionOperationalContext('kotor-demo');

    expect(context.generatedAt).toBe('2026-07-09T07:59:00.000Z');
    expect(context.operationalDayStartTime).toBe('08:00');
    expect(context.operational).toEqual({
      operationalDate: '2026-07-08',
      startsAt: '2026-07-08T08:00:00.000Z',
      endsAt: '2026-07-09T08:00:00.000Z',
    });
    expect(context.housekeepingDayStart).toEqual({
      kind: 'before_start',
      operationalDate: '2026-07-08',
      calendarToday: '2026-07-09',
      startTimeLabel: '08:00',
      targetOperationalDate: '2026-07-09',
    });
    expect(hasHousekeepingBedRolloverRun).toHaveBeenCalledWith('tenant-1', '2026-07-09');
  });

  it('marks housekeeping day start already_rolled when ledger has a run', async () => {
    vi.mocked(hasHousekeepingBedRolloverRun).mockResolvedValue(true);

    const context = await buildReceptionOperationalContext('kotor-demo');

    expect(context.housekeepingDayStart.kind).toBe('already_rolled');
    expect(context.housekeepingDayStart.targetOperationalDate).toBe('2026-07-09');
  });

  it('fetches stays, plan occupancy, open issues, and open transfers in parallel', async () => {
    await buildReceptionOperationalContext('kotor-demo', 'en');

    expect(listActiveGuestStays).toHaveBeenCalledWith('kotor-demo', 'en');
    expect(listPlanGuestReservations).toHaveBeenCalledWith('kotor-demo', 'en');
    expect(listGuestIssues).toHaveBeenCalledWith('kotor-demo', 'open');
    expect(listGuestHubTransfers).toHaveBeenCalledWith('kotor-demo', 'open');
    expect(getTenantRecord).toHaveBeenCalledWith('kotor-demo');
  });

  it('uses default operational day start when tenant is missing', async () => {
    vi.mocked(getTenantRecord).mockResolvedValue(null);

    const context = await buildReceptionOperationalContext('unknown');

    expect(context.operationalDayStartTime).toBe('08:00');
    expect(context.operational.operationalDate).toBe('2026-07-08');
    expect(context.operational.endsAt).toBe('2026-07-09T08:00:00.000Z');
    expect(context.housekeepingDayStart.kind).toBe('before_start');
    expect(hasHousekeepingBedRolloverRun).not.toHaveBeenCalled();
  });
});
