import { describe, expect, it } from 'vitest';
import type { CityPackContent } from '../model/types';
import { validateCityPackNeedNowPlaceIds } from './validateOwnerCityPackPlaceSelection';

const content: CityPackContent = {
  places: [
    { id: 'atm-1', name: 'ATM', category: 'essential' },
    { id: 'bar-1', name: 'Bar', category: 'bars' },
    { id: 'pharm-1', name: 'Pharmacy', category: 'cafes' },
  ],
  routes: {},
};

describe('validateCityPackNeedNowPlaceIds', () => {
  it('accepts empty selection', () => {
    expect(validateCityPackNeedNowPlaceIds(content, [])).toEqual({ ok: true });
  });

  it('accepts eligible ids from pack', () => {
    expect(validateCityPackNeedNowPlaceIds(content, ['atm-1', 'pharm-1'])).toEqual({ ok: true });
  });

  it('rejects ineligible category even if id exists in pack', () => {
    expect(validateCityPackNeedNowPlaceIds(content, ['bar-1'])).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it('rejects unknown ids', () => {
    expect(validateCityPackNeedNowPlaceIds(content, ['fake-id'])).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it('rejects when pack content is missing', () => {
    expect(validateCityPackNeedNowPlaceIds(undefined, ['atm-1'])).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });
});
