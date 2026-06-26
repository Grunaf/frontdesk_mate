import type { GuestExtraConfig } from '@/entities/guest-extra';
import type { TenantSettings } from '@/entities/tenant';

export type TenantFormSaveBlockReason =
  | { code: 'subscription_dates'; message: string }
  | { code: 'guest_extra_price'; message: string };

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
}): TenantFormSaveBlockReason | null {
  if (!input.subscriptionStartsAt.trim() || !input.subscriptionEndsAt.trim()) {
    return {
      code: 'subscription_dates',
      message: 'Set subscription start and end dates in step 1 before saving.',
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
