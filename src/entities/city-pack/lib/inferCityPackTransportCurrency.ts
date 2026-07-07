import type { CityPackContent, CityPackTransportCurrency, CityPackTransportCurrencyMode } from '../model/types';

const DUAL_CURRENCY_PACK_IDS = new Set(['sarajevo']);

export function inferCityPackTransportCurrencyMode(
  packId: string,
  content?: CityPackContent
): CityPackTransportCurrencyMode {
  const stored = content?.transportCurrency?.mode;
  if (stored === 'eur_only' || stored === 'local_and_eur') {
    return stored;
  }

  if (DUAL_CURRENCY_PACK_IDS.has(packId)) {
    return 'local_and_eur';
  }

  return 'eur_only';
}

export function inferCityPackTransportCurrency(
  packId: string,
  content?: CityPackContent
): CityPackTransportCurrency {
  const mode = inferCityPackTransportCurrencyMode(packId, content);

  if (mode === 'local_and_eur') {
    return {
      mode,
      localCurrencyCode: 'BAM',
      localCurrencySymbol: 'KM',
    };
  }

  return { mode };
}

export function normalizeCityPackTransportCurrency(
  packId: string,
  raw: CityPackContent['transportCurrency'] | undefined
): CityPackTransportCurrency {
  return inferCityPackTransportCurrency(packId, { transportCurrency: raw });
}
