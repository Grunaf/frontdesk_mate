import { RULES_DISPLAY_CONFIG } from '@/entities/hostel';
import { useTranslations } from '@/shared/i18n';
import { Badge, Icon } from '@/shared/ui';

interface HostelRulesProps {
  activeRulesKeys: Array<keyof typeof RULES_DISPLAY_CONFIG>;
}

export function HostelRules({ activeRulesKeys }: HostelRulesProps) {
  const hostelInfo = useTranslations('domains.hostel');
  const rulesData = hostelInfo.raw('rules') || {};
  const rulesComponent = useTranslations('components.rules');

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">{rulesComponent('title')}</h3>

      <div className="flex flex-wrap gap-2">
        {activeRulesKeys.map((key) => {
          const rule = rulesData[key];
          const config = RULES_DISPLAY_CONFIG[key];
          if (!rule || !config) return null;

          return (
            <Badge key={key} variant="outline" title={rule.content} className="gap-1.5 px-3 py-1.5">
              <Icon icon={config.icon} className="h-3 w-3 text-muted-foreground" />
              {rule.summary}
            </Badge>
          );
        })}
      </div>
    </section>
  );
}
