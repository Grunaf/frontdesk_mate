import type { TenantSettings } from '@/entities/tenant/model/settings';
import { getRuleTemplate } from './catalog';
import type { HouseRule, RuleTemplateId } from '../model/types';

const LEGACY_KEY_TO_TEMPLATE: Record<string, Exclude<RuleTemplateId, 'custom'>> = {
  quietHours: 'quietHours',
  smoking: 'smoking',
  alcohol: 'alcohol',
};

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

/** Drops custom-invalid and template rules that are not in the current catalog (e.g. removed templates). */
export function retainSupportedHouseRules(rules: HouseRule[]): HouseRule[] {
  return rules.filter((rule) => {
    if (rule.templateId === 'custom') {
      return true;
    }
    return getRuleTemplate(rule.templateId) !== undefined;
  });
}

export function getHouseRules(settings: TenantSettings | undefined): HouseRule[] {
  if (!settings) {
    return [];
  }

  if (settings.houseRules !== undefined) {
    return retainSupportedHouseRules(settings.houseRules);
  }

  if (settings.activeRulesKeys?.length) {
    return retainSupportedHouseRules(migrateActiveRulesKeys(settings.activeRulesKeys));
  }

  return [];
}

export function isHouseRulesModuleTracked(settings: TenantSettings | undefined): boolean {
  if (!settings) {
    return false;
  }
  return settings.houseRules !== undefined || settings.activeRulesKeys !== undefined;
}
