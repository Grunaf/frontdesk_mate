/** How the offer is sold on landing + reception. Default: per bed. */
export type StayOfferBookingUnit = 'bed' | 'room';

/** Sellable stay group shared by landing, reception, and guest-stay room pools. */
export interface StayOffer {
  id: string;
  title: string;
  /** Base nightly price in tenant primary currency (landing badge / web booking). */
  basePriceEur?: number;
  /**
   * Sell unit for this offer.
   * - `bed` (default): price is per person / bed / night; capacity = free beds.
   * - `room`: price is per room / night (formula A); capacity = `maxGuests` / linked beds.
   */
  bookingUnit?: StayOfferBookingUnit;
  /**
   * Max guests when `bookingUnit: 'room'`.
   * Ignored for bed offers (capacity comes from free beds).
   */
  maxGuests?: number;
  /** Booking-engine room type id when online booking is enabled. */
  engineRoomTypeId?: string;
  sortOrder?: number;
}

export function resolveStayOfferBookingUnit(
  offer: Pick<StayOffer, 'bookingUnit'> | null | undefined
): StayOfferBookingUnit {
  return offer?.bookingUnit === 'room' ? 'room' : 'bed';
}

export function resolveStayOfferMaxGuests(
  offer: Pick<StayOffer, 'bookingUnit' | 'maxGuests'> | null | undefined
): number | undefined {
  if (resolveStayOfferBookingUnit(offer) !== 'room') return undefined;
  const max = offer?.maxGuests;
  if (typeof max !== 'number' || !Number.isFinite(max) || max < 1) return undefined;
  return Math.floor(max);
}
