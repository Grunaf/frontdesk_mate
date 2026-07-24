import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';
import { resolveReceptionCashSnapshot } from './resolveReceptionCashSnapshot';

const settings: TenantSettings = {
  operationalDayStartTime: '08:00',
  guestStay: {
    rooms: [{ id: 'room-a', label: 'Room A', floorId: 'floor-1' }],
    beds: [{ id: 'bed-1', roomId: 'room-a' }],
  },
};

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture({
    check_in_at: '2026-07-08T14:00:00.000Z',
    check_out_at: '2026-07-10T10:00:00.000Z',
    check_in_date: '2026-07-08',
    check_out_date: '2026-07-10',
    booking_amount_due_minor: 5000,
    booking_amount_currency: 'EUR',
    ...overrides,
  });
}

describe('resolveReceptionCashSnapshot', () => {
  it('sums collected when paid_at is inside the operational window', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const paid = makeStay({
      id: 'paid',
      booking_paid_at: '2026-07-09T09:00:00.000Z',
    });
    const unpaid = makeStay({
      id: 'unpaid',
      bed_id: 'bed-1',
      booking_paid_at: null,
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [paid, unpaid], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-09');
    expect(snapshot.collectedMinor).toBe(5000);
    expect(snapshot.paidTodayCount).toBe(1);
    expect(snapshot.stillDueMinor).toBe(5000);
    expect(snapshot.expectedTotalMinor).toBe(10000);
    expect(snapshot.unpaidCount).toBe(1);
  });

  it('excludes paid_at at or after operational day end from collected', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const paidNextDay = makeStay({
      booking_paid_at: '2026-07-10T08:00:00.000Z',
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [paidNextDay], now);

    expect(snapshot.collectedMinor).toBe(0);
    expect(snapshot.paidTodayCount).toBe(0);
  });

  it('excludes paid_at before operational day start from collected', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const paidEarlier = makeStay({
      booking_paid_at: '2026-07-09T07:59:00.000Z',
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [paidEarlier], now);

    expect(snapshot.collectedMinor).toBe(0);
    expect(snapshot.paidTodayCount).toBe(0);
  });

  it('lists unpaid without price but does not add them to still due sum', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const noPrice = makeStay({
      booking_amount_due_minor: null,
      booking_amount_currency: null,
      booking_paid_at: null,
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [noPrice], now);

    expect(snapshot.unpaidCount).toBe(1);
    expect(snapshot.stillDueMinor).toBe(0);
    expect(snapshot.stillToCollect[0]?.hasPrice).toBe(false);
  });

  it('excludes volunteer stays from unpaid cohort', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const volunteer = makeStay({
      stay_kind: 'volunteer',
      booking_amount_due_minor: null,
      booking_amount_currency: null,
      booking_paid_at: null,
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [volunteer], now);

    expect(snapshot.unpaidCount).toBe(0);
    expect(snapshot.stillToCollect).toEqual([]);
  });

  it('sorts admitted unpaid before not admitted', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const waiting = makeStay({
      id: 'waiting',
      guest_name: 'Zoe',
      booking_paid_at: null,
    });
    const admitted = makeStay({
      id: 'admitted',
      guest_name: 'Ann',
      passport_checked_at: '2026-07-09T10:00:00.000Z',
      booking_paid_at: null,
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [waiting, admitted], now);

    expect(snapshot.stillToCollect.map((item) => item.stay.id)).toEqual([
      'admitted',
      'waiting',
    ]);
  });

  it('flags and prioritizes unpaid leaving tomorrow over other unpaid', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    // Checkout 10 → last night 09 = leaves tomorrow on operational 09
    const leavingTomorrow = makeStay({
      id: 'leaving-tomorrow',
      guest_name: 'Zoe',
      booking_paid_at: null,
      check_out_date: '2026-07-10',
      check_out_at: '2026-07-10T10:00:00.000Z',
    });
    // Longer stay — still covers night 09, checkout later
    const staying = makeStay({
      id: 'staying',
      guest_name: 'Ann',
      bed_id: 'bed-1',
      passport_checked_at: '2026-07-08T15:00:00.000Z',
      booking_paid_at: null,
      check_out_date: '2026-07-12',
      check_out_at: '2026-07-12T10:00:00.000Z',
    });

    const snapshot = resolveReceptionCashSnapshot(settings, [staying, leavingTomorrow], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-09');
    expect(snapshot.leavesTomorrowCount).toBe(1);
    expect(snapshot.stillToCollect.map((item) => item.stay.id)).toEqual([
      'leaving-tomorrow',
      'staying',
    ]);
    expect(snapshot.stillToCollect[0]?.leavesTomorrow).toBe(true);
    expect(snapshot.stillToCollect[1]?.leavesTomorrow).toBe(false);
  });
});
