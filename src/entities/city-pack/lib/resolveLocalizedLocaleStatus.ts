import type { CityPackRouteContent } from '../model/types';
import type { LocalizedText } from '../model/types';
import { resolveLocalizedText } from '../model/localized';

export function isLocalizedFilled(value: LocalizedText | undefined, locale: 'en' | 'ru'): boolean {
  return Boolean(resolveLocalizedText(value, locale).trim());
}

export function resolveRouteLocaleStatus(route: CityPackRouteContent): { en: boolean; ru: boolean } {
  const fields: (LocalizedText | undefined)[] = [
    route.locationLabel,
    route.hint,
    route.copy.publicTitle,
    route.copy.publicSummary,
    route.copy.publicPreview,
    route.copy.publicText,
    route.copy.publicGetOffAt,
    route.copy.publicWalkToHostel,
    route.copy.taxiCost,
    route.copy.taxiPickupPoint,
    ...(route.copy.transitScheduleAdvice ?? []),
    ...(route.copy.transitTicketPayment ?? []),
    route.transit.fareLabel,
  ];

  const required = fields.filter((field): field is LocalizedText => field != null);

  return {
    en: required.every((field) => isLocalizedFilled(field, 'en')),
    ru: required.every((field) => isLocalizedFilled(field, 'ru')),
  };
}

export function copyLocalizedEnToRu(value: LocalizedText | undefined): LocalizedText {
  const en = value?.en?.trim() ?? '';
  const ru = value?.ru?.trim();

  if (!en) {
    return value ?? { en: '' };
  }

  return {
    en,
    ru: ru || en,
  };
}

export function copyRouteEnToRu(route: CityPackRouteContent): CityPackRouteContent {
  const copy = route.copy;

  return {
    ...route,
    locationLabel: copyLocalizedEnToRu(route.locationLabel),
    hint: route.hint ? copyLocalizedEnToRu(route.hint) : route.hint,
    copy: {
      publicTitle: copyLocalizedEnToRu(copy.publicTitle),
      publicSummary: copyLocalizedEnToRu(copy.publicSummary),
      publicPreview: copyLocalizedEnToRu(copy.publicPreview),
      publicText: copyLocalizedEnToRu(copy.publicText),
      publicGetOffAt: copyLocalizedEnToRu(copy.publicGetOffAt),
      publicWalkToHostel: copyLocalizedEnToRu(copy.publicWalkToHostel),
      transitScheduleAdvice: copy.transitScheduleAdvice?.map((line) => copyLocalizedEnToRu(line)),
      transitTicketPayment: copy.transitTicketPayment?.map((line) => copyLocalizedEnToRu(line)),
      taxiCost: copyLocalizedEnToRu(copy.taxiCost),
      taxiPickupPoint: copyLocalizedEnToRu(copy.taxiPickupPoint),
      taxiTips: copy.taxiTips?.map((tip) => copyLocalizedEnToRu(tip)),
    },
    transit: {
      ...route.transit,
      fareLabel: route.transit.fareLabel
        ? copyLocalizedEnToRu(route.transit.fareLabel)
        : route.transit.fareLabel,
    },
    tips: route.tips?.map((tip) => copyLocalizedEnToRu(tip)),
  };
}
