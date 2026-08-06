import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import {
  resolvePlanStayBalanceStay,
  resolvePlanStayQuickActions,
} from './resolvePlanStayQuickActions';

function stay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture({
    activated_at: '2026-07-27T12:00:00.000Z',
    magicLinkUrl: null,
    check_in_at: '2026-07-27T14:00:00.000Z',
    check_out_at: '2026-07-29T10:00:00.000Z',
    ...overrides,
  });
}

describe('resolvePlanStayQuickActions', () => {
  it('lists open + check-in + move + extend + edit + cancel for upcoming unpaid-ineligible stay', () => {
    const current = stay({ desk_checked_in_at: null });
    const ids = resolvePlanStayQuickActions({
      stay: current,
      balanceStay: current,
      operationalDate: '2026-07-27',
      canEditPastStays: false,
    }).map((action) => action.id);

    expect(ids).toEqual([
      'open',
      'checkIn',
      'moveBed',
      'extend',
      'editBooking',
      'cancelBooking',
    ]);
  });

  it('shows check out and take payment when admitted and unpaid', () => {
    const current = stay({
      desk_checked_in_at: '2026-07-27T15:00:00.000Z',
      booking_amount_due_minor: 5000,
      booking_amount_currency: 'EUR',
      booking_paid_at: null,
    });
    const ids = resolvePlanStayQuickActions({
      stay: current,
      balanceStay: current,
      operationalDate: '2026-07-27',
      canEditPastStays: false,
    }).map((action) => action.id);

    expect(ids).toEqual([
      'open',
      'checkOut',
      'takePayment',
      'moveBed',
      'extend',
      'editBooking',
    ]);
    expect(ids).not.toContain('cancelBooking');
    expect(ids).not.toContain('checkIn');
  });

  it('hides move/edit for ended stays without past-edit permission', () => {
    const current = stay({
      desk_checked_in_at: '2026-07-27T15:00:00.000Z',
      check_out_at: '2026-07-28T10:00:00.000Z',
      check_out_date: '2026-07-28',
    });
    const ids = resolvePlanStayQuickActions({
      stay: current,
      balanceStay: current,
      operationalDate: '2026-07-28',
      canEditPastStays: false,
    }).map((action) => action.id);

    expect(ids).toContain('open');
    expect(ids).toContain('checkOut');
    expect(ids).not.toContain('moveBed');
    expect(ids).not.toContain('editBooking');
  });

  it('marks cancel as destructive', () => {
    const current = stay({ desk_checked_in_at: null });
    const cancel = resolvePlanStayQuickActions({
      stay: current,
      balanceStay: current,
      operationalDate: '2026-07-27',
      canEditPastStays: false,
    }).find((action) => action.id === 'cancelBooking');
    expect(cancel?.destructive).toBe(true);
  });

  it('mutes Move bed when hasMoveBedTargets is false but keeps the action', () => {
    const current = stay({ desk_checked_in_at: null });
    const move = resolvePlanStayQuickActions({
      stay: current,
      balanceStay: current,
      operationalDate: '2026-07-27',
      canEditPastStays: false,
      hasMoveBedTargets: false,
    }).find((action) => action.id === 'moveBed');
    expect(move).toEqual({ id: 'moveBed', label: 'Move bed', muted: true });
  });
});

describe('resolvePlanStayBalanceStay', () => {
  it('picks the party member that carries the balance', () => {
    const lead = stay({
      id: 'a',
      booking_group_id: 'g1',
      booking_amount_due_minor: null,
    });
    const payer = stay({
      id: 'b',
      booking_group_id: 'g1',
      booking_amount_due_minor: 4000,
      booking_amount_currency: 'EUR',
    });
    expect(resolvePlanStayBalanceStay(lead, [lead, payer]).id).toBe('b');
  });
});
