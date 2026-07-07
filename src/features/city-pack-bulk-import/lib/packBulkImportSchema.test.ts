import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import { parsePackBulkImportJson } from './packBulkImportSchema';
import { applyPackBulkImportPreview } from './applyPackBulkImportPreview';
import { hubImportToGuidedPreview } from './mapBulkImportToRouteContent';

describe('parsePackBulkImportJson', () => {
  it('accepts a multi-hub document', () => {
    const raw = JSON.stringify({
      packId: 'tivat',
      suggestedEnabledRoutes: ['airport'],
      routes: {
        airport: {
          primaryRouteMode: 'transit',
          transit: {
            publicTitle: 'Airport bus',
            publicText: 'Take the shuttle to town.',
            publicGetOffAt: 'Main square',
          },
        },
      },
    });

    const result = parsePackBulkImportJson(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.routes.airport?.transit?.publicTitle).toBe('Airport bus');
    }
  });

  it('rejects invalid route keys', () => {
    const raw = JSON.stringify({
      packId: 'x',
      routes: { ferry: { transit: { publicText: 'nope' } } },
    });
    const result = parsePackBulkImportJson(raw);
    expect(result.ok).toBe(false);
  });
});

describe('hubImportToGuidedPreview', () => {
  it('keeps taxi out of transit publicText when enforcing single scenario', () => {
    const notes = 'Bus 37 to old town. At night take a taxi.';
    const preview = hubImportToGuidedPreview(
      {
        primaryRouteMode: 'transit',
        transit: {
          publicText: 'Board bus 37. At night take a taxi instead.',
          publicGetOffAt: 'Gate',
        },
        taxi: { tips: ['Taxi stand outside arrivals'] },
      },
      notes
    );

    expect(preview.copy.publicText).toBe('Board bus 37.');
    expect(preview.tips?.some((tip) => /taxi/i.test(tip))).toBe(true);
  });
});

describe('applyPackBulkImportPreview', () => {
  it('merges partial routes without wiping omitted hubs', () => {
    const airport = createBlankCityPackRouteContent('airport');
    airport.copy.publicTitle = { en: 'Existing airport title' };
    const bus = createBlankCityPackRouteContent('bus_central');
    bus.copy.publicTitle = { en: 'Keep bus title' };

    const { routes } = applyPackBulkImportPreview({
      packId: 'demo',
      notes: 'Airport shuttle only.',
      document: {
        packId: 'demo',
        routes: {
          airport: {
            transit: {
              publicText: 'Shuttle to hostel district.',
              publicGetOffAt: 'Hostel stop',
              publicTitle: 'Shuttle',
            },
          },
        },
      },
      currentRoutes: { airport, bus_central: bus },
      routeIdsToApply: ['airport'],
      currentEnabledRoutes: ['airport', 'bus_central'],
      applySuggestedEnabledRoutes: false,
    });

    expect(routes.bus_central?.copy.publicTitle.en).toBe('Keep bus title');
    expect(routes.airport?.copy.publicText.en).toContain('Shuttle');
    expect(routes.airport?.copy.publicTitle.en).toBe('Shuttle');
  });

  it('maps taxi tips to route tips without polluting publicText', () => {
    const existing = createBlankCityPackRouteContent('airport');
    const { routes } = applyPackBulkImportPreview({
      packId: 'demo',
      notes: 'Bus by day.',
      document: {
        packId: 'demo',
        routes: {
          airport: {
            primaryRouteMode: 'transit',
            transit: {
              publicText: 'Take the public bus.',
              publicGetOffAt: 'Center',
            },
            taxi: {
              taxiCost: { en: '€15–20' },
              tips: ['Use official taxi desk'],
            },
          },
        },
      },
      currentRoutes: { airport: existing },
      routeIdsToApply: ['airport'],
      currentEnabledRoutes: ['airport'],
      applySuggestedEnabledRoutes: false,
    });

    const next = routes.airport!;
    expect(next.copy.publicText.en).not.toMatch(/official taxi desk/i);
    expect(next.tips?.some((tip) => /official taxi desk/i.test(tip.en))).toBe(true);
    expect(next.copy.taxiCost.en).toBe('€15–20');
  });
});
