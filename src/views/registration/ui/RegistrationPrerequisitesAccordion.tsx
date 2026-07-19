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
  shouldShowRegistrationIdentityAccordionItem,
} from '../lib/resolveRegistrationAccordionItem';

import type { RegistrationSurface } from '../lib/registrationSurface';

type RegistrationPrerequisitesAccordionProps = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
  passportVerified?: boolean;
  value: RegistrationAccordionItem;
  onValueChange: (value: RegistrationAccordionItem) => void;
  interactionEnabled: boolean;
  tenantSlug: string;
  stayContactWhatsapp: string | null;
  onTourismComplete: () => void;
  onContactComplete: (savedWhatsapp: string) => void;
  onContactDraftChange?: (draft: string) => void;
  /** When tourism required, contact back returns to arrival card (not an accordion item). */
  onContactBackToArrival?: () => void;
  registrationSurface?: RegistrationSurface;
  showIntroHeading?: boolean;
};

export function RegistrationPrerequisitesAccordion({
  tourismRequired,
  tourismComplete,
  entryDateComplete,
  contactComplete,
  passportVerified = false,
  value,
  onValueChange,
  interactionEnabled,
  tenantSlug,
  stayContactWhatsapp,
  onTourismComplete,
  onContactComplete,
  onContactDraftChange,
  onContactBackToArrival,
  registrationSurface = 'standalone',
  showIntroHeading = true,
}: RegistrationPrerequisitesAccordionProps) {
  const navigationMode = registrationSurface;
  const t = useTranslations('pages.staySetup.tabs');

  const showIdentity = shouldShowRegistrationIdentityAccordionItem(tourismRequired);
  const contactLocked = isRegistrationContactAccordionDisabled(
    tourismRequired,
    tourismComplete,
    entryDateComplete
  );

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
      {showIdentity ? (
        <AccordionItem
          value="identity"
          className="border-b border-border/60 bg-transparent data-open:bg-transparent"
        >
          <AccordionTrigger
            size="section"
            className={cn('min-h-12 items-center py-3', tourismComplete && 'text-foreground/80')}
          >
            {t('identity')}
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <TourismGuestsRegistrationPanel
              interactionEnabled={interactionEnabled}
              navigationMode={navigationMode}
              showIntroHeading={showIntroHeading}
              showPassportWaiting={
                tourismComplete && entryDateComplete && contactComplete && !passportVerified
              }
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
              showIdentity
                ? () => {
                    if (onContactBackToArrival && tourismComplete) {
                      onContactBackToArrival();
                      return;
                    }
                    onValueChange('identity');
                  }
                : undefined
            }
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
