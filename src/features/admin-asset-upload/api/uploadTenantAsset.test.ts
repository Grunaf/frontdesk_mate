import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const uploadMock = vi.fn(async () => ({ error: null }));

vi.mock('@/shared/lib/db/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    storage: {
      from: () => ({
        upload: uploadMock,
      }),
    },
  })),
}));

import { uploadTenantAsset } from './uploadTenantAsset';

function pngFile(): File {
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
  return new File([bytes], 'tile.png', { type: 'image/png' });
}

describe('uploadTenantAsset', () => {
  beforeEach(() => {
    uploadMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uploads via storage and returns public bucket URL', async () => {
    const result = await uploadTenantAsset('demo-hostel', pngFile(), 'misc');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.publicUrl).toMatch(/^https:\/\/test\.supabase\.co\/storage\/v1\/object\/public\/tenant-assets\//);
    expect(result.publicUrl).toContain('/demo-hostel/misc/');
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid slug without calling storage', async () => {
    const result = await uploadTenantAsset('Bad_Slug', pngFile(), 'misc');

    expect(result).toEqual({ ok: false, error: 'invalidSlug' });
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
