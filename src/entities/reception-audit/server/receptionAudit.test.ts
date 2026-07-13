import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/db/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import {
  RECEPTION_AUDIT_EVENT_TYPES,
  isReceptionAuditEventType,
} from '@/entities/reception-audit';
import {
  insertReceptionAuditEvent,
  listReceptionAuditEvents,
} from '@/entities/reception-audit/server';

describe('reception-audit types', () => {
  it('accepts known event_type values and rejects unknown', () => {
    expect(RECEPTION_AUDIT_EVENT_TYPES).toContain('guest_stay_created');
    expect(RECEPTION_AUDIT_EVENT_TYPES).toContain('hub_transfer_resolved');
    expect(isReceptionAuditEventType('desk_check_in_completed')).toBe(true);
    expect(isReceptionAuditEventType('settings_updated')).toBe(false);
    expect(isReceptionAuditEventType('')).toBe(false);
  });
});

describe('insertReceptionAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a row via supabase admin', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({ insert })),
    } as never);

    await insertReceptionAuditEvent({
      tenantId: 'tenant-1',
      actorReceptionUserId: 'user-1',
      eventType: 'guest_stay_created',
      subjectType: 'guest_stay',
      subjectId: 'stay-1',
      flags: { summary: 'Bed A1' },
    });

    expect(insert).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      actor_reception_user_id: 'user-1',
      event_type: 'guest_stay_created',
      subject_type: 'guest_stay',
      subject_id: 'stay-1',
      flags: { summary: 'Bed A1' },
    });
  });

  it('does not throw when insert fails (fire-and-forget)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({ insert })),
    } as never);

    await expect(
      insertReceptionAuditEvent({
        tenantId: 'tenant-1',
        actorReceptionUserId: null,
        eventType: 'booking_paid_set',
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('listReceptionAuditEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps rows and returns newest-first list', async () => {
    const eventsLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'evt-1',
          created_at: '2026-07-13T10:00:00.000Z',
          actor_reception_user_id: 'user-1',
          event_type: 'guest_stay_created',
          subject_type: 'guest_stay',
          subject_id: 'stay-1',
          flags: { summary: 'ok' },
        },
        {
          id: 'evt-skip',
          created_at: '2026-07-13T09:00:00.000Z',
          actor_reception_user_id: null,
          event_type: 'unknown_event',
          subject_type: null,
          subject_id: null,
          flags: {},
        },
      ],
      error: null,
    });
    const eventsOrder = vi.fn(() => ({ limit: eventsLimit }));
    const eventsEq = vi.fn(() => ({ order: eventsOrder }));
    const eventsSelect = vi.fn(() => ({ eq: eventsEq }));

    const actorsIn = vi.fn().mockResolvedValue({
      data: [{ id: 'user-1', login: 'anna', display_name: 'Anna Desk' }],
      error: null,
    });
    const actorsSelect = vi.fn(() => ({ in: actorsIn }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'reception_users') {
          return { select: actorsSelect };
        }
        return { select: eventsSelect };
      }),
    } as never);

    const result = await listReceptionAuditEvents('tenant-1', { limit: 10 });

    expect(eventsEq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(eventsOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(eventsLimit).toHaveBeenCalledWith(10);
    expect(actorsIn).toHaveBeenCalledWith('id', ['user-1']);
    expect(result.error).toBeNull();
    expect(result.events).toEqual([
      {
        id: 'evt-1',
        createdAt: '2026-07-13T10:00:00.000Z',
        actorReceptionUserId: 'user-1',
        actorLogin: 'anna',
        actorDisplayName: 'Anna Desk',
        eventType: 'guest_stay_created',
        subjectType: 'guest_stay',
        subjectId: 'stay-1',
        flags: { summary: 'ok' },
      },
    ]);
  });

  it('returns error string when admin query fails', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ limit })),
          })),
        })),
      })),
    } as never);

    const result = await listReceptionAuditEvents('tenant-1');
    expect(result).toEqual({ events: [], error: 'permission denied' });
  });
});
