import type { RecommendedTaxi } from '@/entities/hostel';
import type { HostelContactLink } from '@/entities/tenant/model/hostel-config';
import { resolvePhoneDisplay } from '@/shared/lib/phoneDisplay';

export interface ResolvedRecommendedTaxi {
  name: string;
  phoneRaw: string;
  phoneMask: string;
  href: string;
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

  return {
    name: packTaxi.name,
    phoneRaw,
    phoneMask: resolvePhoneDisplay(normalized, packTaxi.phoneMask, tenantTaxi.mask),
    href: `tel:+${normalized}`,
  };
}
