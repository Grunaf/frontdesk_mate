'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashDeskPin, isNewDeskPinValid, DESK_PIN_MIN_LENGTH } from '@/app/reception/lib/deskPin';
import { getTenantRecord, listTenants, setTenantArchived, upsertTenant } from '@/entities/tenant/server';
import { parseTenantSettingsFormData } from '@/entities/tenant/server/parseTenantSettingsFormData';
import { isCityPackId } from '@/entities/hostel';
import {
  assertAdminAuthenticated,
  clearAdminSession,
  setAdminSession,
} from './lib/adminSession';
import { resolveCityTaxDisplay } from '@/entities/tenant/lib/resolveHostelMoney';
import { mergeTenantSettingsWithPrevious } from './(protected)/tenants/lib/mergeTenantSettingsWithPrevious';

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
  let settings = mergeTenantSettingsWithPrevious(
    formData,
    parseTenantSettingsFormData(formData),
    previousTenant?.settings
  );

  settings = {
    ...settings,
    cityTax: resolveCityTaxDisplay(settings) || previousTenant?.settings.cityTax,
  };

  const deskPin = String(formData.get('receptionDeskPin') || '').trim();
  const previousHash = previousTenant?.settings.reception?.deskPinHash;

  if (deskPin && !isNewDeskPinValid(deskPin)) {
    throw new Error(`Reception desk PIN must be at least ${DESK_PIN_MIN_LENGTH} characters.`);
  }

  if (deskPin) {
    settings.reception = {
      ...settings.reception,
      deskPinHash: hashDeskPin(slug, deskPin),
    };
  } else if (previousHash) {
    settings.reception = {
      ...settings.reception,
      deskPinHash: previousHash,
    };
  }

  const result = await upsertTenant({
    slug,
    originalSlug,
    name,
    cityPackId,
    settings,
    subscriptionStartsAt,
    subscriptionEndsAt,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  revalidatePath('/admin/tenants');
  if (originalSlug) {
    revalidatePath(`/admin/tenants/${originalSlug}`);
  }
  revalidatePath(`/admin/tenants/${slug}`);
  redirect(`/admin/tenants/${slug}?saved=1`);
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
