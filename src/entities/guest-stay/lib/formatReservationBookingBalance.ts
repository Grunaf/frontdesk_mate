import type { GuestStayRecord } from '../model/types';
import { formatMoneyFromMinor, isCurrencyCode } from '@/shared/lib/currency';

function formatPaidAt(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatReservationBookingBalanceSummary(
  stay: Pick<
    GuestStayRecord,
    'booking_amount_due_minor' | 'booking_amount_currency' | 'booking_paid_at'
  >,
  locale = 'en'
): string | null {
  const minor = stay.booking_amount_due_minor;
  const currency = stay.booking_amount_currency;
  if (minor == null || !currency || !isCurrencyCode(currency)) {
    return null;
  }

  const amountLabel = formatMoneyFromMinor(minor, currency, locale);
  if (stay.booking_paid_at) {
    return `${amountLabel} · Paid · ${formatPaidAt(stay.booking_paid_at)}`;
  }

  return `${amountLabel} due · Unpaid`;
}

export function formatReservationBookingBalanceListHint(
  stay: Pick<
    GuestStayRecord,
    'booking_amount_due_minor' | 'booking_amount_currency' | 'booking_paid_at'
  >,
  locale = 'en'
): string | null {
  const minor = stay.booking_amount_due_minor;
  const currency = stay.booking_amount_currency;
  if (minor == null || !currency || !isCurrencyCode(currency) || stay.booking_paid_at) {
    return null;
  }

  return `Unpaid ${formatMoneyFromMinor(minor, currency, locale)}`;
}
