import { describe, expect, it } from 'vitest';
import {
  coalesceCityPackTaxiCityRulesForAdmin,
  resolvePackTaxiCityRulesLines,
  splitTaxiCityRulesParagraphs,
} from './resolvePackTaxiCityRules';

describe('splitTaxiCityRulesParagraphs', () => {
  it('splits on blank lines', () => {
    expect(splitTaxiCityRulesParagraphs('Line one.\n\nLine two.')).toEqual(['Line one.', 'Line two.']);
  });
});

describe('resolvePackTaxiCityRulesLines', () => {
  it('prefers taxiCityRules over legacy stand/meter', () => {
    const lines = resolvePackTaxiCityRulesLines(
      {
        taxiCityRules: { en: 'Use the meter.\n\nAvoid curbside touts.' },
        taxiStand: { en: 'Legacy stand' },
        taxiMeter: { en: 'Legacy meter' },
      },
      'en'
    );
    expect(lines).toEqual(['Use the meter.', 'Avoid curbside touts.']);
  });

  it('falls back to stand and meter when taxiCityRules is empty', () => {
    const lines = resolvePackTaxiCityRulesLines(
      {
        taxiStand: { en: 'Official stands only.' },
        taxiMeter: { en: 'Clear the meter first.' },
      },
      'en'
    );
    expect(lines).toEqual(['Official stands only.', 'Clear the meter first.']);
  });
});

describe('coalesceCityPackTaxiCityRulesForAdmin', () => {
  it('merges legacy fields for the single admin input', () => {
    const value = coalesceCityPackTaxiCityRulesForAdmin({
      taxiStand: { en: 'Stand copy' },
      taxiMeter: { en: 'Meter copy' },
    });
    expect(value.en).toBe('Stand copy\n\nMeter copy');
  });
});
