export type BookingPlatformOption = {
  id: string;
  label: string;
  requiresExternalId?: boolean;
};

export type ReceptionBookingSettings = {
  platforms: BookingPlatformOption[];
  /** Booking.com property id for reception extranet deep links. */
  bookingComHotelId?: string;
  /**
   * Hostelworld property constant: leading 6 digits of the full booking number.
   * Stay stores only the unique suffix; Inbox URL uses the unique part only.
   */
  hostelworldBookingPrefix?: string;
};

export const SUGGESTED_RECEPTION_BOOKING_PLATFORMS: BookingPlatformOption[] = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'direct', label: 'Direct' },
  { id: 'booking-com', label: 'Booking.com' },
  { id: 'hostelworld', label: 'Hostelworld' },
];
