import type { GuestExtraConfig } from '@/entities/guest-extra';
import { isNewDeskPinValid, DESK_PIN_MIN_LENGTH } from '@/app/reception/lib/deskPin';
import type { TenantSettings } from '../model/settings';
import { validateReceptionBookingPlatformsForAdmin } from '../lib/normalizeReceptionBookingSettings';

export type TenantSettingsSaveActor = 'platform' | 'owner';

export type TenantSettingsSaveBlockReason =
  | { code: 'subscription_dates'; message: string }
  | { code: 'guest_extra_price'; message: string }
  | { code: 'reception_desk_pin'; message: string }
  | { code: 'reception_booking_platforms'; message: string };

export function findGuestExtrasMissingPriceLabel(
  guestExtras: GuestExtraConfig[] | undefined
): GuestExtraConfig[] {
  return (guestExtras ?? []).filter(
    (entry) => entry.enabled && !entry.priceLabel?.trim()
  );
}

export function validateTenantSettingsBeforeSave(input: {
  actor: TenantSettingsSaveActor;
  subscriptionStartsAt?: string;
  subscriptionEndsAt?: string;
  mergedSettings: TenantSettings;
  receptionDeskPin?: string;
}): TenantSettingsSaveBlockReason | null {
  if (input.actor === 'platform') {
    const starts = input.subscriptionStartsAt?.trim() ?? '';
    const ends = input.subscriptionEndsAt?.trim() ?? '';
    if (!starts || !ends) {
      return {
        code: 'subscription_dates',
        message: 'Set subscription start and end dates in step 1 before saving.',
      };
    }
  }

  const deskPin = input.receptionDeskPin?.trim() ?? '';
  if (deskPin && !isNewDeskPinValid(deskPin)) {
    return {
      code: 'reception_desk_pin',
      message: `Reception desk PIN must be at least ${DESK_PIN_MIN_LENGTH} characters.`,
    };
  }

  const missingPrice = findGuestExtrasMissingPriceLabel(input.mergedSettings.guestExtras);
  if (missingPrice.length > 0) {
    const count = missingPrice.length;
    return {
      code: 'guest_extra_price',
      message: `Fill price label for ${count} enabled extra${count === 1 ? '' : 's'} (Guest app → Extras).`,
    };
  }

  const platformError = validateReceptionBookingPlatformsForAdmin(input.mergedSettings);
  if (platformError) {
    return {
      code: 'reception_booking_platforms',
      message: platformError,
    };
  }

  return null;
}
