import 'server-only';

import { listBookingComExternalBookingsByBookingIds } from '@/entities/booking-com-external-booking/server';
import {
  cancelOrCheckoutGuestReservation,
  listPlanGuestReservations,
} from '@/entities/guest-stay/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  collectLinkedStayIdsForCancelledBookings,
  type BookingComCancellationSyncBooking,
} from './collectLinkedStayIdsForCancelledBookings';
import {
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from './resolveOperationalDay';

export type { BookingComCancellationSyncBooking } from './collectLinkedStayIdsForCancelledBookings';
export { collectLinkedStayIdsForCancelledBookings } from './collectLinkedStayIdsForCancelledBookings';

/**
 * After Booking.com sync upsert/patch: cancel local planned stays linked to
 * OTA-cancelled bookings (same soft-archive path as reception cancel).
 * Best-effort: sync success does not depend on cancel outcome.
 */
export async function cancelLinkedStaysForBookingComCancellations(input: {
  tenantSlug: string;
  bookings: BookingComCancellationSyncBooking[];
}): Promise<{ cancelledStayIds: string[]; skipped: number }> {
  const cancelledBookings = input.bookings.filter((booking) => booking.status === 'cancelled');
  if (cancelledBookings.length === 0) {
    return { cancelledStayIds: [], skipped: 0 };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { cancelledStayIds: [], skipped: cancelledBookings.length };
  }

  const operationalDate = resolveOperationalDay(
    new Date(),
    resolveOperationalDayStartTime(tenant.settings)
  ).operationalDate;

  const bookingIds = cancelledBookings.map((booking) => booking.booking_id);
  const [planStays, externalRows] = await Promise.all([
    listPlanGuestReservations(input.tenantSlug),
    listBookingComExternalBookingsByBookingIds({
      tenantSlug: input.tenantSlug,
      bookingIds,
    }),
  ]);

  const stayIds = collectLinkedStayIdsForCancelledBookings({
    bookings: cancelledBookings,
    externalRows,
    stays: planStays,
  });

  const cancelledStayIds: string[] = [];
  let skipped = 0;

  for (const stayId of stayIds) {
    const result = await cancelOrCheckoutGuestReservation({
      tenantSlug: input.tenantSlug,
      stayId,
      operationalDate,
      archivedByReceptionUserId: '',
      intent: 'cancel',
    });
    if (result.ok) {
      cancelledStayIds.push(stayId);
      continue;
    }
    if (result.error === 'already_archived' || result.error === 'not_found') {
      skipped += 1;
      continue;
    }
    console.error(
      'cancelLinkedStaysForBookingComCancellations:',
      stayId,
      result.error
    );
    skipped += 1;
  }

  return { cancelledStayIds, skipped };
}
