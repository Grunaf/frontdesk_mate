export type {
  CustomHouseRule,
  HouseRule,
  HouseRuleBase,
  RuleIconId,
  RuleTemplateId,
  RuleTemplateKind,
  TemplateHouseRule,
} from './model/types';
export {
  HOUSE_RULE_DETAIL_MAX,
  HOUSE_RULE_SUMMARY_MAX,
} from './model/types';
export {
  CUSTOM_RULE_ICON_OPTIONS,
  HOUSE_RULE_TEMPLATES,
  RULE_ICON_MAP,
  getRuleTemplate,
  getRuleTemplateIcon,
  type RuleRenderContext,
  type RuleRenderResult,
  type RuleTemplateDefinition,
} from './lib/catalog';
export {
  getHouseRules,
  isHouseRulesModuleTracked,
  migrateActiveRulesKeys,
} from './lib/normalizeHouseRules';
export {
  resolveHouseRuleDisplay,
  resolveHouseRulesForDisplay,
  resolveCustomRuleIcon,
  type ResolvedHouseRuleDisplay,
} from './lib/resolveHouseRuleDisplay';
export {
  resolveHouseRulesReady,
  resolveHouseRulesReadyDetail,
  type HouseRulesReadyResult,
} from './lib/resolveHouseRulesReady';
export {
  isTemplateAlreadyAdded,
  validateHouseRule,
  type HouseRuleValidationIssue,
  type HouseRuleValidationResult,
} from './lib/validateHouseRule';
