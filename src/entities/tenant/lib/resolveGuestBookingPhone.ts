import type { TenantSettings } from '../model/settings';

/** WhatsApp number for landing hero / room booking. Falls back to reception phone. */
export function resolveGuestBookingPhone(settings: TenantSettings): string {
  return (
    settings.contacts?.bookingWhatsappPhoneRaw?.trim() ||
    settings.contacts?.phoneRaw?.trim() ||
    ''
  );
}
