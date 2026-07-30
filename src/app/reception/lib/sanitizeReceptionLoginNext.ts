/**
 * Safe relative path for reception post-login redirect.
 * Rejects absolute URLs, protocol-relative, and non-path values (open-redirect guard).
 */
export function sanitizeReceptionLoginNext(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  if (trimmed.includes('\\') || trimmed.includes('\0')) {
    return null;
  }

  // Block scheme-like segments after the leading slash (e.g. /https://…).
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}
