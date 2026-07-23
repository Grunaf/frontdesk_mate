/** Sellable stay group shared by landing, reception, and guest-stay room pools. */
export interface StayOffer {
  id: string;
  title: string;
  /** Booking-engine room type id when online booking is enabled. */
  engineRoomTypeId?: string;
  sortOrder?: number;
}
