import type { RouteConfig } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';

type RoutesTranslator = (key: string, values?: Record<string, string>) => string;

export function resolveWalkToHostelText(params: {
  route: RouteConfig;
  routes: RoutesTranslator;
  settings?: TenantSettings;
  address?: string;
}): string {
  const { route, routes, settings, address } = params;
  const byRoute = settings?.arrivalWalkToHostelByRoute?.[route.id];

  if (byRoute) {
    return byRoute;
  }

  if (settings?.arrivalWalkToHostel) {
    return settings.arrivalWalkToHostel;
  }

  return routes(route.translationKeys.publicWalkToHostel, {
    address: address ?? '',
  });
}
