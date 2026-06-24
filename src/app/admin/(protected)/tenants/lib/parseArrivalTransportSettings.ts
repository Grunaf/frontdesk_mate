import type { RouteId } from '@/entities/hostel';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import { toLocalizedText, type LocalizedText } from '@/entities/city-pack/model/localized';
import type { TenantSettings } from '@/entities/tenant';

export function parseArrivalWalkToHostelJson(raw: string): LocalizedField | undefined {
  try {
    const parsed = JSON.parse(raw) as LocalizedText;
    return toLocalizedText(parsed);
  } catch {
    return undefined;
  }
}

export function parseArrivalWalkByRouteJson(
  raw: string
): TenantSettings['arrivalWalkToHostelByRoute'] {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<RouteId, LocalizedText>>;
    const next: Partial<Record<RouteId, LocalizedField>> = {};

    for (const [routeId, value] of Object.entries(parsed) as [RouteId, LocalizedText | undefined][]) {
      const localized = toLocalizedText(value);
      if (localized) {
        next[routeId] = localized;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  } catch {
    return undefined;
  }
}

export function serializeArrivalWalkToHostelJson(value: LocalizedField | undefined): string {
  if (!value) {
    return JSON.stringify({ en: '' });
  }

  if (typeof value === 'string') {
    return JSON.stringify({ en: value });
  }

  return JSON.stringify(value);
}

export function serializeArrivalWalkByRouteJson(
  value: TenantSettings['arrivalWalkToHostelByRoute']
): string {
  return JSON.stringify(value ?? {});
}
