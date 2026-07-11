import type { PhoneCountryPresetId } from '@/shared/lib/phone-display-presets';

export const GUEST_PHONE_COUNTRY_FLAG: Record<PhoneCountryPresetId, string> = {
  ba: '🇧🇦',
  me: '🇲🇪',
  rs: '🇷🇸',
};

export function guestPhoneCountryFlag(presetId: PhoneCountryPresetId): string {
  return GUEST_PHONE_COUNTRY_FLAG[presetId];
}
