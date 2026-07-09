import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import type { TenantSettings } from '@/entities/tenant';
import {
  isCurrencyCode,
  parseDecimalMoneyInput,
  type CurrencyCode,
} from '@/shared/lib/currency';

export type ReservationBookingBalanceError = 'invalid_amount';

export type ResolvedReservationBookingBalance =
  | {
      ok: true;
      amountMinor: number | null;
      currency: CurrencyCode | null;
    }
  | { ok: false; error: ReservationBookingBalanceError };

export function resolveReservationBookingBalance(input: {
  settings: TenantSettings;
  bookingAmountDue?: string | number | null;
}): ResolvedReservationBookingBalance {
  const primary = resolveTenantCurrency(input.settings).primary;

  if (input.bookingAmountDue === undefined || input.bookingAmountDue === null) {
    return { ok: true, amountMinor: null, currency: null };
  }

  if (typeof input.bookingAmountDue === 'string' && !input.bookingAmountDue.trim()) {
    return { ok: true, amountMinor: null, currency: null };
  }

  const amountMinor = parseDecimalMoneyInput(input.bookingAmountDue, primary);
  if (amountMinor === null) {
    return { ok: false, error: 'invalid_amount' };
  }

  return { ok: true, amountMinor, currency: primary };
}

export function reservationBookingBalanceErrorMessage(
  code: ReservationBookingBalanceError
): string {
  switch (code) {
    case 'invalid_amount':
      return 'Enter a valid stay balance amount (0 or greater).';
  }
}

export function readBookingAmountMinorFromRow(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function readBookingAmountCurrencyFromRow(value: unknown): CurrencyCode | null {
  if (value == null || value === '') {
    return null;
  }

  const code = String(value);
  return isCurrencyCode(code) ? code : null;
}
