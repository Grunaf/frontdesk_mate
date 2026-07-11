'use client';

import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import type { RegistrationSurface } from '../lib/registrationSurface';
import { RegistrationPrerequisitesAccordion } from './RegistrationPrerequisitesAccordion';

export type { RegistrationSurface } from '../lib/registrationSurface';

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
  onContactDraftChange?: (draft: string) => void;
  className?: string;
  showCompleteHint?: boolean;
  registrationSurface?: RegistrationSurface;
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
  onContactDraftChange,
  className,
  showCompleteHint = true,
  registrationSurface = 'standalone',
}: RegistrationStepBodyProps) {
  const t = useTranslations('pages.staySetup');
  const showIntroHeading = registrationSurface === 'standalone';

  if (registrationComplete && showCompleteHint) {
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
        onContactDraftChange={onContactDraftChange}
        registrationSurface={registrationSurface}
        showIntroHeading={showIntroHeading}
      />
    </div>
  );
}
