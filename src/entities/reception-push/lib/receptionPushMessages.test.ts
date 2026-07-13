import { describe, expect, it } from 'vitest';
import {
  buildGuestHubTransferPushPayload,
  buildGuestIssuePushPayload,
  buildGuestStayPushPayload,
} from './receptionPushMessages';

describe('buildGuestIssuePushPayload', () => {
  it('maps category and guest name', () => {
    expect(
      buildGuestIssuePushPayload({ category: 'wifi', guestName: 'Alex' })
    ).toMatchObject({
      title: 'New guest issue',
      body: 'Wi‑Fi — Alex',
      url: '/?tab=issues',
      tag: 'reception-guest-issue',
      refresh: 'context',
    });
  });
});

describe('buildGuestHubTransferPushPayload', () => {
  it('includes context refresh', () => {
    expect(
      buildGuestHubTransferPushPayload({
        id: 't1',
        tenant_id: 'ten',
        stay_id: 's1',
        bed_id: 'b1',
        guest_name: 'Sam',
        hub_category: 'airport',
        direction: 'to_hostel',
        requested_date: '2026-07-14',
        requested_time: '10:00',
        status: 'open',
        note: null,
        created_at: '',
        resolved_at: null,
      })
    ).toMatchObject({
      tag: 'reception-hub-transfer',
      refresh: 'context',
    });
  });
});

describe('buildGuestStayPushPayload', () => {
  it('uses reservation title when kind is reservation', () => {
    expect(
      buildGuestStayPushPayload({ guestName: 'Alex', kind: 'reservation' })
    ).toEqual({
      title: 'New reservation',
      body: 'Alex',
      url: '/?tab=desk',
      tag: 'reception-stay',
      refresh: 'context',
    });
  });

  it('uses walk-in title when kind is walk-in', () => {
    expect(buildGuestStayPushPayload({ guestName: null, kind: 'walk-in' })).toMatchObject({
      title: 'Walk-in',
      body: 'Guest',
      refresh: 'context',
    });
  });
});
