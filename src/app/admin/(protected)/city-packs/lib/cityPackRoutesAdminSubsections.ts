import type { RouteId } from '@/entities/hostel';
import type { CityPackContentWarnings, CityPackRouteContent } from '@/entities/city-pack/model/types';
import { formatRouteGateStatus } from '@/entities/city-pack';
import { isLocalizedFilled } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import type { ModuleStatus } from '@/entities/tenant';

export const CITY_PACK_ROUTE_MODULE_PREFIX = 'route:' as const;

export function encodeCityPackRouteModuleId(routeId: RouteId): string {
  return `${CITY_PACK_ROUTE_MODULE_PREFIX}${routeId}`;
}

export function decodeCityPackRouteModuleId(moduleId: string): RouteId | null {
  if (!moduleId.startsWith(CITY_PACK_ROUTE_MODULE_PREFIX)) {
    return null;
  }
  return moduleId.slice(CITY_PACK_ROUTE_MODULE_PREFIX.length) as RouteId;
}

export function isCityPackRouteModuleId(moduleId: string): boolean {
  return moduleId.startsWith(CITY_PACK_ROUTE_MODULE_PREFIX);
}

export const CITY_PACK_ROUTE_MODULE_DESCRIPTION =
  'Guest arrival copy, transit options, and taxi backup for this hub.';

export const CITY_PACK_ROUTES_MODULE_IDS = ['taxi-service', 'hub-warnings'] as const;

export type CityPackRoutesModuleId = (typeof CITY_PACK_ROUTES_MODULE_IDS)[number];

export interface CityPackRoutesModuleDefinition {
  id: CityPackRoutesModuleId;
  label: string;
  description: string;
}

export const CITY_PACK_ROUTES_ADMIN_MODULES: CityPackRoutesModuleDefinition[] = [
  {
    id: 'taxi-service',
    label: 'Taxi service',
    description: 'Recommended taxi for guests and city-wide taxi rules.',
  },
  {
    id: 'hub-warnings',
    label: 'Bus hub clarification',
    description: 'Optional copy when guests must pick between bus stations.',
  },
];

export type CityPackRoutesModuleInput = {
  taxiName: string;
  taxiPhone: string;
  warnings: CityPackContentWarnings;
};

function hasTaxiWarnings(warnings: CityPackContentWarnings): boolean {
  return (
    isLocalizedFilled(warnings.taxiCityRules, 'en') ||
    isLocalizedFilled(warnings.taxiCityRules, 'ru') ||
    isLocalizedFilled(warnings.taxiStand, 'en') ||
    isLocalizedFilled(warnings.taxiStand, 'ru') ||
    isLocalizedFilled(warnings.taxiMeter, 'en') ||
    isLocalizedFilled(warnings.taxiMeter, 'ru')
  );
}

export function getCityPackRoutesModuleHint(
  moduleId: CityPackRoutesModuleId,
  input: CityPackRoutesModuleInput
): string | undefined {
  switch (moduleId) {
    case 'taxi-service': {
      const name = input.taxiName.trim();
      const phone = input.taxiPhone.trim();
      if (name && phone) {
        return `${name} · phone set`;
      }
      if (name) {
        return name;
      }
      if (phone) {
        return 'Phone set, no name';
      }
      if (hasTaxiWarnings(input.warnings)) {
        return 'Warnings set';
      }
      return 'Optional';
    }
    case 'hub-warnings':
      return isLocalizedFilled(input.warnings.busClarification, 'en') ||
        isLocalizedFilled(input.warnings.busClarification, 'ru')
        ? 'Clarification set'
        : 'Optional';
    default:
      return undefined;
  }
}

export function getCityPackRoutesModuleStatus(
  moduleId: CityPackRoutesModuleId,
  input: CityPackRoutesModuleInput
): ModuleStatus | 'n/a' {
  switch (moduleId) {
    case 'taxi-service':
      if (
        input.taxiName.trim() ||
        input.taxiPhone.trim() ||
        hasTaxiWarnings(input.warnings)
      ) {
        return 'ready';
      }
      return 'n/a';
    case 'hub-warnings':
      return isLocalizedFilled(input.warnings.busClarification, 'en') ||
        isLocalizedFilled(input.warnings.busClarification, 'ru')
        ? 'ready'
        : 'n/a';
    default:
      return 'n/a';
  }
}

export function getCityPackRouteModuleHint(
  route: CityPackRouteContent | undefined,
  options?: { offered?: boolean }
): string {
  if (options?.offered === false) {
    return 'Not offered — turn on, then open the row to edit';
  }
  const gate = formatRouteGateStatus(route);
  if (gate.ready) {
    return 'Ready for guests (EN)';
  }
  return gate.shortLabel;
}

export function getCityPackRouteModuleStatus(
  route: CityPackRouteContent | undefined,
  options?: { offered?: boolean }
): ModuleStatus {
  if (options?.offered === false) {
    return 'hidden';
  }
  return formatRouteGateStatus(route).ready ? 'ready' : 'preview';
}
