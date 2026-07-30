import type { TenantSettings } from '@/entities/tenant';
import {
  resolveBookingComHotelId,
  resolveHostelworldBookingPrefix,
} from '@/entities/tenant';
import { buildBookingComReservationUrl } from './buildBookingComReservationUrl';
import {
  buildHostelworldReservationUrl,
  formatHostelworldBookingReferenceDisplay,
} from './parseHostelworldBookingReference';

export type BookingSourceOpenTarget = {
  platformId: 'booking-com' | 'hostelworld';
  label: string;
  buttonLabel: string;
  openUrl: string | null;
  referenceDisplay: string | null;
  hint: string | null;
};

/**
 * Resolve extranet deep-link for a stay's booking source.
 * Returns null when platform has no known open action (walk-in / direct / unknown).
 */
export function resolveBookingSourceOpenTarget(input: {
  platformId: string | null | undefined;
  externalId: string | null | undefined;
  tenantSettings?: TenantSettings;
}): BookingSourceOpenTarget | null {
  const platformId = input.platformId?.trim() ?? '';
  const externalId = input.externalId?.trim() ?? '';

  if (platformId === 'booking-com') {
    const hotelId = resolveBookingComHotelId(input.tenantSettings);
    const openUrl = buildBookingComReservationUrl({
      reservationId: externalId,
      hotelId: hotelId ?? '',
    });
    return {
      platformId: 'booking-com',
      label: 'Booking.com',
      buttonLabel: 'Open in Booking',
      openUrl,
      referenceDisplay: externalId || null,
      hint: !hotelId
        ? 'Set Booking.com hotel ID in admin to open reservations.'
        : !externalId
          ? 'No booking reference'
          : null,
    };
  }

  if (platformId === 'hostelworld') {
    const prefix = resolveHostelworldBookingPrefix(input.tenantSettings);
    const openUrl = buildHostelworldReservationUrl(externalId);
    return {
      platformId: 'hostelworld',
      label: 'Hostelworld',
      buttonLabel: 'Open in Hostelworld',
      openUrl,
      referenceDisplay: externalId
        ? formatHostelworldBookingReferenceDisplay(prefix, externalId) || null
        : null,
      hint: !externalId
        ? 'No booking reference'
        : !prefix
          ? 'Hostelworld property prefix is not set yet.'
          : null,
    };
  }

  return null;
}
