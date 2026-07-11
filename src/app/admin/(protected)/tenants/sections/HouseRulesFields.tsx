'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  CUSTOM_RULE_ICON_OPTIONS,
  getHouseRules,
  getRuleTemplate,
  HOUSE_RULE_DETAIL_MAX,
  HOUSE_RULE_SUMMARY_MAX,
  HOUSE_RULE_TEMPLATES,
  isTemplateAlreadyAdded,
  resolveHouseRulesForDisplay,
  resolveHouseRulesReady,
  resolveHouseRulesReadyDetail,
  validateHouseRule,
  type HouseRule,
  type RuleIconId,
  type RuleTemplateId,
} from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { cn } from '@/shared/lib/utils';
import { Badge, Icon } from '@/shared/ui';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { useSyncedFormRef } from '../lib/syncTenantFormDraft';

interface HouseRulesFieldsProps {
  settings?: TenantSettings;
  readinessInput?: TenantReadinessInput;
}

function createRuleId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function createTemplateRule(templateId: Exclude<RuleTemplateId, 'custom'>): HouseRule {
  if (templateId === 'quietHours') {
    return {
      id: 'quiet-hours',
      templateId,
      enabled: true,
      params: { from: '22:00', to: '08:00' },
    };
  }
  return { id: templateId, templateId, enabled: true };
}

export function HouseRulesFields({ settings, readinessInput }: HouseRulesFieldsProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );

  const [rules, setRules] = useState<HouseRule[]>(() => getHouseRules(settings ?? {}));
  const rulesRef = useSyncedFormRef(rules);

  const syncRules = (next: HouseRule[]) => {
    rulesRef.current = next;
    setRules(next);
    updateDraft({ houseRules: next });
  };

  const applyRules = (updater: (current: HouseRule[]) => HouseRule[]) => {
    const next = updater(rulesRef.current);
    if (next === rulesRef.current) {
      return;
    }
    syncRules(next);
  };

  const [pendingTemplate, setPendingTemplate] = useState<Exclude<RuleTemplateId, 'custom'> | null>(
    null
  );
  const [pendingParams, setPendingParams] = useState<Record<string, string>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customSummary, setCustomSummary] = useState('');
  const [customDetail, setCustomDetail] = useState('');
  const [customIcon, setCustomIcon] = useState<RuleIconId | ''>('');

  const readyState = resolveHouseRulesReady({ ...mergedSettings, houseRules: rules });
  const previewRules = resolveHouseRulesForDisplay(rules.filter((rule) => rule.enabled));

  const customSummaryTooLong = customSummary.length > HOUSE_RULE_SUMMARY_MAX;
  const customDetailTooLong = customDetail.length > HOUSE_RULE_DETAIL_MAX;
  const customValid =
    customSummary.trim().length > 0 &&
    customDetail.trim().length > 0 &&
    !customSummaryTooLong &&
    !customDetailTooLong;

  const updateRule = (id: string, patch: Partial<HouseRule>) => {
    applyRules((current) =>
      current.map((rule) => (rule.id === id ? ({ ...rule, ...patch } as HouseRule) : rule))
    );
  };

  const removeRule = (id: string) => {
    applyRules((current) => current.filter((rule) => rule.id !== id));
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    applyRules((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const addTemplateRule = (templateId: Exclude<RuleTemplateId, 'custom'>) => {
    const template = getRuleTemplate(templateId);
    if (!template || isTemplateAlreadyAdded(rules, templateId)) {
      return;
    }

    if (template.kind === 'configured') {
      setPendingTemplate(templateId);
      setPendingParams(
        templateId === 'quietHours' ? { from: '22:00', to: '08:00' } : { cost: '' }
      );
      return;
    }

    applyRules((current) => [...current, createTemplateRule(templateId)]);
  };

  const confirmPendingTemplate = () => {
    if (!pendingTemplate) {
      return;
    }
    const draftRule = createTemplateRule(pendingTemplate);
    if (draftRule.templateId !== 'custom') {
      draftRule.params = { ...pendingParams };
    }
    const validation = validateHouseRule(draftRule);
    if (!validation.valid) {
      return;
    }
    applyRules((current) => [...current, draftRule]);
    setPendingTemplate(null);
    setPendingParams({});
  };

  const addCustomRule = () => {
    if (!customValid) {
      return;
    }
    applyRules((current) => [
      ...current,
      {
        id: createRuleId('custom'),
        templateId: 'custom',
        enabled: true,
        summary: customSummary.trim(),
        detail: customDetail.trim(),
        icon: customIcon || undefined,
      },
    ]);
    setCustomSummary('');
    setCustomDetail('');
    setCustomIcon('');
    setCustomOpen(false);
  };

  const gateDetail = resolveHouseRulesReadyDetail({ ...mergedSettings, houseRules: rules });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Your house rules</h4>
            <p className="text-xs text-muted-foreground">
              Badge preview matches what guests see in arrival and FAQ.
            </p>
          </div>
          {!readyState.ready ? (
            <span className="text-xs font-medium text-amber-700">{gateDetail}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3 min-h-[44px]">
          {previewRules.length > 0 ? (
            previewRules.map((rule) => (
              <Badge key={rule.id} variant="outline" title={rule.detail} className="gap-1.5 px-3 py-1.5">
                <Icon icon={rule.icon} className="size-[calc(0.75rem*1.15*1.15)] text-muted-foreground" />
                {rule.summary}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No valid rules yet — add from templates below.</span>
          )}
        </div>
      </div>

      {rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((rule, index) => {
            const validation = validateHouseRule(rule);
            const template =
              rule.templateId !== 'custom' ? getRuleTemplate(rule.templateId) : undefined;

            return (
              <li
                key={rule.id}
                className={cn(
                  'rounded-lg border p-3',
                  rule.enabled && !validation.valid && 'border-amber-400 bg-amber-50/40'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })}
                    />
                    {rule.templateId === 'custom'
                      ? rule.summary || 'Custom rule'
                      : template?.label ?? rule.templateId}
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveRule(index, -1)}
                      disabled={index === 0}
                      className="rounded border p-1 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <Icon icon={ChevronUp} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRule(index, 1)}
                      disabled={index === rules.length - 1}
                      className="rounded border p-1 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <Icon icon={ChevronDown} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="rounded border p-1 text-red-700"
                      aria-label="Remove rule"
                    >
                      <Icon icon={Trash2} className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {rule.templateId === 'quietHours' ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="block space-y-1 text-xs">
                      <span>From</span>
                      <input
                        type="time"
                        value={rule.params?.from ?? ''}
                        onChange={(event) =>
                          updateRule(rule.id, {
                            params: { ...rule.params, from: event.target.value },
                          })
                        }
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span>To</span>
                      <input
                        type="time"
                        value={rule.params?.to ?? ''}
                        onChange={(event) =>
                          updateRule(rule.id, {
                            params: { ...rule.params, to: event.target.value },
                          })
                        }
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                ) : null}

                {rule.templateId === 'custom' ? (
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>{rule.summary}</p>
                    <p>{rule.detail}</p>
                  </div>
                ) : null}

                {rule.enabled && !validation.valid ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-amber-800">
                    {validation.issues.map((issue) => (
                      <li key={`${rule.id}-${issue.field}`}>{issue.message}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Add from templates</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {HOUSE_RULE_TEMPLATES.map((template) => {
            const added = isTemplateAlreadyAdded(rules, template.id);
            return (
              <button
                key={template.id}
                type="button"
                disabled={added}
                onClick={() => addTemplateRule(template.id)}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm transition-colors',
                  added
                    ? 'cursor-not-allowed bg-muted/40 text-muted-foreground'
                    : 'hover:border-primary/40 hover:bg-muted/20'
                )}
              >
                <span className="font-medium">{template.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{template.description}</span>
                {added ? <span className="mt-1 block text-[10px] uppercase tracking-wide">Added</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {pendingTemplate ? (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">
            Configure {getRuleTemplate(pendingTemplate)?.label}
          </p>
          {pendingTemplate === 'quietHours' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1 text-xs">
                <span>From</span>
                <input
                  type="time"
                  value={pendingParams.from ?? ''}
                  onChange={(event) =>
                    setPendingParams((current) => ({ ...current, from: event.target.value }))
                  }
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span>To</span>
                <input
                  type="time"
                  value={pendingParams.to ?? ''}
                  onChange={(event) =>
                    setPendingParams((current) => ({ ...current, to: event.target.value }))
                  }
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmPendingTemplate}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Add to list
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingTemplate(null);
                setPendingParams({});
              }}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setCustomOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        >
          <span className="inline-flex items-center gap-2">
            <Icon icon={Plus} className="h-4 w-4" />
            Add custom rule
          </span>
          <Icon icon={customOpen ? ChevronUp : ChevronDown} className="h-4 w-4 text-muted-foreground" />
        </button>
        {customOpen ? (
          <div className="space-y-3 border-t px-4 pb-4 pt-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium">
                Summary ({customSummary.length}/{HOUSE_RULE_SUMMARY_MAX})
              </span>
              <input
                value={customSummary}
                onChange={(event) => setCustomSummary(event.target.value)}
                maxLength={HOUSE_RULE_SUMMARY_MAX + 5}
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 text-sm',
                  customSummaryTooLong && 'border-red-400'
                )}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">
                Detail ({customDetail.length}/{HOUSE_RULE_DETAIL_MAX})
              </span>
              <textarea
                value={customDetail}
                onChange={(event) => setCustomDetail(event.target.value)}
                rows={3}
                maxLength={HOUSE_RULE_DETAIL_MAX + 10}
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 text-sm',
                  customDetailTooLong && 'border-red-400'
                )}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Icon</span>
              <select
                value={customIcon}
                onChange={(event) => setCustomIcon(event.target.value as RuleIconId | '')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Default</option>
                {CUSTOM_RULE_ICON_OPTIONS.map((iconId) => (
                  <option key={iconId} value={iconId}>
                    {iconId}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!customValid}
              onClick={addCustomRule}
              className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Add custom rule
            </button>
          </div>
        ) : null}
      </div>

      {readinessInput && !readyState.ready ? (
        <p className="text-xs text-amber-700">{gateDetail}</p>
      ) : null}
    </div>
  );
}
