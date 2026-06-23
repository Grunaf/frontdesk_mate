'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DirectionPicker } from '@/features/direction-picker';
import { DoorAccessPanel } from '@/features/door-access';
import { PreTripInfo } from '@/features/pre-trip';
import {
  CrossHostelStrip,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { SettlementPhase } from './SettlementPhase';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, SegmentedChipBar } from '@/shared/ui';
import { useCheckInState, type Step } from '../model/useCheckInState';

interface ArrivalJourneyCoordinatorProps {
  isOnsite: boolean;
}

export interface StepItem {
  id: Step;
  label: string;
  Component: React.ComponentType;
  onComplete: () => void;
  buttonKey: string;
}

const REGISTRATION_LOCKED_STEPS: Step[] = ['arrival', 'settlement'];

function isRegistrationLockedStep(step: Step, isRegistered: boolean): boolean {
  return !isRegistered && REGISTRATION_LOCKED_STEPS.includes(step);
}

export function ArrivalJourneyCoordinator({ isOnsite }: ArrivalJourneyCoordinatorProps) {
  const t = useTranslations('pages.arrivalJourney');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const checkInPath = `/${locale}/check-in`;
  const isRegistered = useIsGuestRegistered();
  const { currentStep, setCurrentStep } = useCheckInState(isOnsite);

  const navigateToCheckIn = () => {
    router.push(checkInPath);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    if (step !== 'info' && step !== 'route' && step !== 'arrival' && step !== 'settlement') {
      return;
    }

    if (isRegistrationLockedStep(step, isRegistered)) {
      router.replace(checkInPath);
      return;
    }

    setCurrentStep(step);
  }, [checkInPath, isRegistered, router, setCurrentStep]);

  const stepsConfig: StepItem[] = [
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
      onComplete: () => setCurrentStep('settlement'),
      buttonKey: 'arrival.actionButton',
    },
    {
      id: 'settlement',
      label: t('tabs.settlement'),
      Component: SettlementPhase,
      onComplete: () => router.push(SITE_CONFIG.routes.app.concierge.path),
      buttonKey: 'settlement.actionButton',
    },
  ];

  const activeStep = stepsConfig.find((step) => step.id === currentStep) || stepsConfig[0];
  const ActiveComponent = activeStep.Component;

  const handleStepChange = (value: string) => {
    const step = value as Step;
    if (isRegistrationLockedStep(step, isRegistered)) {
      navigateToCheckIn();
      return;
    }
    setCurrentStep(step);
  };

  const chipItems = stepsConfig.map((step) => ({
    id: step.id,
    label: step.label,
    locked: isRegistrationLockedStep(step.id, isRegistered),
  }));

  const handlePrimaryAction = () => {
    if (!isRegistered && activeStep.id === 'route') {
      navigateToCheckIn();
      return;
    }

    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      navigateToCheckIn();
      return;
    }

    activeStep.onComplete();
  };

  return (
    <div className="flex min-h-screen w-full max-w-md flex-col bg-background">
      <SegmentedChipBar
        bleed={false}
        className="mt-4"
        items={chipItems}
        value={currentStep}
        onValueChange={handleStepChange}
        onLockedClick={navigateToCheckIn}
        ariaLabel="Arrival guide steps"
      />

      <CrossHostelStrip showRoutesHint={currentStep === 'route'} className="mx-4 mt-3" />

      <main className="flex flex-col justify-between gap-y-6 bg-background px-4 pb-8 pt-4">
        <ActiveComponent />
        <Button size="lg" className="w-full" onClick={handlePrimaryAction}>
          {t(activeStep.buttonKey)}
        </Button>
      </main>
    </div>
  );
}
