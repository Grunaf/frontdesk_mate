import { describe, expect, it } from 'vitest';
import {
  buildTenantAssetObjectPath,
  getTenantAssetPublicUrl,
  isTenantAssetKind,
  isTenantSlugForAssetPath,
} from '../lib/tenantAssetStorage';

describe('tenantAssetStorage', () => {
  it('builds object path under slug and kind', () => {
    const path = buildTenantAssetObjectPath('kotor', 'logo', 'icon.PNG');
    expect(path).toMatch(/^kotor\/logo\/\d+-[a-z0-9]+\.png$/);
  });

  it('validates slug', () => {
    expect(isTenantSlugForAssetPath('kotor')).toBe(true);
    expect(isTenantSlugForAssetPath('Kotor')).toBe(false);
    expect(isTenantSlugForAssetPath('../evil')).toBe(false);
  });

  it('validates kind', () => {
    expect(isTenantAssetKind('logo')).toBe(true);
    expect(isTenantAssetKind('unknown')).toBe(false);
  });

  it('builds public URL', () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

    expect(getTenantAssetPublicUrl('kotor/logo/x.png')).toBe(
      'https://example.supabase.co/storage/v1/object/public/tenant-assets/kotor/logo/x.png'
    );

    process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });
});
