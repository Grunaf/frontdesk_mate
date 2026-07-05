import type { TenantSettings } from '@/entities/tenant';
import {
  findGuestExtrasMissingPriceLabel,
  validateTenantSettingsBeforeSave,
  type TenantSettingsSaveBlockReason,
} from '@/entities/tenant/lib/validateTenantSettingsBeforeSave';

export type TenantFormSaveBlockReason = TenantSettingsSaveBlockReason;

export { findGuestExtrasMissingPriceLabel };

export function validateTenantFormBeforeSave(input: {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  mergedSettings: TenantSettings;
  receptionDeskPin?: string;
}): TenantFormSaveBlockReason | null {
  return validateTenantSettingsBeforeSave({
    actor: 'platform',
    subscriptionStartsAt: input.subscriptionStartsAt,
    subscriptionEndsAt: input.subscriptionEndsAt,
    mergedSettings: input.mergedSettings,
    receptionDeskPin: input.receptionDeskPin,
  });
}
