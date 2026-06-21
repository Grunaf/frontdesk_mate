'use server';

import { redirect } from 'next/navigation';
import { getTenantRecord, resolveTenantSlug } from '@/entities/tenant/server';
import { verifyDeskPin, isDeskPinConfigured } from './lib/deskPin';
import { clearReceptionSession, setReceptionSession } from './lib/receptionSession';

export async function loginReceptionAction(formData: FormData) {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    redirect('/login?error=no_tenant');
  }

  const pin = formData.get('pin')?.toString() ?? '';
  const tenant = await getTenantRecord(tenantSlug);

  if (!tenant) {
    redirect('/login?error=no_tenant');
  }

  const storedHash = tenant.settings.reception?.deskPinHash;
  if (!isDeskPinConfigured(storedHash)) {
    redirect('/login?error=pin_not_configured');
  }

  if (!verifyDeskPin(tenantSlug, pin, storedHash)) {
    redirect('/login?error=invalid_pin');
  }

  await setReceptionSession(tenantSlug);
  redirect('/');
}

export async function logoutReceptionAction() {
  await clearReceptionSession();
  redirect('/login');
}
