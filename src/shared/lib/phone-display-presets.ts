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
