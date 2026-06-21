import { BOOKING_INTEGRATIONS } from '@/shared/config/integrations';
import type {
  BookingProvider,
  HostelBookingConfig,
  HostelBookingParamKeys,
  TenantBookingSettings,
} from '../model/booking';
import type { TenantSettings } from '../model/settings';

export function readBookingSettings(settings: TenantSettings): Required<TenantBookingSettings> {
  if (settings.booking?.provider) {
    return {
      provider: settings.booking.provider,
      engineId: settings.booking.engineId ?? '',
      url: settings.booking.url ?? '',
    };
  }

  return {
    provider: 'none',
    engineId: '',
    url: '',
  };
}

function resolvePropertyUrl(provider: BookingProvider, engineId: string, urlOverride?: string): string | null {
  if (provider === 'none') {
    return null;
  }

  const trimmedOverride = urlOverride?.trim();
  if (trimmedOverride) {
    return trimmedOverride.replace(/\/$/, '');
  }

  const integration = BOOKING_INTEGRATIONS[provider];
  const trimmedEngineId = engineId.trim();
  if (!trimmedEngineId) {
    return null;
  }

  return integration.buildPropertyUrl(trimmedEngineId);
}

export function resolveBookingConfig(settings: TenantSettings): HostelBookingConfig {
  const { provider, engineId, url } = readBookingSettings(settings);
  const propertyUrl = resolvePropertyUrl(provider, engineId, url || undefined);
  const paramKeys: HostelBookingParamKeys =
    provider === 'none' ? BOOKING_INTEGRATIONS.cloudbeds.paramKeys : BOOKING_INTEGRATIONS[provider].paramKeys;

  return {
    provider,
    enabled: provider !== 'none' && Boolean(propertyUrl),
    engineId: engineId.trim() || undefined,
    propertyUrl,
    paramKeys,
  };
}

export function buildBookingSearchUrl(
  booking: HostelBookingConfig,
  params: { checkIn?: string; checkOut?: string; guests?: string }
): string | null {
  if (!booking.propertyUrl) {
    return null;
  }

  const url = new URL(booking.propertyUrl);

  if (params.checkIn) {
    url.searchParams.set(booking.paramKeys.checkIn, params.checkIn);
  }
  if (params.checkOut) {
    url.searchParams.set(booking.paramKeys.checkOut, params.checkOut);
  }
  if (params.guests) {
    url.searchParams.set(booking.paramKeys.guests, params.guests);
  }

  return url.toString();
}

export function buildBookingRoomUrl(
  booking: HostelBookingConfig,
  roomTypeId: string,
  params: { checkIn?: string; checkOut?: string }
): string | null {
  if (!booking.propertyUrl) {
    return null;
  }

  const url = new URL(booking.propertyUrl);
  url.searchParams.set(booking.paramKeys.roomType, roomTypeId);

  if (params.checkIn) {
    url.searchParams.set(booking.paramKeys.checkIn, params.checkIn);
  }
  if (params.checkOut) {
    url.searchParams.set(booking.paramKeys.checkOut, params.checkOut);
  }

  return url.toString();
}
