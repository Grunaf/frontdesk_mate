'use client';

import { TourismGuestsRegistrationPanel } from '@/features/guest-tourism-registration';
import { StayContactStepPanel } from '@/features/guest-stay-contact';
import { useTranslations } from '@/shared/i18n';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import {
  isRegistrationContactAccordionDisabled,
  shouldShowRegistrationRegisterAccordionItem,
} from '../lib/resolveRegistrationAccordionItem';

type RegistrationPrerequisitesAccordionProps = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
  value: RegistrationAccordionItem;
  onValueChange: (value: RegistrationAccordionItem) => void;
  interactionEnabled: boolean;
  tenantSlug: string;
  stayContactWhatsapp: string | null;
  onTourismComplete: () => void;
  onContactComplete: (savedWhatsapp: string) => void;
};

export function RegistrationPrerequisitesAccordion({
  tourismRequired,
  tourismComplete,
  contactComplete,
  value,
  onValueChange,
  interactionEnabled,
  tenantSlug,
  stayContactWhatsapp,
  onTourismComplete,
  onContactComplete,
}: RegistrationPrerequisitesAccordionProps) {
  const t = useTranslations('pages.staySetup.tabs');

  const showRegister = shouldShowRegistrationRegisterAccordionItem(tourismRequired);
  const contactLocked = isRegistrationContactAccordionDisabled(tourismRequired, tourismComplete);

  return (
    <Accordion
      type="single"
      collapsible={false}
      value={value}
      onValueChange={(next) => {
        if (!next) {
          return;
        }
        const item = next as RegistrationAccordionItem;
        if (item === 'contact' && contactLocked) {
          return;
        }
        onValueChange(item);
      }}
      className="border-none"
    >
      {showRegister ? (
        <AccordionItem value="register" className="border-b border-border/60">
          <AccordionTrigger
            className={cn('py-3 text-sm font-medium', tourismComplete && 'text-muted-foreground')}
          >
            {t('register')}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <TourismGuestsRegistrationPanel
              interactionEnabled={interactionEnabled}
              onComplete={onTourismComplete}
            />
          </AccordionContent>
        </AccordionItem>
      ) : null}

      <AccordionItem value="contact" className="border-b border-border/60">
        <AccordionTrigger
          disabled={contactLocked}
          className={cn('py-3 text-sm font-medium', contactComplete && 'text-muted-foreground')}
        >
          {t('contact')}
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <StayContactStepPanel
            tenantSlug={tenantSlug}
            initialContactWhatsapp={stayContactWhatsapp}
            interactionEnabled={interactionEnabled}
            onComplete={onContactComplete}
            onBack={
              showRegister
                ? () => {
                    onValueChange('register');
                  }
                : undefined
            }
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
