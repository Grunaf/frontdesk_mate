import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';
import {
  classifyReceptionHubStay,
  resolveReceptionHubSnapshot,
} from './resolveReceptionHubSnapshot';

const settings: TenantSettings = {
  operationalDayStartTime: '08:00',
  guestStay: {
    rooms: [{ id: 'room-a', label: 'Room A', floorId: 'floor-1' }],
    beds: [
      { id: 'bed-1', roomId: 'room-a' },
      { id: 'bed-2', roomId: 'room-a' },
    ],
  },
};

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture({
    check_in_at: '2026-07-08T14:00:00.000Z',
    check_out_at: '2026-07-10T23:59:59.999Z',
    created_at: '2026-07-08T10:00:00.000Z',
    ...overrides,
  });
}


describe('resolveReceptionHubSnapshot', () => {
  it('classifies expected today on current operational date', () => {
    const now = new Date('2026-07-09T07:59:00.000Z');
    const stay = makeStay({ check_in_at: '2026-07-08T14:00:00.000Z' });

    expect(
      classifyReceptionHubStay(stay, {
        operationalDate: '2026-07-08',
        now,
        operationalDayStartTime: '08:00',
      })
    ).toBe('expectedToday');
  });

  it('keeps prior-day check-in in still expected before operational rollover', () => {
    const now = new Date('2026-07-09T07:59:00.000Z');
    const stay = makeStay({
      id: 'stay-old',
      check_in_at: '2026-07-07T14:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-08');
    expect(snapshot.stillExpected.map((entry) => entry.id)).toEqual(['stay-old']);
    expect(snapshot.noShow).toEqual([]);
  });

  it('moves same stay to no-show after operational day start', () => {
    const stay = makeStay({ check_in_at: '2026-07-08T14:00:00.000Z' });
    const beforeRollover = resolveReceptionHubSnapshot(settings, [stay], new Date('2026-07-09T07:59:00.000Z'));
    const afterRollover = resolveReceptionHubSnapshot(settings, [stay], new Date('2026-07-09T08:00:00.000Z'));

    expect(beforeRollover.expectedToday.map((entry) => entry.id)).toEqual(['stay-1']);
    expect(afterRollover.noShow.map((entry) => entry.id)).toEqual(['stay-1']);
    expect(afterRollover.expectedToday).toEqual([]);
  });

  it('excludes admitted guests (passport verified) from arrival buckets', () => {
    const now = new Date('2026-07-09T08:30:00.000Z');
    const stay = makeStay({
      check_in_at: '2026-07-09T14:00:00.000Z',
      passport_checked_at: '2026-07-09T09:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.expectedToday).toEqual([]);
    expect(snapshot.noShow).toEqual([]);
  });

  it('excludes legacy desk-checked-in guests from arrival buckets', () => {
    const now = new Date('2026-07-09T08:30:00.000Z');
    const stay = makeStay({
      check_in_at: '2026-07-09T14:00:00.000Z',
      desk_checked_in_at: '2026-07-09T09:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.expectedToday).toEqual([]);
    expect(snapshot.noShow).toEqual([]);
  });

  it('keeps guest in arrival buckets when only guest app is open', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const stay = makeStay({
      check_in_at: '2026-07-09T14:00:00.000Z',
      activated_at: '2026-07-09T09:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.expectedToday.map((entry) => entry.id)).toEqual(['stay-1']);
  });

  it('lists free beds and occupied count for operational night', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const occupied = makeStay({ bed_id: 'bed-1', check_in_at: '2026-07-09T14:00:00.000Z' });

    const snapshot = resolveReceptionHubSnapshot(settings, [occupied], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-09');
    expect(snapshot.freeBedEntries.map((entry) => entry.bedId)).toEqual(['bed-2']);
    expect(snapshot.occupiedBedCount).toBe(1);
  });

  it('lists unpaid stays covering the operational night', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const unpaid = makeStay({
      id: 'unpaid',
      bed_id: 'bed-1',
      check_in_at: '2026-07-09T14:00:00.000Z',
    });
    const paid = makeStay({
      id: 'paid',
      bed_id: 'bed-2',
      check_in_at: '2026-07-09T14:00:00.000Z',
      booking_paid_at: '2026-07-09T09:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [unpaid, paid], now);

    expect(snapshot.unpaid.map((entry) => entry.id)).toEqual(['unpaid']);
  });

  it('lists admitted stays without key issued on the operational night', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const missingKey = makeStay({
      id: 'no-key',
      bed_id: 'bed-1',
      check_in_at: '2026-07-09T14:00:00.000Z',
      passport_checked_at: '2026-07-09T09:00:00.000Z',
    });
    const withKey = makeStay({
      id: 'has-key',
      bed_id: 'bed-2',
      check_in_at: '2026-07-09T14:00:00.000Z',
      passport_checked_at: '2026-07-09T09:00:00.000Z',
      key_issued_at: '2026-07-09T09:05:00.000Z',
    });
    const notAdmitted = makeStay({
      id: 'expected',
      bed_id: 'bed-1',
      check_in_at: '2026-07-09T14:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [missingKey, withKey, notAdmitted], now);

    expect(snapshot.keyNotIssued.map((entry) => entry.id)).toEqual(['no-key']);
  });

  it('excludes archived and revoked stays from unpaid and key buckets', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const archived = makeStay({
      id: 'archived',
      check_in_at: '2026-07-09T14:00:00.000Z',
      passport_checked_at: '2026-07-09T09:00:00.000Z',
      is_archived: true,
    });
    const revoked = makeStay({
      id: 'revoked',
      bed_id: 'bed-2',
      check_in_at: '2026-07-09T14:00:00.000Z',
      passport_checked_at: '2026-07-09T09:00:00.000Z',
      revoked_at: '2026-07-09T09:30:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [archived, revoked], now);

    expect(snapshot.unpaid).toEqual([]);
    expect(snapshot.keyNotIssued).toEqual([]);
  });

  it('lists admitted departures only on check-out morning', () => {
    const lastNightNow = new Date('2026-07-09T10:00:00.000Z');
    // Nights 08–09 → last night 09, exclusive checkout 10
    const departing = makeStay({
      id: 'leaving',
      check_in_at: '2026-07-08T14:00:00.000Z',
      check_out_at: '2026-07-10T23:59:59.999Z',
      passport_checked_at: '2026-07-08T15:00:00.000Z',
    });
    const midStay = makeStay({
      id: 'staying',
      bed_id: 'bed-2',
      check_in_at: '2026-07-08T14:00:00.000Z',
      check_out_at: '2026-07-12T23:59:59.999Z',
      passport_checked_at: '2026-07-08T15:00:00.000Z',
    });

    const onLastNight = resolveReceptionHubSnapshot(settings, [departing, midStay], lastNightNow);
    expect(onLastNight.operational.operationalDate).toBe('2026-07-09');
    expect(onLastNight.departures).toEqual([]);

    const checkoutMorning = new Date('2026-07-10T10:00:00.000Z');
    const onCheckoutDay = resolveReceptionHubSnapshot(
      { ...settings, checkOutTime: '11:00' },
      [departing],
      checkoutMorning
    );
    expect(onCheckoutDay.operational.operationalDate).toBe('2026-07-10');
    expect(onCheckoutDay.departures.map((entry) => entry.id)).toEqual(['leaving']);
    expect(onCheckoutDay.departurePhase).toBe('due_soon');
    expect(onCheckoutDay.checkOutTimeLabel).toBe('11:00');
  });

  it('counts checked-in today and remaining arrivals', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const admittedToday = makeStay({
      id: 'in',
      check_in_at: '2026-07-09T14:00:00.000Z',
      check_in_date: '2026-07-09',
      passport_checked_at: '2026-07-09T09:00:00.000Z',
    });
    const expected = makeStay({
      id: 'expected',
      bed_id: 'bed-2',
      check_in_at: '2026-07-09T14:00:00.000Z',
      check_in_date: '2026-07-09',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [admittedToday, expected], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-09');
    expect(snapshot.checkedInTodayCount).toBe(1);
    expect(snapshot.remainingArrivalsCount).toBe(1);
    expect(snapshot.expectedToday.map((entry) => entry.id)).toEqual(['expected']);
  });

  it('omits non-admitted stays from departures', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const notAdmitted = makeStay({
      check_in_at: '2026-07-08T14:00:00.000Z',
      check_out_at: '2026-07-10T23:59:59.999Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [notAdmitted], now);
    expect(snapshot.departures).toEqual([]);
  });

  it('surfaces orphan stays for unknown beds on operational night', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const orphan = makeStay({
      bed_id: 'unknown-bed',
      check_in_at: '2026-07-09T14:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [orphan], now);

    expect(snapshot.orphanStays).toEqual([orphan]);
  });
});
