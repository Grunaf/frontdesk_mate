'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckInRequiredSheet,
  resolveGuestStaySetupPath,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from '@/views/arrival-journey';
import type { StaySetupInitialState } from '@/views/stay-setup';
import { isStaySetupRegistrationComplete } from '@/views/stay-setup/lib/resolveStaySetupSteps';
import { SITE_CONFIG } from '@/shared/config';
import { useLocale, useTranslations } from '@/shared/i18n';
import { Button, IconBackActionsRow } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import { resolveOpenRegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import { RegistrationPrerequisitesAccordion } from './RegistrationPrerequisitesAccordion';

interface RegistrationCoordinatorProps {
  initial: StaySetupInitialState;
}

export function RegistrationCoordinator({ initial }: RegistrationCoordinatorProps) {
  const t = useTranslations('pages.staySetup');
  const locale = useLocale();
  const router = useRouter();
  const { slug: tenantSlug, settings } = useTenant();
  const tourismRequired = resolveTourismRegistrationRequired(settings);
  const isRegistered = useIsGuestRegistered();

  const [tourismComplete, setTourismComplete] = useState(initial.tourismComplete);
  const [contactComplete, setContactComplete] = useState(initial.contactComplete);
  const [stayContactWhatsapp, setStayContactWhatsapp] = useState(initial.stayContactWhatsapp);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);

  const completion = useMemo(
    () => ({
      tourismRequired,
      tourismComplete,
      contactComplete,
    }),
    [tourismRequired, tourismComplete, contactComplete]
  );

  const registrationComplete = isStaySetupRegistrationComplete(completion);

  const [accordionValue, setAccordionValue] = useState<RegistrationAccordionItem>(() =>
    resolveOpenRegistrationAccordionItem(completion)
  );

  useEffect(() => {
    setTourismComplete(initial.tourismComplete);
    setContactComplete(initial.contactComplete);
    setStayContactWhatsapp(initial.stayContactWhatsapp);
  }, [initial.tourismComplete, initial.contactComplete, initial.stayContactWhatsapp]);

  useEffect(() => {
    if (isRegistered) {
      setCheckInSheetOpen(false);
      return;
    }

    setCheckInSheetOpen(true);
  }, [isRegistered]);

  const goBack = useCallback(() => {
    router.push(`/${locale}${SITE_CONFIG.routes.app.staySetup.path}`);
  }, [locale, router]);

  const continueToStaySetup = useCallback(() => {
    router.push(
      resolveGuestStaySetupPath({
        locale,
        step: 'essentials',
        tourismRequired,
        completion,
      })
    );
    router.refresh();
  }, [locale, router, tourismRequired, completion]);

  const handleTourismComplete = useCallback(() => {
    setTourismComplete(true);
    setAccordionValue('contact');
  }, []);

  const handleContactComplete = useCallback(
    (savedWhatsapp: string) => {
      const nextCompletion = {
        tourismRequired,
        tourismComplete,
        contactComplete: true,
      };

      setStayContactWhatsapp(savedWhatsapp);
      setContactComplete(true);

      router.push(
        resolveGuestStaySetupPath({
          locale,
          step: 'essentials',
          tourismRequired,
          completion: nextCompletion,
        })
      );
      router.refresh();
    },
    [locale, router, tourismRequired, tourismComplete]
  );

  const interactionEnabled = isRegistered;

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col overflow-x-hidden bg-background')}>
      <ArrivalGuideStepsShell stepsLayout="scrollLinked">
        <div className="mt-2 px-4">
          <h1 className="text-lg font-semibold">{t('tabs.registration')}</h1>
        </div>
      </ArrivalGuideStepsShell>

      <main className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4">
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {registrationComplete ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('registration.completeHint')}</p>
              <Button size="lg" className="w-full sm:w-auto" onClick={continueToStaySetup}>
                {t('registration.allCompleteCta')}
              </Button>
            </div>
          ) : (
            <RegistrationPrerequisitesAccordion
              tourismRequired={tourismRequired}
              tourismComplete={tourismComplete}
              contactComplete={contactComplete}
              value={accordionValue}
              onValueChange={setAccordionValue}
              interactionEnabled={interactionEnabled}
              tenantSlug={tenantSlug}
              stayContactWhatsapp={stayContactWhatsapp}
              onTourismComplete={handleTourismComplete}
              onContactComplete={handleContactComplete}
            />
          )}
        </div>
        <IconBackActionsRow className="mt-3" onBack={goBack}>
          <span className="sr-only" aria-hidden />
        </IconBackActionsRow>
      </main>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </div>
  );
}
