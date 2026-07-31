import {
  BOOKING_COM_BOOKING_STATUSES,
  BOOKING_COM_CAPTURE_SOURCES,
  type BookingComBookingStatus,
  type BookingComCaptureSource,
  type BookingComExternalBookingInput,
} from '../model/types';

const BOOKING_ID_MAX = 64;
const HOTEL_ID_MAX = 32;
const GUEST_NAME_MAX = 200;
const PHONE_MAX = 40;
const CURRENCY_MAX = 8;
const ROOM_NAME_MAX = 200;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function asNonNegInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return null;
}

function asAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asDate(value: unknown): string | null {
  const raw = asTrimmedString(value, 10);
  if (!raw || !DATE_PATTERN.test(raw)) return null;
  return raw;
}

function asStatus(value: unknown): BookingComBookingStatus {
  if (typeof value === 'string' && (BOOKING_COM_BOOKING_STATUSES as readonly string[]).includes(value)) {
    return value as BookingComBookingStatus;
  }
  return 'unknown';
}

function asSource(value: unknown): BookingComCaptureSource {
  if (typeof value === 'string' && (BOOKING_COM_CAPTURE_SOURCES as readonly string[]).includes(value)) {
    return value as BookingComCaptureSource;
  }
  return 'list_api';
}

export function normalizeBookingComExternalBookingInput(
  raw: unknown
): BookingComExternalBookingInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const bookingId = asTrimmedString(record.booking_id, BOOKING_ID_MAX);
  const hotelId = asTrimmedString(record.hotel_id, HOTEL_ID_MAX);
  if (!bookingId || !hotelId) return null;

  return {
    booking_id: bookingId,
    hotel_id: hotelId,
    guest_name: asTrimmedString(record.guest_name, GUEST_NAME_MAX),
    phone_number: asTrimmedString(record.phone_number, PHONE_MAX),
    adults: asNonNegInt(record.adults),
    children: asNonNegInt(record.children),
    check_in: asDate(record.check_in),
    check_out: asDate(record.check_out),
    amount: asAmount(record.amount),
    currency: asTrimmedString(record.currency, CURRENCY_MAX)?.toUpperCase() ?? null,
    status: asStatus(record.status),
    room_name: asTrimmedString(record.room_name, ROOM_NAME_MAX),
    captured_at: asTrimmedString(record.captured_at, 40),
    source: asSource(record.source),
  };
}

export function normalizeBookingComExternalBookingBatch(
  raw: unknown
): BookingComExternalBookingInput[] {
  if (!Array.isArray(raw)) return [];
  const out: BookingComExternalBookingInput[] = [];
  for (const item of raw) {
    const normalized = normalizeBookingComExternalBookingInput(item);
    if (normalized) out.push(normalized);
  }
  return out;
}
