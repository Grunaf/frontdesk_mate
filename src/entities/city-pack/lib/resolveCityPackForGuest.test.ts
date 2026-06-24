import { describe, expect, it } from 'vitest';
import { getCityPack } from '@/entities/hostel';
import { buildCityPackRouteSeedContent, buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import { resolveCityPackForGuest } from './resolveCityPackForGuest';

describe('buildCityPackRoutesFromCode', () => {
  it('builds sarajevo routes from i18n + code metadata', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');

    expect(routes.airport?.copy.publicTitle.en).toContain('Trolleybus');
    expect(routes.airport?.taxi.priceKM).toEqual({ min: 15, max: 20 });
    expect(routes.bus_central?.hint?.en).toContain('EU routes');
  });

  it('builds kotor walk-only bus route', () => {
    const routes = buildCityPackRoutesFromCode('kotor');

    expect(routes.bus_central?.routeMode).toBe('walk_only');
    expect(routes.airport?.transit.fareLabel?.en).toContain('€3');
  });
});

describe('resolveCityPackForGuest', () => {
  it('merges DB recommended taxi over code default', () => {
    const pack = resolveCityPackForGuest({
      packId: 'sarajevo',
      locale: 'en',
      packStatus: 'ready',
      enabledRoutes: ['airport'],
      content: {
        recommendedTaxi: { name: 'Zuti Taxi', phoneRaw: '38761123456' },
      },
    });

    expect(pack.recommendedTaxi).toEqual({
      name: 'Zuti Taxi',
      phoneRaw: '38761123456',
      phoneMask: undefined,
    });
  });

  it('attaches guestCopy from code seed when DB routes are absent', () => {
    const pack = resolveCityPackForGuest({
      packId: 'sarajevo',
      locale: 'en',
      packStatus: 'ready',
      enabledRoutes: ['airport'],
      content: { enabledRoutes: ['airport'] },
    });

    expect(pack.routes.airport?.guestCopy?.publicTitle).toContain('Trolleybus');
    expect(pack.guestWarnings?.taxiStandWarning).toContain('official stands');
  });

  it('prefers DB route copy over code/i18n', () => {
    const pack = resolveCityPackForGuest({
      packId: 'sarajevo',
      locale: 'en',
      packStatus: 'ready',
      enabledRoutes: ['airport'],
      content: {
        routes: {
          airport: {
            ...buildCityPackRoutesFromCode('sarajevo').airport!,
            copy: {
              ...buildCityPackRoutesFromCode('sarajevo').airport!.copy,
              publicTitle: { en: 'Custom airport title' },
            },
          },
        },
      },
    });

    expect(pack.routes.airport?.guestCopy?.publicTitle).toBe('Custom airport title');
  });

  it('returns empty routes when pack is not ready', () => {
    const pack = resolveCityPackForGuest({
      packId: 'kotor',
      locale: 'en',
      packStatus: 'draft',
      enabledRoutes: ['airport'],
      content: { enabledRoutes: ['airport'] },
    });

    expect(pack.routes).toEqual({});
    expect(pack.categories).toEqual([]);
  });

  it('keeps code categories filtered by enabled routes', () => {
    const base = getCityPack('sarajevo');
    const pack = resolveCityPackForGuest({
      packId: 'sarajevo',
      locale: 'en',
      packStatus: 'ready',
      enabledRoutes: ['airport', 'bus_central'],
      content: { enabledRoutes: ['airport', 'bus_central'] },
    });

    expect(Object.keys(pack.routes).sort()).toEqual(['airport', 'bus_central']);
    expect(pack.categories.length).toBeLessThanOrEqual(base.categories.length);
  });
});

describe('buildCityPackRouteSeedContent', () => {
  it('includes warnings and pre-trip tips for sarajevo', () => {
    const seed = buildCityPackRouteSeedContent('sarajevo');

    expect(seed.warnings?.busClarification?.en).toContain('Which direction');
    expect(seed.preTripTips).toContain('sundayClosure');
    expect(Object.keys(seed.routes ?? {}).length).toBeGreaterThan(0);
  });
});
