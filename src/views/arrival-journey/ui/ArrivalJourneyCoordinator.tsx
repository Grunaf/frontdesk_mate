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
import { TourismRegistrationPanel } from '@/features/guest-tourism-registration';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { SettlementPhase } from './SettlementPhase';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, SegmentedChipBar } from '@/shared/ui';
import { useCheckInState, type Step } from '../model/useCheckInState';
import { resolveArrivalJourneyPrimaryButtonKey } from '../lib/resolveArrivalJourneyPrimaryButtonKey';

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
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const isRegistered = useIsGuestRegistered();
  const { currentStep, setCurrentStep } = useCheckInState(isOnsite);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [tourismComplete, setTourismComplete] = useState(initialTourismComplete);

  useEffect(() => {
    setTourismComplete(initialTourismComplete);
  }, [initialTourismComplete]);

  const canAccessSettlement =
    isRegistered && (!tourismRegistrationRequired || tourismComplete);

  const openCheckInSheet = () => {
    setCheckInSheetOpen(true);
  };

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
      setCurrentStep('route');
      setCheckInSheetOpen(true);
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
    setCurrentStep,
    tourismRegistrationRequired,
    tourismComplete,
  ]);

  const stepsConfig: StepItem[] = useMemo(() => {
    const arrivalOnComplete = () =>
      setCurrentStep(tourismRegistrationRequired ? 'register' : 'settlement');

    const base: StepItem[] = [
      {
        id: 'info',
        label: t('tabs.info'),
        Component: PreTripInfo,
        onComplete: () => setCurrentStep('route'),
        buttonKey: 'preTrip.actionButton',
      },
      {
        id: 'route',
        label: t('tabs.route'),
        Component: DirectionPicker,
        onComplete: () => setCurrentStep('arrival'),
        buttonKey: 'directions.actionButton',
      },
      {
        id: 'arrival',
        label: t('tabs.arrival'),
        Component: DoorAccessPanel,
        onComplete: arrivalOnComplete,
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
    tourismRegistrationRequired,
    setCurrentStep,
    router,
    handleTourismRegistrationComplete,
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
      setCurrentStep('register');
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
      setCurrentStep('register');
    }
  };

  const handlePrimaryAction = () => {
    if (!isRegistered && activeStep.id === 'route') {
      openCheckInSheet();
      return;
    }

    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      openCheckInSheet();
      return;
    }

    if (
      activeStep.id === 'settlement' &&
      !canAccessSettlement
    ) {
      setCurrentStep('register');
      return;
    }

    activeStep.onComplete();
  };

  const primaryButtonKey = resolveArrivalJourneyPrimaryButtonKey(currentStep, isRegistered);
  const showPrimaryButton = activeStep.id !== 'register';

  return (
    <div className="flex min-h-screen w-full max-w-md flex-col bg-background">
      <SegmentedChipBar
        bleed={false}
        className="mt-4"
        items={chipItems}
        value={currentStep}
        onValueChange={handleStepChange}
        onLockedClick={handleLockedChipClick}
        ariaLabel="Arrival guide steps"
      />

      <CrossHostelStrip showRoutesHint={currentStep === 'route'} className="mx-4 mt-3" />

      {!isRegistered ? (
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

      <main className="flex flex-col justify-between gap-y-6 bg-background px-4 pb-8 pt-4">
        <ActiveComponent />
        {showPrimaryButton ? (
          <Button size="lg" className="w-full" onClick={handlePrimaryAction}>
            {t(primaryButtonKey)}
          </Button>
        ) : null}
      </main>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </div>
  );
}
