'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DirectionPicker } from '@/features/direction-picker';
import { DoorAccessPanel } from '@/features/door-access';
import { PreTripInfo } from '@/features/pre-trip';
import {
  CheckInRequiredSheet,
  CrossHostelStrip,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { TourismRegistrationPanel, TourismRegistrationRequiredSheet } from '@/features/guest-tourism-registration';
import { resolveTourismRegistrationRequired, useModuleStatus, useTenant } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from './ArrivalGuideStepsShell';
import { SettlementPhase } from './SettlementPhase';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, SegmentedChipBar, useAppHeaderScroll } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { useCheckInState, type Step } from '../model/useCheckInState';
import { resolveArrivalJourneyPrimaryButtonKey } from '../lib/resolveArrivalJourneyPrimaryButtonKey';
import {
  resolveNextArrivalJourneyStep,
  resolvePublicArrivalJourneyTab,
} from '../lib/resolveNextArrivalJourneyStep';

interface ArrivalJourneyCoordinatorProps {
  isOnsite: boolean;
  tourismRegistrationComplete?: boolean;
}

export interface StepItem {
  id: Step;
  label: string;
  Component: React.ComponentType;
  onComplete: () => void;
  buttonKey: string;
}

const REGISTRATION_LOCKED_STEPS: Step[] = ['arrival', 'register', 'settlement'];

function isRegistrationLockedStep(step: Step, isRegistered: boolean): boolean {
  return !isRegistered && REGISTRATION_LOCKED_STEPS.includes(step);
}

function isSettlementTourismLocked(
  step: Step,
  tourismRegistrationRequired: boolean,
  tourismComplete: boolean,
  isRegistered: boolean
): boolean {
  if (step !== 'settlement') return false;
  if (!tourismRegistrationRequired || !isRegistered) return false;
  return !tourismComplete;
}

function isValidUrlStep(
  step: string | null,
  tourismRegistrationRequired: boolean
): step is Step {
  if (!step) return false;
  const base: Step[] = ['info', 'route', 'arrival', 'settlement'];
  const withRegister: Step[] = [...base.slice(0, 3), 'register', ...base.slice(3)];
  const allowed = tourismRegistrationRequired ? withRegister : base;
  return allowed.includes(step as Step);
}

export function ArrivalJourneyCoordinator({
  isOnsite,
  tourismRegistrationComplete: initialTourismComplete = false,
}: ArrivalJourneyCoordinatorProps) {
  const t = useTranslations('pages.arrivalJourney');
  const router = useRouter();
  const { settings } = useTenant();
  const arrivalRoutesStatus = useModuleStatus('arrivalRoutes');
  const routesAvailable = arrivalRoutesStatus !== 'hidden';
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const isRegistered = useIsGuestRegistered();
  const { currentStep, setCurrentStep } = useCheckInState(isOnsite);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [tourismGateSheetOpen, setTourismGateSheetOpen] = useState(false);
  const [tourismComplete, setTourismComplete] = useState(initialTourismComplete);
  const [arrivalHideMainPrimary, setArrivalHideMainPrimary] = useState(false);
  const { setSuppressAutoHide } = useAppHeaderScroll();

  const isArrival = currentStep === 'arrival';

  useEffect(() => {
    setSuppressAutoHide(isArrival);
    return () => setSuppressAutoHide(false);
  }, [isArrival, setSuppressAutoHide]);

  useEffect(() => {
    if (!isArrival) {
      return;
    }

    const { documentElement } = document;
    const previousOverflow = documentElement.style.overflow;
    documentElement.style.overflow = 'hidden';

    return () => {
      documentElement.style.overflow = previousOverflow;
    };
  }, [isArrival]);

  useEffect(() => {
    setTourismComplete(initialTourismComplete);
  }, [initialTourismComplete]);

  const canAccessSettlement =
    isRegistered && (!tourismRegistrationRequired || tourismComplete);

  const openCheckInSheet = () => {
    setCheckInSheetOpen(true);
  };

  const openTourismGateSheet = () => {
    setTourismGateSheetOpen(true);
  };

  const goToTourismRegistration = useCallback(() => {
    setCurrentStep('register');
  }, [setCurrentStep]);

  const handleTourismRegistrationComplete = useCallback(() => {
    setTourismComplete(true);
    setCurrentStep('settlement');
  }, [setCurrentStep]);

  useEffect(() => {
    if (
      currentStep === 'settlement' &&
      tourismRegistrationRequired &&
      isRegistered &&
      !tourismComplete
    ) {
      setCurrentStep('register');
    }
  }, [
    currentStep,
    tourismRegistrationRequired,
    isRegistered,
    tourismComplete,
    setCurrentStep,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    if (!isValidUrlStep(step, tourismRegistrationRequired)) {
      return;
    }

    if (isRegistrationLockedStep(step, isRegistered)) {
      setCurrentStep(resolvePublicArrivalJourneyTab(routesAvailable));
      setCheckInSheetOpen(true);
      return;
    }

    if (step === 'route' && !routesAvailable) {
      setCurrentStep(resolvePublicArrivalJourneyTab(false));
      return;
    }

    let target: Step = step;

    if (step === 'register' && !tourismRegistrationRequired) {
      target = 'settlement';
    }

    if (
      target === 'settlement' &&
      tourismRegistrationRequired &&
      isRegistered &&
      !tourismComplete
    ) {
      target = 'register';
    }

    setCurrentStep(target);
  }, [
    isRegistered,
    routesAvailable,
    setCurrentStep,
    tourismRegistrationRequired,
    tourismComplete,
  ]);

  useEffect(() => {
    if (!routesAvailable && currentStep === 'route') {
      setCurrentStep(resolvePublicArrivalJourneyTab(false));
    }
  }, [routesAvailable, currentStep, setCurrentStep]);

  const navigateToStep = useCallback(
    (step: Step) => {
      if (isRegistrationLockedStep(step, isRegistered)) {
        openCheckInSheet();
        return;
      }
      if (
        isSettlementTourismLocked(
          step,
          tourismRegistrationRequired,
          tourismComplete,
          isRegistered
        )
      ) {
        openTourismGateSheet();
        return;
      }
      setCurrentStep(step);
    },
    [
      isRegistered,
      tourismRegistrationRequired,
      tourismComplete,
      setCurrentStep,
    ]
  );

  const handleArrivalPrimaryAction = useCallback(() => {
    if (isRegistrationLockedStep('arrival', isRegistered)) {
      openCheckInSheet();
      return;
    }
    const next = resolveNextArrivalJourneyStep(
      'arrival',
      routesAvailable,
      tourismRegistrationRequired
    );
    if (next === null) {
      return;
    }
    navigateToStep(next);
  }, [
    isRegistered,
    routesAvailable,
    tourismRegistrationRequired,
    navigateToStep,
  ]);

  const stepsConfig: StepItem[] = useMemo(() => {
    const goToNextFrom = (fromStep: Step) => {
      const next = resolveNextArrivalJourneyStep(
        fromStep,
        routesAvailable,
        tourismRegistrationRequired
      );
      if (next === null) {
        return;
      }
      navigateToStep(next);
    };

    const base: StepItem[] = [
      {
        id: 'info',
        label: t('tabs.info'),
        Component: PreTripInfo,
        onComplete: () => goToNextFrom('info'),
        buttonKey: 'preTrip.actionButton',
      },
      ...(routesAvailable
        ? [
            {
              id: 'route' as const,
              label: t('tabs.route'),
              Component: DirectionPicker,
              onComplete: () => goToNextFrom('route'),
              buttonKey: 'directions.actionButton',
            },
          ]
        : []),
      {
        id: 'arrival',
        label: t('tabs.arrival'),
        Component: function ArrivalGuidePlaceholder() {
          return null;
        },
        onComplete: () => goToNextFrom('arrival'),
        buttonKey: 'arrival.actionButton',
      },
    ];

    if (tourismRegistrationRequired) {
      base.push({
        id: 'register',
        label: t('tabs.register'),
        Component: function RegisterStep() {
          return <TourismRegistrationPanel onComplete={handleTourismRegistrationComplete} />;
        },
        onComplete: handleTourismRegistrationComplete,
        buttonKey: 'register.actionButton',
      });
    }

    base.push({
      id: 'settlement',
      label: t('tabs.settlement'),
      Component: SettlementPhase,
      onComplete: () => router.push(SITE_CONFIG.routes.app.concierge.path),
      buttonKey: 'settlement.actionButton',
    });

    return base;
  }, [
    t,
    routesAvailable,
    tourismRegistrationRequired,
    navigateToStep,
    router,
    handleTourismRegistrationComplete,
    handleArrivalPrimaryAction,
  ]);

  const activeStep =
    stepsConfig.find((step) => step.id === currentStep) || stepsConfig[0];
  const ActiveComponent =
    activeStep.id === 'settlement' && !canAccessSettlement
      ? function TourismGateFallback() {
          return <TourismRegistrationPanel onComplete={handleTourismRegistrationComplete} />;
        }
      : activeStep.Component;

  const handleStepChange = (value: string) => {
    const step = value as Step;
    if (isRegistrationLockedStep(step, isRegistered)) {
      openCheckInSheet();
      return;
    }
    if (
      isSettlementTourismLocked(step, tourismRegistrationRequired, tourismComplete, isRegistered)
    ) {
      openTourismGateSheet();
      return;
    }
    setCurrentStep(step);
  };

  const chipItems = stepsConfig.map((step) => ({
    id: step.id,
    label: step.label,
    locked:
      isRegistrationLockedStep(step.id, isRegistered) ||
      isSettlementTourismLocked(
        step.id,
        tourismRegistrationRequired,
        tourismComplete,
        isRegistered
      ),
  }));

  const handleLockedChipClick = (id: string) => {
    const step = id as Step;
    if (isRegistrationLockedStep(step, isRegistered)) {
      openCheckInSheet();
      return;
    }
    if (
      isSettlementTourismLocked(step, tourismRegistrationRequired, tourismComplete, isRegistered)
    ) {
      openTourismGateSheet();
    }
  };

  const handlePrimaryAction = () => {
    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      openCheckInSheet();
      return;
    }

    if (activeStep.id === 'settlement' && !canAccessSettlement) {
      openTourismGateSheet();
      return;
    }

    const nextStep = resolveNextArrivalJourneyStep(
      activeStep.id,
      routesAvailable,
      tourismRegistrationRequired
    );

    if (nextStep === null) {
      activeStep.onComplete();
      return;
    }

    navigateToStep(nextStep);
  };

  const primaryButtonKey = resolveArrivalJourneyPrimaryButtonKey(
    currentStep,
    isRegistered,
    routesAvailable,
    tourismRegistrationRequired
  );
  const showPrimaryButton =
    activeStep.id !== 'register' &&
    !(activeStep.id === 'arrival' && arrivalHideMainPrimary);

  const arrivalGuideChipsOverlay = (
    <div className="bg-gradient-to-b from-black/70 via-black/45 to-transparent pb-5 pt-1">
      <SegmentedChipBar
        bleed={false}
        className="mt-4 px-4"
        items={chipItems}
        value={currentStep}
        onValueChange={handleStepChange}
        onLockedClick={handleLockedChipClick}
        ariaLabel="Arrival guide steps"
      />
    </div>
  );

  return (
    <div
      className={cn(
        'flex w-full flex-col bg-background',
        isArrival ? 'min-h-0 flex-1 overflow-x-hidden overflow-y-hidden' : 'min-h-screen'
      )}
    >
      {!isArrival ? (
        <ArrivalGuideStepsShell stepsLayout="scrollLinked">
          <SegmentedChipBar
            bleed
            className="mt-4"
            items={chipItems}
            value={currentStep}
            onValueChange={handleStepChange}
            onLockedClick={handleLockedChipClick}
            ariaLabel="Arrival guide steps"
          />
        </ArrivalGuideStepsShell>
      ) : null}

      {!isArrival ? (
        <CrossHostelStrip showRoutesHint={currentStep === 'route'} className="mx-4 mt-3" />
      ) : null}

      {!isArrival && !isRegistered ? (
        <p className="mx-4 mt-3 text-xs leading-relaxed text-muted-foreground">
          {t('guestCheckIn.hint')}{' '}
          <button
            type="button"
            className="font-medium text-primary underline underline-offset-2"
            onClick={openCheckInSheet}
          >
            {t('guestCheckIn.link')}
          </button>
        </p>
      ) : null}

      <main
        className={cn(
          'flex flex-col bg-background',
          isArrival
            ? 'min-h-0 flex-1 overflow-hidden px-0 pt-0 pb-0'
            : 'justify-between gap-y-6 px-4 pt-4 pb-8'
        )}
      >
        {isArrival ? (
          <DoorAccessPanel
            mediaTopOverlay={arrivalGuideChipsOverlay}
            primaryAction={{
              label: t('arrival.actionButton'),
              onClick: handleArrivalPrimaryAction,
            }}
            onHideMainPrimaryChange={setArrivalHideMainPrimary}
          />
        ) : (
          <ActiveComponent />
        )}
        {showPrimaryButton ? (
          <Button
            size="lg"
            className={cn('w-full', isArrival && 'mx-4 mb-4 shrink-0')}
            onClick={handlePrimaryAction}
          >
            {t(primaryButtonKey)}
          </Button>
        ) : null}
      </main>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
      <TourismRegistrationRequiredSheet
        open={tourismGateSheetOpen}
        onOpenChange={setTourismGateSheetOpen}
        onGoToRegistration={goToTourismRegistration}
      />
    </div>
  );
}
