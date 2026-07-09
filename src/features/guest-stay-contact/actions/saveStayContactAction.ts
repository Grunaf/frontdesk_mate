'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { validateTourismWhatsapp } from '@/features/guest-tourism-registration/lib/validateTourismWhatsapp';

export type SaveStayContactActionResult =
  | { ok: true }
  | {
      ok: false;
      error: 'unauthorized' | 'invalid_whatsapp' | 'db_unavailable';
    };

export async function saveStayContactAction(
  tenantSlug: string,
  contactWhatsapp: string
): Promise<SaveStayContactActionResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  const whatsappResult = validateTourismWhatsapp(contactWhatsapp);
  if (!whatsappResult.ok) {
    return { ok: false, error: 'invalid_whatsapp' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const updatedAt = new Date().toISOString();
  const { error } = await admin
    .from('guest_reservations')
    .update({
      stay_contact_whatsapp: whatsappResult.e164,
      updated_at: updatedAt,
    })
    .eq('id', session.stayId);

  if (error) {
    console.error('saveStayContactAction:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}
