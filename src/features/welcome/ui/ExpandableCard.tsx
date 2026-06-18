'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui';

interface ExpandableCardProps {
  title: string;
  preview: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  label?: string;
}

export function ExpandableCard({
  title,
  preview,
  children,
  isOpen,
  onToggle,
  label,
}: ExpandableCardProps) {
  return (
    <Accordion
      type="single"
      collapsible
      value={isOpen ? 'content' : ''}
      onValueChange={() => onToggle()}
      className="rounded-xl border-0 shadow-sm"
    >
      <AccordionItem value="content" className="rounded-xl border bg-card">
        <AccordionTrigger className="px-3 py-3 hover:no-underline">
          <div className="flex w-full flex-col items-start gap-2 text-left">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-sm font-medium text-muted-foreground">{preview}</span>
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="border-t bg-muted/30 px-3 pb-3">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
