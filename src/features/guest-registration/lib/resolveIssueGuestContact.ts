import { validateContactEmail } from '@/entities/guest-stay/lib/validateContactEmail';
import { validateTourismWhatsapp } from '@/features/guest-tourism-registration/lib/validateTourismWhatsapp';

export type ResolveIssueGuestContactResult =
  | { ok: true; contactPhone: string | null; contactEmail: string | null }
  | {
      ok: false;
      error: 'contact_required' | 'invalid_phone' | 'invalid_email';
    };

/**
 * Reception issue access: require at least one of phone or email,
 * unless staff explicitly skips (no usable contact on the OTA booking).
 */
export function resolveIssueGuestContact(input: {
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactSkipped?: boolean;
}): ResolveIssueGuestContactResult {
  if (input.contactSkipped) {
    return { ok: true, contactPhone: null, contactEmail: null };
  }

  const rawPhone = input.contactPhone?.trim() ?? '';
  const rawEmail = input.contactEmail?.trim() ?? '';

  let contactPhone: string | null = null;
  if (rawPhone) {
    const phoneResult = validateTourismWhatsapp(rawPhone);
    if (!phoneResult.ok) {
      return { ok: false, error: 'invalid_phone' };
    }
    contactPhone = phoneResult.e164;
  }

  let contactEmail: string | null = null;
  if (rawEmail) {
    const emailResult = validateContactEmail(rawEmail);
    if (!emailResult.ok) {
      return { ok: false, error: 'invalid_email' };
    }
    contactEmail = emailResult.email;
  }

  if (!contactPhone && !contactEmail) {
    return { ok: false, error: 'contact_required' };
  }

  return { ok: true, contactPhone, contactEmail };
}
