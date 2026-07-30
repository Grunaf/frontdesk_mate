'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { validateTourismWhatsapp } from '@/features/guest-tourism-registration/lib/validateTourismWhatsapp';

export type SaveStayContactActionResult =
  | { ok: true; mode: 'confirmed' | 'pending' }
  | {
      ok: false;
      error: 'unauthorized' | 'invalid_whatsapp' | 'db_unavailable';
    };

/**
 * Guest stay contact save:
 * - No confirmed phone yet → write `contact_phone` (first fill).
 * - Confirmed phone exists → write `contact_phone_pending` (guest change request).
 * Repeated edits overwrite pending only.
 */
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

  const { data: existing, error: loadError } = await admin
    .from('guest_reservations')
    .select('contact_phone')
    .eq('id', session.stayId)
    .maybeSingle();

  if (loadError) {
    console.error('saveStayContactAction load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const hasConfirmed = Boolean(existing?.contact_phone && String(existing.contact_phone).trim());
  const updatedAt = new Date().toISOString();
  const patch = hasConfirmed
    ? {
        contact_phone_pending: whatsappResult.e164,
        updated_at: updatedAt,
      }
    : {
        contact_phone: whatsappResult.e164,
        contact_phone_pending: null,
        updated_at: updatedAt,
      };

  const { error } = await admin
    .from('guest_reservations')
    .update(patch)
    .eq('id', session.stayId);

  if (error) {
    console.error('saveStayContactAction:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, mode: hasConfirmed ? 'pending' : 'confirmed' };
}
