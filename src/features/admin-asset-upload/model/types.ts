export const TENANT_ASSET_KINDS = ['logo', 'hero', 'bridge-icon', 'misc'] as const;

export type TenantAssetKind = (typeof TENANT_ASSET_KINDS)[number];

export type UploadTenantAssetResult =
  | { ok: true; path: string; publicUrl: string }
  | { ok: false; error: 'notConfigured' | 'invalidSlug' | 'invalidKind' | 'invalidFile' | 'uploadFailed' };
