import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/db/supabase-owner-server', () => ({
  isOwnerSupabaseConfigured: vi.fn(() => true),
  createOwnerServerClient: vi.fn(),
}));

vi.mock('./getOwnerSession', () => ({
  getOwnerSession: vi.fn(),
}));

import { createOwnerServerClient } from '@/shared/lib/db/supabase-owner-server';
import { getOwnerSession } from './getOwnerSession';
import { getOwnerTenantContext } from './getOwnerTenantContext';

describe('getOwnerTenantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when session is missing', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue(null);

    await expect(getOwnerTenantContext()).resolves.toBeNull();
  });

  it('returns null when tenant_owners row is missing', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });

    vi.mocked(createOwnerServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    } as never);

    await expect(getOwnerTenantContext()).resolves.toBeNull();
  });

  it('returns slug and name when owner link exists', async () => {
    vi.mocked(getOwnerSession).mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });

    const tenantRow = {
      id: 'tenant-1',
      slug: 'kotor-demo',
      name: 'Kotor Demo',
      subscription_starts_at: '2026-01-01T00:00:00.000Z',
      subscription_ends_at: '2027-01-01T23:59:59.999Z',
      archived_at: null,
      is_active: true,
    };

    vi.mocked(createOwnerServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'tenant_owners') {
          return {
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: tenantRow.id }, error: null }),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: tenantRow, error: null }),
            })),
          })),
        };
      }),
    } as never);

    await expect(getOwnerTenantContext()).resolves.toMatchObject({
      userId: 'user-1',
      email: 'owner@test.com',
      tenantId: 'tenant-1',
      slug: 'kotor-demo',
      name: 'Kotor Demo',
      lifecycleStatus: 'active',
    });
  });
});
