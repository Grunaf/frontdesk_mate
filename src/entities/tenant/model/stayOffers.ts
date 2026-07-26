/** Sellable stay group shared by landing, reception, and guest-stay room pools. */
export interface StayOffer {
  id: string;
  title: string;
  /** Base nightly price in tenant primary currency (landing badge / web booking). */
  basePriceEur?: number;
  /** Booking-engine room type id when online booking is enabled. */
  engineRoomTypeId?: string;
  sortOrder?: number;
}
