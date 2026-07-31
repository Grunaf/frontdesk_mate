'use client';

import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import type { TourismGuestListItem } from '@/features/guest-tourism-registration';
import type { RegistrationAccordionOpenValue } from '../lib/resolveRegistrationAccordionItem';
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
  /** When true, hide passport-waiting banner (bed already unlocked). */
  bedVisible?: boolean;
  accordionValue: RegistrationAccordionOpenValue;
  onAccordionValueChange: (value: RegistrationAccordionOpenValue) => void;
  interactionEnabled: boolean;
  tenantSlug: string;
  stayContactWhatsapp: string | null;
  initialTourismGuests?: TourismGuestListItem[];
  initialTourismComplete?: boolean;
  onTourismComplete: () => void;
  onEntryDateComplete: (savedDate: string | null) => void;
  onContactComplete: (savedWhatsapp: string) => void;
  onContactDraftChange?: (draft: string) => void;
  onContactEditingChange?: (editing: boolean) => void;
  className?: string;
  /** @deprecated Kept for call-site compatibility; completed state uses collapsed accordion. */
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
  bedVisible = false,
  accordionValue,
  onAccordionValueChange,
  interactionEnabled,
  tenantSlug,
  stayContactWhatsapp,
  initialTourismGuests,
  initialTourismComplete,
  onTourismComplete,
  onEntryDateComplete,
  onContactComplete,
  onContactDraftChange,
  onContactEditingChange,
  className,
  registrationSurface = 'standalone',
  showCompleteHint = false,
}: RegistrationStepBodyProps) {
  const t = useTranslations('pages.staySetup');
  const showPassportWaiting = registrationComplete && !passportVerified && !bedVisible;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {showPassportWaiting ? (
        <div className="mb-3 shrink-0 rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
          <p className="text-sm font-medium leading-snug text-foreground">
            {t('registration.passportWaitingTitle')}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {t('registration.passportWaitingDescription')}
          </p>
        </div>
      ) : null}
      <RegistrationPrerequisitesAccordion
        className="min-h-0 flex-1"
        tourismRequired={tourismRequired}
        tourismComplete={tourismComplete}
        entryDateComplete={entryDateComplete}
        contactComplete={contactComplete}
        value={accordionValue}
        onValueChange={onAccordionValueChange}
        interactionEnabled={interactionEnabled}
        tenantSlug={tenantSlug}
        stayContactWhatsapp={stayContactWhatsapp}
        initialTourismGuests={initialTourismGuests}
        initialTourismComplete={initialTourismComplete}
        onTourismComplete={onTourismComplete}
        onEntryDateComplete={onEntryDateComplete}
        onContactComplete={onContactComplete}
        onContactDraftChange={onContactDraftChange}
        onContactEditingChange={onContactEditingChange}
        registrationSurface={registrationSurface}
      />
    </div>
  );
}
