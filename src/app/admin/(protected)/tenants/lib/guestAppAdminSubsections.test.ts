import { describe, expect, it } from 'vitest';
import {
  getGuestAppAdminModuleStatus,
  normalizeGuestAppAdminModuleId,
} from './guestAppAdminSubsections';

describe('guestAppAdminSubsections', () => {
  it('normalizes known module ids and rejects unknown', () => {
    expect(normalizeGuestAppAdminModuleId('room-map')).toBe('room-map');
    expect(normalizeGuestAppAdminModuleId('near-hostel')).toBe('near-hostel');
    expect(normalizeGuestAppAdminModuleId('find-building')).toBeNull();
    expect(normalizeGuestAppAdminModuleId(null)).toBeNull();
  });

  it('marks extras as n/a status', () => {
    const context = {
      readinessInput: {
        slug: 'demo',
        name: 'Demo',
        cityPackId: 'sarajevo' as const,
        settings: {},
        lifecycleStatus: 'active' as const,
      },
    };
    expect(getGuestAppAdminModuleStatus('extras', context)).toBe('n/a');
  });
});
