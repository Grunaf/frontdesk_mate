import type { AppLocale, LocalizedText } from '../model/types';
import { resolveLocalizedText } from '../model/localized';

/** Tips with non-empty copy for the active guest locale (order preserved). */
export function resolveRouteTipsForGuest(
  tips: LocalizedText[] | undefined,
  locale: AppLocale
): string[] | undefined {
  if (!tips?.length) {
    return undefined;
  }

  const resolved = tips
    .map((tip) => resolveLocalizedText(tip, locale).trim())
    .filter(Boolean);

  return resolved.length > 0 ? resolved : undefined;
}
