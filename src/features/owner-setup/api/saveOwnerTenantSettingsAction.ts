'use server';

import {
  assertOwnerAuthenticated,
  getOwnerTenantContext,
} from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import { getTenantRecord } from '@/entities/tenant/server';
import { persistTenantSettings } from '@/entities/tenant/server/persistTenantSettings';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function saveOwnerTenantSettingsAction(formData: FormData) {
  await assertOwnerAuthenticated();
  const context = await getOwnerTenantContext();
  const locale = String(formData.get('locale') || 'en').trim() || 'en';

  if (!context) {
    redirect(`/${locale}/login`);
  }

  const access = resolveOwnerEditAccess(context.lifecycleStatus);
  if (!access.canEditSettings) {
    const returnTo = String(formData.get('returnTo') || 'setup').trim();
    const path = returnTo === 'settings' ? 'settings' : 'setup';
    redirect(`/${locale}/${path}?error=read_only`);
  }

  const slug = context.slug;
  const previousTenant = await getTenantRecord(slug);
  if (!previousTenant) {
    redirect(`/${locale}/setup?error=not_found`);
  }

  if (previousTenant.id !== context.tenantId) {
    redirect(`/${locale}/setup?error=not_found`);
  }

  const name = String(formData.get('name') || '').trim();
  if (!name) {
    const returnTo = String(formData.get('returnTo') || 'setup').trim();
    const path = returnTo === 'settings' ? 'settings' : 'setup';
    redirect(`/${locale}/${path}?error=name`);
  }

  const result = await persistTenantSettings({
    actor: { kind: 'owner', tenantId: context.tenantId, userId: context.userId },
    slug,
    originalSlug: slug,
    name,
    cityPackId: previousTenant.city_pack_id,
    subscriptionStartsAt: '',
    subscriptionEndsAt: '',
    formData,
    previous: previousTenant,
  });

  if (!result.ok) {
    const returnTo = String(formData.get('returnTo') || 'setup').trim();
    const path = returnTo === 'settings' ? 'settings' : 'setup';
    redirect(`/${locale}/${path}?error=save`);
  }

  revalidatePath(`/${locale}/setup`, 'page');
  revalidatePath(`/${locale}/settings`, 'page');

  const returnTo = String(formData.get('returnTo') || 'setup').trim();
  if (returnTo === 'settings') {
    redirect(`/${locale}/settings?saved=1`);
  }
  redirect(`/${locale}/setup?saved=1`);
}
