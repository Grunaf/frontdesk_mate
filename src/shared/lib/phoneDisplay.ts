import {
  detectPhoneCountryPresetId,
  formatPhoneWithCountryPreset,
  normalizePhoneDisplayPreset,
  type PhoneCountryPresetId,
  type PhoneDisplayPresetId,
} from './phone-display-presets';

/** Input-mask templates (e.g. "+### ## ### ###") are not display labels. */
export function isInputMaskPattern(value?: string): boolean {
  return Boolean(value?.includes('#'));
}

export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return raw;
  }

  const detected = detectPhoneCountryPresetId(digits);
  if (detected) {
    return formatPhoneWithCountryPreset(digits, detected);
  }

  return `+${digits}`;
}

export function formatPhoneWithPreset(
  raw: string,
  preset: PhoneDisplayPresetId
): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return raw;
  }

  if (preset === 'auto') {
    return formatPhoneDisplay(raw);
  }

  if (preset === 'custom') {
    return formatPhoneDisplay(raw);
  }

  return formatPhoneWithCountryPreset(digits, preset);
}

/** Pick the first human-readable label; fall back to preset formatting or auto-detect. */
export function resolvePhoneDisplay(
  raw: string | undefined,
  mask?: string,
  preset?: PhoneDisplayPresetId
): string {
  if (!raw) {
    return '';
  }

  const normalizedPreset = normalizePhoneDisplayPreset(preset);
  const trimmedMask = mask?.trim();

  if (normalizedPreset === 'custom') {
    if (trimmedMask && !isInputMaskPattern(trimmedMask)) {
      return trimmedMask;
    }

    return formatPhoneDisplay(raw);
  }

  if (normalizedPreset && normalizedPreset !== 'auto') {
    return formatPhoneWithPreset(raw, normalizedPreset);
  }

  if (trimmedMask && !isInputMaskPattern(trimmedMask)) {
    return trimmedMask;
  }

  return formatPhoneDisplay(raw);
}

export function resolveStoredPhoneMask(
  raw: string | undefined,
  mask: string | undefined,
  preset: PhoneDisplayPresetId | undefined
): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalizedPreset = normalizePhoneDisplayPreset(preset) ?? 'auto';

  if (normalizedPreset === 'custom') {
    return mask?.trim() || undefined;
  }

  return resolvePhoneDisplay(raw, undefined, normalizedPreset);
}

export type { PhoneCountryPresetId, PhoneDisplayPresetId };
