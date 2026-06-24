import { describe, expect, it } from 'vitest';
import {
  formatAdminSectionGuestProgress,
  getAdminSectionGuestProgress,
} from './resolveAdminSectionProgress';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';

const baseInput: TenantReadinessInput = {
  slug: 'demo',
  name: 'Demo Hostel',
  cityPackId: 'sarajevo',
  settings: {
    checkInTime: '14:00',
    contacts: { phoneRaw: '38761111', address: 'Main St 1' },
    heroBgUrl: '/hero.jpg',
    wifi: { name: 'Guest', password: 'pass' },
  },
  lifecycleStatus: 'active',
};

describe('resolveAdminSectionProgress', () => {
  it('counts readiness items per section', () => {
    const contacts = getAdminSectionGuestProgress('contacts', baseInput);
    expect(contacts).toEqual({ complete: 2, total: 2 });

    const landing = getAdminSectionGuestProgress('landing', baseInput);
    expect(landing).toEqual({ complete: 1, total: 1 });
  });

  it('formats progress label', () => {
    expect(formatAdminSectionGuestProgress({ complete: 2, total: 5 })).toBe('2/5 for guests');
  });

  it('returns null for sections without tracked items', () => {
    expect(getAdminSectionGuestProgress('booking', { ...baseInput, settings: { booking: { provider: 'none' } } })).toBeNull();
  });
});
