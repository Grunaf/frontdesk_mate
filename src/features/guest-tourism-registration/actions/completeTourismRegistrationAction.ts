'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import {
  getTourismRegistrationByStayId,
  listTourismGuestsByStayId,
} from '@/entities/guest-tourism-registration/server';
import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { validateTourismWhatsapp } from '../lib/validateTourismWhatsapp';

export type CompleteTourismRegistrationActionResult =
  | { ok: true; alreadyComplete?: boolean }
  | {
      ok: false;
      error:
        | 'feature_disabled'
        | 'unauthorized'
        | 'invalid_whatsapp'
        | 'whatsapp_required'
        | 'no_guests'
        | 'db_unavailable';
    };

export async function completeTourismRegistrationAction(
  tenantSlug: string,
  contactWhatsapp: string
): Promise<CompleteTourismRegistrationActionResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(slug);
  if (!tenant || !resolveTourismRegistrationRequired(tenant.settings)) {
    return { ok: false, error: 'feature_disabled' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  const registration = await getTourismRegistrationByStayId(session.stayId);
  if (registration && isTourismRegistrationComplete(registration)) {
    return { ok: true, alreadyComplete: true };
  }

  const guests = await listTourismGuestsByStayId(session.stayId);
  if (guests.length < 1) {
    return { ok: false, error: 'no_guests' };
  }

  const whatsappResult = validateTourismWhatsapp(contactWhatsapp);
  if (!whatsappResult.ok) {
    return { ok: false, error: whatsappResult.error };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await admin
    .from('guest_stays')
    .update({
      tourism_contact_whatsapp: whatsappResult.e164,
      tourism_registration_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', session.stayId)
    .is('tourism_registration_completed_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('completeTourismRegistrationAction:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    const latest = await getTourismRegistrationByStayId(session.stayId);
    if (latest && isTourismRegistrationComplete(latest)) {
      return { ok: true, alreadyComplete: true };
    }
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}
