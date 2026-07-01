import type { TenantAssetKind } from '../model/types';

const DEFAULT_BUCKET = 'tenant-assets';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getTenantAssetsBucketName(): string {
  return process.env.SUPABASE_TENANT_ASSETS_BUCKET?.trim() || DEFAULT_BUCKET;
}

export function isTenantSlugForAssetPath(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function isTenantAssetKind(value: string): value is TenantAssetKind {
  return value === 'logo' || value === 'hero' || value === 'bridge-icon' || value === 'misc';
}

function extensionFromFileName(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) {
    return 'bin';
  }
  const ext = parts.pop()?.toLowerCase() ?? 'bin';
  return ext.replace(/[^a-z0-9]/g, '') || 'bin';
}

export function buildTenantAssetObjectPath(slug: string, kind: TenantAssetKind, fileName: string): string {
  const safeExt = extensionFromFileName(fileName);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${slug}/${kind}/${unique}.${safeExt}`;
}

export function getTenantAssetPublicUrl(objectPath: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) {
    return null;
  }

  const bucket = getTenantAssetsBucketName();
  const encodedPath = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
