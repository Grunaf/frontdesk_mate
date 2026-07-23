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
import { useTenant } from '@/entities/tenant';
import type { StaySetupInitialState } from '@/views/stay-setup';
import { SITE_CONFIG } from '@/shared/config';
import { useLocale, useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';
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
    accordionValue,
    setAccordionValue,
    handleTourismComplete,
    handleEntryDateComplete,
    handleContactComplete,
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
      <main className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4">
        <div className="flex min-h-0 flex-1 flex-col">
          <RegistrationStepBody
            className="flex min-h-0 flex-1 flex-col"
            tourismRequired={tourismRequired}
            tourismComplete={tourismComplete}
            entryDateComplete={entryDateComplete}
            contactComplete={contactComplete}
            registrationComplete={registrationComplete}
            passportVerified={passportVerified}
            accordionValue={accordionValue}
            onAccordionValueChange={setAccordionValue}
            interactionEnabled={isRegistered}
            tenantSlug={tenantSlug}
            stayContactWhatsapp={stayContactWhatsapp}
            initialTourismGuests={initial.tourismGuests}
            initialTourismComplete={initial.tourismComplete}
            onTourismComplete={handleTourismComplete}
            onEntryDateComplete={handleEntryDateComplete}
            onContactComplete={onContactComplete}
            onContactDraftChange={setContactDraftWhatsapp}
            registrationSurface="standalone"
          />
        </div>
        {footerLabel ? (
          <div className="mt-3 shrink-0">
            <Button size="lg" className="w-full" onClick={handleFooterPrimary}>
              {footerLabel}
            </Button>
          </div>
        ) : null}
      </main>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </div>
  );
}
