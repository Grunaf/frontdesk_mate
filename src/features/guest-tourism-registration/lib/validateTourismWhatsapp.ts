const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export type ValidateTourismWhatsappResult =
  | { ok: true; e164: string }
  | { ok: false; error: 'invalid_whatsapp' | 'whatsapp_required' };

/**
 * Normalize guest contact WhatsApp to E.164 (`+` + digits).
 */
export function validateTourismWhatsapp(raw: string): ValidateTourismWhatsappResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'whatsapp_required' };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    return { ok: false, error: 'invalid_whatsapp' };
  }

  return { ok: true, e164: `+${digits}` };
}
