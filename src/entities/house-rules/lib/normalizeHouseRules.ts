import type { TenantSettings } from '@/entities/tenant/model/settings';
import type { HouseRule, RuleTemplateId } from '../model/types';

const LEGACY_KEY_TO_TEMPLATE: Record<string, Exclude<RuleTemplateId, 'custom'>> = {
  quietHours: 'quietHours',
  smoking: 'smoking',
  alcohol: 'alcohol',
  registration: 'registration',
};

const DEPRECATED_RULE_TEMPLATE_IDS = new Set(['laundry']);

const DEFAULT_QUIET_HOURS = { from: '22:00', to: '08:00' };

function migrateLegacyKey(key: string): HouseRule | null {
  const templateId = LEGACY_KEY_TO_TEMPLATE[key];
  if (!templateId) {
    return null;
  }

  const id = templateId === 'quietHours' ? 'quiet-hours' : templateId;

  if (templateId === 'quietHours') {
    return {
      id,
      templateId,
      enabled: true,
      params: { ...DEFAULT_QUIET_HOURS },
    };
  }

  return { id, templateId, enabled: true };
}

export function migrateActiveRulesKeys(keys: string[]): HouseRule[] {
  return keys
    .map((key) => migrateLegacyKey(key))
    .filter((rule): rule is HouseRule => rule !== null);
}

function stripDeprecatedHouseRules(rules: HouseRule[]): HouseRule[] {
  return rules.filter(
    (rule) => !DEPRECATED_RULE_TEMPLATE_IDS.has(rule.templateId as string)
  );
}

export function getHouseRules(settings: TenantSettings | undefined): HouseRule[] {
  if (!settings) {
    return [];
  }

  if (settings.houseRules !== undefined) {
    return stripDeprecatedHouseRules(settings.houseRules);
  }

  if (settings.activeRulesKeys?.length) {
    return stripDeprecatedHouseRules(migrateActiveRulesKeys(settings.activeRulesKeys));
  }

  return [];
}

export function isHouseRulesModuleTracked(settings: TenantSettings | undefined): boolean {
  if (!settings) {
    return false;
  }
  return settings.houseRules !== undefined || settings.activeRulesKeys !== undefined;
}
