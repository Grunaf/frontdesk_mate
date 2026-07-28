import type { GuestStayRecord } from '@/entities/guest-stay';
import { isCurrencyCode } from '@/shared/lib/currency';

/**
 * Stays that should paint occupancy cells on Reception Plan calendar.
 * Active bookings + full checked-out history. Cancelled / remainder archives stay out.
 */
export function isPlanCalendarOccupancyStay(
  stay: Pick<GuestStayRecord, 'is_archived' | 'archive_kind' | 'archive_reason'>
): boolean {
  if (!stay.is_archived) return true;
  return stay.archive_kind === 'full' && stay.archive_reason === 'checked_out';
}

/** Past night or desk-checked-out history — muted on Plan. */
export function isPlanStayCellInactive(input: {
  nightDate: string;
  planToday: string;
  stay: Pick<GuestStayRecord, 'is_archived' | 'archive_reason'> | null | undefined;
}): boolean {
  if (input.nightDate < input.planToday) return true;
  return Boolean(
    input.stay?.is_archived && input.stay.archive_reason === 'checked_out'
  );
}

export function isPlanStayAdmitted(
  stay: Pick<GuestStayRecord, 'passport_checked_at' | 'desk_checked_in_at'>
): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

/**
 * Unpaid badge for Plan cards: admitted guest with due amount and not paid.
 * Pre-check-in / volunteers / missing price skip the indicator.
 */
export function isPlanStayUnpaid(
  stay: Pick<
    GuestStayRecord,
    | 'stay_kind'
    | 'booking_amount_due_minor'
    | 'booking_amount_currency'
    | 'booking_paid_at'
    | 'passport_checked_at'
    | 'desk_checked_in_at'
  >
): boolean {
  if (stay.stay_kind === 'volunteer') return false;
  if (!isPlanStayAdmitted(stay)) return false;
  const minor = stay.booking_amount_due_minor;
  const currency = stay.booking_amount_currency;
  if (minor == null || !currency || !isCurrencyCode(currency)) return false;
  return !stay.booking_paid_at;
}
