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

import type { RegistrationSurface } from '../lib/registrationSurface';

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
  onContactDraftChange?: (draft: string) => void;
  registrationSurface?: RegistrationSurface;
  showIntroHeading?: boolean;
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
  onContactDraftChange,
  registrationSurface = 'standalone',
  showIntroHeading = true,
}: RegistrationPrerequisitesAccordionProps) {
  const navigationMode = registrationSurface;
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
        <AccordionItem
          value="register"
          className="border-b border-border/60 bg-transparent data-open:bg-transparent"
        >
          <AccordionTrigger
            size="section"
            className={cn('min-h-12 items-center py-3', tourismComplete && 'text-foreground/80')}
          >
            {t('register')}
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <TourismGuestsRegistrationPanel
              interactionEnabled={interactionEnabled}
              navigationMode={navigationMode}
              showIntroHeading={showIntroHeading}
              onComplete={onTourismComplete}
            />
          </AccordionContent>
        </AccordionItem>
      ) : null}

      <AccordionItem
        value="contact"
        className="border-b border-border/60 bg-transparent data-open:bg-transparent"
      >
        <AccordionTrigger
          disabled={contactLocked}
          size="section"
          className={cn('min-h-12 items-center py-3', contactComplete && 'text-foreground/80')}
        >
          {t('contact')}
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          <StayContactStepPanel
            tenantSlug={tenantSlug}
            initialContactWhatsapp={stayContactWhatsapp}
            contactComplete={contactComplete}
            interactionEnabled={interactionEnabled}
            navigationMode={navigationMode}
            showIntroHeading={showIntroHeading}
            onDraftChange={onContactDraftChange}
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
