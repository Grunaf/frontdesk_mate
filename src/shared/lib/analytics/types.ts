export type AnalyticsSite = 'landing' | 'app';

export type ReceptionContactContext =
  | 'check_in'
  | 'taxi'
  | 'strip'
  | 'extend_stay'
  | 'issue'
  | 'stay_essentials_contact';

export type ReceptionContactChannel = 'whatsapp' | 'tel';

export type BookingWhatsappPlacement = 'hero' | 'room_card';

export type AnalyticsEventName =
  | 'landing_view'
  | 'booking_whatsapp_click'
  | 'check_in_success'
  | 'reception_contact_click';
