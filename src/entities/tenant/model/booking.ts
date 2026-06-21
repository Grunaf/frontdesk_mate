export type BookingProvider = 'none' | 'cloudbeds' | 'frontdesk_master';

export interface TenantBookingSettings {
  provider?: BookingProvider;
  /** Cloudbeds property ID or Frontdesk Master property slug */
  engineId?: string;
  /** Optional full booking page URL override (skips provider template) */
  url?: string;
}

export interface HostelBookingParamKeys {
  checkIn: string;
  checkOut: string;
  guests: string;
  roomType: string;
}

export interface HostelBookingConfig {
  provider: BookingProvider;
  enabled: boolean;
  engineId?: string;
  propertyUrl: string | null;
  paramKeys: HostelBookingParamKeys;
}

export const BOOKING_PROVIDER_LABELS: Record<BookingProvider, string> = {
  none: 'No booking engine (PMS)',
  cloudbeds: 'Cloudbeds',
  frontdesk_master: 'Frontdesk Master',
};

export function isBookingProvider(value: string): value is BookingProvider {
  return value === 'none' || value === 'cloudbeds' || value === 'frontdesk_master';
}
