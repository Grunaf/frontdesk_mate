'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  CheckInRequiredSheet,
  resolveGuestStaySetupPath,
  useGuestSession,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { isCheckInDayOrLater } from '@/features/stay-essentials/lib/resolveShowSettlementBanner';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from '@/views/arrival-journey';
import type { StaySetupInitialState } from '@/views/stay-setup';
import { SITE_CONFIG } from '@/shared/config';
import { useLocale, useTranslations } from '@/shared/i18n';
import { Button, IconBackActionsRow } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { ensureStayContactSaved } from '@/features/guest-stay-contact/lib/ensureStayContactSaved';
import { resolveRegistrationStandalonePrimary } from '../lib/resolveRegistrationFooterAction';
import { useRegistrationStepState } from '../model/useRegistrationStepState';
import { RegistrationStepBody } from './RegistrationStepBody';

interface RegistrationCoordinatorProps {
  initial: StaySetupInitialState;
}

export function RegistrationCoordinator({ initial }: RegistrationCoordinatorProps) {
  const t = useTranslations('pages.staySetup');
  const tNav = useTranslations('pages.navigation');
  const locale = useLocale();
  const router = useRouter();
  const isRegistered = useIsGuestRegistered();
  const { checkInAt } = useGuestSession();
  const { hostel } = useTenant();
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);

  const checkInDayOrLater = checkInAt
    ? isCheckInDayOrLater(checkInAt, new Date(), hostel.propertyTimeZone)
    : false;

  const {
    tenantSlug,
    tourismRequired,
    tourismComplete,
    entryDateComplete,
    contactComplete,
    passportVerified,
    stayContactWhatsapp,
    completion,
    registrationComplete,
    showArrivalStep,
    accordionValue,
    setAccordionValue,
    handleTourismComplete,
    handleEntryDateComplete,
    handleContactComplete,
    openArrivalStep,
    closeArrivalStepToIdentity,
    contactDraftWhatsapp,
    setContactDraftWhatsapp,
  } = useRegistrationStepState({ initial, isRegistered });

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

  const goToConcierge = useCallback(() => {
    router.push(`/${locale}${SITE_CONFIG.routes.app.concierge.path}`);
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

  const onContactComplete = useCallback(
    (savedWhatsapp: string) => {
      handleContactComplete(savedWhatsapp);

      if (!checkInDayOrLater || !passportVerified) {
        return;
      }

      const nextCompletion = {
        tourismRequired,
        tourismComplete,
        entryDateComplete,
        contactComplete: true,
        passportVerified,
      };

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
    [
      checkInDayOrLater,
      handleContactComplete,
      locale,
      router,
      tourismRequired,
      tourismComplete,
      entryDateComplete,
      passportVerified,
    ]
  );

  const footerPrimary = resolveRegistrationStandalonePrimary({
    isRegistered,
    checkInDayOrLater,
    registrationComplete,
    passportVerified,
  });

  const openCheckInSheet = () => setCheckInSheetOpen(true);

  const handleFooterPrimary = () => {
    if (footerPrimary.kind === 'checkIn') {
      openCheckInSheet();
      return;
    }
    if (footerPrimary.kind === 'concierge') {
      goToConcierge();
      return;
    }
    if (footerPrimary.kind === 'continueEssentials') {
      void (async () => {
        const result = await ensureStayContactSaved({
          tenantSlug,
          contactComplete,
          savedE164: stayContactWhatsapp,
          draftValue: contactDraftWhatsapp,
        });
        if (!result.ok) {
          setAccordionValue('contact');
          return;
        }
        if (!result.skipped) {
          handleContactComplete(result.e164);
        }
        continueToStaySetup();
      })();
    }
  };

  const footerLabel =
    footerPrimary.kind === 'checkIn'
      ? t('guestCheckIn.checkInToContinue')
      : footerPrimary.kind === 'concierge'
        ? tNav('goToConcierge')
        : footerPrimary.kind === 'continueEssentials'
          ? t('registration.allCompleteCta')
          : null;

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col overflow-x-hidden bg-background')}>
      <ArrivalGuideStepsShell stepsLayout="scrollLinked">
        <div className="mt-2 px-4">
          <h1 className="text-lg font-semibold">{t('tabs.registration')}</h1>
        </div>
      </ArrivalGuideStepsShell>

      <main className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RegistrationStepBody
            tourismRequired={tourismRequired}
            tourismComplete={tourismComplete}
            entryDateComplete={entryDateComplete}
            contactComplete={contactComplete}
            registrationComplete={registrationComplete}
            passportVerified={passportVerified}
            showArrivalStep={showArrivalStep}
            accordionValue={accordionValue}
            onAccordionValueChange={setAccordionValue}
            interactionEnabled={isRegistered}
            tenantSlug={tenantSlug}
            stayContactWhatsapp={stayContactWhatsapp}
            onTourismComplete={handleTourismComplete}
            onEntryDateComplete={handleEntryDateComplete}
            onContactComplete={onContactComplete}
            onContactDraftChange={setContactDraftWhatsapp}
            onOpenArrivalStep={openArrivalStep}
            onArrivalBackToIdentity={closeArrivalStepToIdentity}
            registrationSurface="standalone"
          />
        </div>
        <IconBackActionsRow className="mt-3" onBack={goBack}>
          {footerLabel ? (
            <Button size="lg" onClick={handleFooterPrimary}>
              {footerLabel}
            </Button>
          ) : (
            <span className="sr-only" aria-hidden />
          )}
        </IconBackActionsRow>
      </main>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </div>
  );
}
