'use client';

import { useMemo, useState } from 'react';
import {
  getHouseRules,
  resolveHouseRulesForDisplay,
  type ResolvedHouseRuleDisplay,
} from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Badge, badgeVariants, Icon } from '@/shared/ui';
import { HostelRuleDetailSheet } from './HostelRuleDetailSheet';

interface HostelRulesProps {
  settings: TenantSettings;
  variant?: 'compact' | 'full';
}

function hasRuleDetail(rule: ResolvedHouseRuleDisplay): boolean {
  return rule.detail.trim().length > 0;
}

export function HostelRules({ settings, variant = 'full' }: HostelRulesProps) {
  const rulesComponent = useTranslations('components.rules');
  const displays = useMemo(() => {
    return resolveHouseRulesForDisplay(getHouseRules(settings));
  }, [settings]);
  const [selectedRule, setSelectedRule] = useState<ResolvedHouseRuleDisplay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (displays.length === 0) {
    return null;
  }

  const expandableRules = displays.filter(hasRuleDetail);

  const openRule = (rule: ResolvedHouseRuleDisplay) => {
    setSelectedRule(rule);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setSelectedRule(null);
    }
  };

  const Wrapper = variant === 'compact' ? 'div' : 'section';

  return (
    <Wrapper>
      {variant === 'full' ? (
        <h3 className="text-sm font-semibold text-foreground">{rulesComponent('title')}</h3>
      ) : null}

      {expandableRules.length > 0 ? (
        <p
          className={cn(
            'text-xs text-muted-foreground',
            variant === 'full' ? 'mt-1' : 'mt-1.5'
          )}
        >
          {rulesComponent('tapHint')}
        </p>
      ) : null}

      <div
        className={cn(
          'flex flex-wrap gap-2',
          variant === 'full' ? 'mt-2' : expandableRules.length > 0 ? 'mt-3' : null
        )}
      >
        {displays.map((rule) => {
          if (!hasRuleDetail(rule)) {
            return (
              <Badge key={rule.id} variant="outline" className="gap-1.5 px-3 py-1.5">
                <Icon icon={rule.icon} className="h-3 w-3 text-muted-foreground" />
                {rule.summary}
              </Badge>
            );
          }

          return (
            <button
              key={rule.id}
              type="button"
              className={cn(
                badgeVariants({ variant: 'outline' }),
                'min-h-11 gap-1.5 px-3 py-2 text-left active:bg-muted/60'
              )}
              onClick={() => openRule(rule)}
              aria-label={rulesComponent('openDetail', { rule: rule.summary })}
            >
              <Icon icon={rule.icon} className="h-3 w-3 shrink-0 text-muted-foreground" />
              {rule.summary}
            </button>
          );
        })}
      </div>

      <HostelRuleDetailSheet
        rule={selectedRule}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </Wrapper>
  );
}
