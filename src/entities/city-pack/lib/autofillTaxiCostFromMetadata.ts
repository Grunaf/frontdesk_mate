import type { CityPackRouteContent, CityPackTransportCurrencyMode } from '../model/types';
import { isLocalizedFilled } from './resolveLocalizedLocaleStatus';

const EUR_ONLY_TEMPLATE_EN =
  'A taxi for this leg is usually {minEUR}–{maxEUR} € — agree the fare before you leave.';

const DUAL_TEMPLATE_EN =
  'A taxi for this leg is usually {minKM}–{maxKM} KM ({minEUR}–{maxEUR} €) — agree the fare before you leave.';

export function autofillTaxiCostFromMetadata(
  route: CityPackRouteContent,
  currencyMode: CityPackTransportCurrencyMode
): CityPackRouteContent {
  if (isLocalizedFilled(route.copy.taxiCost, 'en')) {
    return route;
  }

  const { priceEUR, priceKM } = route.taxi;
  if (priceEUR.min <= 0 && priceEUR.max <= 0) {
    return route;
  }

  const template = currencyMode === 'local_and_eur' ? DUAL_TEMPLATE_EN : EUR_ONLY_TEMPLATE_EN;

  return {
    ...route,
    copy: {
      ...route.copy,
      taxiCost: {
        en: template,
        ru: route.copy.taxiCost.ru?.trim() ? route.copy.taxiCost.ru : undefined,
      },
    },
  };
}
