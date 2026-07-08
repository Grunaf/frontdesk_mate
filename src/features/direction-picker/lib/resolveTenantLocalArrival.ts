import type { AppLocale, LocalizedField } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import type { RouteId } from '@/entities/hostel';
import type { TenantLocalArrivalPath, TenantSettings } from '@/entities/tenant';

function readLocalized(value: LocalizedField | undefined, locale: AppLocale): string {
  if (!value) {
    return '';
  }
  return resolveLocalizedText(value, locale).trim();
}

export type ResolvedTenantLocalArrival = {
  mode: TenantLocalArrivalPath['mode'];
  title: string;
  summary: string;
  primaryText: string;
  getOffAt: string;
  walkToHostel: string;
};

export function resolveTenantLocalArrivalForGuest(input: {
  settings: TenantSettings;
  routeId: RouteId;
  locale: AppLocale;
}): ResolvedTenantLocalArrival | undefined {
  const path = input.settings.arrivalLocalByRoute?.[input.routeId];
  if (!path) {
    return undefined;
  }

  return {
    mode: path.mode,
    title: readLocalized(path.title, input.locale),
    summary: readLocalized(path.summary, input.locale),
    primaryText: readLocalized(path.primaryText, input.locale),
    getOffAt: readLocalized(path.getOffAt, input.locale),
    walkToHostel: readLocalized(path.walkToHostel, input.locale),
  };
}
