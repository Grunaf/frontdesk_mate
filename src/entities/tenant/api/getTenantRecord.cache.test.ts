import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tenantRow = {
  id: 'tenant-1',
  slug: 'kotor-demo',
  name: 'Demo',
  city_pack_id: 'kotor',
  settings: {},
  is_active: true,
  subscription_starts_at: null,
  subscription_ends_at: null,
  archived_at: null,
};

const { maybeSingle, from, requestCache } = vi.hoisted(() => {
  const requestCache = new Map<string, Promise<unknown>>();
  const maybeSingle = vi.fn(async () => ({ data: tenantRow, error: null }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    })),
  }));
  return { maybeSingle, from, requestCache };
});

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    cache:
      <T extends (...args: never[]) => unknown>(fn: T): T =>
      ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        const existing = requestCache.get(key);
        if (existing) {
          return existing;
        }
        const promise = Promise.resolve(fn(...args));
        requestCache.set(key, promise);
        return promise as ReturnType<T>;
      }) as T,
  };
});

vi.mock('@/shared/lib/db', () => ({
  supabase: { from },
}));

import { getTenantRecord } from './getTenantConfig';

describe('getTenantRecord cache', () => {
  beforeEach(() => {
    requestCache.clear();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it('dedupes repeated loads for the same slug within one request', async () => {
    await getTenantRecord('kotor-demo');
    await getTenantRecord('kotor-demo');

    expect(from).toHaveBeenCalledTimes(1);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('loads separately for different slugs', async () => {
    await getTenantRecord('kotor-demo');
    await getTenantRecord('other-hostel');

    expect(from).toHaveBeenCalledTimes(2);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
});
