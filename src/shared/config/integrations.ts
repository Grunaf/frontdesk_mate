import type { BookingProvider, HostelBookingParamKeys } from '@/entities/tenant/model/booking';

const FRONTDESK_MASTER_BOOKING_BASE_URL =
  process.env.NEXT_PUBLIC_FRONTDESK_MASTER_BOOKING_BASE_URL?.replace(/\/$/, '') ||
  'https://book.frontdeskmate.com';

interface BookingIntegration {
  label: string;
  buildPropertyUrl: (engineId: string) => string;
  paramKeys: HostelBookingParamKeys;
}

export const BOOKING_INTEGRATIONS: Record<Exclude<BookingProvider, 'none'>, BookingIntegration> = {
  cloudbeds: {
    label: 'Cloudbeds',
    buildPropertyUrl: (engineId) =>
      `https://hotels.cloudbeds.com/en/reservation/${encodeURIComponent(engineId)}`,
    paramKeys: {
      checkIn: 'checkIn',
      checkOut: 'checkOut',
      guests: 'guests',
      roomType: 'room_type',
    },
  },
  frontdesk_master: {
    label: 'Frontdesk Master',
    buildPropertyUrl: (engineId) =>
      `${FRONTDESK_MASTER_BOOKING_BASE_URL}/${encodeURIComponent(engineId)}`,
    paramKeys: {
      checkIn: 'checkin',
      checkOut: 'checkout',
      guests: 'guests',
      roomType: 'room',
    },
  },
};
