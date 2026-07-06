/** UI + formatting presets for Balkan mobile numbers. Extend PHONE_COUNTRY_PRESETS to add countries. */
export const PHONE_DISPLAY_PRESET_IDS = ['auto', 'ba', 'me', 'rs', 'custom'] as const;

export type PhoneDisplayPresetId = (typeof PHONE_DISPLAY_PRESET_IDS)[number];

export type PhoneCountryPresetId = Exclude<PhoneDisplayPresetId, 'auto' | 'custom'>;

export interface PhoneCountryPreset {
  id: PhoneCountryPresetId;
  label: string;
  /** Digits without leading +, e.g. "387". */
  countryCode: string;
  /** Digit group lengths after the country code (must sum to national number length). */
  groupsAfterCountry: readonly number[];
}

/** Ordered list — add new Balkan (or other) presets here. */
export const PHONE_COUNTRY_PRESETS: readonly PhoneCountryPreset[] = [
  {
    id: 'ba',
    label: 'Bosnia & Herzegovina (+387)',
    countryCode: '387',
    groupsAfterCountry: [2, 3, 3],
  },
  {
    id: 'me',
    label: 'Montenegro (+382)',
    countryCode: '382',
    groupsAfterCountry: [2, 3, 3],
  },
  {
    id: 'rs',
    label: 'Serbia (+381)',
    countryCode: '381',
    groupsAfterCountry: [2, 3, 4],
  },
] as const;

const PRESET_BY_ID = Object.fromEntries(
  PHONE_COUNTRY_PRESETS.map((preset) => [preset.id, preset])
) as Record<PhoneCountryPresetId, PhoneCountryPreset>;

export const PHONE_DISPLAY_PRESET_OPTIONS: {
  id: PhoneDisplayPresetId;
  label: string;
}[] = [
  { id: 'auto', label: 'Auto-detect country' },
  ...PHONE_COUNTRY_PRESETS.map((preset) => ({ id: preset.id, label: preset.label })),
  { id: 'custom', label: 'Custom display' },
];

export function isPhoneDisplayPresetId(value: string): value is PhoneDisplayPresetId {
  return PHONE_DISPLAY_PRESET_IDS.includes(value as PhoneDisplayPresetId);
}

export function normalizePhoneDisplayPreset(
  value?: string | null
): PhoneDisplayPresetId | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return isPhoneDisplayPresetId(trimmed) ? trimmed : undefined;
}

export function getPhoneCountryPreset(id: PhoneCountryPresetId): PhoneCountryPreset {
  return PRESET_BY_ID[id];
}

export function detectPhoneCountryPresetId(digits: string): PhoneCountryPresetId | undefined {
  for (const preset of PHONE_COUNTRY_PRESETS) {
    const nationalLength = preset.groupsAfterCountry.reduce((sum, group) => sum + group, 0);
    const expectedLength = preset.countryCode.length + nationalLength;

    if (digits.startsWith(preset.countryCode) && digits.length === expectedLength) {
      return preset.id;
    }
  }

  return undefined;
}

export function formatPhoneWithCountryPreset(
  raw: string,
  presetId: PhoneCountryPresetId
): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return raw;
  }

  const preset = getPhoneCountryPreset(presetId);
  const nationalLength = preset.groupsAfterCountry.reduce((sum, group) => sum + group, 0);
  const expectedLength = preset.countryCode.length + nationalLength;

  if (!digits.startsWith(preset.countryCode) || digits.length !== expectedLength) {
    return `+${digits}`;
  }

  const national = digits.slice(preset.countryCode.length);
  let offset = 0;
  const groups = preset.groupsAfterCountry.map((size) => {
    const chunk = national.slice(offset, offset + size);
    offset += size;
    return chunk;
  });

  return `+${preset.countryCode} ${groups.join(' ')}`;
}

export function nationalDigitLength(preset: PhoneCountryPreset): number {
  return preset.groupsAfterCountry.reduce((sum, group) => sum + group, 0);
}

export function nationalInputPlaceholder(groupsAfterCountry: readonly number[]): string {
  if (groupsAfterCountry.length < 2) {
    return groupsAfterCountry.map((size) => 'x'.repeat(size)).join(' ');
  }

  const [first, second, ...rest] = groupsAfterCountry;
  const tail = rest.map((size) => 'x'.repeat(size)).join(' ');
  return `(${ 'x'.repeat(first)}) ${'x'.repeat(second)}${tail ? ` ${tail}` : ''}`;
}

/** Format national digits with grouping mask, e.g. (61) 538 331 */
export function formatNationalPhoneInput(
  nationalDigits: string,
  groupsAfterCountry: readonly number[]
): string {
  const maxLen = groupsAfterCountry.reduce((sum, group) => sum + group, 0);
  const digits = nationalDigits.replace(/\D/g, '').slice(0, maxLen);
  if (!digits) {
    return '';
  }

  let result = '';
  let offset = 0;

  for (let groupIndex = 0; groupIndex < groupsAfterCountry.length; groupIndex += 1) {
    const groupSize = groupsAfterCountry[groupIndex];
    const chunk = digits.slice(offset, offset + groupSize);
    if (!chunk) {
      break;
    }
    offset += chunk.length;

    if (groupIndex === 0) {
      result = `(${chunk}`;
      if (chunk.length === groupSize) {
        result += ')';
      }
      continue;
    }

    const separator = groupIndex === 1 ? (result.endsWith(')') ? ' ' : '') : ' ';
    result += `${separator}${chunk}`;
  }

  return result;
}

export function parseNationalPhoneInput(value: string, maxNationalLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxNationalLength);
}

export function composePhoneRaw(countryCode: string, nationalDigits: string): string {
  const national = nationalDigits.replace(/\D/g, '');
  if (!national) {
    return '';
  }

  return `${countryCode}${national}`;
}

export function extractNationalDigitsFromRaw(
  raw: string,
  countryPresetId: PhoneCountryPresetId
): string {
  const preset = getPhoneCountryPreset(countryPresetId);
  const digits = raw.replace(/\D/g, '');
  const maxNational = nationalDigitLength(preset);

  if (digits.startsWith(preset.countryCode)) {
    return digits.slice(preset.countryCode.length, preset.countryCode.length + maxNational);
  }

  for (const candidate of PHONE_COUNTRY_PRESETS) {
    if (digits.startsWith(candidate.countryCode)) {
      return digits.slice(candidate.countryCode.length, candidate.countryCode.length + maxNational);
    }
  }

  return digits.slice(0, maxNational);
}

/** Country code select value for admin phone control. */
export function resolveAdminCountryPresetId(
  raw: string,
  storedPreset?: PhoneDisplayPresetId | null
): PhoneCountryPresetId {
  const normalized = normalizePhoneDisplayPreset(storedPreset);
  if (normalized === 'ba' || normalized === 'me' || normalized === 'rs') {
    return normalized;
  }

  const digits = raw.replace(/\D/g, '');
  const detected = detectPhoneCountryPresetId(digits);
  if (detected) {
    return detected;
  }

  for (const preset of PHONE_COUNTRY_PRESETS) {
    if (digits.startsWith(preset.countryCode)) {
      return preset.id;
    }
  }

  return 'ba';
}

/** Draft preset after edit: auto when number matches detected Balkan preset. */
export function resolvePhoneFormatPresetForDraft(
  raw: string,
  countryPresetId: PhoneCountryPresetId
): PhoneDisplayPresetId {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return countryPresetId;
  }

  const detected = detectPhoneCountryPresetId(digits);
  if (detected === countryPresetId) {
    return 'auto';
  }

  return countryPresetId;
}

export function inferPhoneDisplayPreset(
  raw?: string,
  mask?: string,
  stored?: string | null
): PhoneDisplayPresetId {
  const normalizedStored = normalizePhoneDisplayPreset(stored);
  if (normalizedStored) {
    return normalizedStored;
  }

  const digits = raw?.replace(/\D/g, '') ?? '';
  const trimmedMask = mask?.trim();

  if (digits) {
    const detected = detectPhoneCountryPresetId(digits);
    if (detected) {
      const autoFormatted = formatPhoneWithCountryPreset(digits, detected);
      if (!trimmedMask || trimmedMask === autoFormatted) {
        return 'auto';
      }
    }
  }

  if (trimmedMask) {
    return 'custom';
  }

  return 'auto';
}
