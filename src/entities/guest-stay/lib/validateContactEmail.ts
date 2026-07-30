export type ValidateContactEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: 'invalid_email' | 'email_required' };

const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize reception contact email (trim + lowercase local-part-safe).
 */
export function validateContactEmail(raw: string): ValidateContactEmailResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'email_required' };
  }

  if (trimmed.length > 254 || !CONTACT_EMAIL_RE.test(trimmed)) {
    return { ok: false, error: 'invalid_email' };
  }

  return { ok: true, email: trimmed.toLowerCase() };
}
