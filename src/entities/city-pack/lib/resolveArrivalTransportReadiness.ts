import type { CityPackId, RouteId } from '@/entities/hostel';
import { ROUTE_PRESETS } from '@/entities/city-pack/lib/constants';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import type { TenantSettings } from '@/entities/tenant';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
  resolveCityDefaultWalkLabel,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';

function hasLocalizedValue(value: LocalizedField | undefined): boolean {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    return Boolean(value.trim());
  }

  return Boolean(value.en?.trim() || value.ru?.trim());
}

export function resolveArrivalWalkReadiness(input: {
  cityPackId: CityPackId;
  settings: TenantSettings;
  cityPackContent?: CityPackContent;
}): { complete: boolean; detail?: string } {
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(input.cityPackId, input.cityPackContent);
  if (enabledRoutes.length === 0) {
    return { complete: true };
  }

  const cityRoutes = resolveAdminCityPackRoutes(input.cityPackId, input.cityPackContent);
  const hasGlobalWalk = hasLocalizedValue(input.settings.arrivalWalkToHostel);
  const missingLabels: string[] = [];

  for (const routeId of enabledRoutes) {
    const hasByRoute = hasLocalizedValue(input.settings.arrivalWalkToHostelByRoute?.[routeId]);
    const hasCityDefault = Boolean(resolveCityDefaultWalkLabel(cityRoutes, routeId));

    if (!hasGlobalWalk && !hasByRoute && !hasCityDefault) {
      const label = ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId;
      missingLabels.push(label);
    }
  }

  if (missingLabels.length === 0) {
    return { complete: true };
  }

  return {
    complete: false,
    detail: `Add city or hostel walk text for: ${missingLabels.join(', ')}`,
  };
}

export function resolveArrivalWalkPreviewText(input: {
  routeId: RouteId;
  settings?: TenantSettings;
  cityPackContent?: CityPackContent;
  cityPackId: CityPackId;
  locale?: 'en' | 'ru';
  address?: string;
}): string {
  const locale = input.locale ?? 'en';
  const byRoute = input.settings?.arrivalWalkToHostelByRoute?.[input.routeId];
  if (hasLocalizedValue(byRoute)) {
    return resolveLocalizedText(byRoute!, locale);
  }

  if (hasLocalizedValue(input.settings?.arrivalWalkToHostel)) {
    return resolveLocalizedText(input.settings!.arrivalWalkToHostel!, locale);
  }

  const cityRoutes = resolveAdminCityPackRoutes(input.cityPackId, input.cityPackContent);
  const template = resolveCityDefaultWalkLabel(cityRoutes, input.routeId, locale) ?? '';
  const address = input.address ?? '123 Example Street';

  return template.replace(/\{address\}/g, address);
}
