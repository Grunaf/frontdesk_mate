import type { TenantSettings } from '../model/settings';

export type GuestFieldPresentation = 'render' | 'hide' | 'preview';

export function shouldShowPreTripCheckIn(settings: TenantSettings): boolean {
  return Boolean(settings.checkInTime?.trim());
}

export function shouldShowPreTripCityTax(settings: TenantSettings): boolean {
  const legacy = settings.cityTax?.trim();
  const structured = settings.hostel?.cityTax?.amount;
  return Boolean(legacy) || (typeof structured === 'number' && structured >= 0);
}

export function shouldShowRoomDescription(description?: string): boolean {
  return Boolean(description?.trim());
}

export function shouldShowPreTripLuggage(settings: TenantSettings): boolean {
  return shouldShowPreTripCheckIn(settings);
}

export function shouldShowTimedGuestBanner(time?: string): boolean {
  return Boolean(time?.trim());
}
