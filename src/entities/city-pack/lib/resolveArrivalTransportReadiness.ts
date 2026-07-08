import type { CityPackId, RouteId } from '@/entities/hostel';
import { ROUTE_PRESETS } from '@/entities/city-pack/lib/constants';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import type { TenantLocalArrivalPath, TenantSettings } from '@/entities/tenant';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
  resolveCityDefaultWalkLabel,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import { isTenantLocalHub } from '@/entities/city-pack/lib/resolveHubArrivalKind';
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

function hasLocalPathReady(path: TenantLocalArrivalPath | undefined): boolean {
  if (!path) {
    return false;
  }
  if (!hasLocalizedValue(path.primaryText)) {
    return false;
  }
  if (path.mode === 'transit_lite') {
    // Get-off optional; walk after get-off recommended but primary can cover short hops.
    return true;
  }
  return true;
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
  const cityRoutes = resolveAdminCityPackRoutes(input.cityPackId, input.cityPackContent);
  const existingByRoute = input.settings.arrivalWalkToHostelByRoute ?? {};
  const nextByRoute: Partial<Record<RouteId, LocalizedField>> = { ...existingByRoute };

  for (const routeId of enabledRoutes) {
    if (isTenantLocalHub(cityRoutes[routeId])) {
      continue;
    }
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

  const cityRoutes = resolveAdminCityPackRoutes(input.cityPackId, input.cityPackContent);
  const hasGlobalWalk = hasLocalizedValue(input.settings.arrivalWalkToHostel);
  const missingWalkLabels: string[] = [];
  const missingOriginLabels: string[] = [];
  const missingLocalLabels: string[] = [];

  for (const routeId of enabledRoutes) {
    const label = ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId;
    const mapsUrl = input.settings.arrivalWalkMapsUrlByRoute?.[routeId]?.trim();
    if (!mapsUrl) {
      missingOriginLabels.push(label);
    }

    if (isTenantLocalHub(cityRoutes[routeId])) {
      if (!hasLocalPathReady(input.settings.arrivalLocalByRoute?.[routeId])) {
        missingLocalLabels.push(label);
      }
      continue;
    }

    const hasByRoute = hasLocalizedValue(input.settings.arrivalWalkToHostelByRoute?.[routeId]);
    if (!hasGlobalWalk && !hasByRoute) {
      missingWalkLabels.push(label);
    }
  }

  if (
    missingWalkLabels.length === 0 &&
    missingOriginLabels.length === 0 &&
    missingLocalLabels.length === 0
  ) {
    return { complete: true };
  }

  const parts: string[] = [];
  if (missingLocalLabels.length > 0) {
    parts.push(`Add full hostel directions for Local hubs: ${missingLocalLabels.join(', ')}`);
  }
  if (missingWalkLabels.length > 0) {
    parts.push(`Add hostel walk directions for: ${missingWalkLabels.join(', ')}`);
  }
  if (missingOriginLabels.length > 0) {
    parts.push(`Add walking Maps link for: ${missingOriginLabels.join(', ')}`);
  }

  return {
    complete: false,
    detail: parts.join(' '),
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
  const cityRoutes = resolveAdminCityPackRoutes(input.cityPackId, input.cityPackContent);
  if (isTenantLocalHub(cityRoutes[input.routeId])) {
    const local = input.settings?.arrivalLocalByRoute?.[input.routeId];
    if (local && hasLocalizedValue(local.primaryText)) {
      return resolveLocalizedText(local.primaryText, locale);
    }
    return '';
  }

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
