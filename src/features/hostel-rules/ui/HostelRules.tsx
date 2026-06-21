'use client';

import { getHouseRules, resolveHouseRulesForDisplay } from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { Badge, Icon } from '@/shared/ui';

interface HostelRulesProps {
  settings: TenantSettings;
}

export function HostelRules({ settings }: HostelRulesProps) {
  const rulesComponent = useTranslations('components.rules');
  const displays = resolveHouseRulesForDisplay(getHouseRules(settings), {
    laundryCost: settings.laundryCost,
  });

  if (displays.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">{rulesComponent('title')}</h3>

      <div className="flex flex-wrap gap-2">
        {displays.map((rule) => (
          <Badge key={rule.id} variant="outline" title={rule.detail} className="gap-1.5 px-3 py-1.5">
            <Icon icon={rule.icon} className="h-3 w-3 text-muted-foreground" />
            {rule.summary}
          </Badge>
        ))}
      </div>
    </section>
  );
}
