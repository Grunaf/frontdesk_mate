import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from './resolveAdminCityPackTransport';
import {
  addCityPackArrivalHub,
  applyCityPackHubDisplayName,
  listAdminCityPackHubRouteIds,
  resolveNextCityPackHubSlot,
  resolveCityPackHubAdminLabel,
} from './cityPackHubAdmin';

describe('cityPackHubAdmin', () => {
  it('lists hub route ids in slot order', () => {
    const routes = {
      train_station: createBlankCityPackRouteContent('train_station'),
      airport: createBlankCityPackRouteContent('airport'),
    };

    expect(listAdminCityPackHubRouteIds(routes)).toEqual(['airport', 'train_station']);
  });

  it('resolves next bus slot after central is taken', () => {
    const routes = { bus_central: createBlankCityPackRouteContent('bus_central') };

    expect(resolveNextCityPackHubSlot('bus', routes)).toBe('bus_istochno');
    expect(resolveNextCityPackHubSlot('airport', routes)).toBe('airport');
  });

  it('applies display name to location label only', () => {
    const route = createBlankCityPackRouteContent('bus_central');
    route.copy.publicTitle = { en: 'Card title stays' };
    const next = applyCityPackHubDisplayName(route, 'East station');

    expect(next.locationLabel.en).toBe('East station');
    expect(next.copy.publicTitle.en).toBe('Card title stays');
  });

  it('adds a hub with autofill and enables it for guests', () => {
    const result = addCityPackArrivalHub({
      packId: 'demo-city',
      category: 'bus',
      displayNameEn: 'Main bus station',
      enabledRoutes: [],
      routes: {},
      content: { transportCurrency: { mode: 'eur_only' } },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.routeId).toBe('bus_central');
    expect(result.enabledRoutes).toEqual(['bus_central']);
    expect(result.routes.bus_central?.locationLabel.en).toBe('Main bus station');
    expect(result.routes.bus_central?.copy.publicTitle.en).not.toBe('Main bus station');
    expect((result.routes.bus_central?.transit.durationMin ?? 0) > 0).toBe(true);
  });

  it('prefers route display name for admin label', () => {
    const route = createBlankCityPackRouteContent('bus_istochno');
    route.locationLabel = { en: 'Istočno' };

    expect(resolveCityPackHubAdminLabel('bus_istochno', route)).toBe('Istočno');
  });
});
