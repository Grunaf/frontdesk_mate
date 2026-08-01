export const BOOKING_COM_BOOKING_STATUSES = ['ok', 'cancelled', 'no_show', 'unknown'] as const;

export type BookingComBookingStatus = (typeof BOOKING_COM_BOOKING_STATUSES)[number];

export const BOOKING_COM_INBOX_STATUSES = ['open', 'done', 'dismissed'] as const;

export type BookingComInboxStatus = (typeof BOOKING_COM_INBOX_STATUSES)[number];

export const BOOKING_COM_CAPTURE_SOURCES = ['list_api', 'detail_api', 'dom_fallback'] as const;

export type BookingComCaptureSource = (typeof BOOKING_COM_CAPTURE_SOURCES)[number];

export interface BookingComExternalBookingRecord {
  id: string;
  tenant_id: string;
  hotel_id: string;
  booking_id: string;
  guest_name: string | null;
  phone_number: string | null;
  guest_email: string | null;
  adults: number | null;
  children: number | null;
  check_in: string | null;
  check_out: string | null;
  amount: number | null;
  currency: string | null;
  booking_status: BookingComBookingStatus;
  room_name: string | null;
  inbox_status: BookingComInboxStatus;
  source: BookingComCaptureSource;
  captured_at: string | null;
  issued_stay_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Normalized booking payload from the Chrome extension. */
export type BookingComExternalBookingInput = {
  booking_id: string;
  hotel_id: string;
  guest_name?: string | null;
  phone_number?: string | null;
  guest_email?: string | null;
  adults?: number | null;
  children?: number | null;
  check_in?: string | null;
  check_out?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: BookingComBookingStatus | null;
  room_name?: string | null;
  captured_at?: string | null;
  source?: BookingComCaptureSource | null;
};

export type ListBookingComExternalBookingsFilter = BookingComInboxStatus;

export type UpsertBookingComExternalBookingsResult =
  | { ok: true; upserted: number }
  | {
      ok: false;
      error: 'tenant_not_found' | 'hotel_mismatch' | 'invalid_payload' | 'db_unavailable';
    };

export type PatchBookingComExternalBookingResult =
  | { ok: true }
  | {
      ok: false;
      error: 'tenant_not_found' | 'hotel_mismatch' | 'not_found' | 'invalid_payload' | 'db_unavailable';
    };

export type ResolveBookingComExternalBookingResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'db_unavailable' };
