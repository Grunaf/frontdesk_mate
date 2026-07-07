import type { RouteConfig } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import type { AppLocale } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import { resolveRouteCopyField } from './resolveRouteCopy';

type RoutesTranslator = (key: string, values?: Record<string, string>) => string;

export function resolveWalkToHostelText(params: {
  route: RouteConfig;
  routes: RoutesTranslator;
  settings?: TenantSettings;
  address?: string;
  locale?: AppLocale;
}): string {
  const { route, routes, settings, address, locale = 'en' } = params;
  const byRoute = settings?.arrivalWalkToHostelByRoute?.[route.id];

  if (byRoute) {
    return resolveLocalizedText(byRoute, locale);
  }

  if (settings?.arrivalWalkToHostel) {
    return resolveLocalizedText(settings.arrivalWalkToHostel, locale);
  }

  return resolveRouteCopyField(route, 'publicWalkToHostel', routes, {
    address: address ?? '',
  });
}
