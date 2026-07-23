'use client';

import { useRouter } from 'next/navigation';
import {
  resolveGuestStaySetupPath,
  resolveStaySetupDeepLinkStep,
} from '@/features/guest-check-in/lib/resolveGuestStaySetupPath';
import { useStaySetupStatus } from '@/features/guest-stay-contact';
import { resolveGuestStayPlan, resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { useTranslations, useLocale } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { ArrowRight } from 'lucide-react';
import type { StaySetupCompletion } from '@/views/stay-setup/lib/resolveStaySetupSteps';
import { FindYourBedSummary } from './FindYourBedSummary';

type StaySetupBedMapStep = 'registration' | 'essentials' | 'room';

type StaySetupBedMapState = {
  step: StaySetupBedMapStep;
  completion: StaySetupCompletion;
  statusLoading: boolean;
};

/** Bed-map deep link from shared StaySetupStatus (SSR provider) — no duplicate fetch. */
function useStaySetupBedMapState(): StaySetupBedMapState {
  const { settings } = useTenant();
  const { status, statusLoading } = useStaySetupStatus();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);

  const completion: StaySetupCompletion = {
    tourismRequired: tourismRegistrationRequired,
    tourismComplete: status?.tourismComplete ?? false,
    entryDateComplete: status?.entryDateComplete ?? false,
    contactComplete: status?.contactComplete ?? false,
    passportVerified: status?.passportVerified ?? false,
  };

  const step = resolveStaySetupDeepLinkStep({
    tourismRequired: tourismRegistrationRequired,
    tourismComplete: completion.tourismComplete,
    entryDateComplete: completion.entryDateComplete,
    contactComplete: completion.contactComplete,
    passportVerified: completion.passportVerified,
    preferSettlement: true,
  });

  return { step, completion, statusLoading };
}

/** Deep link step for bed map / settlement when stay-setup gates may apply. */
export function useStaySetupBedMapStep(): StaySetupBedMapStep;
export function useStaySetupBedMapStep(withState: true): StaySetupBedMapState;
export function useStaySetupBedMapStep(withState?: true): StaySetupBedMapStep | StaySetupBedMapState {
  const state = useStaySetupBedMapState();
  if (withState === true) {
    return state;
  }
  return state.step;
}

/** @deprecated Use useStaySetupBedMapStep */
export function useWelcomeBedMapStep(): 'registration' | 'essentials' | 'room' {
  return useStaySetupBedMapStep();
}

export function FindYourBedCard() {
  const t = useTranslations('components.findYourBed');
  const locale = useLocale();
  const { settings, guestBedId } = useTenant();
  const router = useRouter();
  const { step: staySetupStep, completion: staySetupCompletion } = useStaySetupBedMapStep(true);
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const plan = resolveGuestStayPlan(settings, guestBedId);
  const awaitingPassport =
    staySetupCompletion.contactComplete &&
    (!staySetupCompletion.tourismRequired || staySetupCompletion.tourismComplete) &&
    !staySetupCompletion.passportVerified;

  if (!plan.bedId) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mb-4 h-auto w-full justify-between gap-3 p-3 text-left"
      onClick={() =>
        router.push(
          resolveGuestStaySetupPath({
            locale,
            step: staySetupStep,
            tourismRequired: tourismRegistrationRequired,
            completion: staySetupCompletion,
          })
        )
      }
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {t('title')}
        </span>
        {awaitingPassport ? (
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
            {t('passportWaiting')}
          </span>
        ) : (
          <FindYourBedSummary plan={plan} variant="inline" />
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        <span className="hidden sm:inline">{t('viewFullGuide')}</span>
        <Icon icon={ArrowRight} className="size-4" />
      </span>
    </Button>
  );
}
