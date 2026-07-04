import type { RouteId } from '@/entities/hostel';
import type { AppLocale, LocalizedText } from '@/entities/city-pack/model/types';
import { resolveRouteTipsForGuest } from '@/entities/city-pack/lib/resolveRouteTipsForGuest';
import { MAX_ROUTE_TIPS } from '@/entities/city-pack';

export function mergeArrivalRouteTipsForGuest(input: {
  cityPackTips: string[] | undefined;
  tenantTips: LocalizedText[] | undefined;
  locale: AppLocale;
}): string[] | undefined {
  const fromTenant = resolveRouteTipsForGuest(input.tenantTips, input.locale) ?? [];
  const fromCity = input.cityPackTips ?? [];
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const tip of [...fromCity, ...fromTenant]) {
    const key = tip.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(tip.trim());
    if (merged.length >= MAX_ROUTE_TIPS) {
      break;
    }
  }

  return merged.length > 0 ? merged : undefined;
}

export function readTenantRouteTips(
  byRoute: Partial<Record<RouteId, LocalizedText[]>> | undefined,
  routeId: RouteId
): LocalizedText[] | undefined {
  const tips = byRoute?.[routeId];
  return tips?.length ? tips : undefined;
}
