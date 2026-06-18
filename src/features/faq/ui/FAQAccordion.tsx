import { useTranslations } from '@/shared/i18n';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui';

export function FAQAccordion() {
  const t = useTranslations('domains.hostel');
  const rules = t.raw('rules');
  const ruleKeys = Object.keys(rules);

  return (
    <section className="space-y-3">
      <h3 className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {rules.title}
      </h3>

      <Accordion type="multiple" className="space-y-2 border-0">
        {ruleKeys.map((key) => {
          const rule = rules[key];
          if (!rule?.trigger) return null;

          return (
            <AccordionItem
              key={key}
              value={key}
              className="overflow-hidden rounded-xl border bg-muted/50 px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <span className="text-sm font-medium">{rule.trigger}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                {rule.content}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
