import { describe, expect, it } from 'vitest';
import {
  isPlanCalendarOccupancyStay,
  isPlanStayCellInactive,
  isPlanStayUnpaid,
} from './resolvePlanStayCalendarPresentation';

describe('isPlanCalendarOccupancyStay', () => {
  it('includes active stays', () => {
    expect(isPlanCalendarOccupancyStay({ is_archived: false })).toBe(true);
    expect(isPlanCalendarOccupancyStay({})).toBe(true);
  });

  it('includes full checked-out history', () => {
    expect(
      isPlanCalendarOccupancyStay({
        is_archived: true,
        archive_kind: 'full',
        archive_reason: 'checked_out',
      })
    ).toBe(true);
  });

  it('excludes cancelled and remainder archives', () => {
    expect(
      isPlanCalendarOccupancyStay({
        is_archived: true,
        archive_kind: 'full',
        archive_reason: 'cancelled',
      })
    ).toBe(false);
    expect(
      isPlanCalendarOccupancyStay({
        is_archived: true,
        archive_kind: 'remainder',
        archive_reason: 'checked_out',
      })
    ).toBe(false);
  });
});

describe('isPlanStayCellInactive', () => {
  it('marks past nights inactive', () => {
    expect(
      isPlanStayCellInactive({
        nightDate: '2026-07-20',
        planToday: '2026-07-26',
        stay: { is_archived: false },
      })
    ).toBe(true);
  });

  it('marks checked-out stays inactive even on today', () => {
    expect(
      isPlanStayCellInactive({
        nightDate: '2026-07-26',
        planToday: '2026-07-26',
        stay: { is_archived: true, archive_reason: 'checked_out' },
      })
    ).toBe(true);
  });

  it('keeps active current/future nights active', () => {
    expect(
      isPlanStayCellInactive({
        nightDate: '2026-07-26',
        planToday: '2026-07-26',
        stay: { is_archived: false },
      })
    ).toBe(false);
  });
});

describe('isPlanStayUnpaid', () => {
  it('flags admitted guest stays with due amount and no paid_at', () => {
    expect(
      isPlanStayUnpaid({
        stay_kind: 'guest',
        booking_amount_due_minor: 4500,
        booking_amount_currency: 'EUR',
        booking_paid_at: null,
        passport_checked_at: '2026-07-26T10:00:00.000Z',
        desk_checked_in_at: null,
      })
    ).toBe(true);
  });

  it('skips pre-check-in, paid, volunteer, and missing due', () => {
    expect(
      isPlanStayUnpaid({
        stay_kind: 'guest',
        booking_amount_due_minor: 4500,
        booking_amount_currency: 'EUR',
        booking_paid_at: null,
        passport_checked_at: null,
        desk_checked_in_at: null,
      })
    ).toBe(false);
    expect(
      isPlanStayUnpaid({
        stay_kind: 'guest',
        booking_amount_due_minor: 4500,
        booking_amount_currency: 'EUR',
        booking_paid_at: '2026-07-26T10:00:00.000Z',
        passport_checked_at: '2026-07-26T10:00:00.000Z',
        desk_checked_in_at: null,
      })
    ).toBe(false);
    expect(
      isPlanStayUnpaid({
        stay_kind: 'volunteer',
        booking_amount_due_minor: 4500,
        booking_amount_currency: 'EUR',
        booking_paid_at: null,
        passport_checked_at: '2026-07-26T10:00:00.000Z',
        desk_checked_in_at: null,
      })
    ).toBe(false);
    expect(
      isPlanStayUnpaid({
        stay_kind: 'guest',
        booking_amount_due_minor: null,
        booking_amount_currency: null,
        booking_paid_at: null,
        passport_checked_at: '2026-07-26T10:00:00.000Z',
        desk_checked_in_at: null,
      })
    ).toBe(false);
  });
});
