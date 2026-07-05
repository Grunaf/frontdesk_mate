import type { TenantSettings } from '@/entities/tenant';
import { validateTenantSettingsBeforeSave } from '@/entities/tenant/lib/validateTenantSettingsBeforeSave';

export function validateOwnerTenantFormBeforeSave(input: {
  mergedSettings: TenantSettings;
  receptionDeskPin?: string;
}) {
  return validateTenantSettingsBeforeSave({
    actor: 'owner',
    mergedSettings: input.mergedSettings,
  });
}
