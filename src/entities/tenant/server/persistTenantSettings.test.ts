import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertTenantMock = vi.fn();
const getCityPackForAdminMock = vi.fn();

vi.mock('../api/getTenantConfig', () => ({
  upsertTenant: (...args: unknown[]) => upsertTenantMock(...args),
}));

vi.mock('@/entities/city-pack/server', () => ({
  getCityPackForAdmin: (...args: unknown[]) => getCityPackForAdminMock(...args),
}));

import { hashDeskPin } from '@/app/reception/lib/deskPin';

import type { TenantRecord } from '../model/settings';

import { persistTenantSettings } from './persistTenantSettings';

function makePrevious(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: 'tenant-uuid',
    slug: 'kotor',
    name: 'Kotor Hostel',
    city_pack_id: 'kotor',
    settings: {
      wifi: { name: 'Old', password: 'old' },
      reception: { deskPinHash: 'stored-hash' },
    },
    is_active: true,
    subscription_starts_at: '2026-01-01T00:00:00.000Z',
    subscription_ends_at: '2026-12-31T00:00:00.000Z',
    ...overrides,
  };
}

describe('persistTenantSettings owner branch', () => {
  beforeEach(() => {
    upsertTenantMock.mockReset();
    upsertTenantMock.mockResolvedValue({ ok: true });
    getCityPackForAdminMock.mockReset();
    getCityPackForAdminMock.mockResolvedValue({ pack: null, error: null });
    process.env.RECEPTION_SESSION_SECRET = 'test-secret';
  });

  it('ignores tampered slug, pack, and subscription from input', async () => {
    const previous = makePrevious();
    const formData = new FormData();
    formData.set('wifiName', 'NewWifi');
    formData.set('wifiPassword', 'secret');

    const result = await persistTenantSettings({
      actor: { kind: 'owner', tenantId: 'tenant-uuid', userId: 'user-1' },
      slug: 'evil-slug',
      originalSlug: 'evil',
      name: 'Updated Name',
      cityPackId: 'sarajevo',
      subscriptionStartsAt: '2000-01-01',
      subscriptionEndsAt: '2001-01-01',
      formData,
      previous,
    });

    expect(result).toEqual({ ok: true, slug: 'kotor' });
    expect(upsertTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'kotor',
        originalSlug: 'kotor',
        name: 'Updated Name',
        cityPackId: 'kotor',
        subscriptionStartsAt: '2026-01-01',
        subscriptionEndsAt: '2026-12-31',
        settings: expect.objectContaining({
          wifi: { name: 'NewWifi', password: 'secret' },
          reception: expect.objectContaining({ deskPinHash: 'stored-hash' }),
        }),
      })
    );
  });

  it('returns forbidden when tenant id does not match actor', async () => {
    const result = await persistTenantSettings({
      actor: { kind: 'owner', tenantId: 'other-id', userId: 'user-1' },
      slug: 'kotor',
      originalSlug: null,
      name: 'Name',
      cityPackId: 'kotor',
      subscriptionStartsAt: '',
      subscriptionEndsAt: '',
      formData: new FormData(),
      previous: makePrevious(),
    });

    expect(result).toEqual({
      ok: false,
      code: 'forbidden',
      message: 'Tenant mismatch',
    });
    expect(upsertTenantMock).not.toHaveBeenCalled();
  });

  it('rejects tampered cityPackNeedNowPlaceIds and does not upsert', async () => {
    getCityPackForAdminMock.mockResolvedValue({
      pack: {
        id: 'kotor',
        content: {
          places: [{ id: 'real-1', name: 'ATM', category: 'essential' }],
          routes: {},
        },
      },
      error: null,
    });

    const formData = new FormData();
    formData.set('cityPackNeedNowPlaceIdsJson', JSON.stringify(['fake-id']));

    const result = await persistTenantSettings({
      actor: { kind: 'owner', tenantId: 'tenant-uuid', userId: 'user-1' },
      slug: 'kotor',
      originalSlug: 'kotor',
      name: 'Kotor Hostel',
      cityPackId: 'kotor',
      subscriptionStartsAt: '',
      subscriptionEndsAt: '',
      formData,
      previous: makePrevious(),
    });

    expect(result).toEqual({
      ok: false,
      code: 'validation',
      message: expect.any(String),
    });
    expect(upsertTenantMock).not.toHaveBeenCalled();
  });

  it('updates deskPinHash when owner submits a new PIN', async () => {
    const previous = makePrevious();
    const formData = new FormData();
    formData.set('receptionDeskPin', '654321');

    const result = await persistTenantSettings({
      actor: { kind: 'owner', tenantId: 'tenant-uuid', userId: 'user-1' },
      slug: 'kotor',
      originalSlug: 'kotor',
      name: 'Kotor Hostel',
      cityPackId: 'kotor',
      subscriptionStartsAt: '',
      subscriptionEndsAt: '',
      formData,
      previous,
    });

    expect(result).toEqual({ ok: true, slug: 'kotor' });
    const expectedHash = hashDeskPin('kotor', '654321');
    expect(upsertTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          reception: expect.objectContaining({ deskPinHash: expectedHash }),
        }),
      })
    );
  });

  it('keeps deskPinHash when owner saves with empty PIN field', async () => {
    const previous = makePrevious();
    const formData = new FormData();
    formData.set('wifiName', 'NewWifi');

    const result = await persistTenantSettings({
      actor: { kind: 'owner', tenantId: 'tenant-uuid', userId: 'user-1' },
      slug: 'kotor',
      originalSlug: 'kotor',
      name: 'Kotor Hostel',
      cityPackId: 'kotor',
      subscriptionStartsAt: '',
      subscriptionEndsAt: '',
      formData,
      previous,
    });

    expect(result).toEqual({ ok: true, slug: 'kotor' });
    expect(upsertTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          reception: expect.objectContaining({ deskPinHash: 'stored-hash' }),
        }),
      })
    );
  });

  it('rejects owner PIN shorter than minimum length', async () => {
    const formData = new FormData();
    formData.set('receptionDeskPin', '12345');

    const result = await persistTenantSettings({
      actor: { kind: 'owner', tenantId: 'tenant-uuid', userId: 'user-1' },
      slug: 'kotor',
      originalSlug: 'kotor',
      name: 'Kotor Hostel',
      cityPackId: 'kotor',
      subscriptionStartsAt: '',
      subscriptionEndsAt: '',
      formData,
      previous: makePrevious(),
    });

    expect(result).toEqual({
      ok: false,
      code: 'validation',
      message: expect.stringContaining('6'),
    });
    expect(upsertTenantMock).not.toHaveBeenCalled();
  });
});
