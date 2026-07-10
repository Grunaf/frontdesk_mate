'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckInRequiredSheet,
  resolveGuestRegistrationPath,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { TourismRegistrationRequiredSheet } from '@/features/guest-tourism-registration';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from '@/views/arrival-journey';
import { SITE_CONFIG } from '@/shared/config';
import { useLocale, useTranslations } from '@/shared/i18n';
import { Button, IconBackActionsRow } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  isStaySetupRegistrationComplete,
  isStaySetupStepLocked,
  isValidStaySetupUrlStep,
  normalizeStaySetupUrlStep,
  resolveFirstIncompleteStaySetupStep,
  resolveNextStaySetupStep,
  resolvePreviousStaySetupStep,
  resolveStaySetupStepOrder,
  type StaySetupCompletion,
  type StaySetupStep,
} from '../lib/resolveStaySetupSteps';
import { resolveStaySetupPrimaryButtonKey } from '../lib/resolveStaySetupPrimaryButtonKey';
import { StaySetupEssentialsStep } from './StaySetupEssentialsStep';
import { StaySetupRoomStep } from './StaySetupRoomStep';
import { StaySetupStepProgressBar } from './StaySetupStepProgressBar';

export interface StaySetupInitialState {
  tourismComplete: boolean;
  contactComplete: boolean;
  stayContactWhatsapp: string | null;
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
  const locale = useLocale();
  const router = useRouter();
  const { settings } = useTenant();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const isRegistered = useIsGuestRegistered();

  const [tourismComplete, setTourismComplete] = useState(initial.tourismComplete);
  const [contactComplete, setContactComplete] = useState(initial.contactComplete);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [tourismGateSheetOpen, setTourismGateSheetOpen] = useState(false);

  const completion: StaySetupCompletion = useMemo(
    () => ({
      tourismRequired: tourismRegistrationRequired,
      tourismComplete,
      contactComplete,
    }),
    [tourismRegistrationRequired, tourismComplete, contactComplete]
  );

  const registrationComplete = isStaySetupRegistrationComplete(completion);

  const defaultStep = resolveFirstIncompleteStaySetupStep(
    tourismRegistrationRequired,
    completion
  );
  const [currentStep, setCurrentStep] = useState<StaySetupStep>(defaultStep);

  useEffect(() => {
    setTourismComplete(initial.tourismComplete);
    setContactComplete(initial.contactComplete);
  }, [initial.tourismComplete, initial.contactComplete]);

  useEffect(() => {
    if (isRegistered) {
      setCheckInSheetOpen(false);
      return;
    }

    setCheckInSheetOpen(true);
  }, [isRegistered]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = normalizeStaySetupUrlStep(params.get('step'));

    if (!isRegistered) {
      if (step === 'room' || step === 'essentials') {
        setCurrentStep(step);
        return;
      }
      if (step === 'registration' || !step) {
        setCurrentStep(
          step ?? resolveFirstIncompleteStaySetupStep(tourismRegistrationRequired, completion)
        );
      }
      return;
    }

    if (!step) {
      setCurrentStep(resolveFirstIncompleteStaySetupStep(tourismRegistrationRequired, completion));
      return;
    }

    if (step === 'room' || step === 'essentials') {
      if (!registrationComplete) {
        setCurrentStep('registration');
        return;
      }
      setCurrentStep(step);
      return;
    }

    if (!isValidStaySetupUrlStep(params.get('step'), tourismRegistrationRequired, contactComplete)) {
      return;
    }

    setCurrentStep(step);
  }, [
    isRegistered,
    tourismRegistrationRequired,
    registrationComplete,
    contactComplete,
    completion,
  ]);

  const openCheckInSheet = () => setCheckInSheetOpen(true);
  const openTourismGateSheet = () => setTourismGateSheetOpen(true);

  const goToRegistrationPage = useCallback(() => {
    router.push(resolveGuestRegistrationPath({ locale }));
  }, [locale, router]);

  const navigateToStep = useCallback(
    (step: StaySetupStep) => {
      if (!isRegistered) {
        setCurrentStep(step);
        return;
      }

      if (isRoomOrEssentialsStep(step) && isRegistered && !registrationComplete) {
        if (tourismRegistrationRequired && !tourismComplete) {
          openTourismGateSheet();
          return;
        }
        goToRegistrationPage();
        return;
      }

      setCurrentStep(step);
    },
    [
      isRegistered,
      registrationComplete,
      tourismRegistrationRequired,
      tourismComplete,
      goToRegistrationPage,
    ]
  );

  const visibleSteps = resolveStaySetupStepOrder(tourismRegistrationRequired, completion);

  const stepsConfig = useMemo(() => {
    const items: {
      id: StaySetupStep;
      label: string;
      showPrimary: boolean;
      render: () => React.ReactNode;
      onComplete: () => void;
    }[] = [
      {
        id: 'registration',
        label: t('tabs.registration'),
        showPrimary: true,
        render: () => (
          <div className="space-y-2 py-2">
            {registrationComplete ? (
              <p className="text-sm text-muted-foreground">{t('registration.completeHint')}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('registration.incompleteHint')}</p>
            )}
          </div>
        ),
        onComplete: () => setCurrentStep('essentials'),
      },
      {
        id: 'essentials',
        label: t('tabs.essentials'),
        showPrimary: true,
        render: () => <StaySetupEssentialsStep />,
        onComplete: () => setCurrentStep('room'),
      },
      {
        id: 'room',
        label: t('tabs.room'),
        showPrimary: true,
        render: () => <StaySetupRoomStep />,
        onComplete: () => router.push(SITE_CONFIG.routes.app.concierge.path),
      },
    ];

    return items.filter((item) => visibleSteps.includes(item.id));
  }, [t, registrationComplete, router, visibleSteps]);

  const activeStep = stepsConfig.find((step) => step.id === currentStep) ?? stepsConfig[0];

  const progressSteps = stepsConfig.map((step) => ({
    id: step.id,
    label: step.label,
    locked: isStaySetupStepLocked(step.id, isRegistered, tourismRegistrationRequired, completion),
  }));

  const handlePrimaryAction = () => {
    if (!activeStep) {
      return;
    }

    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      openCheckInSheet();
      return;
    }

    if (activeStep.id === 'registration' && !registrationComplete) {
      goToRegistrationPage();
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
      goToRegistrationPage();
      return;
    }

    const nextStep = resolveNextStaySetupStep(
      activeStep.id,
      tourismRegistrationRequired,
      completion
    );

    if (nextStep === null) {
      activeStep.onComplete();
      return;
    }

    navigateToStep(nextStep);
  };

  const primaryButtonKey = activeStep
    ? resolveStaySetupPrimaryButtonKey(
        activeStep.id,
        isRegistered,
        tourismRegistrationRequired,
        completion
      )
    : 'settlement.actionButton';

  const showPrimaryButton = activeStep?.showPrimary ?? false;

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
        <div className="min-h-0 flex-1 overflow-y-auto">{activeStep?.render()}</div>
        {showPrimaryButton ? (
          <IconBackActionsRow className="mt-3" onBack={showBackButton ? handleBackAction : undefined}>
            <Button size="lg" onClick={handlePrimaryAction}>
              {t(primaryButtonKey)}
            </Button>
          </IconBackActionsRow>
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
        onGoToRegistration={goToRegistrationPage}
      />
    </div>
  );
}
