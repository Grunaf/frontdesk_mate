import { describe, expect, it } from 'vitest';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import {
  autofillCityPackRouteLocationLabel,
  createBlankCityPackRouteContent,
  ensureCityPackRouteContent,
  ensureEnabledCityPackRoutes,
} from './resolveAdminCityPackTransport';

describe('ensureCityPackRouteContent', () => {
  it('keeps an existing route body', () => {
    const current = createBlankCityPackRouteContent('airport');
    current.copy.publicTitle = { en: 'Custom' };

    expect(ensureCityPackRouteContent('demo', 'airport', current).copy.publicTitle.en).toBe('Custom');
  });

  it('uses per-route code seed when available', () => {
    const seeded = buildCityPackRoutesFromCode('sarajevo').airport!;
    const ensured = ensureCityPackRouteContent('sarajevo', 'airport');

    expect(ensured.copy.publicTitle.en).toBe(seeded.copy.publicTitle.en);
  });

  it('falls back to a blank shell for packs without seed', () => {
    const blank = ensureCityPackRouteContent('demo-city', 'bus_central');

    expect(blank.category).toBe('bus');
    expect(blank.copy.publicTitle).toEqual({ en: '' });
    expect(blank.locationLabel.en).toBe('Bus station');
  });

  it('autofills location label from preset when EN is empty', () => {
    const route = createBlankCityPackRouteContent('train_station');
    const filled = autofillCityPackRouteLocationLabel('demo-city', 'train_station', route);

    expect(filled.locationLabel.en).toBe('Train station');
  });

  it('autofills location label from code seed when available', () => {
    const route = createBlankCityPackRouteContent('airport');
    const filled = autofillCityPackRouteLocationLabel('sarajevo', 'airport', route);

    expect(filled.locationLabel.en).toBe(
      buildCityPackRoutesFromCode('sarajevo').airport!.locationLabel.en
    );
  });

  it('fills missing enabled routes without replacing existing ones', () => {
    const airport = createBlankCityPackRouteContent('airport');
    airport.copy.publicTitle = { en: 'Kept' };

    const next = ensureEnabledCityPackRoutes('demo-city', ['airport', 'train_station'], {
      airport,
    });

    expect(next.airport?.copy.publicTitle.en).toBe('Kept');
    expect(next.train_station?.category).toBe('train');
  });
});
