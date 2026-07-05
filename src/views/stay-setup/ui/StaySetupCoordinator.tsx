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
import { ArrivalGuideStepsShell, SettlementPhase } from '@/views/arrival-journey';
import { useTranslations, useLocale } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  isStaySetupStepLocked,
  isValidStaySetupUrlStep,
  resolveFirstIncompleteStaySetupStep,
  resolveNextStaySetupStep,
  resolveStaySetupStepOrder,
  type StaySetupCompletion,
  type StaySetupStep,
} from '../lib/resolveStaySetupSteps';
import { resolveStaySetupPrimaryButtonKey } from '../lib/resolveStaySetupPrimaryButtonKey';

export interface StaySetupInitialState {
  tourismComplete: boolean;
  contactComplete: boolean;
  stayContactWhatsapp: string | null;
}

interface StaySetupCoordinatorProps {
  initial: StaySetupInitialState;
}

const REGISTRATION_LOCKED_STEPS: StaySetupStep[] = ['register', 'contact', 'settlement'];

function isRegistrationLockedStep(step: StaySetupStep, isRegistered: boolean): boolean {
  return !isRegistered && REGISTRATION_LOCKED_STEPS.includes(step);
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
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');

    if (!step) {
      setCurrentStep(resolveFirstIncompleteStaySetupStep(tourismRegistrationRequired, completion));
      return;
    }

    if (step === 'register' && !tourismRegistrationRequired) {
      setCurrentStep(
        contactComplete
          ? 'settlement'
          : resolveFirstIncompleteStaySetupStep(false, completion)
      );
      return;
    }

    if (step === 'contact' && contactComplete) {
      setCurrentStep(resolveFirstIncompleteStaySetupStep(tourismRegistrationRequired, completion));
      return;
    }

    if (step === 'settlement') {
      if (isRegistrationLockedStep('settlement', isRegistered)) {
        setCheckInSheetOpen(true);
        return;
      }
      if (tourismRegistrationRequired && !tourismComplete) {
        setCurrentStep('register');
        return;
      }
      if (!contactComplete) {
        setCurrentStep('contact');
        return;
      }
      setCurrentStep('settlement');
      return;
    }

    if (!isValidStaySetupUrlStep(step, tourismRegistrationRequired, contactComplete)) {
      return;
    }

    const target = step as StaySetupStep;

    if (isRegistrationLockedStep(target, isRegistered)) {
      setCheckInSheetOpen(true);
      return;
    }

    setCurrentStep(target);
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
    setCurrentStep(contactComplete ? 'settlement' : 'contact');
  }, [contactComplete]);

  const handleContactComplete = useCallback(() => {
    setContactComplete(true);
    setCurrentStep('settlement');
  }, []);

  const navigateToStep = useCallback(
    (step: StaySetupStep) => {
      if (isRegistrationLockedStep(step, isRegistered)) {
        openCheckInSheet();
        return;
      }

      if (
        step === 'settlement' &&
        tourismRegistrationRequired &&
        isRegistered &&
        !tourismComplete
      ) {
        openTourismGateSheet();
        return;
      }

      if (step === 'settlement' && isRegistered && !contactComplete) {
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
        render: () => <TourismGuestsRegistrationPanel onComplete={handleTourismComplete} />,
        onComplete: handleTourismComplete,
      });
    }

    if (!contactComplete) {
      items.push({
        id: 'contact',
        label: t('tabs.contact'),
        showPrimary: false,
        render: () => (
          <StayContactStepPanel
            tenantSlug={tenantSlug}
            initialContactWhatsapp={stayContactWhatsapp}
            onComplete={handleContactComplete}
          />
        ),
        onComplete: handleContactComplete,
      });
    }

    items.push({
      id: 'settlement',
      label: t('tabs.settlement'),
      showPrimary: true,
      render: () => <SettlementPhase />,
      onComplete: () => router.push(SITE_CONFIG.routes.app.concierge.path),
    });

    return items.filter((item) => visibleSteps.includes(item.id));
  }, [
    t,
    tourismRegistrationRequired,
    contactComplete,
    handleTourismComplete,
    handleContactComplete,
    tenantSlug,
    stayContactWhatsapp,
    router,
    visibleSteps,
  ]);

  const activeStep = stepsConfig.find((step) => step.id === currentStep) ?? stepsConfig[0];

  const chipItems = stepsConfig.map((step) => ({
    id: step.id,
    label: step.label,
    locked: isStaySetupStepLocked(step.id, isRegistered, tourismRegistrationRequired, completion),
  }));

  const handleStepChange = (value: string) => {
    navigateToStep(value as StaySetupStep);
  };

  const handleLockedChipClick = (id: string) => {
    const step = id as StaySetupStep;
    if (isRegistrationLockedStep(step, isRegistered)) {
      openCheckInSheet();
      return;
    }
    if (step === 'settlement' || step === 'contact') {
      if (tourismRegistrationRequired && !tourismComplete) {
        openTourismGateSheet();
      }
    }
  };

  const handlePrimaryAction = () => {
    if (!activeStep) {
      return;
    }

    if (isRegistrationLockedStep(activeStep.id, isRegistered)) {
      openCheckInSheet();
      return;
    }

    if (
      activeStep.id === 'settlement' &&
      tourismRegistrationRequired &&
      !tourismComplete
    ) {
      openTourismGateSheet();
      return;
    }

    if (activeStep.id === 'settlement' && !contactComplete) {
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

  return (
    <div className={cn('flex min-h-screen w-full flex-col overflow-x-hidden bg-background')}>
      <ArrivalGuideStepsShell stepsLayout="scrollLinked">
        <SegmentedChipBar
          bleed={false}
          className="mt-2 px-4 py-0.5"
          items={chipItems}
          value={currentStep}
          onValueChange={handleStepChange}
          onLockedClick={handleLockedChipClick}
          ariaLabel="Stay setup steps"
        />
      </ArrivalGuideStepsShell>

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

      <main className="flex flex-col justify-between gap-y-6 px-4 pt-4 pb-8">
        {activeStep?.render()}
        {showPrimaryButton ? (
          <Button size="lg" className="w-full" onClick={handlePrimaryAction}>
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
