import type { TenantSettings } from '@/entities/tenant';
import { getHouseRules } from '@/entities/house-rules';

export type GuestServiceId = 'laundry' | 'late_checkout';

export interface ResolvedGuestService {
  id: GuestServiceId;
  priceLabel: string | null;
}

function resolveLaundryPriceLabel(settings: TenantSettings): string | null {
  const fromSettings = settings.laundryCost?.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const laundryRule = getHouseRules(settings).find(
    (rule) => rule.enabled && rule.templateId === 'laundry'
  );

  if (laundryRule && laundryRule.templateId === 'laundry') {
    const fromRule = laundryRule.params?.cost?.trim();
    if (fromRule) {
      return fromRule;
    }
  }

  return null;
}

function isLaundryServiceAvailable(settings: TenantSettings): boolean {
  if (resolveLaundryPriceLabel(settings)) {
    return true;
  }

  return getHouseRules(settings).some((rule) => rule.enabled && rule.templateId === 'laundry');
}

export function resolveGuestServices(settings: TenantSettings): ResolvedGuestService[] {
  const services: ResolvedGuestService[] = [];

  if (isLaundryServiceAvailable(settings)) {
    services.push({
      id: 'laundry',
      priceLabel: resolveLaundryPriceLabel(settings),
    });
  }

  if (settings.checkOutTime?.trim()) {
    services.push({
      id: 'late_checkout',
      priceLabel: null,
    });
  }

  return services;
}

export function shouldHideLaundryHouseRule(settings: TenantSettings): boolean {
  return resolveGuestServices(settings).some((service) => service.id === 'laundry');
}
