import type { RouteId } from '@/entities/hostel';
import { MAX_ROUTE_TIPS } from '@/entities/city-pack';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import { toLocalizedText, type LocalizedText } from '@/entities/city-pack/model/localized';
import type { TenantLocalArrivalPath, TenantSettings } from '@/entities/tenant';

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

export function parseArrivalRouteTipsByRouteJson(
  raw: string
): TenantSettings['arrivalRouteTipsByRoute'] {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<RouteId, LocalizedText[]>>;
    const next: Partial<Record<RouteId, LocalizedText[]>> = {};

    for (const [routeId, tips] of Object.entries(parsed) as [RouteId, LocalizedText[] | undefined][]) {
      if (!Array.isArray(tips)) {
        continue;
      }
      const normalized = tips
        .map((tip) => toLocalizedText(tip))
        .filter((tip): tip is LocalizedText => Boolean(tip?.en?.trim()))
        .slice(0, MAX_ROUTE_TIPS);
      if (normalized.length > 0) {
        next[routeId] = normalized;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  } catch {
    return undefined;
  }
}

export function serializeArrivalRouteTipsByRouteJson(
  value: TenantSettings['arrivalRouteTipsByRoute']
): string {
  return JSON.stringify(value ?? {});
}

export function parseArrivalWalkMapsUrlByRouteJson(
  raw: string
): TenantSettings['arrivalWalkMapsUrlByRoute'] {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<RouteId, string>>;
    const next: Partial<Record<RouteId, string>> = {};

    for (const [routeId, value] of Object.entries(parsed) as [RouteId, string | undefined][]) {
      const trimmed = value?.trim();
      if (trimmed) {
        next[routeId] = trimmed;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  } catch {
    return undefined;
  }
}

export function serializeArrivalWalkMapsUrlByRouteJson(
  value: TenantSettings['arrivalWalkMapsUrlByRoute']
): string {
  return JSON.stringify(value ?? {});
}

export function parseArrivalGetOffAtByRouteJson(
  raw: string
): TenantSettings['arrivalGetOffAtByRoute'] {
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

export function serializeArrivalGetOffAtByRouteJson(
  value: TenantSettings['arrivalGetOffAtByRoute']
): string {
  return JSON.stringify(value ?? {});
}

function softLocalField(value: LocalizedField | undefined): LocalizedField | undefined {
  return toLocalizedText(typeof value === 'string' ? { en: value } : value);
}

function normalizeTenantLocalArrivalPath(raw: unknown): TenantLocalArrivalPath | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const value = raw as Record<string, unknown>;
  const mode = value.mode === 'transit_lite' ? 'transit_lite' : value.mode === 'walk' ? 'walk' : null;
  if (!mode) {
    return undefined;
  }

  return {
    mode,
    title: softLocalField(value.title as LocalizedField | undefined),
    summary: softLocalField(value.summary as LocalizedField | undefined),
    primaryText: softLocalField(value.primaryText as LocalizedField | undefined) ?? { en: '' },
    getOffAt: softLocalField(value.getOffAt as LocalizedField | undefined),
    walkToHostel: softLocalField(value.walkToHostel as LocalizedField | undefined),
  };
}

export function parseArrivalLocalByRouteJson(
  raw: string
): TenantSettings['arrivalLocalByRoute'] {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<RouteId, unknown>>;
    const next: NonNullable<TenantSettings['arrivalLocalByRoute']> = {};

    for (const [routeId, value] of Object.entries(parsed) as [RouteId, unknown][]) {
      const normalized = normalizeTenantLocalArrivalPath(value);
      if (normalized) {
        next[routeId] = normalized;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  } catch {
    return undefined;
  }
}

export function serializeArrivalLocalByRouteJson(
  value: TenantSettings['arrivalLocalByRoute']
): string {
  return JSON.stringify(value ?? {});
}
