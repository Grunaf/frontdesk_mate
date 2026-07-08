import type { RouteId } from '@/entities/hostel';
import type { RouteConfig } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import type { AppLocale, LocalizedField } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import { resolveRouteCopyField } from './resolveRouteCopy';

type RoutesTranslator = (key: string, values?: Record<string, string>) => string;

function readOverrideEn(value: LocalizedField | undefined): string {
  if (!value) {
    return '';
  }
  return resolveLocalizedText(value, 'en').trim();
}

/** EN label for Maps helper / AI prompts (override || city). */
export function resolveGetOffAtEn(params: {
  routeId: RouteId;
  cityGetOffEn?: string;
  arrivalGetOffAtByRoute?: TenantSettings['arrivalGetOffAtByRoute'];
}): string {
  const override = readOverrideEn(params.arrivalGetOffAtByRoute?.[params.routeId]);
  if (override) {
    return override;
  }
  return params.cityGetOffEn?.trim() ?? '';
}

/** Guest-visible get-off for a locale (override || city route copy). */
export function resolveGetOffAtForGuest(params: {
  route: RouteConfig;
  routes: RoutesTranslator;
  settings?: TenantSettings;
  locale?: AppLocale;
}): string {
  const { route, routes, settings, locale = 'en' } = params;
  const override = settings?.arrivalGetOffAtByRoute?.[route.id];
  if (override) {
    const text = resolveLocalizedText(override, locale).trim();
    if (text) {
      return text;
    }
  }
  return resolveRouteCopyField(route, 'publicGetOffAt', routes).trim();
}
