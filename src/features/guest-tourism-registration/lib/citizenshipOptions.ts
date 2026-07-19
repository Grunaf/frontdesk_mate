/** ISO-3166-1 alpha-2 codes for citizenship select. */
export const CITIZENSHIP_ISO_CODES = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AR', 'AM', 'AU', 'AT', 'AZ',
  'BH', 'BD', 'BY', 'BE', 'BZ', 'BA', 'BR', 'BG', 'CA', 'CL',
  'CN', 'CO', 'HR', 'CY', 'CZ', 'DK', 'EG', 'EE', 'ET', 'FI',
  'FR', 'GE', 'DE', 'GH', 'GR', 'HK', 'HU', 'IS', 'IN', 'ID',
  'IR', 'IQ', 'IE', 'IL', 'IT', 'JP', 'JO', 'KZ', 'KE', 'XK',
  'KW', 'KG', 'LV', 'LB', 'LY', 'LI', 'LT', 'LU', 'MY', 'MT',
  'MX', 'MD', 'MC', 'MN', 'ME', 'MA', 'NP', 'NL', 'NZ', 'NG',
  'MK', 'NO', 'OM', 'PK', 'PS', 'PE', 'PH', 'PL', 'PT', 'QA',
  'RO', 'RU', 'SA', 'RS', 'SG', 'SK', 'SI', 'ZA', 'KR', 'ES',
  'LK', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TH', 'TR', 'TM', 'UA',
  'AE', 'GB', 'US', 'UZ', 'VE', 'VN',
] as const;

export type CitizenshipIsoCode = (typeof CITIZENSHIP_ISO_CODES)[number];

const CITIZENSHIP_SET = new Set<string>(CITIZENSHIP_ISO_CODES);

/**
 * Default citizenship from UI locale.
 * Mapped: ru→RU, sr→RS. Unmapped locales (incl. en) → ME (property country).
 */
const LOCALE_TO_DEFAULT_CITIZENSHIP: Record<string, string> = {
  ru: 'RU',
  sr: 'RS',
};

export function localeToDefaultCitizenship(locale: string): string {
  const normalized = locale.trim().toLowerCase().split('-')[0] ?? '';
  const mapped = LOCALE_TO_DEFAULT_CITIZENSHIP[normalized];
  if (mapped) return mapped;
  return 'ME';
}

export function isKnownCitizenshipCode(code: string): boolean {
  return CITIZENSHIP_SET.has(code.trim().toUpperCase());
}

export type CitizenshipOption = {
  code: string;
  label: string;
};

/** Build select options with localized country names (falls back to ISO code). */
export function buildCitizenshipOptions(locale: string): CitizenshipOption[] {
  const displayNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null;

  return CITIZENSHIP_ISO_CODES.map((code) => {
    const label = displayNames?.of(code === 'XK' ? 'XK' : code) ?? code;
    return { code, label: label === code ? code : `${label} (${code})` };
  }).sort((a, b) => a.label.localeCompare(b.label, locale));
}
