import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export type ValidateTourismWhatsappResult =
  | { ok: true; e164: string }
  | { ok: false; error: 'invalid_whatsapp' | 'whatsapp_required' };

function toE164Candidate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * Normalize guest contact WhatsApp to E.164 (`+` + digits).
 * Uses libphonenumber-js/min for possible/valid number checks.
 */
export function validateTourismWhatsapp(raw: string): ValidateTourismWhatsappResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'whatsapp_required' };
  }

  const candidate = toE164Candidate(trimmed);
  if (!candidate) {
    return { ok: false, error: 'invalid_whatsapp' };
  }

  const parsed = parsePhoneNumberFromString(candidate);
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: 'invalid_whatsapp' };
  }

  return { ok: true, e164: parsed.format('E.164') };
}
