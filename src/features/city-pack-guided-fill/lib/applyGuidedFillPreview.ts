import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { autofillCityPackRouteLocationLabel } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
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

export function applyGuidedFillPreview(
  packId: string,
  routeId: RouteId,
  route: CityPackRouteContent,
  preview: GuidedRouteFillPreview
): CityPackRouteContent {
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

  for (const [key, value] of Object.entries(preview.copy) as [keyof typeof preview.copy, string][]) {
    if (!value?.trim()) {
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

  return autofillCityPackRouteLocationLabel(packId, routeId, next);
}
