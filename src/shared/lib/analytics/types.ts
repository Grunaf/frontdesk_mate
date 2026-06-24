export type AnalyticsSite = 'landing' | 'app';

export type ReceptionContactContext =
  | 'check_in'
  | 'taxi'
  | 'strip'
  | 'extend_stay'
  | 'issue';

export type ReceptionContactChannel = 'whatsapp' | 'tel';

export type BookingWhatsappPlacement = 'hero' | 'room_card';

export type AnalyticsEventName =
  | 'landing_view'
  | 'booking_whatsapp_click'
  | 'check_in_success'
  | 'reception_contact_click';
