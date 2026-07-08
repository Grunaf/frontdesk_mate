import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import { parsePackBulkImportJson } from './packBulkImportSchema';
import { applyPackBulkImportPreview, buildPackBulkImportPreviewState } from './applyPackBulkImportPreview';
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

  it('rejects more than 2 taxi tips on a hub', () => {
    const raw = JSON.stringify({
      packId: 'x',
      routes: {
        airport: {
          taxi: { tips: ['One', 'Two', 'Three'] },
        },
      },
    });
    const result = parsePackBulkImportJson(raw);
    expect(result.ok).toBe(false);
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
        taxi: { tips: ['Use the official taxi desk outside arrivals'] },
      },
      notes
    );

    expect(preview.copy.publicText).toBe('Board bus 37.');
    expect(preview.tips?.some((tip) => /taxi/i.test(tip))).toBe(true);
    expect(preview.tips?.some((tip) => /official taxi desk/i.test(tip))).toBe(false);
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

  it('maps taxi tips to copy.taxiTips without polluting Good to know', () => {
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
              tips: ['Sunday buses are limited'],
            },
            taxi: {
              taxiCost: { en: '€15–20' },
              tips: ['Use official taxi desk', 'Insist on the meter'],
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
    expect(next.tips?.some((tip) => /official taxi desk/i.test(tip.en))).toBe(false);
    expect(next.tips?.some((tip) => /Sunday buses/i.test(tip.en))).toBe(true);
    expect(next.copy.taxiTips?.map((tip) => tip.en)).toEqual([
      'Use official taxi desk',
      'Insist on the meter',
    ]);
    expect(next.copy.taxiCost.en).toBe('€15–20');
  });

  it('drops call-ahead wording from imported taxi.tips', () => {
    const existing = createBlankCityPackRouteContent('airport');
    const { routes } = applyPackBulkImportPreview({
      packId: 'demo',
      notes: 'Desk taxi.',
      document: {
        packId: 'demo',
        routes: {
          airport: {
            taxi: {
              tips: ['Call Red Taxi at the desk', 'Insist on the meter'],
            },
          },
        },
      },
      currentRoutes: { airport: existing },
      routeIdsToApply: ['airport'],
      currentEnabledRoutes: ['airport'],
      applySuggestedEnabledRoutes: false,
    });

    expect(routes.airport!.copy.taxiTips?.map((tip) => tip.en)).toEqual(['Insist on the meter']);
  });

  it('documents taxi.tips slot semantics for bulk import', () => {
    const existing = createBlankCityPackRouteContent('airport');
    const { routes } = applyPackBulkImportPreview({
      packId: 'demo',
      notes: 'Airport taxi.',
      document: {
        packId: 'demo',
        routes: {
          airport: {
            taxi: {
              taxiPickupPoint: { en: 'Arrivals taxi desk' },
              tips: ['Queue at the desk in arrivals', 'Agree fare or confirm meter before leaving'],
            },
          },
        },
      },
      currentRoutes: { airport: existing },
      routeIdsToApply: ['airport'],
      currentEnabledRoutes: ['airport'],
      applySuggestedEnabledRoutes: false,
    });

    expect(routes.airport!.copy.taxiPickupPoint.en).toBe('Arrivals taxi desk');
    expect(routes.airport!.copy.taxiTips?.map((tip) => tip.en)).toEqual([
      'Queue at the desk in arrivals',
      'Agree fare or confirm meter before leaving',
    ]);
  });

  it('applies taxi metadata to numeric guest card fields', () => {
    const existing = createBlankCityPackRouteContent('airport');
    const { routes } = applyPackBulkImportPreview({
      packId: 'demo',
      notes: 'Taxi from desk.',
      document: {
        packId: 'demo',
        routes: {
          airport: {
            taxi: { taxiCost: { en: '€18–22' } },
            metadata: { taxiEur: 18, taxiDuration: 15 },
          },
        },
      },
      currentRoutes: { airport: existing },
      routeIdsToApply: ['airport'],
      currentEnabledRoutes: ['airport'],
      applySuggestedEnabledRoutes: false,
      transportCurrencyMode: { mode: 'eur_only' },
    });

    const next = routes.airport!;
    expect(next.taxi.priceEUR.min).toBe(18);
    expect(next.taxi.priceEUR.max).toBe(18);
    expect(next.taxi.durationMin.min).toBe(15);
    expect(next.taxi.durationMin.max).toBe(15);
    expect(next.copy.taxiCost.en).toBeTruthy();
  });
});

describe('buildPackBulkImportPreviewState research scope', () => {
  it('preview only hubs in researchRouteIds; flags ignored keys', () => {
    const airport = createBlankCityPackRouteContent('airport');
    const state = buildPackBulkImportPreviewState({
      packId: 'demo',
      notes: '',
      document: {
        packId: 'demo',
        routes: {
          airport: { transit: { publicText: 'Shuttle', publicGetOffAt: 'Stop' } },
          bus_central: { transit: { publicText: 'Bus 1', publicGetOffAt: 'Center' } },
        },
      },
      currentRoutes: { airport },
      researchRouteIds: ['airport'],
    });

    expect(state.hubs.map((hub) => hub.routeId)).toEqual(['airport']);
    expect(state.ignoredOutOfScopeRouteIds).toEqual(['bus_central']);
  });
});
