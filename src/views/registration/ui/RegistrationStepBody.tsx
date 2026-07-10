'use client';

import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import { RegistrationPrerequisitesAccordion } from './RegistrationPrerequisitesAccordion';

export type RegistrationStepBodyProps = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
  registrationComplete: boolean;
  accordionValue: RegistrationAccordionItem;
  onAccordionValueChange: (value: RegistrationAccordionItem) => void;
  interactionEnabled: boolean;
  tenantSlug: string;
  stayContactWhatsapp: string | null;
  onTourismComplete: () => void;
  onContactComplete: (savedWhatsapp: string) => void;
  className?: string;
  showCompleteHint?: boolean;
};

export function RegistrationStepBody({
  tourismRequired,
  tourismComplete,
  contactComplete,
  registrationComplete,
  accordionValue,
  onAccordionValueChange,
  interactionEnabled,
  tenantSlug,
  stayContactWhatsapp,
  onTourismComplete,
  onContactComplete,
  className,
  showCompleteHint = true,
}: RegistrationStepBodyProps) {
  const t = useTranslations('pages.staySetup');

  if (registrationComplete) {
    if (!showCompleteHint) {
      return null;
    }

    return (
      <p className={cn('text-sm text-muted-foreground', className)}>{t('registration.completeHint')}</p>
    );
  }

  return (
    <div className={cn('py-2', className)}>
      <RegistrationPrerequisitesAccordion
        tourismRequired={tourismRequired}
        tourismComplete={tourismComplete}
        contactComplete={contactComplete}
        value={accordionValue}
        onValueChange={onAccordionValueChange}
        interactionEnabled={interactionEnabled}
        tenantSlug={tenantSlug}
        stayContactWhatsapp={stayContactWhatsapp}
        onTourismComplete={onTourismComplete}
        onContactComplete={onContactComplete}
      />
    </div>
  );
}
