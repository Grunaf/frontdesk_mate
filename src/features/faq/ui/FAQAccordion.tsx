'use client';

import { useMemo } from 'react';
import { getHouseRules, resolveHouseRulesForDisplay } from '@/entities/house-rules';
import type { ResolvedHouseRuleDisplay } from '@/entities/house-rules';
import { useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui';

export type FAQAccordionVariant = 'compact' | 'full';

const COMPACT_FAQ_LIMIT = 2;

export function useFaqDisplays(): ResolvedHouseRuleDisplay[] {
  const { settings } = useTenant();

  return useMemo(() => resolveHouseRulesForDisplay(getHouseRules(settings)), [settings]);
}

type FAQAccordionProps = {
  variant?: FAQAccordionVariant;
};

export function FAQAccordion({ variant = 'full' }: FAQAccordionProps) {
  const displays = useFaqDisplays();
  const tTitle = useTranslations('components.rules');

  if (displays.length === 0) {
    return null;
  }

  const items = variant === 'compact' ? displays.slice(0, COMPACT_FAQ_LIMIT) : displays;

  const accordion = (
    <Accordion type="multiple" className="space-y-2 border-0">
      {items.map((rule) => (
        <AccordionItem
          key={rule.id}
          value={rule.id}
          className="overflow-hidden rounded-xl border bg-muted/50 px-4"
        >
          <AccordionTrigger className="py-4 hover:no-underline">
            <span className="text-sm font-medium">{rule.summary}</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {rule.detail}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  if (variant === 'compact') {
    return accordion;
  }

  return (
    <section className="space-y-3">
      <h3 className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {tTitle('title')}
      </h3>
      {accordion}
    </section>
  );
}
