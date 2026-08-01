import type { BookingComExternalBookingRecord } from '../model/types';

/** Prefer detail total due; fall back to list booking price. */
export function resolveBookingComAmountDue(
  booking: Pick<BookingComExternalBookingRecord, 'total_amount' | 'list_amount' | 'amount'>
): number | null {
  if (booking.total_amount != null) return booking.total_amount;
  if (booking.list_amount != null) return booking.list_amount;
  if (booking.amount != null) return booking.amount;
  return null;
}

export function resolveBookingComListAmounts(booking: Pick<
  BookingComExternalBookingRecord,
  'list_amount' | 'total_amount' | 'amount'
>): { list: number | null; total: number | null } {
  return {
    list: booking.list_amount ?? booking.amount ?? null,
    total: booking.total_amount ?? null,
  };
}

/** True when we only have Extranet list/booking price — total due may differ (city tax). */
export function hasBookingComListPriceOnlyWarning(
  booking: Pick<BookingComExternalBookingRecord, 'list_amount' | 'total_amount' | 'amount'>
): boolean {
  const { list, total } = resolveBookingComListAmounts(booking);
  return list != null && total == null;
}

export const BOOKING_COM_LIST_PRICE_ONLY_NOTICE =
  'List price only — total due may differ (city tax). Open the reservation page in Extranet to sync the full amount.';

/** Short hint for inbox cards; full copy belongs on the create-stay form. */
export const BOOKING_COM_LIST_PRICE_ONLY_INBOX_HINT = 'Verify total on Extranet';

export function formatBookingComInboxAmountLine(
  booking: Pick<
    BookingComExternalBookingRecord,
    'list_amount' | 'total_amount' | 'amount' | 'currency'
  >
): string | null {
  const currency = booking.currency?.trim() || '';
  const fmt = (n: number) => (currency ? `${n} ${currency}` : String(n));
  const { list, total } = resolveBookingComListAmounts(booking);

  if (list != null && total != null && list !== total) {
    return `${fmt(list)} booking · ${fmt(total)} due`;
  }
  if (list != null && total != null) {
    return `${fmt(total)} due`;
  }
  if (total != null) return `${fmt(total)} due`;
  if (list != null) return `${fmt(list)} booking (list)`;
  return null;
}

export function resolveLinkedStayIdForBookingComInbox(input: {
  booking: Pick<BookingComExternalBookingRecord, 'booking_id' | 'issued_stay_id'>;
  stays: Array<{
    id: string;
    booking_platform_id?: string | null;
    booking_external_id?: string | null;
  }>;
}): string | null {
  if (input.booking.issued_stay_id) return input.booking.issued_stay_id;
  const externalId = input.booking.booking_id.trim();
  if (!externalId) return null;
  const match = input.stays.find(
    (stay) =>
      stay.booking_platform_id === 'booking-com' &&
      (stay.booking_external_id?.trim() || '') === externalId
  );
  return match?.id ?? null;
}

export type BookingComInboxStayRef = {
  id: string;
  booking_platform_id?: string | null;
  booking_external_id?: string | null;
};

/** Exact match only: split Open inbox into action vs already-linked local stays. */
export function partitionBookingComInboxOpenRows(input: {
  bookings: BookingComExternalBookingRecord[];
  stays: BookingComInboxStayRef[];
}): {
  needsAction: Array<{ booking: BookingComExternalBookingRecord; linkedStayId: null }>;
  alreadyInSystem: Array<{ booking: BookingComExternalBookingRecord; linkedStayId: string }>;
} {
  const needsAction: Array<{ booking: BookingComExternalBookingRecord; linkedStayId: null }> = [];
  const alreadyInSystem: Array<{
    booking: BookingComExternalBookingRecord;
    linkedStayId: string;
  }> = [];

  for (const booking of input.bookings) {
    const linkedStayId = resolveLinkedStayIdForBookingComInbox({
      booking,
      stays: input.stays,
    });
    if (linkedStayId) {
      alreadyInSystem.push({ booking, linkedStayId });
    } else {
      needsAction.push({ booking, linkedStayId: null });
    }
  }

  return { needsAction, alreadyInSystem };
}
