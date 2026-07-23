'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckInRequiredSheet,
  useGuestSession,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { ensureStayContactSaved } from '@/features/guest-stay-contact/lib/ensureStayContactSaved';
import { isStayCheckInStarted } from '@/entities/guest-stay';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from '@/views/arrival-journey';
import { RegistrationStepBody, useRegistrationStepState } from '@/views/registration';
import { SITE_CONFIG } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { TourismRegistrationRequiredSheet, PassportVerificationRequiredSheet } from '@/features/guest-tourism-registration';
import type { TourismGuestListItem } from '@/features/guest-tourism-registration';
import { Button, IconBackActionsRow } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  isStaySetupSettlementUnlocked,
  isStaySetupStepLocked,
  normalizeStaySetupUrlStep,
  resolveStaySetupCoordinatorStep,
  resolveNextStaySetupStep,
  resolvePreviousStaySetupStep,
  resolveStaySetupStepOrder,
  type StaySetupCompletion,
  type StaySetupStep,
} from '../lib/resolveStaySetupSteps';
import {
  resolveStaySetupPrimaryButtonKey,
  shouldShowStaySetupPrimaryButton,
  isStaySetupEssentialsPrimaryDisabled,
} from '../lib/resolveStaySetupPrimaryButtonKey';
import {
  isStaySetupUrlSyncedWithStep,
  mergeRegistrationStatusMonotonic,
  reconcileStepAfterCompletionSync,
  resolveStaySetupStepFromUrl,
} from '../lib/reconcileStaySetupStep';
import { buildStaySetupStepSearchParams } from '../lib/buildStaySetupStepSearchParams';
import { useStaySetupCompletionSync } from '../model/useStaySetupCompletionSync';
import {
  markStaySettlementEssentialsDone,
  markStaySettlementRoomDone,
  readStaySettlementBannerProgress,
} from '@/features/stay-essentials/model/staySettlementBannerProgressStorage';
import { StaySetupEssentialsStep } from './StaySetupEssentialsStep';
import { StaySetupRoomStep } from './StaySetupRoomStep';
import { StaySetupSettlementDayGateSheet } from './StaySetupSettlementDayGateSheet';
import { StaySetupStepProgressBar } from './StaySetupStepProgressBar';

export interface StaySetupInitialState {
  tourismComplete: boolean;
  entryDateComplete: boolean;
  entryStampDate: string | null;
  contactComplete: boolean;
  passportVerified: boolean;
  stayContactWhatsapp: string | null;
  /** SSR guest list for registration panels (avoids client waterfall skeleton). */
  tourismGuests: TourismGuestListItem[];
}

interface StaySetupCoordinatorProps {
  initial: StaySetupInitialState;
}

const REGISTRATION_LOCKED_STEPS: StaySetupStep[] = ['registration', 'essentials', 'room'];

function isRegistrationLockedStep(step: StaySetupStep, isRegistered: boolean): boolean {
  return !isRegistered && REGISTRATION_LOCKED_STEPS.includes(step);
}

function isRoomOrEssentialsStep(step: StaySetupStep): boolean {
  return step === 'essentials' || step === 'room';
}

export function StaySetupCoordinator({ initial }: StaySetupCoordinatorProps) {
  const t = useTranslations('pages.staySetup');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stepFromUrl = normalizeStaySetupUrlStep(searchParams.get('step'));
  const { settings, slug, hostel } = useTenant();
  const { session, checkInAt } = useGuestSession();
  const stayId = session?.stayId ?? null;
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const isRegistered = useIsGuestRegistered();
  const checkInStarted = checkInAt
    ? isStayCheckInStarted({
        checkInAt,
        propertyTimeZone: hostel.propertyTimeZone,
        checkInTimeFallback: hostel.checkInTime,
      })
    : false;

  const {
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
    applyRegistrationStatus,
    contactDraftWhatsapp,
    setContactDraftWhatsapp,
  } = useRegistrationStepState({ initial, isRegistered });

  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [tourismGateSheetOpen, setTourismGateSheetOpen] = useState(false);
  const [passportGateSheetOpen, setPassportGateSheetOpen] = useState(false);
  const [settlementDayGateSheetOpen, setSettlementDayGateSheetOpen] = useState(false);
  const [essentialsHasHouseRules, setEssentialsHasHouseRules] = useState(false);
  const [essentialsRulesAcknowledged, setEssentialsRulesAcknowledged] = useState(false);
  const [essentialsStepPreviouslyCompleted, setEssentialsStepPreviouslyCompleted] = useState(false);
  const [contactSaveError, setContactSaveError] = useState(false);
  const userStepIntentRef = useRef<StaySetupStep | null>(null);

  useEffect(() => {
    if (!slug || !stayId) {
      return;
    }

    const { essentialsDone } = readStaySettlementBannerProgress(slug, stayId);
    if (!essentialsDone) {
      return;
    }

    setEssentialsRulesAcknowledged(true);
    setEssentialsStepPreviouslyCompleted(true);
  }, [slug, stayId]);

  const defaultStep = resolveStaySetupCoordinatorStep(
    tourismRegistrationRequired,
    completion,
    checkInStarted
  );
  const [currentStep, setCurrentStep] = useState<StaySetupStep>(defaultStep);

  useEffect(() => {
    if (isRegistered) {
      setCheckInSheetOpen(false);
      return;
    }

    setCheckInSheetOpen(true);
  }, [isRegistered]);

  const handleCompletionSync = useCallback(
    (status: {
      tourismComplete: boolean;
      entryDateComplete: boolean;
      entryStampDate: string | null;
      contactComplete: boolean;
      passportVerified: boolean;
    }) => {
      const merged = mergeRegistrationStatusMonotonic(
        { tourismComplete, entryDateComplete, contactComplete, passportVerified },
        status
      );
      applyRegistrationStatus({
        ...merged,
        entryStampDate: status.entryStampDate,
      });

      const nextCompletion: StaySetupCompletion = {
        tourismRequired: tourismRegistrationRequired,
        tourismComplete: merged.tourismComplete,
        entryDateComplete: merged.entryDateComplete,
        contactComplete: merged.contactComplete,
        passportVerified: merged.passportVerified,
      };

      setCurrentStep((step) =>
        reconcileStepAfterCompletionSync(
          step,
          tourismRegistrationRequired,
          nextCompletion,
          checkInStarted
        )
      );
    },
    [
      applyRegistrationStatus,
      tourismRegistrationRequired,
      checkInStarted,
      tourismComplete,
      entryDateComplete,
      contactComplete,
      passportVerified,
    ]
  );

  useStaySetupCompletionSync({
    slug,
    isRegistered,
    staySetupPathSuffix: SITE_CONFIG.routes.app.staySetup.path,
    onStatus: handleCompletionSync,
  });

  useEffect(() => {
    if (userStepIntentRef.current !== null) {
      return;
    }

    const next = resolveStaySetupStepFromUrl({
      urlStep: stepFromUrl,
      isRegistered,
      tourismRegistrationRequired,
      completion,
      checkInDayOrLater: checkInStarted,
      registrationComplete,
      contactComplete,
      currentStep,
      userIntentStep: null,
    });

    if (next === null || next === currentStep) {
      return;
    }

    setCurrentStep(next);
  }, [
    stepFromUrl,
    isRegistered,
    tourismRegistrationRequired,
    checkInStarted,
    registrationComplete,
    contactComplete,
    completion,
    currentStep,
  ]);

  useEffect(() => {
    const intent = userStepIntentRef.current;
    if (intent === null) {
      return;
    }

    if (isStaySetupUrlSyncedWithStep(stepFromUrl, intent)) {
      userStepIntentRef.current = null;
    }
  }, [currentStep, stepFromUrl]);

  useEffect(() => {
    if (!isRegistered) {
      return;
    }

    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);
    const urlStep = normalizeStaySetupUrlStep(params.get('step'));

    if (urlStep === currentStep) {
      return;
    }

    const nextSearch = buildStaySetupStepSearchParams(currentStep, search.replace(/^\?/, ''));
    router.replace(`${pathname}?${nextSearch}`, { scroll: false });
  }, [currentStep, isRegistered, pathname, router]);

  const openCheckInSheet = () => setCheckInSheetOpen(true);
  const openTourismGateSheet = () => setTourismGateSheetOpen(true);
  const openPassportGateSheet = () => setPassportGateSheetOpen(true);

  const focusRegistrationStep = useCallback(() => {
    userStepIntentRef.current = 'registration';
    setCurrentStep('registration');
  }, []);

  const openSettlementDayGateSheet = () => setSettlementDayGateSheetOpen(true);

  const ensureContactBeforeAdvance = useCallback(async (): Promise<boolean> => {
    if (!slug) {
      return false;
    }

    const result = await ensureStayContactSaved({
      tenantSlug: slug,
      contactComplete,
      savedE164: stayContactWhatsapp,
      draftValue: contactDraftWhatsapp,
    });

    if (!result.ok) {
      setContactSaveError(true);
      setAccordionValue('contact');
      return false;
    }

    if (!result.skipped) {
      handleContactComplete(result.e164);
    }

    setContactSaveError(false);
    return true;
  }, [
    slug,
    contactComplete,
    stayContactWhatsapp,
    contactDraftWhatsapp,
    handleContactComplete,
    setAccordionValue,
  ]);

  const navigateToStep = useCallback(
    (step: StaySetupStep) => {
      userStepIntentRef.current = step;
      if (!isRegistered) {
        setCurrentStep(step);
        return;
      }

      if (isRoomOrEssentialsStep(step) && isRegistered && !registrationComplete) {
        if (tourismRegistrationRequired && !tourismComplete) {
          openTourismGateSheet();
          return;
        }
        focusRegistrationStep();
        return;
      }

      if (isRoomOrEssentialsStep(step) && isRegistered && !checkInStarted) {
        openSettlementDayGateSheet();
        return;
      }

      if (
        isRoomOrEssentialsStep(step) &&
        isRegistered &&
        registrationComplete &&
        !passportVerified
      ) {
        openPassportGateSheet();
        return;
      }

      setCurrentStep(step);
    },
    [
      isRegistered,
      registrationComplete,
      tourismRegistrationRequired,
      tourismComplete,
      checkInStarted,
      passportVerified,
      focusRegistrationStep,
    ]
  );

  const visibleSteps = resolveStaySetupStepOrder(tourismRegistrationRequired, completion);

  const stepsConfig = useMemo(() => {
    const items: {
      id: StaySetupStep;
      label: string;
      render: () => React.ReactNode;
      onComplete: () => void;
    }[] = [
      {
        id: 'registration',
        label: t('tabs.registration'),
        render: () => (
          <RegistrationStepBody
            className="flex min-h-0 flex-1 flex-col"
            tourismRequired={tourismRegistrationRequired}
            tourismComplete={tourismComplete}
            entryDateComplete={entryDateComplete}
            contactComplete={contactComplete}
            registrationComplete={registrationComplete}
            passportVerified={passportVerified}
            accordionValue={accordionValue}
            onAccordionValueChange={setAccordionValue}
            interactionEnabled={isRegistered}
            tenantSlug={slug ?? ''}
            stayContactWhatsapp={stayContactWhatsapp}
            initialTourismGuests={initial.tourismGuests}
            initialTourismComplete={initial.tourismComplete}
            onTourismComplete={handleTourismComplete}
            onEntryDateComplete={handleEntryDateComplete}
            onContactComplete={handleContactComplete}
            onContactDraftChange={setContactDraftWhatsapp}
            showCompleteHint={false}
            registrationSurface="wizard"
          />
        ),
        onComplete: () => {
          userStepIntentRef.current = 'essentials';
          setCurrentStep('essentials');
        },
      },
      {
        id: 'essentials',
        label: t('tabs.essentials'),
        render: () => (
          <StaySetupEssentialsStep
            rulesAcknowledged={essentialsRulesAcknowledged}
            onRulesAcknowledgedChange={setEssentialsRulesAcknowledged}
            onHasHouseRulesChange={setEssentialsHasHouseRules}
            rulesAckLocked={essentialsStepPreviouslyCompleted}
          />
        ),
        onComplete: () => {
          userStepIntentRef.current = 'room';
          setCurrentStep('room');
        },
      },
      {
        id: 'room',
        label: t('tabs.room'),
        render: () => <StaySetupRoomStep />,
        onComplete: () => router.push(SITE_CONFIG.routes.app.concierge.path),
      },
    ];

    return items.filter((item) => visibleSteps.includes(item.id));
  }, [
    t,
    tourismRegistrationRequired,
    tourismComplete,
    entryDateComplete,
    contactComplete,
    passportVerified,
    registrationComplete,
    accordionValue,
    isRegistered,
    slug,
    stayContactWhatsapp,
    initial.tourismGuests,
    initial.tourismComplete,
    handleTourismComplete,
    handleEntryDateComplete,
    handleContactComplete,
    setContactDraftWhatsapp,
    essentialsRulesAcknowledged,
    essentialsHasHouseRules,
    essentialsStepPreviouslyCompleted,
    router,
    visibleSteps,
  ]);

  const activeStep = stepsConfig.find((step) => step.id === currentStep) ?? stepsConfig[0];

  const progressSteps = stepsConfig.map((step) => ({
    id: step.id,
    label: step.label,
    locked: isStaySetupStepLocked(
      step.id,
      isRegistered,
      tourismRegistrationRequired,
      completion,
      checkInStarted
    ),
  }));

  const handlePrimaryAction = () => {
    if (!activeStep) {
      return;
    }

    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      openCheckInSheet();
      return;
    }

    if (
      activeStep.id === 'registration' &&
      registrationComplete &&
      !checkInStarted
    ) {
      openSettlementDayGateSheet();
      return;
    }

    if (
      isRoomOrEssentialsStep(activeStep.id) &&
      tourismRegistrationRequired &&
      !tourismComplete
    ) {
      openTourismGateSheet();
      return;
    }

    if (isRoomOrEssentialsStep(activeStep.id) && !registrationComplete) {
      focusRegistrationStep();
      return;
    }

    if (
      (isRoomOrEssentialsStep(activeStep.id) || activeStep.id === 'registration') &&
      registrationComplete &&
      checkInStarted &&
      !passportVerified
    ) {
      openPassportGateSheet();
      return;
    }

    const runAdvance = async () => {
      if (
        activeStep.id === 'registration' &&
        registrationComplete &&
        checkInStarted &&
        isStaySetupSettlementUnlocked(completion)
      ) {
        const saved = await ensureContactBeforeAdvance();
        if (!saved) {
          return;
        }
        userStepIntentRef.current = 'essentials';
        setCurrentStep('essentials');
        return;
      }

      const nextStep = resolveNextStaySetupStep(
        activeStep.id,
        tourismRegistrationRequired,
        completion
      );

      if (activeStep.id === 'essentials' && nextStep === 'room' && slug && stayId) {
        markStaySettlementEssentialsDone(slug, stayId);
        setEssentialsStepPreviouslyCompleted(true);
      }

      if (nextStep === null) {
        if (activeStep.id === 'room' && slug && stayId) {
          markStaySettlementRoomDone(slug, stayId);
        }
        activeStep.onComplete();
        return;
      }

      navigateToStep(nextStep);
    };

    void runAdvance();
  };

  const primaryDisabled =
    activeStep &&
    isStaySetupEssentialsPrimaryDisabled(
      activeStep.id,
      essentialsHasHouseRules,
      essentialsRulesAcknowledged
    );

  const primaryButtonKey = activeStep
    ? resolveStaySetupPrimaryButtonKey(
        activeStep.id,
        isRegistered,
        tourismRegistrationRequired,
        completion
      )
    : 'settlement.actionButton';

  const showPrimaryButton = activeStep
    ? shouldShowStaySetupPrimaryButton(activeStep.id, isRegistered, completion)
    : false;

  const previousStep = activeStep
    ? resolvePreviousStaySetupStep(
        activeStep.id,
        tourismRegistrationRequired,
        completion
      )
    : null;
  const showBackButton = previousStep !== null;

  const handleBackAction = () => {
    if (!previousStep) {
      return;
    }
    navigateToStep(previousStep);
  };

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col overflow-x-hidden bg-background')}>
      <ArrivalGuideStepsShell stepsLayout="scrollLinked">
        <StaySetupStepProgressBar
          className="mt-2 px-4"
          steps={progressSteps}
          value={currentStep}
          completion={completion}
          ariaLabel="Stay setup steps"
        />
      </ArrivalGuideStepsShell>

      <main className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4">
        <div
          className={cn(
            'min-h-0 flex-1',
            currentStep === 'registration' ? 'flex flex-col' : 'overflow-y-auto'
          )}
        >
          {activeStep?.render()}
        </div>
        {showPrimaryButton ? (
          <IconBackActionsRow className="mt-3" onBack={showBackButton ? handleBackAction : undefined}>
            <Button size="lg" disabled={primaryDisabled} onClick={handlePrimaryAction}>
              {t(primaryButtonKey)}
            </Button>
          </IconBackActionsRow>
        ) : null}
        {contactSaveError ? (
          <p className="mt-2 text-xs text-destructive">{t('contact.errors.invalidWhatsapp')}</p>
        ) : null}
      </main>

      <CheckInRequiredSheet
        open={checkInSheetOpen}
        dismissible={isRegistered}
        onOpenChange={(next) => {
          if (!isRegistered && !next) return;
          setCheckInSheetOpen(next);
        }}
      />
      <TourismRegistrationRequiredSheet
        open={tourismGateSheetOpen}
        onOpenChange={setTourismGateSheetOpen}
        onGoToRegistration={focusRegistrationStep}
      />
      <PassportVerificationRequiredSheet
        open={passportGateSheetOpen}
        onOpenChange={setPassportGateSheetOpen}
      />
      <StaySetupSettlementDayGateSheet
        open={settlementDayGateSheetOpen}
        onOpenChange={setSettlementDayGateSheetOpen}
      />
    </div>
  );
}
