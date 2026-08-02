import { resolveLinkedStayIdForBookingComInbox } from '@/entities/booking-com-external-booking';
import type { BookingComBookingStatus } from '@/entities/booking-com-external-booking';

export type BookingComCancellationSyncBooking = {
  booking_id: string;
  status?: BookingComBookingStatus | null;
};

/** Pure: unique linked stay ids for cancelled OTA bookings. */
export function collectLinkedStayIdsForCancelledBookings(input: {
  bookings: BookingComCancellationSyncBooking[];
  externalRows: Array<{ booking_id: string; issued_stay_id: string | null }>;
  stays: Array<{
    id: string;
    booking_platform_id?: string | null;
    booking_external_id?: string | null;
  }>;
}): string[] {
  const cancelled = input.bookings.filter((booking) => booking.status === 'cancelled');
  if (cancelled.length === 0) return [];

  const externalByBookingId = new Map(
    input.externalRows.map((row) => [row.booking_id, row] as const)
  );
  const stayIds = new Set<string>();

  for (const booking of cancelled) {
    const row = externalByBookingId.get(booking.booking_id);
    const linkedStayId = resolveLinkedStayIdForBookingComInbox({
      booking: {
        booking_id: booking.booking_id,
        issued_stay_id: row?.issued_stay_id ?? null,
      },
      stays: input.stays,
    });
    if (linkedStayId) stayIds.add(linkedStayId);
  }

  return [...stayIds];
}
