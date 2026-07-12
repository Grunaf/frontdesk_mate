import { describe, expect, it } from 'vitest';
import {
  ARRIVAL_JOURNEY_ADMIN_MODULE_IDS,
  getArrivalJourneyAdminModuleHint,
  getArrivalJourneyAdminModuleStatus,
  normalizeArrivalJourneyAdminModuleId,
} from './arrivalJourneyAdminSubsections';
import { stripSettingsModuleFromUrl } from './tenantSettingsModuleUrl';

describe('arrivalJourneyAdminSubsections', () => {
  it('normalizes known module ids and rejects unknown', () => {
    expect(normalizeArrivalJourneyAdminModuleId('find-building')).toBe('find-building');
    expect(normalizeArrivalJourneyAdminModuleId('last-mile')).toBe('last-mile');
    expect(normalizeArrivalJourneyAdminModuleId('building-access')).toBe('building-access');
    expect(normalizeArrivalJourneyAdminModuleId('hub-transfer')).toBe('hub-transfer');
    expect(normalizeArrivalJourneyAdminModuleId('reception-desk')).toBeNull();
    expect(normalizeArrivalJourneyAdminModuleId('foo')).toBeNull();
    expect(normalizeArrivalJourneyAdminModuleId(null)).toBeNull();
  });

  it('covers all module definitions', () => {
    expect(ARRIVAL_JOURNEY_ADMIN_MODULE_IDS).toHaveLength(4);
  });

  it('flags find-building preview when address missing', () => {
    const input = {
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo' as const,
      settings: {},
      lifecycleStatus: 'active' as const,
    };
    expect(getArrivalJourneyAdminModuleStatus('find-building', input)).toBe('preview');
    expect(getArrivalJourneyAdminModuleHint('find-building', input)).toMatch(/address/i);
  });

  it('strips module query from settings urls', () => {
    expect(stripSettingsModuleFromUrl('/admin/tenants/x/settings/arrival-journey', 'module=last-mile')).toBe(
      '/admin/tenants/x/settings/arrival-journey'
    );
  });
});
