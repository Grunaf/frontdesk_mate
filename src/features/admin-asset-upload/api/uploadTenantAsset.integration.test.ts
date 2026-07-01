import { describe, expect, it } from 'vitest';
import { isSupabaseAdminConfigured } from '@/shared/lib/db/admin';
import { uploadTenantAsset } from './uploadTenantAsset';

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function pngFile(name = 'pixel.png'): File {
  const bytes = Buffer.from(PNG_1X1_BASE64, 'base64');
  return new File([bytes], name, { type: 'image/png' });
}

describe.skipIf(!isSupabaseAdminConfigured())('uploadTenantAsset (integration)', () => {
  it('uploads png and returns https public URL', async () => {
    const slug = process.env.TENANT_ASSET_UPLOAD_TEST_SLUG?.trim() || 'default';
    const result = await uploadTenantAsset(slug, pngFile(), 'misc');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.publicUrl).toMatch(/^https:\/\//);
    expect(result.publicUrl).toContain('/storage/v1/object/public/tenant-assets/');

    const response = await fetch(result.publicUrl, { method: 'HEAD' });
    expect(response.ok).toBe(true);
  }, 30_000);
});
