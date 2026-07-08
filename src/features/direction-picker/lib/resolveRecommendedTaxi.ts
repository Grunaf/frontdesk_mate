import type { RecommendedTaxi } from '@/entities/hostel';
import type { HostelContactLink } from '@/entities/tenant/model/hostel-config';
import { resolvePhoneDisplay } from '@/shared/lib/phoneDisplay';
import { normalizePhoneDisplayPreset } from '@/shared/lib/phone-display-presets';

export interface ResolvedRecommendedTaxi {
  name: string;
  phoneRaw: string;
  phoneMask: string;
  href: string;
  whatsappEnabled: boolean;
}

export function resolveRecommendedTaxi(
  packTaxi: RecommendedTaxi | undefined,
  tenantTaxi: HostelContactLink
): ResolvedRecommendedTaxi | null {
  if (!packTaxi?.name) {
    return null;
  }

  const phoneRaw = packTaxi.phoneRaw ?? tenantTaxi.raw;
  if (!phoneRaw) {
    return null;
  }

  const normalized = phoneRaw.replace(/\D/g, '');
  const usesTenantNumber = Boolean(tenantTaxi.raw?.trim());

  return {
    name: packTaxi.name,
    phoneRaw,
    phoneMask: resolvePhoneDisplay(
      normalized,
      usesTenantNumber ? tenantTaxi.mask : packTaxi.phoneMask,
      normalizePhoneDisplayPreset(
        usesTenantNumber ? tenantTaxi.formatPreset : packTaxi.phoneFormatPreset
      )
    ),
    href: `tel:+${normalized}`,
    whatsappEnabled: packTaxi.whatsappEnabled !== false,
  };
}
