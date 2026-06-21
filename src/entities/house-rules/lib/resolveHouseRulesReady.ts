import type { TenantSettings } from '@/entities/tenant/model/settings';
import { getHouseRules } from './normalizeHouseRules';
import { validateHouseRule } from './validateHouseRule';
import type { HouseRule } from '../model/types';

export interface HouseRulesReadyResult {
  ready: boolean;
  validEnabledCount: number;
  invalidEnabledRules: HouseRule[];
  quietHoursMissingTimes: boolean;
}

export function resolveHouseRulesReady(settings: TenantSettings | undefined): HouseRulesReadyResult {
  const rules = getHouseRules(settings);
  const enabledRules = rules.filter((rule) => rule.enabled);
  const invalidEnabledRules: HouseRule[] = [];
  let validEnabledCount = 0;
  let quietHoursMissingTimes = false;

  for (const rule of enabledRules) {
    const validation = validateHouseRule(rule);
    if (!validation.valid) {
      invalidEnabledRules.push(rule);
      if (
        rule.templateId === 'quietHours' &&
        validation.issues.some((issue) => issue.field === 'from' || issue.field === 'to')
      ) {
        quietHoursMissingTimes = true;
      }
      continue;
    }
    validEnabledCount += 1;
  }

  return {
    ready: validEnabledCount > 0,
    validEnabledCount,
    invalidEnabledRules,
    quietHoursMissingTimes,
  };
}

export function resolveHouseRulesReadyDetail(settings: TenantSettings | undefined): string | undefined {
  const result = resolveHouseRulesReady(settings);
  if (result.ready) {
    return undefined;
  }
  if (result.quietHoursMissingTimes) {
    return 'Quiet hours need start and end times';
  }
  if (result.validEnabledCount === 0 && result.invalidEnabledRules.length > 0) {
    return 'Fix invalid house rules before launch';
  }
  return 'Add at least one house rule';
}
