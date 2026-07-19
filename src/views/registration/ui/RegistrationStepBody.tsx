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
  passportVerified?: boolean;
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
  passportVerified = false,
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
      <div className={cn('space-y-3', className)}>
        <p className="text-sm text-muted-foreground">{t('registration.completeHint')}</p>
        {!passportVerified ? (
          <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground">
            {t('registration.passportWaiting')}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 py-2', className)}>
      {registrationComplete && !passportVerified ? (
        <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground">
          {t('registration.passportWaiting')}
        </p>
      ) : null}
      <RegistrationPrerequisitesAccordion
        tourismRequired={tourismRequired}
        tourismComplete={tourismComplete}
        contactComplete={contactComplete}
        passportVerified={passportVerified}
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
