function trimValue(value?: string): string {
  return value?.trim() ?? '';
}

function normalizeHttpUrl(raw: string): string | null {
  const trimmed = trimValue(raw);
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function resolveInstagramHref(raw?: string): string | null {
  const trimmed = trimValue(raw);
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const handle = trimmed.replace(/^@/, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

export function resolveFacebookHref(raw?: string): string | null {
  const trimmed = trimValue(raw);
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const handle = trimmed.replace(/^@/, '');
  return handle ? `https://facebook.com/${handle}` : null;
}

export function resolveGuestChatHref(raw?: string): string | null {
  const trimmed = trimValue(raw);
  if (!trimmed) {
    return null;
  }

  return normalizeHttpUrl(trimmed);
}

export function isWhatsappHref(href: string): boolean {
  return /^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)/i.test(href);
}
