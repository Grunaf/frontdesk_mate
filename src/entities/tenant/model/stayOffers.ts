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
   * - `room`: price is per room / night (formula A); capacity = beds in the physical room.
   */
  bookingUnit?: StayOfferBookingUnit;
  /** Booking-engine room type id when online booking is enabled. */
  engineRoomTypeId?: string;
  sortOrder?: number;
}

export function resolveStayOfferBookingUnit(
  offer: Pick<StayOffer, 'bookingUnit'> | null | undefined
): StayOfferBookingUnit {
  return offer?.bookingUnit === 'room' ? 'room' : 'bed';
}
