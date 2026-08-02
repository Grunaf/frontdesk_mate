import { describe, expect, it } from 'vitest';
import {
  formatBookingComInboxAmountLine,
  hasBookingComListPriceOnlyWarning,
  needsBookingComInboxReservationSync,
  partitionBookingComInboxOpenRows,
  resolveBookingComAmountDue,
  resolveLinkedStayIdForBookingComInbox,
} from './resolveBookingComInboxPresentation';

describe('resolveBookingComAmountDue', () => {
  it('prefers total over list', () => {
    expect(
      resolveBookingComAmountDue({ total_amount: 33.4, list_amount: 32.4, amount: 32.4 })
    ).toBe(33.4);
  });

  it('falls back to list', () => {
    expect(resolveBookingComAmountDue({ total_amount: null, list_amount: 32.4, amount: null })).toBe(
      32.4
    );
  });
});

describe('formatBookingComInboxAmountLine', () => {
  it('shows both when different', () => {
    expect(
      formatBookingComInboxAmountLine({
        list_amount: 32.4,
        total_amount: 33.4,
        amount: 32.4,
        currency: 'EUR',
      })
    ).toBe('32.4 EUR booking · 33.4 EUR due');
  });

  it('labels list-only as booking (list)', () => {
    expect(
      formatBookingComInboxAmountLine({
        list_amount: 32.4,
        total_amount: null,
        amount: 32.4,
        currency: 'EUR',
      })
    ).toBe('32.4 EUR booking (list)');
  });

  it('labels total-only as due', () => {
    expect(
      formatBookingComInboxAmountLine({
        list_amount: null,
        total_amount: 33.4,
        amount: null,
        currency: 'EUR',
      })
    ).toBe('33.4 EUR due');
  });
});

describe('hasBookingComListPriceOnlyWarning', () => {
  it('is true when only list price exists', () => {
    expect(
      hasBookingComListPriceOnlyWarning({
        list_amount: 32.4,
        total_amount: null,
        amount: null,
      })
    ).toBe(true);
  });

  it('is false when total exists', () => {
    expect(
      hasBookingComListPriceOnlyWarning({
        list_amount: 32.4,
        total_amount: 33.4,
        amount: null,
      })
    ).toBe(false);
  });
});

describe('needsBookingComInboxReservationSync', () => {
  it('is false when contact and total due exist', () => {
    expect(
      needsBookingComInboxReservationSync({
        phone_number: '+341',
        guest_email: null,
        list_amount: 32.4,
        total_amount: 33.4,
        amount: 32.4,
      })
    ).toBe(false);
  });

  it('is true when contact missing', () => {
    expect(
      needsBookingComInboxReservationSync({
        phone_number: null,
        guest_email: '  ',
        list_amount: null,
        total_amount: 33.4,
        amount: null,
      })
    ).toBe(true);
  });

  it('is true when amount missing', () => {
    expect(
      needsBookingComInboxReservationSync({
        phone_number: '+341',
        guest_email: null,
        list_amount: null,
        total_amount: null,
        amount: null,
      })
    ).toBe(true);
  });

  it('is true for list-price-only', () => {
    expect(
      needsBookingComInboxReservationSync({
        phone_number: null,
        guest_email: 'a@b.c',
        list_amount: 32.4,
        total_amount: null,
        amount: 32.4,
      })
    ).toBe(true);
  });
});

describe('resolveLinkedStayIdForBookingComInbox', () => {
  it('uses issued_stay_id first', () => {
    expect(
      resolveLinkedStayIdForBookingComInbox({
        booking: { booking_id: '1', issued_stay_id: 'stay-a' },
        stays: [{ id: 'stay-b', booking_platform_id: 'booking-com', booking_external_id: '1' }],
      })
    ).toBe('stay-a');
  });

  it('matches platform + external id', () => {
    expect(
      resolveLinkedStayIdForBookingComInbox({
        booking: { booking_id: '5049', issued_stay_id: null },
        stays: [
          { id: 'x', booking_platform_id: 'hostelworld', booking_external_id: '5049' },
          { id: 'y', booking_platform_id: 'booking-com', booking_external_id: '5049' },
        ],
      })
    ).toBe('y');
  });
});

describe('partitionBookingComInboxOpenRows', () => {
  const base = {
    tenant_id: 't',
    hotel_id: 'h',
    guest_name: 'Ada',
    phone_number: null,
    guest_email: null,
    adults: 1,
    children: null,
    check_in: '2026-08-01',
    check_out: '2026-08-02',
    amount: null,
    list_amount: null,
    total_amount: null,
    currency: null,
    booking_status: 'ok' as const,
    room_name: null,
    inbox_status: 'open' as const,
    source: 'list_api' as const,
    captured_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('splits exact matches into alreadyInSystem', () => {
    const result = partitionBookingComInboxOpenRows({
      bookings: [
        { ...base, id: 'row-1', booking_id: '111', issued_stay_id: null },
        { ...base, id: 'row-2', booking_id: '222', issued_stay_id: null },
      ],
      stays: [{ id: 'stay-2', booking_platform_id: 'booking-com', booking_external_id: '222' }],
    });

    expect(result.needsAction.map((r) => r.booking.id)).toEqual(['row-1']);
    expect(result.alreadyInSystem.map((r) => r.booking.id)).toEqual(['row-2']);
    expect(result.alreadyInSystem[0]?.linkedStayId).toBe('stay-2');
    expect(result.canceled).toEqual([]);
  });

  it('routes cancelled bookings into canceled even when linked', () => {
    const result = partitionBookingComInboxOpenRows({
      bookings: [
        {
          ...base,
          id: 'row-ok',
          booking_id: '111',
          issued_stay_id: null,
          booking_status: 'ok',
        },
        {
          ...base,
          id: 'row-cancel',
          booking_id: '222',
          issued_stay_id: null,
          booking_status: 'cancelled',
        },
        {
          ...base,
          id: 'row-cancel-linked',
          booking_id: '333',
          issued_stay_id: null,
          booking_status: 'cancelled',
        },
      ],
      stays: [{ id: 'stay-3', booking_platform_id: 'booking-com', booking_external_id: '333' }],
    });

    expect(result.needsAction.map((r) => r.booking.id)).toEqual(['row-ok']);
    expect(result.alreadyInSystem).toEqual([]);
    expect(result.canceled.map((r) => r.booking.id)).toEqual(['row-cancel', 'row-cancel-linked']);
    expect(result.canceled[1]?.linkedStayId).toBe('stay-3');
  });
});
