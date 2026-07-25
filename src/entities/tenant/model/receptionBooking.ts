export type BookingPlatformOption = {
  id: string;
  label: string;
  requiresExternalId?: boolean;
};

export type ReceptionBookingSettings = {
  platforms: BookingPlatformOption[];
  /** Booking.com property id for reception extranet deep links. */
  bookingComHotelId?: string;
};

export const SUGGESTED_RECEPTION_BOOKING_PLATFORMS: BookingPlatformOption[] = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'direct', label: 'Direct' },
  { id: 'booking-com', label: 'Booking.com' },
  { id: 'hostelworld', label: 'Hostelworld' },
];
