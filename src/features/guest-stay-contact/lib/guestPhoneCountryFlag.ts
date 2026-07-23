/** ISO-3166-1 alpha-2 → regional-indicator emoji flag (e.g. ME → 🇲🇪). */
export function guestPhoneCountryFlag(countryCode: string): string {
  const iso = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) {
    return '';
  }

  const base = 0x1f1e6; // Regional Indicator Symbol Letter A
  const a = 'A'.charCodeAt(0);
  return String.fromCodePoint(base + (iso.charCodeAt(0) - a), base + (iso.charCodeAt(1) - a));
}
