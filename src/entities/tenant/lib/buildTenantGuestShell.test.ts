import { describe, expect, it } from 'vitest';
import { buildTenantGuestShell, resolveTenantAccessFromLookup } from './buildTenantGuestShell';
import type { TenantRecord } from '../model/settings';

const baseRecord: TenantRecord = {
  id: '1',
  slug: 'vega',
  name: 'Vega Hostel',
  city_pack_id: 'sarajevo',
  settings: {
    contacts: {
      phoneRaw: '38761123456',
      email: 'hello@vega.example',
    },
    reception: {
      whatsappEnabled: true,
    },
    booking: {
      provider: 'cloudbeds',
      engineId: '12345',
    },
  },
  is_active: true,
  subscription_starts_at: '2026-01-01T00:00:00.000Z',
  subscription_ends_at: '2027-01-01T23:59:59.999Z',
  archived_at: null,
};

describe('buildTenantGuestShell', () => {
  it('returns null for active tenants', () => {
    expect(buildTenantGuestShell(baseRecord)).toBeNull();
  });

  it('builds shell for expired tenants', () => {
    const shell = buildTenantGuestShell({
      ...baseRecord,
      is_active: true,
      subscription_ends_at: '2025-01-01T23:59:59.999Z',
    });

    expect(shell).toMatchObject({
      slug: 'vega',
      name: 'Vega Hostel',
      lifecycleStatus: 'expired',
    });
    expect(shell?.contacts.phone.href).toBe('tel:+38761123456');
  });

  it('builds shell for scheduled tenants', () => {
    const shell = buildTenantGuestShell({
      ...baseRecord,
      subscription_starts_at: '2030-01-01T00:00:00.000Z',
    });

    expect(shell?.lifecycleStatus).toBe('scheduled');
    expect(shell?.subscriptionStartsAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('builds shell for archived tenants', () => {
    const shell = buildTenantGuestShell({
      ...baseRecord,
      archived_at: '2026-06-01T12:00:00.000Z',
      is_active: false,
    });

    expect(shell?.lifecycleStatus).toBe('archived');
  });
});

describe('resolveTenantAccessFromLookup', () => {
  const expiredRecord = {
    ...baseRecord,
    is_active: true,
    subscription_ends_at: '2025-01-01T23:59:59.999Z',
  };

  const scheduledRecord = {
    ...baseRecord,
    subscription_starts_at: '2030-01-01T00:00:00.000Z',
  };

  const archivedRecord = {
    ...baseRecord,
    archived_at: '2026-06-01T12:00:00.000Z',
    is_active: false,
  };

  it('returns active config for active tenant on both sites', () => {
    const result = resolveTenantAccessFromLookup({
      slug: 'vega',
      record: baseRecord,
      site: 'app',
      isProdEnv: true,
    });

    expect(result.kind).toBe('active');
    if (result.kind === 'active') {
      expect(result.config.lifecycleStatus).toBe('active');
    }
  });

  it('returns active landing config for expired tenant on landing', () => {
    const result = resolveTenantAccessFromLookup({
      slug: 'vega',
      record: expiredRecord,
      site: 'landing',
      isProdEnv: true,
    });

    expect(result.kind).toBe('active');
    if (result.kind === 'active') {
      expect(result.config.lifecycleStatus).toBe('expired');
      expect(result.config.capabilities.booking).toBe('hidden');
    }
  });

  it('returns offline shell for expired tenant on app', () => {
    const result = resolveTenantAccessFromLookup({
      slug: 'vega',
      record: expiredRecord,
      site: 'app',
      isProdEnv: true,
    });

    expect(result.kind).toBe('offline');
    if (result.kind === 'offline') {
      expect(result.shell.lifecycleStatus).toBe('expired');
    }
  });

  it('returns active landing config for scheduled tenant on landing', () => {
    const result = resolveTenantAccessFromLookup({
      slug: 'vega',
      record: scheduledRecord,
      site: 'landing',
      isProdEnv: true,
    });

    expect(result.kind).toBe('active');
    if (result.kind === 'active') {
      expect(result.config.lifecycleStatus).toBe('scheduled');
      expect(result.config.capabilities.booking).toBe('hidden');
    }
  });

  it('returns offline shell for scheduled tenant on app', () => {
    const result = resolveTenantAccessFromLookup({
      slug: 'vega',
      record: scheduledRecord,
      site: 'app',
      isProdEnv: true,
    });

    expect(result.kind).toBe('offline');
    if (result.kind === 'offline') {
      expect(result.shell.lifecycleStatus).toBe('scheduled');
    }
  });

  it('returns offline shell for archived tenant on landing and app', () => {
    for (const site of ['landing', 'app'] as const) {
      const result = resolveTenantAccessFromLookup({
        slug: 'vega',
        record: archivedRecord,
        site,
        isProdEnv: true,
      });

      expect(result.kind).toBe('offline');
      if (result.kind === 'offline') {
        expect(result.shell.lifecycleStatus).toBe('archived');
      }
    }
  });

  it('returns missing for unknown slug in prod', () => {
    expect(
      resolveTenantAccessFromLookup({
        slug: 'unknown',
        record: null,
        site: 'landing',
        isProdEnv: true,
      })
    ).toEqual({ kind: 'missing' });
  });

  it('returns active config for inactive tenant in dev', () => {
    const result = resolveTenantAccessFromLookup({
      slug: 'vega',
      record: expiredRecord,
      site: 'app',
      isProdEnv: false,
    });

    expect(result.kind).toBe('active');
    if (result.kind === 'active') {
      expect(result.config.lifecycleStatus).toBe('expired');
    }
  });
});
