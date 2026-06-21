import { getRuleTemplate } from './catalog';
import type { HouseRule, RuleTemplateId } from '../model/types';
import { HOUSE_RULE_DETAIL_MAX, HOUSE_RULE_SUMMARY_MAX } from '../model/types';

export interface HouseRuleValidationIssue {
  field: string;
  message: string;
}

export interface HouseRuleValidationResult {
  valid: boolean;
  issues: HouseRuleValidationIssue[];
}

function validateTime(value: string | undefined, field: string): HouseRuleValidationIssue | null {
  if (!value?.trim()) {
    return { field, message: 'Time is required' };
  }
  if (!/^\d{2}:\d{2}$/.test(value.trim())) {
    return { field, message: 'Use HH:MM format' };
  }
  return null;
}

export function validateHouseRule(rule: HouseRule): HouseRuleValidationResult {
  if (!rule.enabled) {
    return { valid: true, issues: [] };
  }

  if (rule.templateId === 'custom') {
    const issues: HouseRuleValidationIssue[] = [];
    const summary = rule.summary?.trim() ?? '';
    const detail = rule.detail?.trim() ?? '';

    if (!summary) {
      issues.push({ field: 'summary', message: 'Summary is required' });
    } else if (summary.length > HOUSE_RULE_SUMMARY_MAX) {
      issues.push({ field: 'summary', message: `Max ${HOUSE_RULE_SUMMARY_MAX} characters` });
    }

    if (!detail) {
      issues.push({ field: 'detail', message: 'Detail is required' });
    } else if (detail.length > HOUSE_RULE_DETAIL_MAX) {
      issues.push({ field: 'detail', message: `Max ${HOUSE_RULE_DETAIL_MAX} characters` });
    }

    return { valid: issues.length === 0, issues };
  }

  const template = getRuleTemplate(rule.templateId);
  if (!template) {
    return { valid: false, issues: [{ field: 'templateId', message: 'Unknown template' }] };
  }

  const issues: HouseRuleValidationIssue[] = [];
  const params = rule.params ?? {};

  if (template.paramSchema?.from) {
    const issue = validateTime(params.from, 'from');
    if (issue) issues.push(issue);
  }
  if (template.paramSchema?.to) {
    const issue = validateTime(params.to, 'to');
    if (issue) issues.push(issue);
  }

  const rendered = template.render(params, {});
  if (rendered.summary.length > HOUSE_RULE_SUMMARY_MAX) {
    issues.push({ field: 'summary', message: `Summary too long (max ${HOUSE_RULE_SUMMARY_MAX})` });
  }
  if (rendered.detail.length > HOUSE_RULE_DETAIL_MAX) {
    issues.push({ field: 'detail', message: `Detail too long (max ${HOUSE_RULE_DETAIL_MAX})` });
  }

  return { valid: issues.length === 0, issues };
}

export function isTemplateAlreadyAdded(
  rules: HouseRule[],
  templateId: Exclude<RuleTemplateId, 'custom'>
): boolean {
  return rules.some((rule) => rule.templateId === templateId);
}
