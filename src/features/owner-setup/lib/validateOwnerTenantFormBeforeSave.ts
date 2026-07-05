import type { TenantSettings } from '@/entities/tenant';
import { validateTenantFormBeforeSave } from '@/app/admin/(protected)/tenants/lib/validateTenantFormBeforeSave';

export function validateOwnerTenantFormBeforeSave(input: {
  mergedSettings: TenantSettings;
  receptionDeskPin?: string;
}) {
  return validateTenantFormBeforeSave({
    subscriptionStartsAt: '2000-01-01',
    subscriptionEndsAt: '2099-12-31',
    mergedSettings: input.mergedSettings,
    receptionDeskPin: input.receptionDeskPin,
  });
}
