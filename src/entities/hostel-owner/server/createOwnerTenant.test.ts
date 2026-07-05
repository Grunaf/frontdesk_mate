import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/db/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/entities/city-pack/api/cityPackRepository', () => ({
  listCityPacksForTenantSelect: vi.fn(),
}));

vi.mock('./getOwnerSession', () => ({
  getOwnerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { listCityPacksForTenantSelect } from '@/entities/city-pack/api/cityPackRepository';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { createOwnerTenant } from './createOwnerTenant';
import { getOwnerSession } from './getOwnerSession';

describe('createOwnerTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCityPacksForTenantSelect).mockResolvedValue({
      options: [
        {
          id: 'kotor',
          label: 'Kotor',
          status: 'ready',
          placesCount: 5,
          readyForTenants: true,
        },
      ],
      error: null,
    });
  });

  it('returns unauthorized without session', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue(null);

    const result = await createOwnerTenant({
      name: 'Demo',
      slugRaw: 'demo-hostel',
      cityPackId: 'kotor',
    });

    expect(result).toEqual({
      ok: false,
      code: 'unauthorized',
      message: 'Sign in to continue.',
    });
  });

  it('returns already_has_hostel when tenant_owners exists', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue({ id: 'user-1', email: 'a@test.com' });

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenant_owners') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'link-1' }, error: null }),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await createOwnerTenant({
      name: 'Demo',
      slugRaw: 'demo-hostel',
      cityPackId: 'kotor',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('already_has_hostel');
    }
  });

  it('creates tenant and owner link on success', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue({ id: 'user-1', email: 'a@test.com' });

    const insertTenant = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'tenant-new' }, error: null }),
      })),
    }));

    const insertOwner = vi.fn().mockResolvedValue({ error: null });

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenant_owners') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: insertOwner,
          };
        }

        if (table === 'tenants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: insertTenant,
          };
        }

        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await createOwnerTenant({
      name: 'Kotor Guesthouse',
      slugRaw: 'kotor-guest',
      cityPackId: 'kotor',
      locale: 'en',
    });

    expect(result).toEqual({ ok: true, slug: 'kotor-guest' });
    expect(insertOwner).toHaveBeenCalledWith({
      user_id: 'user-1',
      tenant_id: 'tenant-new',
    });
  });

  it('rejects reserved slug before database', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue({ id: 'user-1', email: 'a@test.com' });

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenant_owners') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await createOwnerTenant({
      name: 'Admin Hostel',
      slugRaw: 'admin',
      cityPackId: 'kotor',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_slug');
    }
  });
});
