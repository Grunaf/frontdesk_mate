'use client';

import { useRouter } from 'next/navigation';
import { DirectionPicker } from '@/features/direction-picker';
import { DoorAccessPanel } from '@/features/door-access';
import { PreTripInfo } from '@/features/pre-trip';
import { SettlementPhase } from './SettlementPhase';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui';
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

export function ArrivalJourneyCoordinator({ isOnsite }: ArrivalJourneyCoordinatorProps) {
  const t = useTranslations('pages.arrivalJourney');
  const router = useRouter();
  const { currentStep, setCurrentStep } = useCheckInState(isOnsite);

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

  return (
    <div className="flex min-h-screen max-w-md flex-col bg-background">
      <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as Step)} className="mt-4">
        <TabsList
          variant="line"
          className="no-scrollbar -mx-4 h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent px-4 pb-2 sm:mx-0 sm:px-0"
        >
          {stepsConfig.map((step) => (
            <TabsTrigger
              key={step.id}
              value={step.id}
              className="shrink-0 rounded-full border px-4 py-2 text-xs font-medium whitespace-nowrap data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
            >
              {step.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <main className="flex flex-col justify-between gap-y-6 bg-background px-4 pb-8">
        <ActiveComponent />
        <Button size="lg" className="w-full" onClick={activeStep.onComplete}>
          {t(activeStep.buttonKey)}
        </Button>
      </main>
    </div>
  );
}
