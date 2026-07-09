import {
  listReceptionBookingPlatforms,
  RECEPTION_BOOKING_EXTERNAL_ID_MAX,
} from '@/entities/tenant/lib/normalizeReceptionBookingSettings';
import type { TenantSettings } from '@/entities/tenant';

export type ReservationBookingSourceError =
  | 'platform_required'
  | 'external_id_too_long'
  | 'external_id_required';

export function validateReservationBookingSource(input: {
  settings: TenantSettings | undefined;
  bookingPlatformId?: string | null;
  bookingExternalId?: string | null;
}): ReservationBookingSourceError | null {
  const platformId = input.bookingPlatformId?.trim() || null;
  const externalId = input.bookingExternalId?.trim() || null;

  if (externalId && externalId.length > RECEPTION_BOOKING_EXTERNAL_ID_MAX) {
    return 'external_id_too_long';
  }

  if (externalId && !platformId) {
    return 'platform_required';
  }

  if (platformId) {
    const platform = listReceptionBookingPlatforms(input.settings).find(
      (entry) => entry.id === platformId
    );
    if (platform?.requiresExternalId && !externalId) {
      return 'external_id_required';
    }
  }

  return null;
}

export function reservationBookingSourceErrorMessage(
  code: ReservationBookingSourceError
): string {
  switch (code) {
    case 'platform_required':
      return 'Select a booking platform when entering a booking reference.';
    case 'external_id_too_long':
      return `Booking reference must be at most ${RECEPTION_BOOKING_EXTERNAL_ID_MAX} characters.`;
    case 'external_id_required':
      return 'This platform requires a booking reference.';
  }
}
