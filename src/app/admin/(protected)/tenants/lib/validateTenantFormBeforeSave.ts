import type { GuestExtraConfig } from '@/entities/guest-extra';
import type { TenantSettings } from '@/entities/tenant';
import { isNewDeskPinValid, DESK_PIN_MIN_LENGTH } from '@/app/reception/lib/deskPin';

export type TenantFormSaveBlockReason =
  | { code: 'subscription_dates'; message: string }
  | { code: 'guest_extra_price'; message: string }
  | { code: 'reception_desk_pin'; message: string };

export function findGuestExtrasMissingPriceLabel(
  guestExtras: GuestExtraConfig[] | undefined
): GuestExtraConfig[] {
  return (guestExtras ?? []).filter(
    (entry) => entry.enabled && !entry.priceLabel?.trim()
  );
}

export function validateTenantFormBeforeSave(input: {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  mergedSettings: TenantSettings;
  receptionDeskPin?: string;
}): TenantFormSaveBlockReason | null {
  if (!input.subscriptionStartsAt.trim() || !input.subscriptionEndsAt.trim()) {
    return {
      code: 'subscription_dates',
      message: 'Set subscription start and end dates in step 1 before saving.',
    };
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

  return null;
}
