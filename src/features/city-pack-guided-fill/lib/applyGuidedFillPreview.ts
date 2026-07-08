import type { RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '@/entities/city-pack/model/types';
import {
  autofillCityPackRouteLocationLabel,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import { inferCityPackTransportCurrencyMode } from '@/entities/city-pack/lib/inferCityPackTransportCurrency';
import { patchRouteMetadataFromImport } from '@/entities/city-pack/lib/patchRouteMetadataFromImport';
import type { GuidedRouteFillPreview } from '../model/types';

function toLocalizedEn(value: string | undefined, previous: { en: string; ru?: string }): {
  en: string;
  ru?: string;
} {
  if (!value?.trim()) {
    return previous;
  }
  return { en: value.trim(), ru: previous.ru?.trim() ? previous.ru : undefined };
}

function toLocalizedEnLines(
  values: string[] | undefined,
  previous: { en: string; ru?: string }[] | undefined
): { en: string; ru?: string }[] | undefined {
  if (!values?.length) {
    return previous;
  }

  const lines = values
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((line, index) => toLocalizedEn(line, previous?.[index] ?? { en: '' }));

  return lines.length ? lines : previous;
}

export function applyGuidedFillPreview(
  packId: string,
  routeId: RouteId,
  route: CityPackRouteContent,
  preview: GuidedRouteFillPreview,
  content?: CityPackContent
): CityPackRouteContent {
  const currencyMode = inferCityPackTransportCurrencyMode(packId, content);
  const routeMode = preview.routeMode ?? route.routeMode ?? 'transit';

  let next: CityPackRouteContent = {
    ...route,
    routeMode,
    copy: { ...route.copy },
    tips: route.tips ? [...route.tips] : undefined,
  };

  if (preview.locationLabelEn?.trim()) {
    next = {
      ...next,
      locationLabel: {
        en: preview.locationLabelEn.trim(),
        ru: next.locationLabel.ru?.trim() ? next.locationLabel.ru : undefined,
      },
    };
  }

  for (const [key, value] of Object.entries(preview.copy) as [
    keyof typeof preview.copy,
    string | string[],
  ][]) {
    if (key === 'publicWalkToHostel') {
      continue;
    }

    if (key === 'transitScheduleAdvice' || key === 'transitTicketPayment') {
      next.copy[key] = toLocalizedEnLines(value as string[] | undefined, next.copy[key]);
      continue;
    }

    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }
    next.copy[key] = toLocalizedEn(value, next.copy[key]);
  }

  if (preview.tips?.length) {
    next.tips = preview.tips.map((tip, index) => {
      const existing = next.tips?.[index] ?? { en: '' };
      return toLocalizedEn(tip, existing);
    });
  }

  next = autofillCityPackRouteLocationLabel(packId, routeId, next);
  next = patchRouteMetadataFromImport(next, preview.metadata, currencyMode);
  return next;
}
