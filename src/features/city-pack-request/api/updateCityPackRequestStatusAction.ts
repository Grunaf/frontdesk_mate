'use server';

import type { CityPackRequestStatus } from '@/entities/city-pack-request';
import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { revalidatePath } from 'next/cache';

const ALLOWED_STATUSES: CityPackRequestStatus[] = ['reviewed', 'fulfilled', 'dismissed'];

function isCityPackRequestStatus(value: string): value is CityPackRequestStatus {
  return (ALLOWED_STATUSES as string[]).includes(value);
}

export async function updateCityPackRequestStatusAction(formData: FormData): Promise<void> {
  await assertAdminAuthenticated();

  const requestId = String(formData.get('requestId') || '').trim();
  const statusRaw = String(formData.get('status') || '').trim();

  if (!requestId || !isCityPackRequestStatus(statusRaw)) {
    throw new Error('Invalid request or status');
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase admin not configured');
  }

  const { error } = await admin
    .from('city_pack_requests')
    .update({ status: statusRaw })
    .eq('id', requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/city-pack-requests');
}
