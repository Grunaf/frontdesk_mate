'use server';

import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import { uploadTenantAsset } from './uploadTenantAsset';
import { isTenantAssetKind } from '../lib/tenantAssetStorage';
import type { UploadTenantAssetResult } from '../model/types';

export async function uploadTenantAssetAction(formData: FormData): Promise<UploadTenantAssetResult> {
  await assertAdminAuthenticated();

  const slug = String(formData.get('slug') ?? '').trim();
  const kindRaw = String(formData.get('kind') ?? '').trim();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return { ok: false, error: 'invalidFile' };
  }

  if (!isTenantAssetKind(kindRaw)) {
    return { ok: false, error: 'invalidKind' };
  }

  return uploadTenantAsset(slug, file, kindRaw);
}
