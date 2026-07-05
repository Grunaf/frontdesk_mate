import type { CityPackRequestKind } from '@/entities/city-pack-request';

const CITY_PACK_REQUEST_KINDS: CityPackRequestKind[] = ['new_city', 'pack_not_ready', 'other'];

const MAX_CITY_NAME = 200;
const MAX_COUNTRY_OR_REGION = 200;
const MAX_MESSAGE = 2000;

export type NormalizeCityPackRequestInputResult =
  | { ok: true; data: { cityName: string; countryOrRegion: string | null; requestKind: CityPackRequestKind; message: string | null } }
  | { ok: false; code: 'validation' };

export function normalizeCityPackRequestInput(raw: {
  cityName: string;
  countryOrRegion: string;
  requestKind: string;
  message: string;
}): NormalizeCityPackRequestInputResult {
  const cityName = raw.cityName.trim();
  if (!cityName || cityName.length > MAX_CITY_NAME) {
    return { ok: false, code: 'validation' };
  }

  const countryTrimmed = raw.countryOrRegion.trim();
  const countryOrRegion =
    countryTrimmed.length === 0
      ? null
      : countryTrimmed.length > MAX_COUNTRY_OR_REGION
        ? null
        : countryTrimmed;
  if (raw.countryOrRegion.trim().length > 0 && countryOrRegion === null) {
    return { ok: false, code: 'validation' };
  }

  const requestKind = raw.requestKind.trim() as CityPackRequestKind;
  if (!CITY_PACK_REQUEST_KINDS.includes(requestKind)) {
    return { ok: false, code: 'validation' };
  }

  const messageTrimmed = raw.message.trim();
  const message =
    messageTrimmed.length === 0 ? null : messageTrimmed.length > MAX_MESSAGE ? null : messageTrimmed;
  if (raw.message.trim().length > 0 && message === null) {
    return { ok: false, code: 'validation' };
  }

  return {
    ok: true,
    data: { cityName, countryOrRegion, requestKind, message },
  };
}
