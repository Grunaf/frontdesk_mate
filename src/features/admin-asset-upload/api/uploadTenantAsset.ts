import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import {
  buildTenantAssetObjectPath,
  getTenantAssetPublicUrl,
  getTenantAssetsBucketName,
  isTenantAssetKind,
  isTenantSlugForAssetPath,
} from '../lib/tenantAssetStorage';
import type { TenantAssetKind, UploadTenantAssetResult } from '../model/types';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function isAllowedImageFile(file: File): boolean {
  if (!file.size || file.size > 5 * 1024 * 1024) {
    return false;
  }

  if (ALLOWED_IMAGE_TYPES.has(file.type)) {
    return true;
  }

  const name = file.name.toLowerCase();
  return (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    name.endsWith('.svg')
  );
}

export async function uploadTenantAsset(
  slug: string,
  file: File,
  kind: TenantAssetKind
): Promise<UploadTenantAssetResult> {
  const normalizedSlug = slug.trim();

  if (!isTenantSlugForAssetPath(normalizedSlug)) {
    return { ok: false, error: 'invalidSlug' };
  }

  if (!isTenantAssetKind(kind)) {
    return { ok: false, error: 'invalidKind' };
  }

  if (!isAllowedImageFile(file)) {
    return { ok: false, error: 'invalidFile' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'notConfigured' };
  }

  const objectPath = buildTenantAssetObjectPath(normalizedSlug, kind, file.name);
  const bucket = getTenantAssetsBucketName();

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    console.error('uploadTenantAsset:', error.message);
    return { ok: false, error: 'uploadFailed' };
  }

  const publicUrl = getTenantAssetPublicUrl(objectPath);
  if (!publicUrl) {
    return { ok: false, error: 'notConfigured' };
  }

  return { ok: true, path: objectPath, publicUrl };
}
