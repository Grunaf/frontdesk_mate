import { describe, expect, it } from 'vitest';
import {
  buildCityPackGateSnapshot,
  isCityPackReadyForTenant,
  resolveCityPackNotReadyReasonForTenant,
  type CityPackGateSnapshot,
} from './resolveCityPackGateForTenant';

const sarajevoReady: CityPackGateSnapshot = buildCityPackGateSnapshot([
  {
    id: 'sarajevo',
    status: 'ready',
    placesCount: 12,
    routesGateMet: true,
    readyForTenants: true,
    notReadyReason: null,
  },
]);

const kotorDraft: CityPackGateSnapshot = buildCityPackGateSnapshot([
  {
    id: 'kotor',
    status: 'draft',
    placesCount: 3,
    routesGateMet: false,
    readyForTenants: false,
    notReadyReason: 'Publish the city pack when content is complete.',
  },
]);

describe('resolveCityPackGateForTenant', () => {
  it('returns ready when snapshot entry is ready for tenants', () => {
    expect(isCityPackReadyForTenant('sarajevo', sarajevoReady)).toBe(true);
    expect(resolveCityPackNotReadyReasonForTenant('sarajevo', sarajevoReady)).toBeNull();
  });

  it('returns not ready for draft pack even with places', () => {
    expect(isCityPackReadyForTenant('kotor', kotorDraft)).toBe(false);
    expect(resolveCityPackNotReadyReasonForTenant('kotor', kotorDraft)).toMatch(/publish/i);
  });

  it('returns false for unknown pack id in snapshot', () => {
    expect(isCityPackReadyForTenant('unknown', sarajevoReady)).toBe(false);
  });

  it('falls back to code registry when snapshot is empty', () => {
    expect(isCityPackReadyForTenant('sarajevo', {})).toBe(true);
  });
});
