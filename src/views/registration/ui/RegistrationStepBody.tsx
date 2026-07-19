'use client';

import { EntryDateStepPanel } from '@/features/guest-tourism-registration';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import type { RegistrationSurface } from '../lib/registrationSurface';
import { RegistrationPrerequisitesAccordion } from './RegistrationPrerequisitesAccordion';

export type { RegistrationSurface } from '../lib/registrationSurface';

export type RegistrationStepBodyProps = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
  registrationComplete: boolean;
  passportVerified?: boolean;
  showArrivalStep: boolean;
  accordionValue: RegistrationAccordionItem;
  onAccordionValueChange: (value: RegistrationAccordionItem) => void;
  interactionEnabled: boolean;
  tenantSlug: string;
  stayContactWhatsapp: string | null;
  onTourismComplete: () => void;
  onEntryDateComplete: (savedDate: string | null) => void;
  onContactComplete: (savedWhatsapp: string) => void;
  onContactDraftChange?: (draft: string) => void;
  onOpenArrivalStep?: () => void;
  onArrivalBackToIdentity?: () => void;
  className?: string;
  showCompleteHint?: boolean;
  registrationSurface?: RegistrationSurface;
};

export function RegistrationStepBody({
  tourismRequired,
  tourismComplete,
  entryDateComplete,
  contactComplete,
  registrationComplete,
  passportVerified = false,
  showArrivalStep,
  accordionValue,
  onAccordionValueChange,
  interactionEnabled,
  tenantSlug,
  stayContactWhatsapp,
  onTourismComplete,
  onEntryDateComplete,
  onContactComplete,
  onContactDraftChange,
  onOpenArrivalStep,
  onArrivalBackToIdentity,
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

  if (showArrivalStep) {
    return (
      <div className={cn('space-y-3 py-2', className)}>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
          <EntryDateStepPanel
            tenantSlug={tenantSlug}
            entryDateComplete={entryDateComplete}
            interactionEnabled={interactionEnabled}
            navigationMode={registrationSurface}
            showIntroHeading={showIntroHeading}
            onComplete={onEntryDateComplete}
            onBack={onArrivalBackToIdentity}
          />
        </div>
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
        entryDateComplete={entryDateComplete}
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
        onContactBackToArrival={onOpenArrivalStep}
        registrationSurface={registrationSurface}
        showIntroHeading={showIntroHeading}
      />
    </div>
  );
}
