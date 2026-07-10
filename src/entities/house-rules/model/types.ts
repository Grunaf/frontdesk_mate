export type RuleTemplateId =
  | 'quietHours'
  | 'smoking'
  | 'alcohol'
  | 'selfService'
  | 'labelYourFood'
  | 'custom';

export type RuleTemplateKind = 'simple' | 'configured' | 'custom';

export type RuleIconId =
  | 'moon'
  | 'cigarette'
  | 'glass'
  | 'shield'
  | 'bubbles'
  | 'shirt'
  | 'volume'
  | 'clock'
  | 'ban';

export interface HouseRuleBase {
  id: string;
  enabled: boolean;
}

export interface TemplateHouseRule extends HouseRuleBase {
  templateId: Exclude<RuleTemplateId, 'custom'>;
  params?: Record<string, string>;
}

export interface CustomHouseRule extends HouseRuleBase {
  templateId: 'custom';
  summary: string;
  detail: string;
  icon?: RuleIconId;
}

export type HouseRule = TemplateHouseRule | CustomHouseRule;

export const HOUSE_RULE_SUMMARY_MAX = 32;
export const HOUSE_RULE_DETAIL_MAX = 160;
