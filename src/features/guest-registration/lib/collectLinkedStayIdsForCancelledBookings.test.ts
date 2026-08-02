import { describe, expect, it } from 'vitest';
import { collectLinkedStayIdsForCancelledBookings } from './collectLinkedStayIdsForCancelledBookings';

describe('collectLinkedStayIdsForCancelledBookings', () => {
  it('returns empty when no cancelled bookings', () => {
    expect(
      collectLinkedStayIdsForCancelledBookings({
        bookings: [{ booking_id: '1', status: 'ok' }],
        externalRows: [{ booking_id: '1', issued_stay_id: 'stay-a' }],
        stays: [{ id: 'stay-a', booking_platform_id: 'booking-com', booking_external_id: '1' }],
      })
    ).toEqual([]);
  });

  it('prefers issued_stay_id for cancelled bookings', () => {
    expect(
      collectLinkedStayIdsForCancelledBookings({
        bookings: [{ booking_id: '1', status: 'cancelled' }],
        externalRows: [{ booking_id: '1', issued_stay_id: 'stay-issued' }],
        stays: [
          { id: 'stay-match', booking_platform_id: 'booking-com', booking_external_id: '1' },
        ],
      })
    ).toEqual(['stay-issued']);
  });

  it('falls back to booking-com external id match', () => {
    expect(
      collectLinkedStayIdsForCancelledBookings({
        bookings: [{ booking_id: '5049', status: 'cancelled' }],
        externalRows: [{ booking_id: '5049', issued_stay_id: null }],
        stays: [
          { id: 'stay-x', booking_platform_id: 'booking-com', booking_external_id: '5049' },
        ],
      })
    ).toEqual(['stay-x']);
  });

  it('skips cancelled bookings without a linked stay', () => {
    expect(
      collectLinkedStayIdsForCancelledBookings({
        bookings: [{ booking_id: '9', status: 'cancelled' }],
        externalRows: [{ booking_id: '9', issued_stay_id: null }],
        stays: [],
      })
    ).toEqual([]);
  });

  it('dedupes stay ids across cancelled bookings', () => {
    expect(
      collectLinkedStayIdsForCancelledBookings({
        bookings: [
          { booking_id: '1', status: 'cancelled' },
          { booking_id: '2', status: 'cancelled' },
        ],
        externalRows: [
          { booking_id: '1', issued_stay_id: 'stay-same' },
          { booking_id: '2', issued_stay_id: 'stay-same' },
        ],
        stays: [],
      })
    ).toEqual(['stay-same']);
  });
});
