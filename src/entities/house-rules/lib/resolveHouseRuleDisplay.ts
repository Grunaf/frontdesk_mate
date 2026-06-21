import { getRuleTemplate, getRuleTemplateIcon, type RuleRenderContext } from './catalog';
import type { HouseRule, RuleIconId } from '../model/types';
import type { LucideIcon } from 'lucide-react';
import { validateHouseRule } from './validateHouseRule';

export interface ResolvedHouseRuleDisplay {
  id: string;
  summary: string;
  detail: string;
  icon: LucideIcon;
  valid: boolean;
}

export function resolveHouseRuleDisplay(
  rule: HouseRule,
  ctx: RuleRenderContext = {}
): ResolvedHouseRuleDisplay | null {
  if (!rule.enabled) {
    return null;
  }

  const validation = validateHouseRule(rule);
  if (!validation.valid) {
    return null;
  }

  if (rule.templateId === 'custom') {
    return {
      id: rule.id,
      summary: rule.summary.trim(),
      detail: rule.detail.trim(),
      icon: getRuleTemplateIcon('custom', rule.icon),
      valid: true,
    };
  }

  const template = getRuleTemplate(rule.templateId);
  if (!template) {
    return null;
  }

  const rendered = template.render(rule.params ?? {}, ctx);
  return {
    id: rule.id,
    summary: rendered.summary.trim(),
    detail: rendered.detail.trim(),
    icon: getRuleTemplateIcon(rule.templateId),
    valid: true,
  };
}

export function resolveHouseRulesForDisplay(
  rules: HouseRule[],
  ctx: RuleRenderContext = {}
): ResolvedHouseRuleDisplay[] {
  return rules
    .map((rule) => resolveHouseRuleDisplay(rule, ctx))
    .filter((entry): entry is ResolvedHouseRuleDisplay => entry !== null);
}

export function resolveCustomRuleIcon(icon?: RuleIconId): LucideIcon {
  return getRuleTemplateIcon('custom', icon);
}
