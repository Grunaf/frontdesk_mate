import type { RouteConfig } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import { resolveCityDefaultWalkToHostel } from '@/entities/city-pack/lib/buildRouteGuestCopy';
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

  if (route.guestCopy?.publicWalkToHostel) {
    return resolveCityDefaultWalkToHostel(route, locale, address ?? '');
  }

  return resolveRouteCopyField(route, 'publicWalkToHostel', routes, {
    address: address ?? '',
  });
}
