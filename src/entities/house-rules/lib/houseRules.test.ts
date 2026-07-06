import { describe, expect, it } from 'vitest';
import {
  getHouseRules,
  migrateActiveRulesKeys,
  resolveHouseRuleDisplay,
  resolveHouseRulesForDisplay,
  resolveHouseRulesReady,
  validateHouseRule,
} from '@/entities/house-rules';

describe('migrateActiveRulesKeys', () => {
  it('maps legacy keys to template rules with quiet hours defaults', () => {
    const rules = migrateActiveRulesKeys(['quietHours', 'alcohol']);
    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({
      templateId: 'quietHours',
      params: { from: '22:00', to: '08:00' },
    });
    expect(rules[1]).toMatchObject({ templateId: 'alcohol' });
  });

  it('ignores removed legacy keys such as registration', () => {
    const rules = migrateActiveRulesKeys(['registration', 'smoking']);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ templateId: 'smoking' });
  });
});

describe('getHouseRules', () => {
  it('drops stored rules whose template is not in the catalog', () => {
    const rules = getHouseRules({
      houseRules: [
        { id: 'registration', templateId: 'registration' as 'alcohol', enabled: true },
        { id: 'laundry', templateId: 'laundry' as 'alcohol', enabled: true },
        { id: 'alcohol', templateId: 'alcohol', enabled: true },
      ],
    });
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ templateId: 'alcohol' });
  });
});

describe('validateHouseRule', () => {
  it('requires quiet hours times when enabled', () => {
    const result = validateHouseRule({
      id: 'quiet-hours',
      templateId: 'quietHours',
      enabled: true,
      params: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'from')).toBe(true);
  });

  it('blocks custom rule when summary exceeds limit', () => {
    const result = validateHouseRule({
      id: 'custom-1',
      templateId: 'custom',
      enabled: true,
      summary: 'x'.repeat(33),
      detail: 'Valid detail text',
    });
    expect(result.valid).toBe(false);
  });

  it('accepts simple template without params', () => {
    const result = validateHouseRule({
      id: 'smoking',
      templateId: 'smoking',
      enabled: true,
    });
    expect(result.valid).toBe(true);
  });
});

describe('resolveHouseRuleDisplay', () => {
  it('renders quiet hours with params', () => {
    const display = resolveHouseRuleDisplay({
      id: 'quiet-hours',
      templateId: 'quietHours',
      enabled: true,
      params: { from: '22:00', to: '08:00' },
    });
    expect(display?.summary).toBe('Quiet hours 22:00–08:00');
    expect(display?.detail).toContain('22:00');
  });

  it('renders custom rule as-is', () => {
    const display = resolveHouseRuleDisplay({
      id: 'custom-1',
      templateId: 'custom',
      enabled: true,
      summary: 'No outside drinks',
      detail: 'You can buy at our bar.',
      icon: 'glass',
    });
    expect(display?.summary).toBe('No outside drinks');
    expect(display?.detail).toBe('You can buy at our bar.');
  });
});

describe('resolveHouseRulesReady', () => {
  it('passes when at least one valid enabled rule exists', () => {
    const result = resolveHouseRulesReady({
      houseRules: [
        { id: 'alcohol', templateId: 'alcohol', enabled: true },
      ],
    });
    expect(result.ready).toBe(true);
  });

  it('fails when no rules are enabled', () => {
    const result = resolveHouseRulesReady({ houseRules: [] });
    expect(result.ready).toBe(false);
  });

  it('migrates legacy activeRulesKeys on read', () => {
    const rules = getHouseRules({ activeRulesKeys: ['quietHours', 'alcohol'] });
    const result = resolveHouseRulesReady({ houseRules: rules });
    expect(result.ready).toBe(true);
  });
});

describe('resolveHouseRulesForDisplay', () => {
  it('skips invalid enabled rules', () => {
    const displays = resolveHouseRulesForDisplay([
      { id: 'bad', templateId: 'quietHours', enabled: true, params: {} },
      { id: 'good', templateId: 'alcohol', enabled: true },
    ]);
    expect(displays).toHaveLength(1);
    expect(displays[0]?.summary).toBe('No outside drinks');
  });
});
