import type { BookingProvider } from '@/entities/tenant';
import { readBookingSettings } from '@/entities/tenant/lib/resolveBookingConfig';
import { hasLandingRooms } from '@/entities/tenant/lib/resolveLandingRooms';
import type { TenantSettings } from '@/entities/tenant';

export type AdminFieldWidth = 'xs' | 'sm' | 'md' | 'lg' | 'full';

export type GuestEmptyState = 'hide' | 'fallback' | 'gate' | 'degrade' | 'filter' | 'fail';

export interface TenantAdminFieldContext {
  settings: TenantSettings;
  bookingProvider?: BookingProvider;
}

export function resolveAdminBookingProvider(settings: TenantSettings): BookingProvider {
  return readBookingSettings(settings).provider;
}

export function isBookingEngineEnabled(settings: TenantSettings): boolean {
  return resolveAdminBookingProvider(settings) !== 'none';
}

export function isBookingEngineConfigured(settings: TenantSettings): boolean {
  const booking = readBookingSettings(settings);
  if (booking.provider === 'none') {
    return false;
  }

  return Boolean(booking.engineId.trim() || booking.url.trim());
}

export function shouldShowBookingEngineFields(settings: TenantSettings): boolean {
  return isBookingEngineEnabled(settings);
}

export function shouldShowEngineRoomTypeId(settings: TenantSettings): boolean {
  return isBookingEngineEnabled(settings);
}

export function isEngineRoomTypeIdRequired(settings: TenantSettings): boolean {
  return isBookingEngineEnabled(settings) && hasLandingRooms(settings);
}

export function shouldShowPhoneDisplayOptions(raw: string, defaultRaw?: string): boolean {
  return Boolean(raw.trim() || defaultRaw?.trim());
}

export function shouldShowDualCurrency(displayMode: 'primary' | 'dual'): boolean {
  return displayMode === 'dual';
}

export function shouldShowReceptionWhatsappToggles(settings: TenantSettings): boolean {
  const phone = settings.contacts?.phoneRaw?.trim();
  const whatsapp = settings.reception?.whatsappPhoneRaw?.trim();
  const bookingWhatsapp = settings.contacts?.bookingWhatsappPhoneRaw?.trim();
  return Boolean(phone || whatsapp || bookingWhatsapp);
}
