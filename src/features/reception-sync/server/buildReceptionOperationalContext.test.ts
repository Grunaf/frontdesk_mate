import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/guest-stay/server', () => ({
  listActiveGuestStays: vi.fn(),
}));

vi.mock('@/entities/guest-issue/server', () => ({
  listGuestIssues: vi.fn(),
}));

vi.mock('@/entities/guest-hub-transfer/server', () => ({
  listGuestHubTransfers: vi.fn(),
}));

vi.mock('@/entities/tenant/server', () => ({
  getTenantRecord: vi.fn(),
}));

import { listGuestHubTransfers } from '@/entities/guest-hub-transfer/server';
import { listGuestIssues } from '@/entities/guest-issue/server';
import { listActiveGuestStays } from '@/entities/guest-stay/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { buildReceptionOperationalContext } from './buildReceptionOperationalContext';

describe('buildReceptionOperationalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T07:59:00.000Z'));

    vi.mocked(getTenantRecord).mockResolvedValue({
      settings: { operationalDayStartTime: '08:00' },
    } as never);
    vi.mocked(listActiveGuestStays).mockResolvedValue([]);
    vi.mocked(listGuestIssues).mockResolvedValue([]);
    vi.mocked(listGuestHubTransfers).mockResolvedValue([]);
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
  });

  it('fetches stays, open issues, and open transfers in parallel', async () => {
    await buildReceptionOperationalContext('kotor-demo', 'en');

    expect(listActiveGuestStays).toHaveBeenCalledWith('kotor-demo', 'en');
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
  });
});
