import type { StayOffer } from '@/entities/tenant';
import { resolveStayOfferBookingUnit } from '@/entities/tenant';
import { formatMinorAsDecimalInput, majorAmountToMinorUnits } from '@/shared/lib/currency';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import type { TenantSettings } from '@/entities/tenant';
import { countAccessNights } from './guestAccessDates';

export type ResolveReceptionOfferBalanceInput = {
  settings: TenantSettings;
  offer: Pick<StayOffer, 'basePriceEur' | 'bookingUnit'> | null | undefined;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
};

/**
 * Reception create-booking prefill from stay offer.
 * - bed (default): basePriceEur × nights × guests
 * - room (formula A): basePriceEur × nights (guestCount is capacity only)
 * Site discount is intentionally ignored (web-only).
 * Returns null when offer has no base price or nights/guests invalid.
 */
export function resolveReceptionOfferBalance(
  input: ResolveReceptionOfferBalanceInput
): string | null {
  const unit = input.offer?.basePriceEur;
  if (unit == null || !Number.isFinite(unit) || unit < 0) {
    return null;
  }

  const nights = countAccessNights(input.checkInDate, input.checkOutDate);
  const guests = Math.floor(input.guestCount);
  if (nights < 1 || guests < 1) {
    return null;
  }

  const currency = resolveTenantCurrency(input.settings).primary;
  const bookingUnit = resolveStayOfferBookingUnit(input.offer);
  const dueMajor = bookingUnit === 'room' ? unit * nights : unit * nights * guests;
  const dueMinor = majorAmountToMinorUnits(dueMajor, currency);
  return formatMinorAsDecimalInput(dueMinor, currency);
}
