'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DirectionPicker } from '@/features/direction-picker';
import { DoorAccessPanel } from '@/features/door-access';
import { PreTripInfo } from '@/features/pre-trip';
import {
  CheckInRequiredSheet,
  CrossHostelStrip,
  useGuestSession,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { isCheckInDayOrLater } from '@/features/stay-essentials/lib/resolveShowSettlementBanner';
import { useModuleStatus } from '@/entities/tenant';
import { ArrivalGuideStepsShell } from './ArrivalGuideStepsShell';
import { useTranslations, useLocale } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { useCheckInState, type Step } from '../model/useCheckInState';
import { resolveArrivalJourneyPrimaryButtonKey } from '../lib/resolveArrivalJourneyPrimaryButtonKey';
import {
  resolveNextArrivalJourneyStep,
  resolvePublicArrivalJourneyTab,
} from '../lib/resolveNextArrivalJourneyStep';

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

const REGISTRATION_LOCKED_STEPS: Step[] = ['arrival'];

function isRegistrationLockedStep(step: Step, isRegistered: boolean): boolean {
  return !isRegistered && REGISTRATION_LOCKED_STEPS.includes(step);
}

function isValidUrlStep(step: string | null): step is Step {
  if (!step) return false;
  return step === 'info' || step === 'route' || step === 'arrival';
}

export function ArrivalJourneyCoordinator({ isOnsite }: ArrivalJourneyCoordinatorProps) {
  const t = useTranslations('pages.arrivalJourney');
  const locale = useLocale();
  const router = useRouter();
  const arrivalRoutesStatus = useModuleStatus('arrivalRoutes');
  const routesAvailable = arrivalRoutesStatus !== 'hidden';
  const isRegistered = useIsGuestRegistered();
  const { checkInAt } = useGuestSession();
  const checkInDayOrLater = checkInAt ? isCheckInDayOrLater(checkInAt) : false;
  const { currentStep, setCurrentStep } = useCheckInState(isOnsite);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [arrivalHideMainPrimary, setArrivalHideMainPrimary] = useState(false);

  const isArrival = currentStep === 'arrival';
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
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    if (!isValidUrlStep(step)) {
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

    setCurrentStep(step);
  }, [isRegistered, routesAvailable, setCurrentStep]);

  useEffect(() => {
    if (!routesAvailable && currentStep === 'route') {
      setCurrentStep(resolvePublicArrivalJourneyTab(false));
    }
  }, [routesAvailable, currentStep, setCurrentStep]);

  const openCheckInSheet = () => {
    setCheckInSheetOpen(true);
  };

  const goToStaySetup = useCallback(() => {
    router.push(`/${locale}${SITE_CONFIG.routes.app.staySetup.path}`);
  }, [locale, router]);

  const goToConcierge = useCallback(() => {
    router.push(`/${locale}${SITE_CONFIG.routes.app.concierge.path}`);
  }, [locale, router]);

  const completeArrivalStep = useCallback(() => {
    if (!checkInDayOrLater) {
      goToConcierge();
      return;
    }
    goToStaySetup();
  }, [checkInDayOrLater, goToConcierge, goToStaySetup]);

  const navigateToStep = useCallback(
    (step: Step) => {
      if (isRegistrationLockedStep(step, isRegistered)) {
        openCheckInSheet();
        return;
      }
      setCurrentStep(step);
    },
    [isRegistered, setCurrentStep]
  );

  const handleArrivalPrimaryAction = useCallback(() => {
    if (isRegistrationLockedStep('arrival', isRegistered)) {
      openCheckInSheet();
      return;
    }
    completeArrivalStep();
  }, [isRegistered, completeArrivalStep]);

  const arrivalExitButtonKey = checkInDayOrLater ? 'arrival.actionButton' : 'arrival.goToConcierge';

  const stepsConfig: StepItem[] = useMemo(() => {
    const goToNextFrom = (fromStep: Step) => {
      const next = resolveNextArrivalJourneyStep(fromStep, routesAvailable);
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
        onComplete: completeArrivalStep,
        buttonKey: arrivalExitButtonKey,
      },
    ];

    return base;
  }, [t, routesAvailable, navigateToStep, completeArrivalStep, arrivalExitButtonKey]);

  const activeStep =
    stepsConfig.find((step) => step.id === currentStep) || stepsConfig[0];
  const ActiveComponent = activeStep.Component;

  const handleStepChange = (value: string) => {
    const step = value as Step;
    if (isRegistrationLockedStep(step, isRegistered)) {
      openCheckInSheet();
      return;
    }
    setCurrentStep(step);
  };

  const chipItems = stepsConfig.map((step) => ({
    id: step.id,
    label: step.label,
    locked: isRegistrationLockedStep(step.id, isRegistered),
  }));

  const handleLockedChipClick = (id: string) => {
    const step = id as Step;
    if (isRegistrationLockedStep(step, isRegistered)) {
      openCheckInSheet();
    }
  };

  const handlePrimaryAction = () => {
    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      openCheckInSheet();
      return;
    }

    const nextStep = resolveNextArrivalJourneyStep(activeStep.id, routesAvailable);

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
    checkInDayOrLater
  );
  const showPrimaryButton = !(activeStep.id === 'arrival' && arrivalHideMainPrimary);

  const arrivalGuideChipsOverlay = (
    <div className="bg-gradient-to-b from-black/70 via-black/45 to-transparent pb-5 pt-1">
      <SegmentedChipBar
        bleed={false}
        className="mt-2 px-4 py-0.5"
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
        isArrival
          ? 'min-h-0 flex-1 overflow-x-hidden overflow-y-hidden'
          : 'min-h-0 flex-1 flex-col overflow-x-hidden'
      )}
    >
      {!isArrival ? (
        <ArrivalGuideStepsShell stepsLayout="scrollLinked">
          <SegmentedChipBar
            bleed={false}
            className="mt-2 px-4 py-0.5"
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

      <main
        className={cn(
          'flex flex-col bg-background',
          isArrival
            ? 'min-h-0 flex-1 overflow-hidden px-0 pt-0 pb-0'
            : 'min-h-0 flex-1 px-4 pt-4 pb-4'
        )}
      >
        {isArrival ? (
          <DoorAccessPanel
            mediaTopOverlay={arrivalGuideChipsOverlay}
            primaryAction={{
              label: t(arrivalExitButtonKey),
              onClick: handleArrivalPrimaryAction,
            }}
            onHideMainPrimaryChange={setArrivalHideMainPrimary}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ActiveComponent />
          </div>
        )}
        {showPrimaryButton ? (
          <Button
            size="lg"
            className={cn('w-full shrink-0', !isArrival && 'mt-3', isArrival && 'mx-4 mb-2')}
            onClick={handlePrimaryAction}
          >
            {t(primaryButtonKey)}
          </Button>
        ) : null}
      </main>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </div>
  );
}
