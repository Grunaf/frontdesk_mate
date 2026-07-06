'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getTenantRecord, listTenants, setTenantArchived } from '@/entities/tenant/server';
import { persistTenantSettings } from '@/entities/tenant/server/persistTenantSettings';
import { isCityPackId } from '@/entities/hostel';
import {
  assertAdminAuthenticated,
  clearAdminSession,
  setAdminSession,
} from './lib/adminSession';
import { normalizeAdminSectionId } from './(protected)/tenants/lib/adminSections';

export async function loginAdminAction(formData: FormData) {
  const password = formData.get('password')?.toString() ?? '';
  const next = String(formData.get('next') || '/admin/tenants');
  const expected = process.env.ADMIN_SECRET;

  if (!expected || password !== expected) {
    redirect('/admin/login?error=1');
  }

  await setAdminSession();
  redirect(next.startsWith('/admin') ? next : '/admin/tenants');
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function saveTenantAction(formData: FormData) {
  await assertAdminAuthenticated();

  const slug = String(formData.get('slug') || '').trim();
  const originalSlug = String(formData.get('originalSlug') || '').trim() || null;
  const name = String(formData.get('name') || '').trim();
  const cityPackIdRaw = String(formData.get('cityPackId') || 'sarajevo');
  const subscriptionStartsAt = String(formData.get('subscriptionStartsAt') || '').trim();
  const subscriptionEndsAt = String(formData.get('subscriptionEndsAt') || '').trim();
  if (!isCityPackId(cityPackIdRaw)) {
    throw new Error('Unknown city pack');
  }
  const cityPackId = cityPackIdRaw;

  if (!slug || !name) {
    throw new Error('Slug and name are required');
  }

  const lookupSlug = originalSlug || slug;
  const previousTenant = lookupSlug ? await getTenantRecord(lookupSlug) : null;

  const result = await persistTenantSettings({
    actor: { kind: 'platform' },
    slug,
    originalSlug,
    name,
    cityPackId,
    subscriptionStartsAt,
    subscriptionEndsAt,
    formData,
    previous: previousTenant,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  const savedSlug = result.slug;

  revalidatePath('/admin/tenants');
  if (originalSlug) {
    revalidatePath(`/admin/tenants/${originalSlug}`);
  }
  revalidatePath(`/admin/tenants/${savedSlug}`);
  const returnSection = normalizeAdminSectionId(String(formData.get('settingsSection') || '')) ?? 'identity';
  redirect(`/admin/tenants/${savedSlug}/settings/${returnSection}?saved=1`);
}

export async function setTenantArchiveAction(formData: FormData) {
  await assertAdminAuthenticated();

  const slug = String(formData.get('slug') || '').trim();
  const originalSlug = String(formData.get('originalSlug') || '').trim() || null;
  const archived = formData.get('archived') === 'true';

  if (!slug) {
    throw new Error('Slug is required');
  }

  const lookupSlug = originalSlug || slug;
  const result = await setTenantArchived(lookupSlug, archived);

  if (!result.ok) {
    throw new Error(result.error);
  }

  revalidatePath('/admin/tenants');
  if (originalSlug) {
    revalidatePath(`/admin/tenants/${originalSlug}`);
  }
  revalidatePath(`/admin/tenants/${slug}`);
  redirect(`/admin/tenants/${slug}`);
}

export async function getTenantsForAdmin() {
  return listTenants();
}
