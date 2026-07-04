import { describe, expect, it } from 'vitest';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import { mergeCityPackContentForSave, normalizeCityPackRoutes } from './normalizeCityPackRoutes';

describe('normalizeCityPackRoutes', () => {
  it('keeps only enabled routes on save', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');
    const merged = mergeCityPackContentForSave(
      {
        enabledRoutes: ['airport', 'bus_central'],
        routes,
      },
      ['airport']
    );

    expect(Object.keys(merged.routes ?? {})).toEqual(['airport']);
    expect(merged.routes?.airport?.copy.publicTitle.en).toContain('Trolleybus');
  });

  it('keeps incomplete route copy for draft persistence', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');
    const airport = routes.airport!;
    const normalized = normalizeCityPackRoutes({
      airport: {
        ...airport,
        copy: {
          ...airport.copy,
          publicTitle: { en: '' },
          publicPreview: { en: '' },
        },
      },
    });

    expect(normalized?.airport).toBeDefined();
    expect(normalized?.airport?.copy.publicTitle).toEqual({ en: '' });
    expect(normalized?.airport?.copy.publicSummary.en).toBeTruthy();
  });

  it('keeps blank route shells', () => {
    const normalized = normalizeCityPackRoutes({
      airport: {
        category: 'airport',
        locationLabel: { en: '' },
        copy: {
          publicTitle: { en: '' },
          publicSummary: { en: '' },
          publicPreview: { en: '' },
          publicText: { en: '' },
          publicGetOffAt: { en: '' },
          publicWalkToHostel: { en: '' },
          taxiCost: { en: '' },
          taxiPickupPoint: { en: '' },
        },
        transit: { durationMin: 0 },
        taxi: {
          priceKM: { min: 0, max: 0 },
          priceEUR: { min: 0, max: 0 },
          durationMin: { min: 0, max: 0 },
        },
      },
    });

    expect(normalized?.airport?.category).toBe('airport');
    expect(normalized?.airport?.copy.publicTitle).toEqual({ en: '' });
  });

  it('caps and soft-normalizes route tips on save', () => {
    const normalized = normalizeCityPackRoutes({
      airport: {
        category: 'airport',
        locationLabel: { en: 'Airport' },
        tips: [
          { en: 'Tip one' },
          { en: 'Tip two', ru: 'Совет' },
          { en: '3' },
          { en: '4' },
          { en: '5' },
          { en: '6' },
        ],
        copy: {
          publicTitle: { en: '' },
          publicSummary: { en: '' },
          publicPreview: { en: '' },
          publicText: { en: '' },
          publicGetOffAt: { en: '' },
          publicWalkToHostel: { en: '' },
          taxiCost: { en: '' },
          taxiPickupPoint: { en: '' },
        },
        transit: { durationMin: 0 },
        taxi: {
          priceKM: { min: 0, max: 0 },
          priceEUR: { min: 0, max: 0 },
          durationMin: { min: 0, max: 0 },
        },
      },
    });

    expect(normalized?.airport?.tips).toHaveLength(5);
    expect(normalized?.airport?.tips?.[1]).toEqual({ en: 'Tip two', ru: 'Совет' });
  });

  it('persists tips through mergeCityPackContentForSave', () => {
    const routes = normalizeCityPackRoutes({
      airport: {
        category: 'airport',
        locationLabel: { en: 'Airport' },
        tips: [{ en: 'Buy ticket at kiosk' }],
        copy: {
          publicTitle: { en: 'Title' },
          publicSummary: { en: '' },
          publicPreview: { en: '' },
          publicText: { en: '' },
          publicGetOffAt: { en: '' },
          publicWalkToHostel: { en: '' },
          taxiCost: { en: '' },
          taxiPickupPoint: { en: '' },
        },
        transit: { durationMin: 10 },
        taxi: {
          priceKM: { min: 0, max: 0 },
          priceEUR: { min: 0, max: 0 },
          durationMin: { min: 0, max: 0 },
        },
      },
    })!;

    const merged = mergeCityPackContentForSave({ routes }, ['airport']);
    expect(merged.routes?.airport?.tips).toEqual([{ en: 'Buy ticket at kiosk' }]);
  });
});
