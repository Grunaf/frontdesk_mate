import { describe, expect, it } from 'vitest';
import {
  composePhoneRaw,
  detectPhoneCountryPresetId,
  extractNationalDigitsFromRaw,
  formatNationalPhoneInput,
  formatPhoneWithCountryPreset,
  inferPhoneDisplayPreset,
  resolvePhoneFormatPresetForDraft,
} from './phone-display-presets';
import { formatPhoneDisplay, resolvePhoneDisplay, resolveStoredPhoneMask } from './phoneDisplay';

describe('national phone input mask', () => {
  it('formats BA national digits', () => {
    expect(formatNationalPhoneInput('61538331', [2, 3, 3])).toBe('(61) 538 331');
    expect(formatNationalPhoneInput('61', [2, 3, 3])).toBe('(61)');
    expect(formatNationalPhoneInput('6', [2, 3, 3])).toBe('(6');
  });

  it('formats RS national digits', () => {
    expect(formatNationalPhoneInput('641234567', [2, 3, 4])).toBe('(64) 123 4567');
  });

  it('composes and splits raw', () => {
    expect(composePhoneRaw('387', '61538331')).toBe('38761538331');
    expect(extractNationalDigitsFromRaw('38761538331', 'ba')).toBe('61538331');
  });

  it('resolves draft preset as auto when canonical', () => {
    expect(resolvePhoneFormatPresetForDraft('38761538331', 'ba')).toBe('auto');
    expect(resolvePhoneFormatPresetForDraft('38761538331', 'me')).toBe('me');
  });
});

describe('phone country presets', () => {
  it('detects BA, ME, RS from digit length', () => {
    expect(detectPhoneCountryPresetId('38761538331')).toBe('ba');
    expect(detectPhoneCountryPresetId('38267019719')).toBe('me');
    expect(detectPhoneCountryPresetId('381641234567')).toBe('rs');
  });

  it('formats Balkan numbers', () => {
    expect(formatPhoneWithCountryPreset('38761538331', 'ba')).toBe('+387 61 538 331');
    expect(formatPhoneWithCountryPreset('38267019719', 'me')).toBe('+382 67 019 719');
    expect(formatPhoneWithCountryPreset('381641234567', 'rs')).toBe('+381 64 123 4567');
  });
});

describe('formatPhoneDisplay', () => {
  it('auto-formats known country codes', () => {
    expect(formatPhoneDisplay('38761538331')).toBe('+387 61 538 331');
    expect(formatPhoneDisplay('38267019719')).toBe('+382 67 019 719');
    expect(formatPhoneDisplay('381641234567')).toBe('+381 64 123 4567');
  });

  it('falls back to plus digits for unknown lengths', () => {
    expect(formatPhoneDisplay('441234567890')).toBe('+441234567890');
  });
});

describe('resolvePhoneDisplay', () => {
  it('uses explicit preset over stored mask', () => {
    expect(resolvePhoneDisplay('38761538331', '+387 old', 'ba')).toBe('+387 61 538 331');
  });

  it('uses custom mask when preset is custom', () => {
    expect(resolvePhoneDisplay('38761538331', '+387 61 538 331 (reception)', 'custom')).toBe(
      '+387 61 538 331 (reception)'
    );
  });

  it('keeps legacy mask when preset is unset', () => {
    expect(resolvePhoneDisplay('38761538331', '+387 61 538 331')).toBe('+387 61 538 331');
  });
});

describe('resolveStoredPhoneMask', () => {
  it('computes mask for preset modes', () => {
    expect(resolveStoredPhoneMask('381641234567', undefined, 'rs')).toBe('+381 64 123 4567');
  });

  it('stores custom mask verbatim', () => {
    expect(resolveStoredPhoneMask('38761538331', 'call us', 'custom')).toBe('call us');
  });
});

describe('inferPhoneDisplayPreset', () => {
  it('prefers stored preset', () => {
    expect(inferPhoneDisplayPreset('38761538331', undefined, 'rs')).toBe('rs');
  });

  it('detects auto when mask matches formatted number', () => {
    expect(inferPhoneDisplayPreset('38761538331', '+387 61 538 331')).toBe('auto');
  });

  it('uses custom when mask differs', () => {
    expect(inferPhoneDisplayPreset('38761538331', 'Reception desk')).toBe('custom');
  });
});
