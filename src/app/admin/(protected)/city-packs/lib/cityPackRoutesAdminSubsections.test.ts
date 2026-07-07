import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import {
  decodeCityPackRouteModuleId,
  encodeCityPackRouteModuleId,
  getCityPackRouteModuleHint,
  getCityPackRouteModuleStatus,
  getCityPackRoutesModuleHint,
  getCityPackRoutesModuleStatus,
} from './cityPackRoutesAdminSubsections';

describe('cityPackRoutesAdminSubsections', () => {
  const empty = { taxiName: '', taxiPhone: '', warnings: {} };

  it('hints taxi service as optional when empty', () => {
    expect(getCityPackRoutesModuleHint('taxi-service', empty)).toBe('Optional');
    expect(getCityPackRoutesModuleStatus('taxi-service', empty)).toBe('n/a');
  });

  it('surfaces taxi name in hint and ready status', () => {
    const input = { ...empty, taxiName: 'Zuti' };
    expect(getCityPackRoutesModuleHint('taxi-service', input)).toBe('Zuti');
    expect(getCityPackRoutesModuleStatus('taxi-service', input)).toBe('ready');
  });

  it('hints hub warnings when bus clarification is set', () => {
    const input = {
      ...empty,
      warnings: { busClarification: { en: 'Which station?' } },
    };
    expect(getCityPackRoutesModuleHint('hub-warnings', input)).toBe('Clarification set');
    expect(getCityPackRoutesModuleStatus('hub-warnings', input)).toBe('ready');
  });

  it('encodes and decodes route module ids', () => {
    expect(encodeCityPackRouteModuleId('airport')).toBe('route:airport');
    expect(decodeCityPackRouteModuleId('route:airport')).toBe('airport');
    expect(decodeCityPackRouteModuleId('taxi-service')).toBeNull();
  });

  it('surfaces route gate on hub drill-down rows', () => {
    const blank = createBlankCityPackRouteContent('airport');
    expect(getCityPackRouteModuleStatus(blank)).toBe('preview');
    expect(getCityPackRouteModuleHint(blank)).toMatch(/Missing/);
  });

  it('marks unoffered hubs as hidden with offer hint', () => {
    const blank = createBlankCityPackRouteContent('airport');
    expect(getCityPackRouteModuleStatus(blank, { offered: false })).toBe('hidden');
    expect(getCityPackRouteModuleHint(blank, { offered: false })).toMatch(/Not offered/);
  });
});
