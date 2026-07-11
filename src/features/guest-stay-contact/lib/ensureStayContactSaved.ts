import { validateTourismWhatsapp } from '@/features/guest-tourism-registration';
import { saveStayContactAction } from '../actions/saveStayContactAction';

export type EnsureStayContactSavedResult =
  | { ok: true; e164: string; skipped: boolean }
  | { ok: false; error: 'invalid_whatsapp' | 'save_failed' | 'empty' };

export async function ensureStayContactSaved(input: {
  tenantSlug: string;
  contactComplete: boolean;
  savedE164: string | null;
  draftValue: string;
}): Promise<EnsureStayContactSavedResult> {
  const saved = input.savedE164?.trim();
  if (input.contactComplete && saved) {
    const existing = validateTourismWhatsapp(saved);
    if (existing.ok) {
      return { ok: true, e164: existing.e164, skipped: true };
    }
  }

  const trimmedDraft = input.draftValue.trim();
  if (!trimmedDraft) {
    return { ok: false, error: 'empty' };
  }

  const validation = validateTourismWhatsapp(trimmedDraft);
  if (!validation.ok) {
    return { ok: false, error: 'invalid_whatsapp' };
  }

  const result = await saveStayContactAction(input.tenantSlug, trimmedDraft);
  if (!result.ok) {
    return { ok: false, error: 'save_failed' };
  }

  return { ok: true, e164: validation.e164, skipped: false };
}
