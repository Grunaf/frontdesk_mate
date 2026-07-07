'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckInRequiredSheet,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { StayContactStepPanel } from '@/features/guest-stay-contact';
import {
  TourismGuestsRegistrationPanel,
  TourismRegistrationRequiredSheet,
} from '@/features/guest-tourism-registration';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from '@/views/arrival-journey';
import { SITE_CONFIG } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { Button, IconBackActionsRow } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
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

const REGISTRATION_LOCKED_STEPS: StaySetupStep[] = [
  'register',
  'contact',
  'essentials',
  'room',
];

function isRegistrationLockedStep(step: StaySetupStep, isRegistered: boolean): boolean {
  return !isRegistered && REGISTRATION_LOCKED_STEPS.includes(step);
}

function isRoomOrEssentialsStep(step: StaySetupStep): boolean {
  return step === 'essentials' || step === 'room';
}

export function StaySetupCoordinator({ initial }: StaySetupCoordinatorProps) {
  const t = useTranslations('pages.staySetup');
  const router = useRouter();
  const { settings, slug: tenantSlug } = useTenant();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const isRegistered = useIsGuestRegistered();

  const [tourismComplete, setTourismComplete] = useState(initial.tourismComplete);
  const [contactComplete, setContactComplete] = useState(initial.contactComplete);
  const [stayContactWhatsapp, setStayContactWhatsapp] = useState(initial.stayContactWhatsapp);
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

  const defaultStep = resolveFirstIncompleteStaySetupStep(
    tourismRegistrationRequired,
    completion
  );
  const [currentStep, setCurrentStep] = useState<StaySetupStep>(defaultStep);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = normalizeStaySetupUrlStep(params.get('step'));

    if (!isRegistered) {
      if (step === 'room' || step === 'essentials') {
        setCurrentStep(step);
        return;
      }
      if (step === 'contact') {
        setCurrentStep('contact');
        return;
      }
      if (step === 'register' && tourismRegistrationRequired) {
        setCurrentStep('register');
        return;
      }
      if (!step) {
        setCurrentStep(
          resolveFirstIncompleteStaySetupStep(tourismRegistrationRequired, completion)
        );
      }
      return;
    }

    if (!step) {
      setCurrentStep(resolveFirstIncompleteStaySetupStep(tourismRegistrationRequired, completion));
      return;
    }

    if (step === 'register' && !tourismRegistrationRequired) {
      setCurrentStep(
        contactComplete
          ? 'essentials'
          : resolveFirstIncompleteStaySetupStep(false, completion)
      );
      return;
    }

    if (step === 'room' || step === 'essentials') {
      if (tourismRegistrationRequired && !tourismComplete) {
        setCurrentStep('register');
        return;
      }
      if (!contactComplete) {
        setCurrentStep('contact');
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
    tourismComplete,
    contactComplete,
    completion,
  ]);

  const openCheckInSheet = () => setCheckInSheetOpen(true);
  const openTourismGateSheet = () => setTourismGateSheetOpen(true);

  const goToTourismRegistration = useCallback(() => {
    setCurrentStep('register');
  }, []);

  const handleTourismComplete = useCallback(() => {
    setTourismComplete(true);
    setCurrentStep(contactComplete ? 'essentials' : 'contact');
  }, [contactComplete]);

  const handleContactComplete = useCallback((savedWhatsapp: string) => {
    setStayContactWhatsapp(savedWhatsapp);
    setContactComplete(true);
    setCurrentStep('essentials');
  }, []);

  const navigateToStep = useCallback(
    (step: StaySetupStep) => {
      if (!isRegistered) {
        setCurrentStep(step);
        return;
      }

      if (
        isRoomOrEssentialsStep(step) &&
        tourismRegistrationRequired &&
        isRegistered &&
        !tourismComplete
      ) {
        openTourismGateSheet();
        return;
      }

      if (isRoomOrEssentialsStep(step) && isRegistered && !contactComplete) {
        setCurrentStep('contact');
        return;
      }

      if (step === 'contact' && tourismRegistrationRequired && !tourismComplete) {
        openTourismGateSheet();
        return;
      }

      setCurrentStep(step);
    },
    [isRegistered, tourismRegistrationRequired, tourismComplete, contactComplete]
  );

  const visibleSteps = resolveStaySetupStepOrder(tourismRegistrationRequired, completion);

  const stepsConfig = useMemo(() => {
    const items: {
      id: StaySetupStep;
      label: string;
      showPrimary: boolean;
      render: () => React.ReactNode;
      onComplete: () => void;
    }[] = [];

    if (tourismRegistrationRequired) {
      items.push({
        id: 'register',
        label: t('tabs.register'),
        showPrimary: false,
        render: () => (
          <TourismGuestsRegistrationPanel
            onComplete={handleTourismComplete}
            interactionEnabled={isRegistered}
          />
        ),
        onComplete: handleTourismComplete,
      });
    }

    items.push({
      id: 'contact',
      label: t('tabs.contact'),
      showPrimary: false,
      render: () => (
        <StayContactStepPanel
          tenantSlug={tenantSlug}
          initialContactWhatsapp={stayContactWhatsapp}
          onComplete={handleContactComplete}
          interactionEnabled={isRegistered}
          onBack={
            tourismRegistrationRequired ? () => navigateToStep('register') : undefined
          }
        />
      ),
      onComplete: () => handleContactComplete(stayContactWhatsapp ?? ''),
    });

    items.push({
      id: 'essentials',
      label: t('tabs.essentials'),
      showPrimary: true,
      render: () => <StaySetupEssentialsStep />,
      onComplete: () => setCurrentStep('room'),
    });

    items.push({
      id: 'room',
      label: t('tabs.room'),
      showPrimary: true,
      render: () => <StaySetupRoomStep />,
      onComplete: () => router.push(SITE_CONFIG.routes.app.concierge.path),
    });

    return items.filter((item) => visibleSteps.includes(item.id));
  }, [
    t,
    tourismRegistrationRequired,
    handleTourismComplete,
    handleContactComplete,
    tenantSlug,
    stayContactWhatsapp,
    router,
    visibleSteps,
    isRegistered,
    navigateToStep,
  ]);

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

    if (
      isRoomOrEssentialsStep(activeStep.id) &&
      tourismRegistrationRequired &&
      !tourismComplete
    ) {
      openTourismGateSheet();
      return;
    }

    if (isRoomOrEssentialsStep(activeStep.id) && !contactComplete) {
      setCurrentStep('contact');
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
        onGoToRegistration={goToTourismRegistration}
      />
    </div>
  );
}
