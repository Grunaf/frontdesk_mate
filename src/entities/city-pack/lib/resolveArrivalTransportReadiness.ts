import type { CityPackId, RouteId } from '@/entities/hostel';
import { ROUTE_PRESETS } from '@/entities/city-pack/lib/constants';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import type { TenantSettings } from '@/entities/tenant';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveCityDefaultWalkLabel,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import { readCodeI18nRouteWalkTemplate } from './buildCityPackRouteContentFromCode';

function hasLocalizedValue(value: LocalizedField | undefined): boolean {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    return Boolean(value.trim());
  }

  return Boolean(value.en?.trim() || value.ru?.trim());
}

/** Static city i18n starter for tenant pre-fill — not from city pack DB routes. */
export function readCityRouteWalkTemplate(
  packId: string,
  routeId: RouteId
): ReturnType<typeof readCodeI18nRouteWalkTemplate> {
  return readCodeI18nRouteWalkTemplate(packId, routeId);
}

export function buildTenantWalkSeedFromCityTemplates(input: {
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
  settings: TenantSettings;
}): Pick<TenantSettings, 'arrivalWalkToHostel' | 'arrivalWalkToHostelByRoute'> {
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(input.cityPackId, input.cityPackContent);
  const existingByRoute = input.settings.arrivalWalkToHostelByRoute ?? {};
  const nextByRoute: Partial<Record<RouteId, LocalizedField>> = { ...existingByRoute };

  for (const routeId of enabledRoutes) {
    if (hasLocalizedValue(existingByRoute[routeId])) {
      continue;
    }

    const template = readCodeI18nRouteWalkTemplate(input.cityPackId, routeId);
    if (template) {
      nextByRoute[routeId] = template;
    }
  }

  return {
    arrivalWalkToHostelByRoute: nextByRoute,
  };
}

export function resolveArrivalWalkReadiness(input: {
  cityPackId: CityPackId;
  settings: TenantSettings;
  cityPackContent?: CityPackContent;
}): { complete: boolean; detail?: string } {
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(input.cityPackId, input.cityPackContent);
  if (enabledRoutes.length === 0) {
    return {
      complete: false,
      detail: 'City pack has no arrival routes enabled.',
    };
  }

  const hasGlobalWalk = hasLocalizedValue(input.settings.arrivalWalkToHostel);
  const missingLabels: string[] = [];

  for (const routeId of enabledRoutes) {
    const hasByRoute = hasLocalizedValue(input.settings.arrivalWalkToHostelByRoute?.[routeId]);

    if (!hasGlobalWalk && !hasByRoute) {
      const label = ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId;
      missingLabels.push(label);
    }
  }

  if (missingLabels.length === 0) {
    return { complete: true };
  }

  return {
    complete: false,
    detail: `Add hostel walk directions for: ${missingLabels.join(', ')}`,
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

  const template = resolveCityDefaultWalkLabel(input.cityPackId, input.routeId, locale) ?? '';
  const address = input.address ?? '123 Example Street';

  return template.replace(/\{address\}/g, address);
}
