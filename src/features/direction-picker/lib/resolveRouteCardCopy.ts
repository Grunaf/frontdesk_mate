import type { AppLocale } from '@/entities/city-pack/model/types';
import { isTenantLocalRoute, type RouteConfig } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import { resolveRouteCopyField } from './resolveRouteCopy';
import { resolveTenantLocalArrivalForGuest } from './resolveTenantLocalArrival';

type RoutesTranslator = (key: string, values?: Record<string, string>) => string;

/** Guest card title / summary — prefer tenant Local copy when hub is hostel-owned. */
export function resolveRouteCardTitle(
  route: RouteConfig,
  translate: RoutesTranslator,
  settings: TenantSettings,
  locale: AppLocale
): string {
  if (isTenantLocalRoute(route)) {
    const local = resolveTenantLocalArrivalForGuest({
      settings,
      routeId: route.id,
      locale,
    });
    if (local?.title) {
      return local.title;
    }
  }
  return resolveRouteCopyField(route, 'publicTitle', translate);
}

export function resolveRouteCardSummary(
  route: RouteConfig,
  translate: RoutesTranslator,
  settings: TenantSettings,
  locale: AppLocale
): string {
  if (isTenantLocalRoute(route)) {
    const local = resolveTenantLocalArrivalForGuest({
      settings,
      routeId: route.id,
      locale,
    });
    if (local?.summary) {
      return local.summary;
    }
  }
  return resolveRouteCopyField(route, 'publicSummary', translate);
}
