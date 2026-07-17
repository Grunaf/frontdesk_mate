import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/tenant-audit', () => ({
  insertTenantAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/db/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/shared/config/site', () => ({
  getOwnerPortalUrl: vi.fn((path: string) => `http://dashboard.localhost:3000${path}`),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { insertTenantAuditEvent } from '@/entities/tenant-audit';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { linkOwnerToTenant } from './linkOwnerToTenant';

function mockFromChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue(result),
      })),
    })),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe('linkOwnerToTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invalid_email for bad email', async () => {
    const result = await linkOwnerToTenant({ tenantId: 't1', email: 'not-an-email' });
    expect(result).toEqual({
      ok: false,
      code: 'invalid_email',
      message: 'Enter a valid owner email.',
    });
  });

  it('returns server_misconfigured when admin client missing', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const result = await linkOwnerToTenant({ tenantId: 't1', email: 'a@test.com' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('server_misconfigured');
    }
  });

  it('returns tenant_not_found when tenant missing', async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return mockFromChain({ data: null, error: null });
        }
        return {};
      }),
      auth: { admin: {} },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await linkOwnerToTenant({ tenantId: 'missing', email: 'a@test.com' });
    expect(result).toEqual({
      ok: false,
      code: 'tenant_not_found',
      message: 'Tenant not found.',
    });
  });

  it('returns tenant_already_has_owner when link exists', async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return mockFromChain({ data: { id: 't1', slug: 'demo' }, error: null });
        }
        if (table === 'tenant_owners') {
          return mockFromChain({ data: { id: 'link-1' }, error: null });
        }
        return {};
      }),
      auth: { admin: {} },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await linkOwnerToTenant({ tenantId: 't1', email: 'a@test.com' });
    expect(result).toEqual({
      ok: false,
      code: 'tenant_already_has_owner',
      message: 'This hostel already has a linked owner.',
    });
  });

  it('links existing auth user without invite', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    let tenantOwnersCalls = 0;

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return mockFromChain({ data: { id: 't1', slug: 'demo' }, error: null });
        }
        if (table === 'tenant_owners') {
          tenantOwnersCalls += 1;
          if (tenantOwnersCalls === 1) {
            return mockFromChain({ data: null, error: null });
          }
          if (tenantOwnersCalls === 2) {
            return mockFromChain({ data: null, error: null });
          }
          return { insert };
        }
        return {};
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'a@test.com' }] },
            error: null,
          }),
          inviteUserByEmail: vi.fn(),
        },
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await linkOwnerToTenant({ tenantId: 't1', email: 'A@test.com' });

    expect(result).toEqual({
      ok: true,
      email: 'a@test.com',
      userId: 'user-1',
      invited: false,
    });
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith({ user_id: 'user-1', tenant_id: 't1' });
    expect(insertTenantAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        actorKind: 'platform',
        eventType: 'owner_linked',
        flags: { ownerEmail: 'a@test.com' },
      }),
    );
  });

  it('invites new user then links', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    let tenantOwnersCalls = 0;

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return mockFromChain({ data: { id: 't1', slug: 'demo' }, error: null });
        }
        if (table === 'tenant_owners') {
          tenantOwnersCalls += 1;
          if (tenantOwnersCalls <= 2) {
            return mockFromChain({ data: null, error: null });
          }
          return { insert };
        }
        return {};
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-new' } },
            error: null,
          }),
        },
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await linkOwnerToTenant({ tenantId: 't1', email: 'new@test.com' });

    expect(result).toEqual({
      ok: true,
      email: 'new@test.com',
      userId: 'user-new',
      invited: true,
    });
    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith('new@test.com', {
      redirectTo: 'http://dashboard.localhost:3000/en/auth/callback',
    });
  });

  it('returns user_already_owns_tenant when email owns another hostel', async () => {
    let tenantOwnersCalls = 0;

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return mockFromChain({ data: { id: 't1', slug: 'demo' }, error: null });
        }
        if (table === 'tenant_owners') {
          tenantOwnersCalls += 1;
          if (tenantOwnersCalls === 1) {
            return mockFromChain({ data: null, error: null });
          }
          return mockFromChain({ data: { id: 'link-other', tenant_id: 't-other' }, error: null });
        }
        return {};
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'a@test.com' }] },
            error: null,
          }),
        },
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await linkOwnerToTenant({ tenantId: 't1', email: 'a@test.com' });
    expect(result).toEqual({
      ok: false,
      code: 'user_already_owns_tenant',
      message: 'This email already manages another hostel.',
    });
  });
});
