/** Input-mask templates (e.g. "+### ## ### ###") are not display labels. */
export function isInputMaskPattern(value?: string): boolean {
  return Boolean(value?.includes('#'));
}

export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;

  if (digits.length === 11 && (digits.startsWith('387') || digits.startsWith('382'))) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  return `+${digits}`;
}

/** Pick the first human-readable label; fall back to formatting `raw`. */
export function resolvePhoneDisplay(raw: string | undefined, ...candidates: (string | undefined)[]): string {
  if (!raw) return '';

  for (const candidate of candidates) {
    if (candidate && !isInputMaskPattern(candidate)) {
      return candidate;
    }
  }

  return formatPhoneDisplay(raw);
}
