import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/reception/lib/receptionSession', () => ({
  readReceptionSessionFromCookies: vi.fn(),
}));
vi.mock('@/entities/tenant/server', () => ({
  getTenantRecord: vi.fn(),
}));
vi.mock('@/entities/reception-audit/server', () => ({
  insertReceptionAuditEvent: vi.fn(),
}));

import { readReceptionSessionFromCookies } from '@/app/reception/lib/receptionSession';
import { insertReceptionAuditEvent } from '@/entities/reception-audit/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  canRecordReceptionDeskAudit,
  mapReceptionDeskAuditEvent,
  recordReceptionDeskAuditEvent,
} from './recordReceptionDeskAuditEvent';

describe('mapReceptionDeskAuditEvent', () => {
  it('maps each desk mutation to the MVP event_type and subject', () => {
    expect(mapReceptionDeskAuditEvent({ mutation: 'createGuestStay', subjectId: 'stay-1' })).toEqual({
      eventType: 'guest_stay_created',
      subjectType: 'guest_stay',
      subjectId: 'stay-1',
      flags: {},
    });

    expect(
      mapReceptionDeskAuditEvent({
        mutation: 'updateGuestReservation',
        subjectId: 'stay-2',
        bedId: 'bed-a',
      })
    ).toEqual({
      eventType: 'guest_stay_updated',
      subjectType: 'guest_stay',
      subjectId: 'stay-2',
      flags: { bedId: 'bed-a', summary: 'bed-a' },
    });

    expect(mapReceptionDeskAuditEvent({ mutation: 'revokeGuestStay', subjectId: 'stay-3' })).toEqual({
      eventType: 'guest_stay_revoked',
      subjectType: 'guest_stay',
      subjectId: 'stay-3',
      flags: {},
    });

    expect(mapReceptionDeskAuditEvent({ mutation: 'reissueGuestStay', subjectId: 'stay-4' })).toEqual({
      eventType: 'guest_stay_reissued',
      subjectType: 'guest_stay',
      subjectId: 'stay-4',
      flags: {},
    });

    expect(mapReceptionDeskAuditEvent({ mutation: 'completeDeskCheckIn', subjectId: 'stay-5' })).toEqual({
      eventType: 'desk_check_in_completed',
      subjectType: 'guest_stay',
      subjectId: 'stay-5',
      flags: {},
    });

    expect(
      mapReceptionDeskAuditEvent({
        mutation: 'setGuestReservationBookingPaid',
        subjectId: 'stay-6',
        paid: true,
      })
    ).toEqual({
      eventType: 'booking_paid_set',
      subjectType: 'guest_stay',
      subjectId: 'stay-6',
      flags: { paid: true, summary: 'paid' },
    });

    expect(
      mapReceptionDeskAuditEvent({
        mutation: 'setGuestReservationBookingPaid',
        subjectId: 'stay-7',
        paid: false,
      })
    ).toEqual({
      eventType: 'booking_paid_set',
      subjectType: 'guest_stay',
      subjectId: 'stay-7',
      flags: { paid: false, summary: 'unpaid' },
    });

    expect(
      mapReceptionDeskAuditEvent({ mutation: 'resolveGuestHubTransfer', subjectId: 'xfer-1' })
    ).toEqual({
      eventType: 'hub_transfer_resolved',
      subjectType: 'guest_hub_transfer',
      subjectId: 'xfer-1',
      flags: {},
    });
  });

  it('puts bedId into flags without guest name / PII', () => {
    const mapped = mapReceptionDeskAuditEvent({
      mutation: 'createGuestStay',
      subjectId: 'stay-9',
      bedId: 'bed-9',
    });
    expect(mapped.flags).toEqual({ bedId: 'bed-9', summary: 'bed-9' });
    expect(JSON.stringify(mapped.flags)).not.toMatch(/guest|name/i);
  });
});

describe('canRecordReceptionDeskAudit', () => {
  it('skips when session has no receptionUserId', () => {
    expect(
      canRecordReceptionDeskAudit({ receptionUserId: null, tenantId: 'tenant-1' })
    ).toBe(false);
    expect(
      canRecordReceptionDeskAudit({ receptionUserId: undefined, tenantId: 'tenant-1' })
    ).toBe(false);
    expect(canRecordReceptionDeskAudit({ receptionUserId: '', tenantId: 'tenant-1' })).toBe(false);
  });

  it('skips when tenant id is missing', () => {
    expect(
      canRecordReceptionDeskAudit({ receptionUserId: 'user-1', tenantId: null })
    ).toBe(false);
    expect(
      canRecordReceptionDeskAudit({ receptionUserId: 'user-1', tenantId: undefined })
    ).toBe(false);
  });

  it('allows write when both actor and tenant are present', () => {
    expect(
      canRecordReceptionDeskAudit({ receptionUserId: 'user-1', tenantId: 'tenant-1' })
    ).toBe(true);
  });
});

describe('recordReceptionDeskAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips insert when session has no receptionUserId', async () => {
    vi.mocked(readReceptionSessionFromCookies).mockResolvedValue(null);

    await recordReceptionDeskAuditEvent({
      tenantSlug: 'demo',
      mutation: 'createGuestStay',
      subjectId: 'stay-1',
      bedId: 'bed-1',
    });

    expect(getTenantRecord).not.toHaveBeenCalled();
    expect(insertReceptionAuditEvent).not.toHaveBeenCalled();
  });

  it('skips insert when tenant is missing', async () => {
    vi.mocked(readReceptionSessionFromCookies).mockResolvedValue({
      tenantSlug: 'demo',
      exp: Date.now() + 60_000,
      receptionUserId: 'user-1',
    });
    vi.mocked(getTenantRecord).mockResolvedValue(null);

    await recordReceptionDeskAuditEvent({
      tenantSlug: 'demo',
      mutation: 'createGuestStay',
      subjectId: 'stay-1',
    });

    expect(insertReceptionAuditEvent).not.toHaveBeenCalled();
  });

  it('inserts mapped event when session and tenant are present', async () => {
    vi.mocked(readReceptionSessionFromCookies).mockResolvedValue({
      tenantSlug: 'demo',
      exp: Date.now() + 60_000,
      receptionUserId: 'user-1',
    });
    vi.mocked(getTenantRecord).mockResolvedValue({
      id: 'tenant-1',
      slug: 'demo',
      name: 'Demo',
      city_pack_id: 'sarajevo',
      settings: {} as never,
      is_active: true,
    });
    vi.mocked(insertReceptionAuditEvent).mockResolvedValue(undefined);

    await recordReceptionDeskAuditEvent({
      tenantSlug: 'demo',
      mutation: 'createGuestStay',
      subjectId: 'stay-1',
      bedId: 'bed-1',
    });

    expect(insertReceptionAuditEvent).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorReceptionUserId: 'user-1',
      eventType: 'guest_stay_created',
      subjectType: 'guest_stay',
      subjectId: 'stay-1',
      flags: { bedId: 'bed-1', summary: 'bed-1' },
    });
  });
});
